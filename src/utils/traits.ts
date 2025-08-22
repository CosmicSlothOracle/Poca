import { Card, PoliticianCard, SpecialCard } from '../types/game';
import {
  getCardTags,
  hasPublicTag,
  hasGovernmentTag
} from '../data/tagIndex';
import {
  CARD_TAGS,
  PublicTag,
  GovernmentTag
} from '../constants/tags';
import { isDeactivated } from './status';

// Core card type checks (consistent with existing codebase)
export const isPublicCard = (card: Card): boolean => {
  return card.kind === 'spec' && (
    (card as SpecialCard).type === 'Öffentlichkeitskarte' ||
    /öffentlich/i.test((card as SpecialCard).type ?? '') ||
    /public/i.test((card as SpecialCard).type ?? '')
  );
};

export const isGovernmentCard = (card: Card): boolean => {
  return card.kind === 'pol';
};

export const isInitiative = (card: Card): boolean => {
  if (card.kind !== 'spec') return false;
  const spec = card as SpecialCard;
  return spec.type === 'Sofort-Initiative' || spec.type === 'Dauerhaft-Initiative';
};

// Tag-based trait checks (efficient, uses card name directly)
export function hasPublicTagByCard(card: Card, tag: PublicTag): boolean {
  return !isDeactivated(card) && hasPublicTag(card.name, tag);
}

export function hasGovernmentTagByCard(card: Card, tag: GovernmentTag): boolean {
  return !isDeactivated(card) && hasGovernmentTag(card.name, tag);
}

// Specific trait functions (for readability)
export const isOligarch = (card: Card): boolean =>
  hasPublicTagByCard(card, CARD_TAGS.PUBLIC.OLIGARCH);

export const isPlatform = (card: Card): boolean =>
  hasPublicTagByCard(card, CARD_TAGS.PUBLIC.PLATFORM);

export const isMovement = (card: Card): boolean =>
  hasPublicTagByCard(card, CARD_TAGS.PUBLIC.MOVEMENT);

export const isNGO = (card: Card): boolean =>
  hasPublicTagByCard(card, CARD_TAGS.PUBLIC.NGO);

export const isIntelligence = (card: Card): boolean =>
  hasPublicTagByCard(card, CARD_TAGS.PUBLIC.INTELLIGENCE);

export const isMedia = (card: Card): boolean =>
  hasPublicTagByCard(card, CARD_TAGS.PUBLIC.MEDIA);

export const hasLeadership = (card: Card): boolean =>
  hasGovernmentTagByCard(card, CARD_TAGS.GOVERNMENT.LEADERSHIP);

export const isDiplomat = (card: Card): boolean =>
  hasGovernmentTagByCard(card, CARD_TAGS.GOVERNMENT.DIPLOMAT);

// Utility functions for board analysis
export function getCardsWithTag(cards: Card[], tag: PublicTag | GovernmentTag): Card[] {
  return cards.filter(card => {
    // Check if tag is a public tag
    if (Object.values(CARD_TAGS.PUBLIC).includes(tag as PublicTag)) {
      return hasPublicTagByCard(card, tag as PublicTag);
    }
    // Check if tag is a government tag
    else if (Object.values(CARD_TAGS.GOVERNMENT).includes(tag as GovernmentTag)) {
      return hasGovernmentTagByCard(card, tag as GovernmentTag);
    }
    return false;
  });
}

export function countCardsWithTag(cards: Card[], tag: PublicTag | GovernmentTag): number {
  return getCardsWithTag(cards, tag).length;
}
