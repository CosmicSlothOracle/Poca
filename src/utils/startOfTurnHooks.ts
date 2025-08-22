import { GameState, Player, createDefaultEffectFlags, PoliticianCard } from '../types/game';
import { isMovementOnBoard } from './movement';

// Helper: Bewegung vorhanden? (Öffentlichkeitsreihe)
function hasMovementCard(player: Player, state: GameState): boolean {
  const pub = state.board[player].innen;
  const names = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
  return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
}

/**
 * Applies start-of-turn hooks for a player
 *
 * Goals:
 * - Clean old free flags (use refunds instead)
 * - Reset per-turn initiative refunds/discounts
 * - Set Greta/Movement refund availability based on board state
 */
export function applyStartOfTurnHooks(state: GameState, player: Player, log: (m: string) => void) {
  const f = state.effectFlags[player];

  const hasGreta = state.board[player].innen.some(
    (c) => (c as any)?.kind === 'pol' && (c as any)?.name === 'Greta Thunberg' && !(c as any)?.deactivated
  );
  const hasJustin = state.board[player].innen.some(
    (c) => (c as any)?.kind === 'pol' && (c as any)?.name === 'Justin Trudeau' && !(c as any)?.deactivated
  );

  // Greta: first government card this turn → +1 AP
  f.govRefundAvailable = !!hasGreta;

  // Justin: first initiative this turn → +1 AP (via nextInitiativeRefund)
  f.nextInitiativeRefund = hasJustin ? 1 : 0;

  // reset actionable counters
  state.actionsUsed[player] = 0;

  // (keep your existing resets)
  f.nextInitiativeDiscounted = false;

  if (hasGreta) log('🌱 Greta aktiv: Erste Regierungskarte dieses Zuges gibt +1 AP zurück.');
  if (hasJustin) log('🎖️ Justin aktiv: Erste Initiative dieses Zuges gibt +1 AP zurück.');
}
