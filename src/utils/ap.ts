import type { GameState, Player } from '../types/game';
import type { Card } from '../types/game';
import { createDefaultEffectFlags } from '../types/game';

export const START_AP = 2;
export const MAX_AP = 4;
export const BASE_AP_COST = 1;

export type APCostInfo = { cost: number; reasons: string[] };
// Legacy compatibility
export type APCalc = APCostInfo;



export function getCardActionPointCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen'
): { cost: number; reasons: string[] } {
  let cost = 1;
  const reasons: string[] = [];

  const kind = (card as any).kind ?? '';
  const typeStr = (card as any).type ?? '';
  const isInitiative = kind === 'spec' && /initiative/i.test(typeStr);

  // ✅ Nur echte Rabatte/Discounts wirken hier auf die Kosten (nicht Refunds!)
  if (isInitiative) {
    const disc = state.effectFlags?.[player]?.ngoInitiativeDiscount ?? 0;
    if (disc > 0) {
      const before = cost;
      cost = Math.max(0, cost - disc);
      reasons.push(`NGO-Rabatt: -${disc} AP (${before}→${cost})`);
    }
    if (state.effectFlags?.[player]?.nextInitiativeDiscounted) {
      const before = cost;
      cost = Math.max(0, cost - 1);
      reasons.push(`Nächste Initiative: -1 AP (${before}→${cost})`);
    }
  }

  return { cost, reasons };
}

export function hasAnyZeroApPlay(state: GameState, player: Player): boolean {
  // Prüfe, ob irgendeine Handkarte auf irgendeinem legalen Ziel mit 0 AP gespielt werden kann.
  // Nutze deine bestehende Kostenfunktion.
  const lanes: ('innen' | 'aussen')[] = ['innen', 'aussen']; // instant wird über spezielle Slots gehandelt
  return state.hands[player].some(card =>
    lanes.some(lane => {
      try {
        const { cost } = getCardActionPointCost(state, player, card, lane);
        return cost === 0;
      } catch {
        return false;
      }
    })
  );
}

export function hasGretaOnBoard(state: GameState, p: Player): boolean {
  const brd = state.board[p];
  const all = [...brd.innen, ...brd.aussen];
  return all.some(c => c.name === 'Greta Thunberg'); // Verwende name statt key
}

/** pro Turn setzen: hat der Spieler aktuell Greta ⇒ erste Gov-Karte gibt +1 AP */
export function resetTurnApRefundFlags(state: GameState, p: Player) {
  const f = state.effectFlags[p] ?? (state.effectFlags[p] = createDefaultEffectFlags());
  // f.firstGovRefundAvailable = hasGretaOnBoard(state, p); // wird durch govRefundAvailable ersetzt
  f.govRefundAvailable = hasGretaOnBoard(state, p); // 🔥 NEU: für netto-0 System
  // andere per-Turn Refunds/Zähler kannst du hier ebenfalls zurücksetzen/ableiten
}

/** wendet nach dem Play die passenden Refunds an */
export function applyApRefundsAfterPlay(
  state: GameState,
  p: Player,
  card: Card,
  log: (m: string) => void
) {
  const f = state.effectFlags[p];
  // Greta: erste Regierungskarte im Zug ⇒ +1 AP
  if (card.kind === 'pol' && f?.govRefundAvailable) {
    state.actionPoints[p] = Math.min(MAX_AP, (state.actionPoints[p] ?? 0) + 1);
    f.govRefundAvailable = false; // 🔥 NEU: für netto-0 System - wird hier konsumiert
    log('🌿 Greta: +1 AP Rückerstattung für die erste Regierungskarte in diesem Zug.');
  }

  // „nächste Initiative −1 AP" wurde in Refunds umgebaut:
  if (card.kind === 'spec' && /initiative/i.test((card as any).type ?? '') && (f?.nextInitiativeRefund ?? 0) > 0) {
    state.actionPoints[p] = Math.min(MAX_AP, (state.actionPoints[p] ?? 0) + 1);
    f.nextInitiativeRefund! -= 1;
    log('🎟️ Initiative-Refund: +1 AP (Rabatt verbraucht).');
  }
}



export function getNetApCost(
  state: GameState,
  p: Player,
  card: Card,
  lane?: 'innen' | 'aussen'
): { cost: number; refund: number; net: number; reasons: string[] } {
  const { cost, reasons } = getCardActionPointCost(state, p, card, lane);

  let refund = 0;

  const kind = (card as any).kind ?? '';
  const typeStr = (card as any).type ?? '';
  const isInitiative = kind === 'spec' && /initiative/i.test(typeStr);
  const isGovernment = kind === 'pol';

  // ✅ Greta-Refund (nur Regierungskarten, einmal pro Zug)
  if (isGovernment && state.effectFlags?.[p]?.govRefundAvailable) {
    refund += 1;
    reasons.push('Greta: +1 AP bei erster Regierungskarte');
  }

  // ✅ Zentrales Refund-Becken für Initiativen (stackbar)
  if (isInitiative) {
    const pool = state.effectFlags?.[p]?.nextInitiativeRefund ?? 0;
    if (pool > 0) {
      refund += pool;
      reasons.push(`Initiative-Refund: +${pool} AP aus Becken`);
    }
  }

  const net = Math.max(0, cost - refund);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[AP DEBUG]', {
      player: p,
      card: (card as any)?.name,
      base: 1,
      costAfterDiscounts: cost,
      refund,
      net,
      flags: state.effectFlags?.[p],
    });
  }

  return { cost, refund, net, reasons };
}

export function wouldBeNetZero(
  state: GameState,
  p: Player,
  card: Card,
  lane?: 'innen' | 'aussen'
): boolean {
  return getNetApCost(state, p, card, lane).net <= 0;
}

export function canPlayCard(state: GameState, p: Player, card: Card, lane?: 'innen'|'aussen') {
  const { net } = getNetApCost(state, p, card, lane);
  const actions = state.actionsUsed[p];
  const ap = state.actionPoints[p];

  const hasZeroAp = net === 0;
  const hasAp    = ap >= net;

  const withinActionLimit = actions < 2;
  const zeroOnlyAllowed   = !withinActionLimit && hasZeroAp;

  return {
    ok: (withinActionLimit && hasAp) || zeroOnlyAllowed,
    onlyZeroApPossible: zeroOnlyAllowed,
    reason: !hasAp ? 'Zu wenig AP' : (!withinActionLimit && !hasZeroAp ? 'Max. Aktionen erreicht' : null),
    net,
  };
}

// helper
export function isGovernmentCard(card: Card): boolean {
  return (card as any).kind === 'pol';
}
