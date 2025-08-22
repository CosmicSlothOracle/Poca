import { GameState, Player, createDefaultEffectFlags, PoliticianCard } from '../types/game';
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
  const f = { ...state.effectFlags[player] };

  // Greta (Bewegung): erste Regierungskarte gibt +1 AP zurück
  const gretaActive = state.board[player].innen.some(
    c => c.kind === 'pol' && c.name === 'Greta Thunberg' && !(c as PoliticianCard).deactivated
  );
  // Nur wenn Greta liegt, aktivieren; sonst aus
  f.govRefundAvailable = !!gretaActive;

  // Initiative-Refund-Becken bleibt bestehen (z. B. von Bill Gates)
  // KEIN Reset von f.nextInitiativeRefund hier – es ist stackbar und wird beim Spielen verbraucht.

  // Reset turn-scoped Flags (Initiative-bezogen neu initialisieren)
  f.nextInitiativeDiscounted = false;
  // Plattform-Refund bleibt erhalten, bis er verbraucht wurde, aber "Used" ist turn-lokal -> resetten:
  if (!f.platformRefundAvailable) {
    // falls keiner anstand, Sicherheit
    f.platformRefundUsed = false;
  } else {
    f.platformRefundUsed = false;
  }
  f.diplomatInfluenceTransferUsed = false;

  state.effectFlags = { ...state.effectFlags, [player]: f };
}

function hasMovementCard(player: Player, state: GameState): boolean {
  const pub = state.board[player].innen;
  const names = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
  return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
}
