// Test Setup für Mandate Game
import '@testing-library/jest-dom';

// Mock für React Hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useCallback: jest.fn(),
  useEffect: jest.fn(),
}));

// Mock für console.log um Test-Output zu reduzieren
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock für Date.now() für konsistente Tests
const mockDate = new Date('2024-01-01T12:00:00.000Z');
jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

// Mock für Math.random() für deterministische Tests
jest.spyOn(Math, 'random').mockImplementation(() => 0.5);

// Mock für setTimeout
jest.useFakeTimers();

// Globale Test-Hilfsfunktionen
global.createTestGameState = () => ({
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
      diplomatInfluenceTransferUsed: false,
      influenceTransferBlocked: false,
    },
    2: {
      freeInitiativeAvailable: false,
      platformRefundAvailable: false,
      platformRefundUsed: false,
      ngoInitiativeDiscount: 0,
      diplomatInfluenceTransferUsed: false,
      influenceTransferBlocked: false,
    }
  },
  effectQueue: { items: [], processing: false, nextId: 1 },
  activeAbilities: {
    1: [],
    2: []
  },
  pendingAbilitySelect: undefined
});

// Mock für gameData
jest.mock('../data/gameData', () => ({
  Pols: [
    { id: 1, key: 'test_pol', name: 'Test Politician', influence: 5, tag: 'Leadership', T: 1, BP: 10 },
    { id: 2, key: 'test_pol2', name: 'Test Politician 2', influence: 6, tag: 'Diplomat', T: 2, BP: 12 }
  ],
  Specials: [
    { id: 1, key: 'test_spec', name: 'Test Special', type: 'Sofort-Initiative', bp: 2, effect: 'Test effect', tier: 1, impl: 'test' },
    { id: 2, key: 'test_spec2', name: 'Test Special 2', type: 'Dauerhaft-Initiative', bp: 3, effect: 'Test effect 2', tier: 2, impl: 'test2' }
  ],
  PRESET_DECKS: {
    TEST_DECK: [
      { kind: 'pol', baseId: 1, count: 2 },
      { kind: 'spec', baseId: 1, count: 1 }
    ]
  }
}));

// Mock für cardDetails
jest.mock('../data/cardDetails', () => ({
  getCardDetails: jest.fn((name: string) => ({
    name,
    type: 'Sofort-Initiative',
    slot: 'Öffentlichkeit',
    effect: 'Test effect'
  }))
}));

// Mock für gameUtils
jest.mock('../utils/gameUtils', () => ({
  sumRow: jest.fn((cards) => cards.reduce((sum, card) => sum + (card.influence || 0), 0)),
  shuffle: jest.fn((arr) => [...arr].reverse()), // Deterministic shuffle for testing
  makePolInstance: jest.fn((base) => ({
    id: base.id,
    key: base.key,
    name: base.name,
    kind: 'pol',
    baseId: base.id,
    uid: Date.now(),
    tag: base.tag,
    T: base.T,
    BP: base.BP,
    influence: base.influence,
    protected: false,
    deactivated: false,
    tempDebuffs: 0,
    tempBuffs: 0,
    _activeUsed: false
  })),
  makeSpecInstance: jest.fn((base) => ({
    id: base.id,
    key: base.key,
    name: base.name,
    kind: 'spec',
    baseId: base.id,
    uid: Date.now(),
    type: base.type,
    impl: base.impl,
    bp: base.bp
  })),
  buildDeckFromEntries: jest.fn((entries) => {
    const deck = [];
    entries.forEach(entry => {
      for (let i = 0; i < entry.count; i++) {
        if (entry.kind === 'pol') {
          deck.push({ id: entry.baseId, name: `Politician ${entry.baseId}`, kind: 'pol' });
        } else {
          deck.push({ id: entry.baseId, name: `Special ${entry.baseId}`, kind: 'spec' });
        }
      }
    });
    return deck;
  }),
  drawCards: jest.fn((player, count, state, log) => {
    const deck = [...state.decks[player]];
    const hand = [...state.hands[player]];
    const drawn = deck.splice(0, Math.min(count, deck.length));
    hand.push(...drawn);
    log(`P${player} zieht ${drawn.length} Karte(n)`);
    return {
      newHands: { ...state.hands, [player]: hand },
      newDecks: { ...state.decks, [player]: deck }
    };
  }),
  drawCardsAtRoundEnd: jest.fn((state, log) => {
    let newHands = { ...state.hands };
    let newDecks = { ...state.decks };
    [1, 2].forEach(player => {
      const targetHandSize = 5;
      const currentHandSize = newHands[player].length;
      const drawCount = Math.max(0, targetHandSize - currentHandSize);
      if (drawCount > 0) {
        const result = require('../utils/gameUtils').drawCards(player, drawCount, { ...state, hands: newHands, decks: newDecks }, log);
        newHands = result.newHands;
        newDecks = result.newDecks;
      }
    });
    return { newHands, newDecks };
  }),
  tryApplyNegativeEffect: jest.fn((card, effect, round) => {
    if (card.protected) {
      card.protected = false;
      return false;
    }
    effect();
    return true;
  }),
  adjustInfluence: jest.fn((card, amount, source) => {
    card.influence += amount;
  }),
  findCardLocation: jest.fn((card, state) => {
    for (const player of [1, 2]) {
      for (const lane of ['innen', 'aussen']) {
        const index = state.board[player][lane].findIndex(c => c.uid === card.uid);
        if (index !== -1) {
          return { player, lane, index };
        }
      }
    }
    return null;
  }),
  getAllowedLaneForCard: jest.fn((card) => {
    if (card.tag === 'Staatsoberhaupt' || card.tag === 'Regierungschef' || card.tag === 'Diplomat') {
      return 'aussen';
    }
    return 'innen';
  }),
  isLaneAllowedForCard: jest.fn((card, lane) => {
    const allowedLane = require('../utils/gameUtils').getAllowedLaneForCard(card);
    return allowedLane === lane;
  }),
  getCardActionPointCost: jest.fn((card, state, player) => {
    // Mock implementation for testing
    return 1;
  }),
  EffectQueueManager: {
    initializeQueue: jest.fn(() => ({ items: [], processing: false, nextId: 1 })),
    addEffect: jest.fn((queue, effect) => ({
      ...queue,
      items: [...queue.items, { ...effect, id: queue.nextId }],
      nextId: queue.nextId + 1
    })),
    processQueue: jest.fn((queue, state, log) => [queue, state])
  },
  ActiveAbilitiesManager: {
    getAvailableAbilities: jest.fn((player, state) => []),
    canUseAbility: jest.fn((ability, player, state) => true),
    executeAbility: jest.fn((ability, select, state) => state),
    executePutinDoubleIntervention: jest.fn((state, player, interventionIds, log) => state)
  }
}));

// Test-Umgebung Setup
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Globale Test-Timeout
jest.setTimeout(10000);
