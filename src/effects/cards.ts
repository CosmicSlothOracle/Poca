import type { GameState, Player, Card } from '../types/game';
import { enqueueEffect } from '../utils/queue';

export function triggerCardEffects(
  state: GameState,
  p: Player,
  card: Card,
  lane?: 'innen'|'aussen'
) {
  const name = (card as any).name ?? '';

  // Beispiel 1: Think-tank → -1 AP auf NÄCHSTE Initiative
  if (name === 'Think-tank') {
    enqueueEffect(state, { kind: 'DISCOUNT_NEXT_INITIATIVE', player: p });
    enqueueEffect(state, { kind: 'LOG', message: '[THINK-TANK] Naechste Initiative -1 AP.' });
  }

  // Beispiel 2: Bill Gates (NGO) → NÄCHSTE Initiative +1 AP Refund
  if (name === 'Bill Gates') {
    enqueueEffect(state, { kind: 'REFUND_NEXT_INITIATIVE', player: p, amount: 1 });
    enqueueEffect(state, { kind: 'LOG', message: '[BILL GATES] Naechste Initiative +1 AP Refund.' });
  }

  // Beispiel 3: Elon Musk (NGO) → NÄCHSTE Initiative +1 AP Refund (erste Initiative pro Runde)
  if (name === 'Elon Musk') {
    enqueueEffect(state, { kind: 'REFUND_NEXT_INITIATIVE', player: p, amount: 1 });
    enqueueEffect(state, { kind: 'LOG', message: '[ELON MUSK] Erste Initiative pro Runde +1 AP Refund.' });
  }

  // Weitere Karten hier sauber hinzufügen …
}

