import { sumGovernmentInfluenceWithAuras } from '../utils/gameUtils';

describe('Cluster 3: Spezielle Initiative-Boni', () => {
  let mockState;

  beforeEach(() => {
    mockState = {
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      actionPoints: { 1: 2, 2: 2 },
      actionsUsed: { 1: 0, 2: 0 },
      decks: { 1: [], 2: [] },
      hands: { 1: [], 2: [] },
      traps: { 1: [], 2: [] },
      board: {
        1: { innen: [], aussen: [] },
        2: { innen: [], aussen: [] },
      },
      permanentSlots: {
        1: { government: null, public: null },
        2: { government: null, public: null },
      },
      instantSlot: {
        1: null,
        2: null,
      },
      discard: [],
      log: [],
      activeRefresh: { 1: 0, 2: 0 },
      roundsWon: { 1: 0, 2: 0 },
      gameWinner: null,
      effectFlags: {
        1: {
          freeInitiativeAvailable: false,
          platformRefundAvailable: false,
          platformRefundUsed: false,
          ngoInitiativeDiscount: 0,
          platformInitiativeDiscount: 0,
          diplomatInfluenceTransferUsed: false,
          influenceTransferBlocked: false,
          nextGovPlus2: false,
          nextGovernmentCardBonus: 0,
          nextInitiativeDiscounted: false,
          nextInitiativeMinus1: false,
          nextInitiativeRefund: 0,
          govRefundAvailable: false,
          publicEffectDoubled: false,
          cannotPlayInitiatives: false,
          nextCardProtected: false,
          platformAfterInitiativeBonus: false,
          interventionEffectReduced: false,
          opportunistActive: false,
          markZuckerbergUsed: false,
          // Cluster 3 Flags
          scienceInitiativeBonus: false,
          militaryInitiativePenalty: false,
          healthInitiativeBonus: false,
          cultureInitiativeBonus: false,
        },
        2: {
          freeInitiativeAvailable: false,
          platformRefundAvailable: false,
          platformRefundUsed: false,
          ngoInitiativeDiscount: 0,
          platformInitiativeDiscount: 0,
          diplomatInfluenceTransferUsed: false,
          influenceTransferBlocked: false,
          nextGovPlus2: false,
          nextGovernmentCardBonus: 0,
          nextInitiativeDiscounted: false,
          nextInitiativeMinus1: false,
          nextInitiativeRefund: 0,
          govRefundAvailable: false,
          publicEffectDoubled: false,
          cannotPlayInitiatives: false,
          nextCardProtected: false,
          platformAfterInitiativeBonus: false,
          interventionEffectReduced: false,
          opportunistActive: false,
          markZuckerbergUsed: false,
          // Cluster 3 Flags
          scienceInitiativeBonus: false,
          militaryInitiativePenalty: false,
          healthInitiativeBonus: false,
          cultureInitiativeBonus: false,
        }
      },
      effectQueue: { items: [], processing: false, nextId: 1 },
      activeAbilities: { 1: [], 2: [] },
      pendingAbilitySelect: undefined,
      aiEnabled: { 1: false, 2: false },
    };
  });

  describe('Jennifer Doudna - Wissenschaft Initiative Bonus', () => {
    it('should give +1 influence when scienceInitiativeBonus flag is active', () => {
      // Setup: Player 1 has a government card and scienceInitiativeBonus flag
      mockState.board[1].aussen = [{
        id: 1,
        key: 'test_gov',
        name: 'Test Government',
        kind: 'pol',
        baseId: 1,
        uid: 1,
        tag: 'Test',
        T: 1,
        BP: 5,
        influence: 5,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false,
      }];

      mockState.effectFlags[1].scienceInitiativeBonus = true;

      const influence = sumGovernmentInfluenceWithAuras(mockState, 1);
      expect(influence).toBe(6); // Base 5 + 1 bonus
    });

    it('should not give bonus when flag is inactive', () => {
      // Setup: Player 1 has a government card but no scienceInitiativeBonus flag
      mockState.board[1].aussen = [{
        id: 1,
        key: 'test_gov',
        name: 'Test Government',
        kind: 'pol',
        baseId: 1,
        uid: 1,
        tag: 'Test',
        T: 1,
        BP: 5,
        influence: 5,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false,
      }];

      mockState.effectFlags[1].scienceInitiativeBonus = false;

      const influence = sumGovernmentInfluenceWithAuras(mockState, 1);
      expect(influence).toBe(5); // Base 5, no bonus
    });
  });

  describe('Anthony Fauci - Gesundheits Initiative Bonus', () => {
    it('should give +1 influence when healthInitiativeBonus flag is active', () => {
      // Setup: Player 1 has a government card and healthInitiativeBonus flag
      mockState.board[1].aussen = [{
        id: 1,
        key: 'test_gov',
        name: 'Test Government',
        kind: 'pol',
        baseId: 1,
        uid: 1,
        tag: 'Test',
        T: 1,
        BP: 5,
        influence: 5,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false,
      }];

      mockState.effectFlags[1].healthInitiativeBonus = true;

      const influence = sumGovernmentInfluenceWithAuras(mockState, 1);
      expect(influence).toBe(6); // Base 5 + 1 bonus
    });
  });

  describe('Noam Chomsky - Militär Initiative Penalty', () => {
    it('should give -1 influence when militaryInitiativePenalty flag is active', () => {
      // Setup: Player 1 has a government card and militaryInitiativePenalty flag
      mockState.board[1].aussen = [{
        id: 1,
        key: 'test_gov',
        name: 'Test Government',
        kind: 'pol',
        baseId: 1,
        uid: 1,
        tag: 'Test',
        T: 1,
        BP: 5,
        influence: 5,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false,
      }];

      mockState.effectFlags[1].militaryInitiativePenalty = true;

      const influence = sumGovernmentInfluenceWithAuras(mockState, 1);
      expect(influence).toBe(4); // Base 5 - 1 penalty
    });
  });

  describe('Multiple Cluster 3 effects', () => {
    it('should stack multiple bonuses correctly', () => {
      // Setup: Player 1 has a government card and multiple Cluster 3 flags
      mockState.board[1].aussen = [{
        id: 1,
        key: 'test_gov',
        name: 'Test Government',
        kind: 'pol',
        baseId: 1,
        uid: 1,
        tag: 'Test',
        T: 1,
        BP: 5,
        influence: 5,
        protected: false,
        deactivated: false,
        tempDebuffs: 0,
        tempBuffs: 0,
        _activeUsed: false,
      }];

      // Activate multiple bonuses
      mockState.effectFlags[1].scienceInitiativeBonus = true;
      mockState.effectFlags[1].healthInitiativeBonus = true;
      mockState.effectFlags[1].militaryInitiativePenalty = true;

      const influence = sumGovernmentInfluenceWithAuras(mockState, 1);
      expect(influence).toBe(6); // Base 5 + 1 (science) + 1 (health) - 1 (military) = 6
    });
  });
});
