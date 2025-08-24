import { isInstantInitiative } from '../tags';
import { Card } from '../../types/game';

describe('tags utility', () => {
  describe('isInstantInitiative', () => {
    it('should return true for Sofort-Initiative cards', () => {
      const card: Card = {
        id: 1,
        key: 'test',
        name: 'Test Initiative',
        kind: 'spec',
        baseId: 1,
        uid: 1,
        type: 'Sofort-Initiative',
        bp: 2,
        impl: 'test'
      };

      expect(isInstantInitiative(card)).toBe(true);
    });

    it('should return false for Dauerhaft-Initiative cards', () => {
      const card: Card = {
        id: 1,
        key: 'test',
        name: 'Test Initiative',
        kind: 'spec',
        baseId: 1,
        uid: 1,
        type: 'Dauerhaft-Initiative',
        bp: 2,
        impl: 'test'
      };

      expect(isInstantInitiative(card)).toBe(false);
    });

    it('should return false for politician cards', () => {
      const card: Card = {
        id: 1,
        key: 'test',
        name: 'Test Politician',
        kind: 'pol',
        baseId: 1,
        uid: 1,
        tag: 'test',
        T: 1,
        BP: 1,
        influence: 1,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false
      };

      expect(isInstantInitiative(card)).toBe(false);
    });

    it('should return false for null/undefined cards', () => {
      expect(isInstantInitiative(null as any)).toBe(false);
      expect(isInstantInitiative(undefined as any)).toBe(false);
    });

    it('should handle case-insensitive type matching', () => {
      const card: Card = {
        id: 1,
        key: 'test',
        name: 'Test Initiative',
        kind: 'spec',
        baseId: 1,
        uid: 1,
        type: 'SOFORT-INITIATIVE',
        bp: 2,
        impl: 'test'
      };

      expect(isInstantInitiative(card)).toBe(true);
    });

    it('should return false for cards without type', () => {
      const card: Card = {
        id: 1,
        key: 'test',
        name: 'Test Card',
        kind: 'spec',
        baseId: 1,
        uid: 1,
        bp: 2,
        impl: 'test'
      };

      expect(isInstantInitiative(card)).toBe(false);
    });
  });
});
