/**
 * Einheitliches Targeting-System
 * Zentrale Funktionen für Zielauswahl in Karteneffekten
 */

import { GameState, Player, Card, PoliticianCard } from '../types/game';

/**
 * Ermittelt die stärkste Regierungskarte eines Spielers
 * Sortierkriterium: influence absteigend, Tie-Break: UID absteigend (zuletzt gelegt)
 */
export function getStrongestGovernment(state: GameState, player: Player): PoliticianCard | undefined {
  const row = state.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
  if (!row.length) return undefined;

  // Nur aktive (nicht deaktivierte) Karten berücksichtigen
  const activeCards = row.filter(c => !c.deactivated);
  if (activeCards.length === 0) return undefined;

  // Berechne tatsächlichen Einfluss (base + buffs - debuffs)
  const scored = activeCards.map(c => ({
    card: c,
    influence: (c.influence || 0) + (c.tempBuffs || 0) - (c.tempDebuffs || 0),
    uid: c.uid
  }));

  // Sortiere: Einfluss absteigend, dann UID absteigend
  scored.sort((a, b) => {
    if (b.influence !== a.influence) {
      return b.influence - a.influence;
    }
    return b.uid - a.uid; // Höhere UID = zuletzt gelegt
  });

  return scored[0]?.card;
}

/**
 * Ermittelt die UID der stärksten Regierungskarte
 * Wrapper für getStrongestGovernment, gibt nur die UID zurück
 */
export function getStrongestGovernmentUid(state: GameState, player: Player): number | null {
  const card = getStrongestGovernment(state, player);
  return card ? card.uid : null;
}
