import { PRESET_DECKS } from './gameData';

describe('INITIATIVE_TEST_DECK', () => {
  const deck = PRESET_DECKS.INITIATIVE_TEST_DECK;

  it('should have exactly 10 cards', () => {
    const totalCards = deck.reduce((sum, entry) => sum + entry.count, 0);
    expect(totalCards).toBe(10);
  });

  it('should include all 4 Phase-1 initiatives', () => {
    const initiatives = deck.filter(entry =>
      [12, 6, 8, 2].includes(entry.baseId) // Symbolpolitik, Verzögerung, Think-tank, Spin Doctor
    );
    expect(initiatives).toHaveLength(4);
  });

  it('should include government cards for testing', () => {
    const govCards = deck.filter(entry => entry.kind === 'pol');
    expect(govCards).toHaveLength(4);

    // Should include Joschka Fischer for Think-tank combo
    const joschaFischer = govCards.find(entry => entry.baseId === 14);
    expect(joschaFischer).toBeDefined();
  });

  it('should include support cards', () => {
    const supportCards = deck.filter(entry =>
      entry.kind === 'spec' && ![12, 6, 8, 2].includes(entry.baseId)
    );
    expect(supportCards).toHaveLength(2);
  });

  it('should have balanced BP costs for testing', () => {
    // Low cost initiatives (1 BP): Symbolpolitik, Verzögerungsverfahren
    const lowCostInitiatives = deck.filter(entry => [12, 6].includes(entry.baseId));
    expect(lowCostInitiatives).toHaveLength(2);

    // Medium cost initiatives (2 BP): Think-tank, Spin Doctor
    const mediumCostInitiatives = deck.filter(entry => [8, 2].includes(entry.baseId));
    expect(mediumCostInitiatives).toHaveLength(2);
  });
});
