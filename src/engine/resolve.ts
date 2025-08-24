import type { GEvent } from '../types/events';
import type { GameState } from '../types/game';
import { assertNever } from '../data/effectKeys';
import { handleInstantInitiative } from './instant';

// Priorität nach Ruleset: Interventions → Initiatives → Passives → Aktives
export function sortEventsForResolution(queue: GEvent[]): GEvent[] {
  const p = (e: GEvent) =>
    e.t === 'PLAY_INTERVENTION' ? 0 :
    e.t === 'PLAY_INITIATIVE'  ? 1 :
    e.t === 'PLAY_PUBLIC' || e.t === 'PLAY_GOV' ? 2 :
    e.t === 'CARD_DISABLED' || e.t === 'CARD_REACTIVATED' ? 3 :
    e.t === 'ROUND_START' || e.t === 'ROUND_END' ? 4 : 5;
  return [...queue].sort((a,b) => p(a)-p(b));
}

export function resolveQueue(state: GameState, log: (m: string) => void): void {
  // Legacy resolve function - not used in unified system
  log('⚠️ Legacy resolveQueue called - use utils/queue.ts instead');
  return;
}

export function enqueue(state: GameState, ev: GEvent): void {
  // Legacy enqueue function - not used in unified system
  console.warn('⚠️ Legacy enqueue called - use utils/queue.ts instead');
}
