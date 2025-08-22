import type { GameState, Player } from './game';

export type EffectEvent =
  | { kind: 'LOG'; message: string }
  | { kind: 'SET_FLAG'; player: Player; path: string; value: any }
  | { kind: 'DISCOUNT_NEXT_INITIATIVE'; player: Player; amount?: number }
  | { kind: 'REFUND_NEXT_INITIATIVE'; player: Player; amount: number }
  | { kind: 'ADD_AP'; player: Player; amount: number };

export type EffectQueue = EffectEvent[];

