import { GameState, Player, Card } from '../types/game';

export const START_AP = 2;
export const MAX_AP = 4;
export const BASE_AP_COST = 1;

export const isInitiativeCard = (c: Card) =>
  (c as any)?.kind === 'spec' && /initiative/i.test((c as any)?.type ?? '');
export const isGovernmentCard = (c: Card) => (c as any)?.kind === 'pol';

// Cards that give an immediate AP refund when played (not resolved later)
function immediateApRefundOnPlay(card: Card): number {
  const name = (card as any)?.name ?? '';
  const kind = (card as any)?.kind ?? '';

  if (kind === 'spec') {
    if (name === 'Verzögerungsverfahren') return 1; // +1 AP instantly
    // add more instant-refund specs here if needed
  }
  return 0;
}

// Discounts only (no refunds here)
export function getCardActionPointCost(
  state: GameState,
  p: Player,
  card: Card
): { cost: number; reasons: string[] } {
  let cost = BASE_AP_COST;
  const reasons: string[] = [];

  if (isInitiativeCard(card)) {
    const disc = state.effectFlags?.[p]?.ngoInitiativeDiscount ?? 0;
    if (disc > 0) {
      const before = cost;
      cost = Math.max(0, cost - disc);
      reasons.push(`NGO-Rabatt: -${disc} AP (${before}→${cost})`);
    }
    if (state.effectFlags?.[p]?.nextInitiativeDiscounted) {
      const before = cost;
      cost = Math.max(0, cost - 1);
      reasons.push(`Nächste Initiative rabattiert: -1 AP (${before}→${cost})`);
    }
  }

  return { cost, reasons };
}

// Net cost = discounts – refunds (refunds include Greta/Justin/Next + card-instant)
export function getNetApCost(
  state: GameState,
  p: Player,
  card: Card,
  // optional lane param for backwards-compat with older calls; ignored
  _lane?: 'innen' | 'aussen'
): { cost: number; refund: number; net: number; reasons: string[] } {
  const { cost, reasons } = getCardActionPointCost(state, p, card);
  let refund = 0;

  // Greta: first government card per turn → +1 AP
  if (isGovernmentCard(card) && state.effectFlags?.[p]?.govRefundAvailable) {
    refund += 1;
    reasons.push('Greta: +1 AP (erste Regierungskarte)');
  }

  // Justin or any "next initiative gets +1" source → use nextInitiativeRefund
  const nextRef = state.effectFlags?.[p]?.nextInitiativeRefund ?? 0;
  if (isInitiativeCard(card) && nextRef > 0) {
    refund += 1;
    reasons.push('Nächste Initiative: +1 AP');
  }

  // Card-specific immediate refunds (e.g., Verzögerungsverfahren)
  const instant = immediateApRefundOnPlay(card);
  if (instant > 0) {
    refund += instant;
    reasons.push(`Sofort-Effekt: +${instant} AP`);
  }

  const net = Math.max(0, cost - refund);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[AP DEBUG]', {
      player: p,
      card: (card as any)?.name,
      base: BASE_AP_COST,
      costAfterDiscounts: cost,
      refund,
      net,
      flags: state.effectFlags?.[p],
      reasons,
    });
  }

  return { cost, refund, net, reasons };
}

// Net-0 utility
export function isNetZeroMove(state: GameState, p: Player, card: Card, lane?: 'innen' | 'aussen'): boolean {
  return getNetApCost(state, p, card, lane).net === 0;
}

// Back-compat alias (old import name):
export const wouldBeNetZero = isNetZeroMove;

// May play if actions < 2 OR the move is net zero
export function canPlayCard(state: GameState, p: Player, card: Card): boolean {
  const actions = state.actionsUsed?.[p] ?? 0;
  if (actions < 2) return true;
  return isNetZeroMove(state, p, card);
}

// Optional helpers you might already export:
export const hasGretaOnBoard = (state: GameState, p: Player) =>
  state.board[p].innen.some(
    (c) => (c as any)?.kind === 'pol' && (c as any)?.name === 'Greta Thunberg' && !(c as any)?.deactivated
  );
export const hasAnyZeroApPlay = (state: GameState, p: Player) =>
  (state.hands[p] ?? []).some((c) => isNetZeroMove(state, p, c));
export function resetTurnApRefundFlags(state: GameState, p: Player) {
  // left empty intentionally – managed in start-of-turn hooks
}
export function applyApRefundsAfterPlay(_state: GameState, _p: Player, _card: Card) {
  // if you had any deferred refunds (resolve-time), handle here
}


