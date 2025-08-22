import { GameState, createDefaultEffectFlags } from '../types/game';
import { triggerCardEffects } from '../effects/cards';
import { resolveQueue } from '../utils/queue';

describe('On-Play Effects', () => {
  let gameState: GameState;
  let logMessages: string[];

  beforeEach(() => {
    logMessages = [];
    const log = (msg: string) => logMessages.push(msg);

    gameState = {
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
        2: { innen: [], aussen: [] }
      },
      permanentSlots: {
        1: { government: null, public: null },
        2: { government: null, public: null }
      },
      instantSlot: { 1: null, 2: null },
      discard: [],
      log: [],
      activeRefresh: { 1: 0, 2: 0 },
      roundsWon: { 1: 0, 2: 0 },
      effectFlags: {
        1: createDefaultEffectFlags(),
        2: createDefaultEffectFlags()
      },
      _effectQueue: []
    };
  });

  test('Jack Ma should draw 1 card', () => {
    // Setup: Add cards to deck
    gameState.decks[1] = [
      { id: 1, key: 'test_card', name: 'Test Card', kind: 'pol', baseId: 1, uid: 1 } as any
    ];

    const jackMaCard = {
      id: 2,
      key: 'jack_ma',
      name: 'Jack Ma',
      kind: 'spec',
      baseId: 2,
      uid: 2
    } as any;

    // Trigger effect
    triggerCardEffects(gameState, 1, jackMaCard);
    resolveQueue(gameState, (msg) => logMessages.push(msg));

    // Verify
    expect(gameState.hands[1]).toHaveLength(1);
    expect(gameState.hands[1][0].name).toBe('Test Card');
    expect(logMessages).toContain('[JACK MA] +1 Karte gezogen.');
  });

  test('Opportunist should set flag', () => {
    const opportunistCard = {
      id: 3,
      key: 'opportunist',
      name: 'Opportunist',
      kind: 'spec',
      baseId: 3,
      uid: 3
    } as any;

    // Trigger effect
    triggerCardEffects(gameState, 1, opportunistCard);
    resolveQueue(gameState, (msg) => logMessages.push(msg));

    // Verify
    expect(gameState.effectFlags[1].opportunistActive).toBe(true);
    expect(logMessages).toContain('[OPPORTUNIST] Einfluss-Boni des Gegners werden gespiegelt.');
  });

  test('Verzögerungsverfahren should add AP', () => {
    const verzCard = {
      id: 4,
      key: 'verzoegerungsverfahren',
      name: 'Verzögerungsverfahren',
      kind: 'spec',
      baseId: 4,
      uid: 4
    } as any;

    const initialAP = gameState.actionPoints[1];

    // Trigger effect
    triggerCardEffects(gameState, 1, verzCard);
    resolveQueue(gameState, (msg) => logMessages.push(msg));

    // Verify
    expect(gameState.actionPoints[1]).toBe(initialAP + 1);
    expect(logMessages).toContain('[VERZÖGERUNGSVERFAHREN] +1 AP erhalten.');
  });
});
