import { Card, GameState, Player } from '../types/game';

export const START_AP = 2;
export const MAX_AP = 4;
export const BASE_AP_COST = 1;

function isInitiative(card: Card): boolean {
  const typeStr = (card as any).type ?? '';
  return card.kind === 'spec' && /Sofort-?Initiative/i.test(typeStr);
}

function isGovernment(card: Card): boolean {
  return card.kind === 'pol';
}

export function getCardActionPointCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen' | 'sofort'
): { cost: number; reasons: string[] } {
  let cost = 1;
  const reasons: string[] = [];

  if (isInitiative(card)) {
    const disc = state.effectFlags[player]?.initiativeDiscount ?? 0;
    if (disc > 0) {
      const before = cost;
      cost = Math.max(0, cost - 1);
      reasons.push(`Initiative-Discount: -1 AP (${before}→${cost})`);
    }
  }

  return { cost, reasons };
}

export function getNetApCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen' | 'sofort'
): { cost: number; refund: number; net: number; reasons: string[] } {
  const { cost, reasons } = getCardActionPointCost(state, player, card, lane);
  let refund = 0;

  if (isGovernment(card) && state.effectFlags[player]?.govRefundAvailable) {
    refund += 1;
    reasons.push('Bewegung: +1 AP Refund für erste Regierungskarte');
  }

  if (isInitiative(card) && (state.effectFlags[player]?.initiativeRefund ?? 0) > 0) {
    refund += 1;
    reasons.push('Initiative-Refund: +1 AP');
  }

  const net = Math.max(0, cost - refund);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[AP DEBUG]', {
      player,
      card: card?.name,
      base: 1,
      costAfterDiscounts: cost,
      refund,
      net,
      flags: state.effectFlags?.[player],
      reasons,
    });
  }

  return { cost, refund, net, reasons };
}

export function wouldBeNetZero(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen' | 'sofort'
): boolean {
  return getNetApCost(state, player, card, lane).net <= 0;
}

export const isInitiativeCard = isInitiative;
export const isGovernmentCard = isGovernment;
export const isNetZeroMove = wouldBeNetZero;
export const canPlayCard = (state: GameState, p: Player, card: Card): boolean => {
  const actions = state.actionsUsed?.[p] ?? 0;
  if (actions < 2) return true;
  return wouldBeNetZero(state, p, card);
};

export const hasGretaOnBoard = (state: GameState, p: Player) =>
  state.board[p].innen.some(
    (c) => (c as any)?.kind === 'pol' && (c as any)?.name === 'Greta Thunberg' && !(c as any)?.deactivated
  );
export const hasAnyZeroApPlay = (state: GameState, p: Player) =>
  (state.hands[p] ?? []).some((c) => wouldBeNetZero(state, p, c));
export function resetTurnApRefundFlags(state: GameState, p: Player) {}
export function applyApRefundsAfterPlay(_state: GameState, _p: Player, _card: Card) {}