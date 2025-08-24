import { getCardActionPointCost, START_AP, MAX_AP, getNetApCost } from './ap';
import { GameState, Card, createDefaultEffectFlags } from '../types/game';

describe('Central AP System', () => {
  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    decks: { 1: [], 2: [] },
    hands: { 1: [], 2: [] },
    traps: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
    permanentSlots: { 1: { government: null, public: null }, 2: { government: null, public: null } },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
        effectFlags: {
      1: createDefaultEffectFlags(),
      2: createDefaultEffectFlags()
    },
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

  describe('Basic AP Costs', () => {
    it('should return 1 AP for government cards', () => {
      const state = createMockState();
      const card = createMockCard('pol');

      const result = getCardActionPointCost(state, 1, card);

      expect(result.cost).toBe(1);
    });

    it('should return 1 AP for initiative cards', () => {
      const state = createMockState();
      const card = createMockCard('spec', 'Sofort-Initiative');

      const result = getCardActionPointCost(state, 1, card);

      expect(result.cost).toBe(1);
      expect(result.reasons).toContain('base:initiative');
    });

    it('should return 1 AP for public cards', () => {
      const state = createMockState();
      const card = createMockCard('spec', 'Öffentlichkeitskarte');

      const result = getCardActionPointCost(state, 1, card);

      expect(result.cost).toBe(1);
      expect(result.reasons).toContain('base:public');
    });
  });

  describe('Greta Thunberg Aura', () => {
        it('should make government cards cost 0 AP when Greta is in government', () => {
      const greta = createMockCard('pol', undefined, 'Greta Thunberg');
      const state = createMockState({
        board: {
          1: { innen: [], aussen: [greta], sofort: [] },
          2: { innen: [], aussen: [], sofort: [] }
        }
      });
      const govCard = createMockCard('pol');

      const result = getCardActionPointCost(state, 1, govCard);

      expect(result.cost).toBe(0);
      expect(result.reasons).toContain('Greta: Regierung 0 AP');
    });

    it('should not affect non-government cards', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const state = createMockState({
        board: {
          1: { innen: [greta], aussen: [], sofort: [] },
          2: { innen: [], aussen: [], sofort: [] }
        }
      });
      const initiative = createMockCard('spec', 'Sofort-Initiative');

      const result = getCardActionPointCost(state, 1, initiative);

      expect(result.cost).toBe(1);
      expect(result.reasons).not.toContain('aura:greta_zero_cost');
    });

    it('should only affect cards for player with Greta', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const state = createMockState({
        board: {
          1: { innen: [greta], aussen: [], sofort: [] },
          2: { innen: [], aussen: [], sofort: [] }
        }
      });
      const govCard = createMockCard('pol');

      // Player 1 (has Greta) -> 0 AP
      const result1 = getCardActionPointCost(state, 1, govCard);
      expect(result1.cost).toBe(0);

      // Player 2 (no Greta) -> 1 AP
      const result2 = getCardActionPointCost(state, 2, govCard);
      expect(result2.cost).toBe(1);
    });
  });

  describe('Initiative Discount Flags', () => {
        it('should reduce initiative cost by 1 with nextInitiativeMinus1 flag', () => {
      const state = createMockState();
      state.effectFlags[1].nextInitiativeMinus1 = true;
      const initiative = createMockCard('spec', 'Sofort-Initiative');

      const result = getCardActionPointCost(state, 1, initiative);

      expect(result.cost).toBe(0);
      expect(result.reasons.some(r => r.includes('Initiative-Rabatt −1 AP'))).toBe(true);
    });

    it('should reduce initiative cost by 1 with nextInitiativeDiscounted flag', () => {
      const state = createMockState({
        effectFlags: {
          1: { nextInitiativeDiscounted: true } as any,
          2: {} as any
        }
      });
      const initiative = createMockCard('spec', 'Sofort-Initiative');

      const result = getCardActionPointCost(state, 1, initiative);

      expect(result.cost).toBe(0);
      expect(result.reasons).toContain('flag:next_initiative_minus_1');
    });

    it('should not affect non-initiative cards', () => {
      const state = createMockState({
        effectFlags: {
          1: { nextInitiativeMinus1: true } as any,
          2: {} as any
        }
      });
      const govCard = createMockCard('pol');

      const result = getCardActionPointCost(state, 1, govCard);

      expect(result.cost).toBe(1);
      expect(result.reasons).not.toContain('flag:next_initiative_minus_1');
    });

    it('should ensure cost never goes below 0', () => {
      const state = createMockState({
        effectFlags: {
          1: { nextInitiativeMinus1: true } as any,
          2: {} as any
        }
      });
      const initiative = createMockCard('spec', 'Sofort-Initiative');

      const result = getCardActionPointCost(state, 1, initiative);

      expect(result.cost).toBe(0);
      expect(result.cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Combined Effects', () => {
    it('should combine Greta aura and initiative discount correctly', () => {
      const greta = createMockCard('spec', 'Öffentlichkeitskarte', 'Greta Thunberg');
      const state = createMockState({
        board: {
          1: { innen: [greta], aussen: [], sofort: [] },
          2: { innen: [], aussen: [], sofort: [] }
        },
        effectFlags: {
          1: { nextInitiativeMinus1: true } as any,
          2: {} as any
        }
      });

      // Government card with Greta -> 0 AP (Greta effect)
      const govCard = createMockCard('pol');
      const govResult = getCardActionPointCost(state, 1, govCard);
      expect(govResult.cost).toBe(0);
      expect(govResult.reasons).toContain('aura:greta_zero_cost');

      // Initiative with discount -> 0 AP (discount effect)
      const initiative = createMockCard('spec', 'Sofort-Initiative');
      const initResult = getCardActionPointCost(state, 1, initiative);
      expect(initResult.cost).toBe(0);
      expect(initResult.reasons).toContain('flag:next_initiative_minus_1');
    });
  });

  describe('Constants', () => {
    it('should have correct AP constants', () => {
      expect(START_AP).toBe(2);
      expect(MAX_AP).toBe(4);
    });
  });

  describe('Zero Net AP Plays', () => {
    it('does not consume actions on net zero play', () => {
      const s = createMockState({
        actionPoints: { 1: 2, 2: 2 },
        actionsUsed: { 1: 0, 2: 0 }
      });

      // Greta-Refund aktiv
      s.effectFlags[1].govRefundAvailable = true;

      const card = createMockCard('pol', undefined, 'Karl Rove'); // Regierungskarte
      const { net } = getNetApCost(s, 1, card);

      // Mit Greta-Refund sollte eine Regierungskarte netto 0 kosten
      expect(net).toBe(0);

      // Simulate booking logic: Actions only consumed when net > 0
      const before = s.actionsUsed[1];
      if (net > 0) s.actionsUsed[1] += 1;

      // Actions should remain unchanged for net-0 plays
      expect(s.actionsUsed[1]).toBe(before);
    });

    it('allows unlimited zero-net plays after action limit reached', () => {
      const s = createMockState({
        actionPoints: { 1: 2, 2: 2 },
        actionsUsed: { 1: 2, 2: 0 } // Player 1 has used max actions
      });

      // Greta-Refund still active
      s.effectFlags[1].govRefundAvailable = true;

      const card = createMockCard('pol', undefined, 'Angela Merkel');
      const { net } = getNetApCost(s, 1, card);

      expect(net).toBe(0);

      // Even with 2/2 actions used, zero-net plays should still be allowed
      const canPlayZeroNet = s.actionsUsed[1] >= 2 ? net === 0 : true;
      expect(canPlayZeroNet).toBe(true);
    });

    it('blocks non-zero plays after action limit reached', () => {
      const s = createMockState({
        actionPoints: { 1: 2, 2: 2 },
        actionsUsed: { 1: 2, 2: 0 } // Player 1 has used max actions
      });

      // No refund available
      s.effectFlags[1].govRefundAvailable = false;

      const card = createMockCard('pol', undefined, 'Boris Johnson');
      const { net } = getNetApCost(s, 1, card);

      expect(net).toBe(1); // Normal 1 AP cost

      // With 2/2 actions used and no zero-net, should not be playable
      const canPlay = s.actionsUsed[1] < 2 || net === 0;
      expect(canPlay).toBe(false);
    });

    it('consumes actions for positive net cost', () => {
      const s = createMockState({
        actionPoints: { 1: 2, 2: 2 },
        actionsUsed: { 1: 0, 2: 0 }
      });

      // No refunds available
      s.effectFlags[1].govRefundAvailable = false;

      const card = createMockCard('pol', undefined, 'Vladimir Putin');
      const { net } = getNetApCost(s, 1, card);

      expect(net).toBe(1); // Normal cost

      // Simulate booking: Actions consumed for net > 0
      const before = s.actionsUsed[1];
      if (net > 0) s.actionsUsed[1] += 1;

      expect(s.actionsUsed[1]).toBe(before + 1);
    });
  });
});
