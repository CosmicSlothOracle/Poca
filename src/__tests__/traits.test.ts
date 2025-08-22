import { Card, PoliticianCard, SpecialCard } from '../types/game';
import {
  isMovement,
  isPlatform,
  isNGO,
  hasLeadership,
  isDiplomat,
  getCardsWithTag,
  countCardsWithTag
} from '../utils/traits';
import { CARD_TAGS } from '../constants/tags';
import { getCardTags, hasPublicTag, hasGovernmentTag } from '../data/tagIndex';

// Mock card data for testing
const createMockCard = (name: string, kind: 'pol' | 'spec', type?: string): Card => ({
  id: 1,
  key: name.toLowerCase().replace(/\s+/g, '_'),
  name,
  kind,
  baseId: 1,
  uid: 1,
  ...(kind === 'spec' && { type: type || 'Öffentlichkeitskarte' } as Partial<SpecialCard>),
  ...(kind === 'pol' && {
    tag: 'Test',
    T: 1,
    BP: 1,
    influence: 1,
    protected: false,
    deactivated: false,
    tempDebuffs: 0,
    tempBuffs: 0,
    _activeUsed: false
  } as Partial<PoliticianCard>)
});

describe('Tag-based Trait System', () => {
  describe('Tag Registry', () => {
    it('should correctly identify Elon Musk as oligarch and platform', () => {
      const tags = getCardTags('Elon Musk');
      expect(tags.public).toContain(CARD_TAGS.PUBLIC.OLIGARCH);
      expect(tags.public).toContain(CARD_TAGS.PUBLIC.PLATFORM);
      expect(tags.government).toBeUndefined();
    });

    it('should correctly identify Greta Thunberg as movement', () => {
      const tags = getCardTags('Greta Thunberg');
      expect(tags.public).toContain(CARD_TAGS.PUBLIC.MOVEMENT);
      expect(tags.government).toBeUndefined();
    });

    it('should correctly identify Justin Trudeau as leadership', () => {
      const tags = getCardTags('Justin Trudeau');
      expect(tags.government).toContain(CARD_TAGS.GOVERNMENT.LEADERSHIP);
      expect(tags.public).toBeUndefined();
    });

    it('should correctly identify Joschka Fischer as diplomat', () => {
      const tags = getCardTags('Joschka Fischer');
      expect(tags.government).toContain(CARD_TAGS.GOVERNMENT.DIPLOMAT);
      expect(tags.public).toBeUndefined();
    });

    it('should return empty object for unknown cards', () => {
      const tags = getCardTags('Unknown Card');
      expect(tags).toEqual({});
    });
  });

  describe('Trait Functions', () => {
    it('should identify movement cards correctly', () => {
      const greta = createMockCard('Greta Thunberg', 'spec', 'Öffentlichkeitskarte');
      const elon = createMockCard('Elon Musk', 'spec', 'Öffentlichkeitskarte');

      expect(isMovement(greta)).toBe(true);
      expect(isMovement(elon)).toBe(false);
    });

    it('should identify platform cards correctly', () => {
      const elon = createMockCard('Elon Musk', 'spec', 'Öffentlichkeitskarte');
      const mark = createMockCard('Mark Zuckerberg', 'spec', 'Öffentlichkeitskarte');
      const greta = createMockCard('Greta Thunberg', 'spec', 'Öffentlichkeitskarte');

      expect(isPlatform(elon)).toBe(true);
      expect(isPlatform(mark)).toBe(true);
      expect(isPlatform(greta)).toBe(false);
    });

    it('should identify NGO cards correctly', () => {
      const bill = createMockCard('Bill Gates', 'spec', 'Öffentlichkeitskarte');
      const george = createMockCard('George Soros', 'spec', 'Öffentlichkeitskarte');
      const elon = createMockCard('Elon Musk', 'spec', 'Öffentlichkeitskarte');

      expect(isNGO(bill)).toBe(true);
      expect(isNGO(george)).toBe(true);
      expect(isNGO(elon)).toBe(false);
    });

    it('should identify leadership cards correctly', () => {
      const justin = createMockCard('Justin Trudeau', 'pol');
      const emmanuel = createMockCard('Emmanuel Macron', 'pol');
      const greta = createMockCard('Greta Thunberg', 'spec', 'Öffentlichkeitskarte');

      expect(hasLeadership(justin)).toBe(true);
      expect(hasLeadership(emmanuel)).toBe(true);
      expect(hasLeadership(greta)).toBe(false);
    });

    it('should identify diplomat cards correctly', () => {
      const joschka = createMockCard('Joschka Fischer', 'pol');
      const ursula = createMockCard('Ursula von der Leyen', 'pol');
      const justin = createMockCard('Justin Trudeau', 'pol');

      expect(isDiplomat(joschka)).toBe(true);
      expect(isDiplomat(ursula)).toBe(true);
      expect(isDiplomat(justin)).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should filter cards by tag correctly', () => {
      const cards = [
        createMockCard('Greta Thunberg', 'spec', 'Öffentlichkeitskarte'),
        createMockCard('Elon Musk', 'spec', 'Öffentlichkeitskarte'),
        createMockCard('Justin Trudeau', 'pol'),
        createMockCard('Unknown Card', 'pol')
      ];

      const movementCards = getCardsWithTag(cards, CARD_TAGS.PUBLIC.MOVEMENT);
      expect(movementCards).toHaveLength(1);
      expect(movementCards[0].name).toBe('Greta Thunberg');

      const platformCards = getCardsWithTag(cards, CARD_TAGS.PUBLIC.PLATFORM);
      expect(platformCards).toHaveLength(1);
      expect(platformCards[0].name).toBe('Elon Musk');

      const leadershipCards = getCardsWithTag(cards, CARD_TAGS.GOVERNMENT.LEADERSHIP);
      expect(leadershipCards).toHaveLength(1);
      expect(leadershipCards[0].name).toBe('Justin Trudeau');
    });

    it('should count cards by tag correctly', () => {
      const cards = [
        createMockCard('Greta Thunberg', 'spec', 'Öffentlichkeitskarte'),
        createMockCard('Malala Yousafzai', 'spec', 'Öffentlichkeitskarte'),
        createMockCard('Elon Musk', 'spec', 'Öffentlichkeitskarte'),
        createMockCard('Mark Zuckerberg', 'spec', 'Öffentlichkeitskarte')
      ];

      expect(countCardsWithTag(cards, CARD_TAGS.PUBLIC.MOVEMENT)).toBe(2);
      expect(countCardsWithTag(cards, CARD_TAGS.PUBLIC.PLATFORM)).toBe(2);
      expect(countCardsWithTag(cards, CARD_TAGS.PUBLIC.OLIGARCH)).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle large card arrays efficiently', () => {
      const cards = Array.from({ length: 1000 }, (_, i) =>
        createMockCard(`Card ${i}`, 'pol')
      );

      // Add some tagged cards
      cards[0] = createMockCard('Greta Thunberg', 'spec', 'Öffentlichkeitskarte');
      cards[1] = createMockCard('Elon Musk', 'spec', 'Öffentlichkeitskarte');

      const start = performance.now();
      const movementCards = getCardsWithTag(cards, CARD_TAGS.PUBLIC.MOVEMENT);
      const end = performance.now();

      expect(movementCards).toHaveLength(1);
      expect(end - start).toBeLessThan(10); // Should complete in < 10ms
    });
  });
});
