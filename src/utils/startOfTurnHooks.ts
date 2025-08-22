import { GameState, Player, createDefaultEffectFlags, PoliticianCard } from '../types/game';
import {
  isMovement,
  isPlatform,
  hasLeadership,
  isDiplomat
} from './traits';
import { CARD_TAGS } from '../constants/tags';

/**
 * Applies start-of-turn hooks for a player using the new tag-based system
 *
 * Goals:
 * - Reset per-turn flags and refunds
 * - Set tag-based effect availability based on board state
 * - Use efficient tag lookups instead of hardcoded names
 */
export function applyStartOfTurnHooks(state: GameState, player: Player, log: (m: string) => void) {
  const f = state.effectFlags[player];
  const board = state.board[player];
  const allCards = [...board.innen, ...board.aussen];

  // Reset per-turn flags
  f.govRefundAvailable = false;
  f.nextInitiativeRefund = 0;
  f.freeInitiativeAvailable = false;
  f.diplomatInfluenceTransferUsed = false;
  f.ngoInitiativeDiscount = 0;

  // Reset action counters
  state.actionsUsed[player] = 0;
  f.nextInitiativeDiscounted = false;

  // Tag-based effect detection (efficient O(n) scan)
  const publicCards = allCards.filter(card => card.kind === 'spec' && (card as any).type === 'Öffentlichkeitskarte');
  const governmentCards = allCards.filter(card => card.kind === 'pol');

  // Movement cards: First government card → +1 AP refund
  if (publicCards.some(isMovement)) {
    f.govRefundAvailable = true;
    log('🌱 Bewegung aktiv: Erste Regierungskarte dieses Zuges gibt +1 AP zurück.');
  }

  // Platform cards: Initiative discount (if implemented)
  if (publicCards.some(isPlatform)) {
    // f.platformInitiativeDiscount = 1; // Future: platform initiative discount
    log('🛰️ Plattform aktiv: Initiative-Rabatt verfügbar.');
  }

  // Leadership cards: Free initiative available
  if (governmentCards.some(hasLeadership)) {
    f.freeInitiativeAvailable = true;
    log('🎖️ Leadership aktiv: Kostenlose Initiative verfügbar.');
  }

  // Diplomat cards: Influence transfer available
  if (governmentCards.some(isDiplomat)) {
    log('🤝 Diplomat aktiv: Einfluss-Transfer verfügbar.');
  }

  // NGO cards: Initiative discount (if implemented)
  const ngoCards = publicCards.filter(card =>
    ['Bill Gates', 'George Soros'].includes(card.name)
  );
  if (ngoCards.length > 0) {
    // f.ngoInitiativeDiscount = ngoCards.length; // Future: NGO initiative discount
    log(`🏛️ NGO aktiv: ${ngoCards.length} Initiative-Rabatt(e) verfügbar.`);
  }
}
