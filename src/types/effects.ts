import type { GameState, Player, Card } from './game';

export type EffectEvent =
  | { kind: 'LOG'; message: string }
  | { kind: 'SET_FLAG'; player: Player; path: string; value: any }
  | { kind: 'DISCOUNT_NEXT_INITIATIVE'; player: Player; amount?: number }
  | { kind: 'REFUND_NEXT_INITIATIVE'; player: Player; amount: number }
  | { kind: 'ADD_AP'; player: Player; amount: number }
  | { kind: 'DRAW_CARDS'; player: Player; count: number }
  | { kind: 'DISCARD_RANDOM_FROM_HAND'; player: Player }
  | { kind: 'ADJUST_INFLUENCE'; player: Player; targetCard: Card; delta: number; source: string };

export type EffectQueue = EffectEvent[];

