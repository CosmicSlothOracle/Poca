import type { Player, Card } from './game';
import type { UID } from './primitives';

export interface PlayPublicEvent {
  t: 'PLAY_PUBLIC';
  actor: Player;
  card: Card;
  slot: 'innen';
}

export interface PlayGovEvent {
  t: 'PLAY_GOV';
  actor: Player;
  card: Card;
  slot: 'aussen' | 'innen';
}

export interface PlayInitiativeEvent {
  t: 'PLAY_INITIATIVE';
  actor: Player;
  card: Card;
}

export interface PlayInterventionEvent {
  t: 'PLAY_INTERVENTION';
  actor: Player;
  card: Card;
}

export interface CardDisabledEvent {
  t: 'CARD_DISABLED';
  actor: Player;
  targetUid: UID;
  until: 'round_end';
}

export interface CardReactivatedEvent {
  t: 'CARD_REACTIVATED';
  actor: Player;
  targetUid: UID;
}

export interface RoundStartEvent {
  t: 'ROUND_START';
  round: number;
}

export interface RoundEndEvent {
  t: 'ROUND_END';
  round: number;
}

export type GEvent =
  | PlayPublicEvent
  | PlayGovEvent
  | PlayInitiativeEvent
  | PlayInterventionEvent
  | CardDisabledEvent
  | CardReactivatedEvent
  | RoundStartEvent
  | RoundEndEvent;
