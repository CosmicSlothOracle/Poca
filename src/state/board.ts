// src/state/board.ts
import { BoardSide, GameState } from '../types/game';

export const emptyBoardSide = (): BoardSide => ({
  innen: [],
  aussen: [],
  sofort: [],   // 👈 always present
});

export const emptyBoard = (): GameState['board'] => ({
  1: emptyBoardSide(),
  2: emptyBoardSide(),
});

/**
 * Defensive upgrade for any state that might miss the new field (e.g., tests, fixtures).
 */
export function ensureSofortBoard(state: GameState) {
  for (const p of [1, 2] as const) {
    const side = state.board[p] as any;
    if (!side.innen)  side.innen  = [];
    if (!side.aussen) side.aussen = [];
    if (!Array.isArray(side.sofort)) side.sofort = [];
  }
  return state;
}
