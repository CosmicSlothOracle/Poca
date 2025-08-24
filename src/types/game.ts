import type { UID } from './primitives';
import type { GEvent } from './events';
import type { EffectEvent } from './effects';

export interface Card {
  id: number;
  key: string;
  name: string;
  kind: 'pol' | 'spec';
  baseId: number;
  uid: number;
}

export interface PoliticianCard extends Card {
  kind: 'pol';
  tag: string;
  T: number;
  BP: number;
  influence: number; // 🔥 VEREINFACHT: Nur noch Einfluss, kein separates M mehr!
  effect?: string; // 🔥 EFFEKT PROPERTY FÜR JOSCHKA FISCHER NGO-BOOST!
  protected: boolean;
  protectedUntil?: number | null; // Round number when protection expires
  deactivated: boolean;
  tempDebuffs: number;
  tempBuffs: number;
  _activeUsed: boolean;
  _pledgeDown?: { amount: number; round: number } | null;
  _hypedRoundFlag?: boolean;
}

export interface SpecialCard extends Card {
  kind: 'spec';
  type: string;
  impl: string;
  bp: number;
  tag?: string; // 🔥 TAG PROPERTY FÜR NGO/PLATTFORM DETECTION!
  deactivated?: boolean; // For public cards that can be deactivated
}

export interface BasePolitician {
  id: number;
  key: string;
  name: string;
  influence: number; // 🔥 VEREINFACHT: M → influence
  tag?: string; // 🔧 FIX: Optional für Kompatibilität mit gameData.ts
  T: number;
  BP?: number;
  effect?: string;
}

export interface BaseSpecial {
  id: number;
  key: string;
  name: string;
  type: string;
  speed?: string;
  bp: number;
  effect?: string; // 🔧 FIX: Optional für Kompatibilität mit gameData.ts
  tier: number;
  impl: string;
  tag?: string;
  effectKey?: string; // Phase 1: effectKey für Initiative-Handler
}

export interface GameState {
  round: number;
  current: 1 | 2;
  passed: { 1: boolean; 2: boolean };
  actionPoints: { 1: number; 2: number };
  actionsUsed: { 1: number; 2: number };
  decks: { 1: Card[]; 2: Card[] };
  hands: { 1: Card[]; 2: Card[] };
  traps: { 1: Card[]; 2: Card[] };
  board: {
    1: { innen: Card[]; aussen: Card[] };
    2: { innen: Card[]; aussen: Card[] };
  };
  permanentSlots: {
    1: { government: Card | null; public: Card | null };
    2: { government: Card | null; public: Card | null };
  };
  instantSlot: {
    1: Card | null;
    2: Card | null;
  };
  discard: Card[];
  log: string[];
  activeRefresh: { 1: number; 2: number };
  roundsWon: { 1: number; 2: number };
  // Kennzeichnet, ob ein Spieler von der KI gesteuert wird
  aiEnabled?: { 1: boolean; 2: boolean };
  gameWinner?: 1 | 2 | null;
  // 🔥 PHASE 0: Neue Engine-Infrastruktur
  blocked?: { initiatives?: boolean }; // durch Oppositionsblockade
  shields?: Set<UID>; // UIDs mit Schutz (Systemrelevant)
  _queue?: GEvent[]; // Engine-Queue für Event-Resolution
  _effectQueue?: EffectEvent[]; // Effect-Queue für Karteneffekte
  effectFlags: {
    1: EffectFlags;
    2: EffectFlags;
  };
  effectQueue?: EffectQueue;
  activeAbilities?: {
    1: ActiveAbility[];
    2: ActiveAbility[];
  };
  pendingAbilitySelect?: AbilitySelect;
  // 🧹 Zug-Ende-System: Flag für automatischen Zugwechsel nach Queue-Auflösung
  isEndingTurn?: boolean;
}



