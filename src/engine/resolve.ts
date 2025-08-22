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
  const q = sortEventsForResolution(state._queue ?? []);
  state._queue = [];

  for (const e of q) {
    try {
      switch (e.t) {
        case 'PLAY_INTERVENTION':
          log(`🔥 INTERVENTION: ${e.card.name} by Player ${e.actor}`);
          // TODO: Implement intervention logic
          break;
        case 'PLAY_INITIATIVE':
          handleInstantInitiative(state, e.actor, e.card, log);
          break;
        case 'PLAY_PUBLIC':
          log(`🎭 PUBLIC: ${e.card.name} by Player ${e.actor} in ${e.slot}`);
          // TODO: Implement public card logic
          break;
        case 'PLAY_GOV':
          log(`🏛️ GOVERNMENT: ${e.card.name} by Player ${e.actor} in ${e.slot}`);
          // TODO: Implement government card logic
          break;
        case 'CARD_DISABLED':
          log(`❌ DISABLED: Card ${e.targetUid} by Player ${e.actor} until ${e.until}`);
          // TODO: Implement disable logic
          break;
        case 'CARD_REACTIVATED':
          log(`✅ REACTIVATED: Card ${e.targetUid} by Player ${e.actor}`);
          // TODO: Implement reactivate logic
          break;
        case 'ROUND_START':
          log(`🎯 ROUND START: Round ${e.round}`);
          // TODO: Implement round start logic
          break;
        case 'ROUND_END':
          log(`🏁 ROUND END: Round ${e.round}`);
          // TODO: Implement round end logic
          break;
        default:
          assertNever(e);
      }
    } catch (err) {
      log(`❌ Resolve-Fehler bei ${e.t}: ${(err as Error).message}`);
    }
  }
}

export function enqueue(state: GameState, ev: GEvent): void {
  state._queue = state._queue ?? [];
  state._queue.push(ev);
}
