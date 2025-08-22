import { GameState, Card, createDefaultEffectFlags } from '../types/game';
import { getNetApCost } from './ap';

describe('Zero Net AP Plays', () => {
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
    gameWinner: null,
    effectFlags: {
      1: createDefaultEffectFlags(),
      2: createDefaultEffectFlags()
    },
    shields: new Set(),
    ...overrides
  });

  const createMockGovCard = (name: string): Card => ({
    id: 1,
    key: name.toLowerCase().replace(' ', '_'),
    name: name,
    kind: 'pol',
    baseId: 1,
    uid: Math.random() * 1000000,
    tag: 'Regierungschef',
    T: 1,
    BP: 3,
    influence: 5,
    protected: false,
    deactivated: false,
    tempDebuffs: 0,
    tempBuffs: 0,
    _activeUsed: false
  } as any);

  it('does not consume actions on net zero play', () => {
    const s = createMockState({ 
      actionPoints: { 1: 2, 2: 2 },
      actionsUsed: { 1: 0, 2: 0 }
    });
    
    // Greta-Refund aktiv
    s.effectFlags[1].govRefundAvailable = true;

    const card = createMockGovCard('Karl Rove'); // Regierungskarte
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

    const card = createMockGovCard('Angela Merkel');
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

    const card = createMockGovCard('Boris Johnson');
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

    const card = createMockGovCard('Vladimir Putin');
    const { net } = getNetApCost(s, 1, card);
    
    expect(net).toBe(1); // Normal cost
    
    // Simulate booking: Actions consumed for net > 0
    const before = s.actionsUsed[1];
    if (net > 0) s.actionsUsed[1] += 1;
    
    expect(s.actionsUsed[1]).toBe(before + 1);
  });
});