export function createDefaultEffectFlags(): EffectFlags {
  return {
    // bestehende Defaults …
    freeInitiativeAvailable: false,
    ngoInitiativeDiscount: 0,
    nextInitiativeDiscounted: false,

    // 🔧 NEU:
    nextInitiativeRefund: 0,
    govRefundAvailable: false,

    // Alt (nicht mehr nutzen):
    platformRefundAvailable: false,
    platformRefundUsed: false,

    // Weitere bestehende Defaults...
    platformInitiativeDiscount: 0,
    diplomatInfluenceTransferUsed: false,
    influenceTransferBlocked: false,
    nextGovPlus2: false,
    nextGovernmentCardBonus: 0,
    nextInitiativeMinus1: false,
    publicEffectDoubled: false,
    cannotPlayInitiatives: false,
    nextCardProtected: false,
    platformAfterInitiativeBonus: false,
    interventionEffectReduced: false,

    // 🔧 NEU: Opportunist-Flag für Mirror-Effekte
    opportunistActive: false,

    // 🔥 CLUSTER 1: Passive Effekte Flags
    markZuckerbergUsed: false, // Mark Zuckerberg: einmal pro Runde

    // 🔥 CLUSTER 3: Temporäre Initiative-Boni (bis Rundenende)
    scienceInitiativeBonus: false,    // Jennifer Doudna: +1 Einfluss bei Initiativen
    militaryInitiativePenalty: false, // Noam Chomsky: -1 Einfluss bei Initiativen (für Gegner)
    healthInitiativeBonus: false,     // Anthony Fauci: +1 Einfluss bei Initiativen
    cultureInitiativeBonus: false,    // Ai Weiwei: +1 Karte +1 AP bei Initiativen
  };
}

export interface BuilderState {
  open: boolean;
  deck: BuilderEntry[];
}

export interface BuilderEntry {
  kind: 'pol' | 'spec';
  baseId: number;
  count: number;
}

export interface UIZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ClickZone {
  x: number;
  y: number;
  w: number;
  h: number;
  data: any;
}

export interface FXState {
  p1Activation: ActivationFX | null;
  p2Activation: ActivationFX | null;
}

export interface ActivationFX {
  card: Card;
  until: number;
}

export interface SelectedState {
  handIndex: number | null;
}

export interface AbilitySelect {
  type: 'hardliner' | 'putin_double_intervention' | 'oligarch_influence' | 'diplomat_transfer';
  actorCard: PoliticianCard;
  actorPlayer: 1 | 2;
  lane?: 'innen' | 'aussen';
  targetCard?: PoliticianCard;
  amount?: number;
  advanceAfterResolve?: boolean;
  consumeRefresh?: boolean;
}

export interface ActiveAbility {
  id: string;
  name: string;
  description: string;
  cardName: string;
  cooldown: number;
  usedThisRound: boolean;
  type: AbilitySelect['type'];
  cost?: number; // AP Cost
  requirements?: string[];
}

export interface EffectQueueItem {
  id: string;
  type: 'intervention' | 'sofort' | 'passiv' | 'aktiv';
  priority: number; // 1=highest (intervention), 4=lowest (aktiv)
  source: Card;
  target?: Card;
  effect: () => void;
  description: string;
  player: Player;
  round: number;
}

export interface EffectQueue {
  items: EffectQueueItem[];
  processing: boolean;
  nextId: number;
}

export type Lane = 'innen' | 'aussen';
export type Player = 1 | 2;

// EffectFlags Type Definition
export interface EffectFlags {
  // bestehende Felder …
  freeInitiativeAvailable: boolean;
  ngoInitiativeDiscount: number;
  nextInitiativeDiscounted: boolean;

  // 🔧 NEU: zentrales Refund-Becken für Initiativen (stackbar)
  nextInitiativeRefund: number;

  // 🔧 Greta-Refund für die erste Regierungskarte pro Zug
  govRefundAvailable: boolean;

  // 🗑️ Alt: nicht mehr verwenden (optional in Typ lassen, aber nirgendwo nutzen)
  platformRefundAvailable: boolean;
  platformRefundUsed: boolean;

  // Weitere bestehende Felder...
  platformInitiativeDiscount: number;
  diplomatInfluenceTransferUsed: boolean;
  influenceTransferBlocked: boolean;
  nextGovPlus2: boolean;
  nextGovernmentCardBonus: number;
  nextInitiativeMinus1: boolean;
  publicEffectDoubled: boolean;
  cannotPlayInitiatives: boolean;
  nextCardProtected: boolean;
  platformAfterInitiativeBonus: boolean;
  interventionEffectReduced: boolean;

  // 🔧 NEU: Opportunist-Flag für Mirror-Effekte
  opportunistActive: boolean;

  // 🔥 CLUSTER 1: Passive Effekte Flags
  markZuckerbergUsed: boolean; // Mark Zuckerberg: einmal pro Runde

  // 🔥 CLUSTER 3: Temporäre Initiative-Boni (bis Rundenende)
  scienceInitiativeBonus: boolean;    // Jennifer Doudna: +1 Einfluss bei Initiativen
  militaryInitiativePenalty: boolean; // Noam Chomsky: -1 Einfluss bei Initiativen (für Gegner)
  healthInitiativeBonus: boolean;     // Anthony Fauci: +1 Einfluss bei Initiativen
  cultureInitiativeBonus: boolean;    // Ai Weiwei: +1 Karte +1 AP bei Initiativen
}
