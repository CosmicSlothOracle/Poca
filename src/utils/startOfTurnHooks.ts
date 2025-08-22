import { GameState, Player, createDefaultEffectFlags } from '../types/game';
import { isMovementOnBoard } from './movement';

/**
 * Applies start-of-turn hooks for a player
 *
 * Goals:
 * - Clean old free flags (use refunds instead)
 * - Reset per-turn initiative refunds/discounts
 * - Set Greta/Movement refund availability based on board state
 */
export function applyStartOfTurnHooks(state: GameState, player: Player, log: (m: string) => void) {
  const f = state.effectFlags[player] ?? createDefaultEffectFlags();

  // ✅ Clean legacy/old free flags - we work only with refunds now
  f.freeGovernmentAvailable = false;     // we work only with refunds
  f.freeInitiativeAvailable = false;     // ditto

  // ✅ Reset per-turn flags (otherwise they carry over rounds)
  f.nextInitiativeDiscounted = false;
  f.nextInitiativeRefund = 0;
  f.govRefundAvailable = false;

  // ✅ Greta/Movement = first government card gives +1 AP back (Refund)
  if (isMovementOnBoard(state, player)) {
    f.govRefundAvailable = true;
    log('🎟️ Bewegung aktiv: Erste Regierungskarte gibt +1 AP zurück.');
  }

  state.effectFlags[player] = f;
}
