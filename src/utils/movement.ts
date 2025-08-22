import { GameState, Player } from '../types/game';

/**
 * Checks if a movement card (Greta Thunberg, Malala Yousafzai, Ai Weiwei, Alexei Navalny)
 * is active on the player's board
 */
export function isMovementOnBoard(state: GameState, p: Player): boolean {
  const pub = state.board[p].innen;
  const names = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
  return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as any).deactivated);
}
