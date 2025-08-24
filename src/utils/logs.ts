/**
 * Standardisierte Log-Formatter
 * Einheitliche Log-Messages für alle Spieleffekte
 */

import { Player } from '../types/game';

// AP-System
export const logAP = (player: Player, before: number, after: number): string =>
  `⚡ AP P${player}: ${before} → ${after}`;

// Initiative-System
export const logDiscount = (player: Player, before: number, after: number): string =>
  `🏷️ Discount P${player}: ${before} → ${after}`;

export const logRefund = (player: Player, before: number, after: number): string =>
  `↩️ Refund-Pool P${player}: ${before} → ${after}`;

// Karten-Aktionen
export const logDraw = (player: Player, cardName: string): string =>
  `🃏 P${player} zieht: ${cardName}`;

export const logDiscardRandom = (player: Player, cardName: string): string =>
  `🗑️ P${player} wirft zufällig ab: ${cardName}`;

export const logDeactivateRandom = (player: Player, cardName: string): string =>
  `⛔ P${player} Handkarte deaktiviert: ${cardName}`;

// Einfluss-System
export const logBuffStrongest = (player: Player, cardName: string, amount: number = 1): string =>
  `📈 Einfluss P${player} stärkste Regierung ${amount >= 0 ? '+' : ''}${amount} (${cardName})`;

// Schutz-System
export const logShield = (uid: number): string =>
  `🛡️ Schutz gewährt: UID ${uid}`;

// Karten-Status
export const logDeactivateCard = (cardName: string): string =>
  `⛔ Karte deaktiviert: ${cardName}`;

// Initiative-Aktivierung
export const logInitiativeActivated = (player: Player): string =>
  `🔥 Initiative aktiviert von P${player}`;

// Aura-Effekte
export const logInitiativeAura = (player: Player, delta: number): string =>
  `🔥 Initiative-Aura: Einfluss Δ=${delta} auf stärkste Regierung von P${player}`;

// Spezial-Effekte
export const logAiWeiwei = (): string =>
  `🎨 Ai Weiwei: +1 Karte & +1 AP bei Sofort-Initiative`;

export const logPlattformBonus = (): string =>
  `🖥️ Plattform-Bonus (Zuckerberg): +1 AP (einmal pro Runde)`;

export const logOpportunist = (player: Player, amount: number): string =>
  `🪞 Opportunist: P${player} spiegelt +${amount}`;

// Symbol-Mapping für UI-Feed
export const EFFECT_SYMBOLS = {
  AP: '⚡',
  DISCOUNT: '🏷️',
  REFUND: '↩️',
  DRAW: '🃏',
  SHIELD: '🛡️',
  BUFF: '📈',
  DISCARD: '🗑️',
  DEACTIVATE: '⛔',
  INITIATIVE: '🔥',
  SPECIAL: '🎨',
  PLATFORM: '🖥️',
  MIRROR: '🪞'
} as const;

export type EffectSymbol = typeof EFFECT_SYMBOLS[keyof typeof EFFECT_SYMBOLS];
