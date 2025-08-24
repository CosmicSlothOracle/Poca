import { Card } from '../types/game';

/**
 * Erkennung von Sofort-Initiativen (nur diese, nicht Dauerhaft-Initiativen)
 *
 * @param card - Die zu prüfende Karte
 * @returns true wenn es eine Sofort-Initiative ist
 */
export function isInstantInitiative(card: Card): boolean {
  if (!card) return false;

  // Nur Special-Karten können Initiativen sein
  if (card.kind !== 'spec') return false;

  const k = card as any;
  const typeStr = String(k.type || '').toLowerCase();

  // treat anything with "sofort" as instant-initiative
  return typeStr.includes('sofort') || typeStr.includes('instant');
}

export function cap(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
