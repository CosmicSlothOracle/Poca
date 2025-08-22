import type { GameState } from '../types/game';
import type { EffectEvent } from '../types/effects';

export function enqueueEffect(state: GameState, ev: EffectEvent) {
  if (!state._effectQueue) {
    state._effectQueue = [];
  }
  state._effectQueue.push(ev);
}

export function resolveQueue(state: GameState, log = (m: string) => {}) {
  if (!state._effectQueue) {
    state._effectQueue = [];
    return;
  }

  while (state._effectQueue.length > 0) {
    const ev = state._effectQueue.shift() as EffectEvent;

    switch (ev.kind) {
      case 'LOG':
        log(ev.message);
        break;

      case 'SET_FLAG': {
        const f = (state.effectFlags[ev.player] ??= {} as any);
        (f as any)[ev.path] = ev.value;
        break;
      }

      case 'DISCOUNT_NEXT_INITIATIVE': {
        const f = (state.effectFlags[ev.player] ??= {} as any);
        (f as any).nextInitiativeDiscounted = true;
        log(`[RABATT] P${ev.player}: Naechste Initiative -1 AP.`);
        break;
      }

      case 'REFUND_NEXT_INITIATIVE': {
        const f = (state.effectFlags[ev.player] ??= {} as any);
        const cur = (f as any).nextInitiativeRefund ?? 0;
        const amount = ev.amount ?? 1;
        (f as any).nextInitiativeRefund = cur + amount;
        log(`[REFUND] P${ev.player}: Naechste Initiative +${amount} AP zurueck.`);
        break;
      }

      case 'ADD_AP': {
        const oldAP = state.actionPoints[ev.player];
        state.actionPoints[ev.player] = Math.max(
          0,
          oldAP + ev.amount
        );
        const newAP = state.actionPoints[ev.player];
        log(`[AP] P${ev.player}: ${oldAP} -> ${newAP} (${ev.amount >= 0 ? '+' : ''}${ev.amount}).`);
        break;
      }
    }
  }
}
