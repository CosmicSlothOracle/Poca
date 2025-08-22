// Unified tag system for both public and government cards
export const CARD_TAGS = {
  // Public categories
  PUBLIC: {
    OLIGARCH: 'oligarch',
    PLATFORM: 'plattform',
    MOVEMENT: 'bewegung',
    NGO: 'ngo',
    INTELLIGENCE: 'intelligenz',
    MEDIA: 'medien'
  },
  // Government keywords
  GOVERNMENT: {
    LEADERSHIP: 'leadership',
    DIPLOMAT: 'diplomat'
  }
} as const;

// Type-safe tag types
export type PublicTag = typeof CARD_TAGS.PUBLIC[keyof typeof CARD_TAGS.PUBLIC];
export type GovernmentTag = typeof CARD_TAGS.GOVERNMENT[keyof typeof CARD_TAGS.GOVERNMENT];

// All possible tags
export type CardTag = PublicTag | GovernmentTag;
