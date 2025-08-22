import { Card, PoliticianCard, SpecialCard } from '../types/game';

// Type-safe shield management
export function hasShield(card: Card): boolean {
  if (card.kind === 'pol') {
    return (card as PoliticianCard).protected;
  }
  // Special cards don't have shields in current design
  return false;
}

export function grantShield(card: Card, charges = 1): void {
  if (card.kind === 'pol') {
    const polCard = card as PoliticianCard;
    polCard.protected = true;
    // Could extend with shield charges if needed
  }
}

export function consumeShield(card: Card): boolean {
  if (card.kind === 'pol') {
    const polCard = card as PoliticianCard;
    if (polCard.protected) {
      polCard.protected = false;
      return true;
    }
  }
  return false;
}

// Deactivation management
export function isDeactivated(card: Card): boolean {
  if (card.kind === 'pol') {
    return (card as PoliticianCard).deactivated;
  }
  if (card.kind === 'spec') {
    return (card as SpecialCard).deactivated ?? false;
  }
  return false;
}

export function setDeactivated(card: Card, val: boolean): void {
  if (card.kind === 'pol') {
    (card as PoliticianCard).deactivated = val;
  } else if (card.kind === 'spec') {
    (card as SpecialCard).deactivated = val;
  }
}

/**
 * Centralized path to disable a card.
 * Respects 1x shield: consumes shield and prevents deactivation.
 * Returns: true = deactivated, false = prevented by shield.
 */
export function attemptDisable(target: Card, log?: (m: string) => void): boolean {
  if (consumeShield(target)) {
    log?.('🛡️ Schutz aktiviert: Deaktivierung verhindert (Schild verbraucht).');
    return false;
  }
  setDeactivated(target, true);
  log?.('🚫 Ziel deaktiviert.');
  return true;
}
