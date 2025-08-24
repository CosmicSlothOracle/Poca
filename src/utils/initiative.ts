// src/utils/initiative.ts
import { GameState, Player } from '../types/game';

export function isInstantInitiative(card: any): boolean {
  if (!card) return false;
  if (card.kind !== 'spec') return false;
  const t = String(card.type || '').toLowerCase();
  // treat anything with "sofort" as instant-initiative
  return t.includes('sofort') || t.includes('instant');
}

export function cap(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
