import { sortEventsForResolution } from './resolve';
import { EK } from '../data/effectKeys';
import { GEvent } from '../types/events';

// Simple mock card
const mockCard = {
  id: 1,
  key: 'test',
  name: 'Test Card',
  kind: 'spec' as const,
  baseId: 1,
  uid: 1
};

describe('Simple Refactor Validation', () => {
  it('should have EK constants', () => {
    expect(EK.PROTECTED).toBe('protected');
    expect(EK.IV_FAKE_NEWS).toBe('iv_fake_news');
  });

  it('should sort events by priority', () => {
    const events: GEvent[] = [
      { t: 'PLAY_GOV', actor: 1, card: mockCard, slot: 'innen' },
      { t: 'PLAY_INTERVENTION', actor: 2, card: mockCard },
      { t: 'PLAY_INITIATIVE', actor: 1, card: mockCard },
    ];

    const sorted = sortEventsForResolution(events);

    expect(sorted[0].t).toBe('PLAY_INTERVENTION');
    expect(sorted[1].t).toBe('PLAY_INITIATIVE');
    expect(sorted[2].t).toBe('PLAY_GOV');
  });

  it('should handle typed events', () => {
    const intervention: GEvent = {
      t: 'PLAY_INTERVENTION',
      actor: 1,
      card: mockCard
    };

    const roundStart: GEvent = {
      t: 'ROUND_START',
      round: 1
    };

    expect(intervention.t).toBe('PLAY_INTERVENTION');
    expect(roundStart.t).toBe('ROUND_START');
    expect('round' in roundStart).toBe(true);
    expect('card' in intervention).toBe(true);
  });
});
