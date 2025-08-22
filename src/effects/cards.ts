import type { GameState, Player, Card } from '../types/game';
import { enqueueEffect } from '../utils/queue';

// Helper functions for on-play effects
const other = (p: Player): Player => (p === 1 ? 2 : 1) as Player;
const isPol = (c: Card): c is any => c && c.kind === 'pol';

function strongestGovCard(state: GameState, p: Player): any | undefined {
  const gov = state.board[p].aussen.filter(isPol).filter(c => !c.deactivated);
  if (gov.length === 0) return undefined;
  return gov.reduce((a, b) => (a.influence >= b.influence ? a : b));
}

function inPublicIsPlatformOrAI(c: Card): boolean {
  const raw = (c as any).tag ?? (c as any).tags ?? [];
  const tags: string[] = Array.isArray(raw) ? raw : [raw];
  return tags.some(t => /plattform|platform|intelligenz|ki|ai/i.test(String(t)));
}

export function triggerCardEffects(
  state: GameState,
  p: Player,
  card: Card,
  lane?: 'innen'|'aussen'
) {
  const name = (card as any).name ?? '';
  const key = (card as any).key ?? card.name;

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

  // 🔧 NEU: On-Play Immediate Effects
  switch (key) {
    case 'jack_ma':
    case 'Jack Ma': {
      enqueueEffect(state, { kind: 'DRAW_CARDS', player: p, count: 1 });
      enqueueEffect(state, { kind: 'LOG', message: '[JACK MA] +1 Karte gezogen.' });
      break;
    }

    case 'oprah_winfrey':
    case 'Oprah Winfrey': {
      enqueueEffect(state, { kind: 'DISCARD_RANDOM_FROM_HAND', player: p });
      enqueueEffect(state, { kind: 'DISCARD_RANDOM_FROM_HAND', player: other(p) });
      enqueueEffect(state, { kind: 'LOG', message: '[OPRAH WINFREY] Beide Spieler verlieren eine zufällige Handkarte.' });
      break;
    }

    case 'algorithmischer_diskurs':
    case 'Algorithmischer Diskurs': {
      // Für jeden Spieler separat zählen und anwenden
      [1, 2].forEach((pp) => {
        const publicRow = state.board[pp as Player].innen;
        const n = publicRow.filter(inPublicIsPlatformOrAI).length;
        if (n > 0) {
          const target = strongestGovCard(state, pp as Player);
          if (target) {
            enqueueEffect(state, {
              kind: 'ADJUST_INFLUENCE',
              player: pp as Player,
              targetCard: target,
              delta: -n,
              source: `Algorithmischer Diskurs (${n} Plattform/KI in Öffentlichkeit)`
            });
          }
        }
      });
      enqueueEffect(state, { kind: 'LOG', message: '[ALGORITHMISCHER DISKURS] Einfluss-Reduktion basierend auf Plattform/KI-Karten.' });
      break;
    }

    case 'opportunist':
    case 'Opportunist': {
      enqueueEffect(state, { kind: 'SET_FLAG', player: p, path: 'opportunistActive', value: true });
      enqueueEffect(state, { kind: 'LOG', message: '[OPPORTUNIST] Einfluss-Boni des Gegners werden gespiegelt.' });
      break;
    }

    case 'spin_doctor':
    case 'Spin Doctor': {
      const target = strongestGovCard(state, p);
      if (target) {
        enqueueEffect(state, {
          kind: 'ADJUST_INFLUENCE',
          player: p,
          targetCard: target,
          delta: 1,
          source: 'Spin Doctor'
        });
      }
      enqueueEffect(state, { kind: 'LOG', message: '[SPIN DOCTOR] +1 Einfluss auf stärkste Regierungskarte.' });
      break;
    }

    case 'verzoegerungsverfahren':
    case 'Verzögerungsverfahren': {
      enqueueEffect(state, { kind: 'ADD_AP', player: p, amount: 1 });
      enqueueEffect(state, { kind: 'LOG', message: '[VERZÖGERUNGSVERFAHREN] +1 AP erhalten.' });
      break;
    }

    default:
      // nichts
      break;
  }

  // Weitere Karten hier sauber hinzufügen …
}

