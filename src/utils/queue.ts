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

      case 'DRAW_CARDS': {
        const deck = state.decks[ev.player];
        const hand = state.hands[ev.player];
        for (let i = 0; i < ev.count; i++) {
          if (!deck.length) {
            log(`🪙 P${ev.player}: Deck leer – keine Karte nachgezogen.`);
            break;
          }
          const c = deck.pop()!;
          hand.push(c);
          log(`🃏 P${ev.player} zieht ${c.name}.`);
        }
        break;
      }

      case 'DISCARD_RANDOM_FROM_HAND': {
        const hand = state.hands[ev.player];
        if (hand.length === 0) break;
        const idx = Math.floor(Math.random() * hand.length);
        const [c] = hand.splice(idx, 1);
        state.discard.push(c);
        log(`🗑️ P${ev.player}: Zufällige Handkarte deaktiviert → ${c.name}.`);
        break;
      }

      case 'ADJUST_INFLUENCE': {
        const target = ev.targetCard as any;
        if (!target || ev.delta === 0) break;

        const before = target.influence ?? 0;
        target.influence = Math.max(0, before + ev.delta);
        log(`${ev.delta > 0 ? '⬆️' : '⬇️'} ${target.name}: ${before}→${target.influence} (${ev.source}).`);

        // Opportunist-Mirror (nur bei Boni, kein Loop)
        if (ev.delta > 0 && state.effectFlags?.[ev.player]?.opportunistActive) {
          const otherPlayer = ev.player === 1 ? 2 : 1;
          const otherGov = state.board[otherPlayer].aussen.filter(c => c.kind === 'pol' && !(c as any).deactivated);
          if (otherGov.length > 0) {
            const mirrorTarget = otherGov.reduce((a, b) => ((a as any).influence >= (b as any).influence ? a : b));
            const mirrorBefore = (mirrorTarget as any).influence ?? 0;
            (mirrorTarget as any).influence = Math.max(0, mirrorBefore + ev.delta);
            log(`🪞 Opportunist: Gegner spiegelt +${ev.delta} Einfluss (${mirrorTarget.name}: ${mirrorBefore}→${(mirrorTarget as any).influence}).`);
          }
        }
        break;
      }
    }
  }

  // 🧹 Queue ist leer: Falls Zug-Ende gewünscht, automatisch ausführen
  if (state.isEndingTurn) {
    log('✅ Effekte fertig – Zugwechsel wird durchgeführt.');
    // Flag bleibt gesetzt, damit die aufrufende Funktion weiß, dass der Zug beendet werden soll
  }
}
