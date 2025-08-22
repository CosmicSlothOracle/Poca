import { hasPlayableZeroCost } from './useGameActions';
import { getCardActionPointCost } from '../utils/ap';
import { GameState, Card } from '../types/game';

describe('0-AP System', () => {
  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    decks: { 1: [], 2: [] },
    hands: { 1: [], 2: [] },
    traps: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [] }, 2: { innen: [], aussen: [] } },
    permanentSlots: { 1: { government: null, public: null }, 2: { government: null, public: null } },
    instantSlot: { 1: null, 2: null },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    effectFlags: { 1: {}, 2: {} } as any,
    shields: new Set(),
    ...overrides
  });

  const createMockCard = (kind: 'pol' | 'spec', type?: string, name?: string): Card => ({
    id: 1,
    key: 'test_card',
    name: name || 'Test Card',
    kind,
    baseId: 1,
    uid: 1,
    type
  } as any);

  describe('hasPlayableZeroCost', () => {
    it('should return false when no cards in hand', () => {
      const state = createMockState();

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(false);
    });

    it('should return false when no zero-cost cards in hand', () => {
      const normalCard = createMockCard('pol');
      const state = createMockState({
        hands: { 1: [normalCard], 2: [] }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(false);
    });

    it('should return true when Greta makes government cards free', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const govCard = createMockCard('pol');
      const state = createMockState({
        hands: { 1: [govCard], 2: [] },
        board: {
          1: { innen: [greta], aussen: [] },
          2: { innen: [], aussen: [] }
        }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(true);
    });

    it('should return true when initiative discount makes initiatives free', () => {
      const initiative = createMockCard('spec', 'Sofort-Initiative');
      const state = createMockState({
        hands: { 1: [initiative], 2: [] },
        effectFlags: {
          1: { nextInitiativeMinus1: true } as any,
          2: {} as any
        }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(true);
    });

    it('should return false when zero-cost cards cannot be played (full lanes)', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const govCard = createMockCard('pol');
      // Fill government lane (aussen)
      const fullLane = Array(5).fill(createMockCard('pol'));
      const state = createMockState({
        hands: { 1: [govCard], 2: [] },
        board: {
          1: { innen: [greta], aussen: fullLane },
          2: { innen: [], aussen: [] }
        }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(false);
    });

    it('should return true when zero-cost cards can still be played in available lanes', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const publicGovCard = createMockCard('pol'); // würde normalerweise innen gehen
      const state = createMockState({
        hands: { 1: [publicGovCard], 2: [] },
        board: {
          1: { innen: [greta], aussen: [] }, // innen hat noch Platz (4/5)
          2: { innen: [], aussen: [] }
        }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(true);
    });
  });

  describe('Integration: Action Consumption', () => {
    it('should verify that 0-cost cards get actionDelta = 0', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const govCard = createMockCard('pol');
      const state = createMockState({
        board: {
          1: { innen: [greta], aussen: [] },
          2: { innen: [], aussen: [] }
        }
      });

      const { cost } = getCardActionPointCost(state, 1, govCard);
      const actionDelta = cost > 0 ? 1 : 0;

      expect(cost).toBe(0);
      expect(actionDelta).toBe(0);
    });

    it('should verify that normal cards get actionDelta = 1', () => {
      const govCard = createMockCard('pol');
      const state = createMockState();

      const { cost } = getCardActionPointCost(state, 1, govCard);
      const actionDelta = cost > 0 ? 1 : 0;

      expect(cost).toBe(1);
      expect(actionDelta).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle player with no effectFlags', () => {
      const initiative = createMockCard('spec', 'Sofort-Initiative');
      const state = createMockState({
        hands: { 1: [initiative], 2: [] },
        effectFlags: undefined as any
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(false);
    });

    it('should handle deactivated cards correctly', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const deactivatedGovCard = { ...createMockCard('pol'), deactivated: true };
      const state = createMockState({
        hands: { 1: [deactivatedGovCard], 2: [] },
        board: {
          1: { innen: [greta], aussen: [] },
          2: { innen: [], aussen: [] }
        }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(false);
    });

    it('should handle multiple zero-cost options', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const govCard1 = createMockCard('pol', undefined, 'Politician 1');
      const govCard2 = createMockCard('pol', undefined, 'Politician 2');
      const state = createMockState({
        hands: { 1: [govCard1, govCard2], 2: [] },
        board: {
          1: { innen: [greta], aussen: [] },
          2: { innen: [], aussen: [] }
        }
      });

      const result = hasPlayableZeroCost(state, 1);

      expect(result).toBe(true);
    });
  });
});
