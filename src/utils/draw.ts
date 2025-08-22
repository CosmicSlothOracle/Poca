import type { GameState, Player } from '../types/game';
import type { Card } from '../types/game'; // Card ist in game.ts definiert

export const HAND_LIMIT = 8;

/**
 * Zieht 1 Karte für Spieler p vom Deck auf die Hand – falls möglich.
 * Rückgabe: true wenn gezogen, sonst false (Hand voll / Deck leer).
 * Achtung: Wir ziehen vom Ende (pop). Falls eure Deck-Top vorne liegt, auf shift() umstellen.
 */
export function drawOne(state: GameState, p: Player, log: (m: string) => void): boolean {
  const hand = state.hands[p];
  const deck = state.decks[p];

  if (hand.length >= HAND_LIMIT) {
    log(`✋ P${p}: Handlimit (${HAND_LIMIT}) erreicht – keine Karte nachgezogen.`);
    return false;
  }

  if (!deck || deck.length === 0) {
    log(`🪙 P${p}: Deck leer – keine Karte nachgezogen.`);
    return false;
  }

  // Standard: oberste/letzte Karte vom Deck nehmen
  const drawn = deck.pop() as Card | undefined;
  if (!drawn) {
    log(`📭 P${p}: Deck leer – keine Karte nachgezogen.`);
    return false;
  }

  hand.push(drawn);
  const count = hand.length;
  // defensiver Fallback, falls Test eine "kaputte" Karte injiziert
  const displayName = (drawn as any).name ?? (drawn as any).key ?? 'Unbenannte Karte';
  log(`🃏 P${p} zieht ${displayName} (${count}/${HAND_LIMIT}).`);
  return true;
}
