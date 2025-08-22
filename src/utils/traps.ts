import { GameState, Player, Card, PoliticianCard } from '../types/game';

const isPol = (c: Card): c is PoliticianCard => c && c.kind === 'pol';

export const isBoycottTrap = (c: Card) =>
  c.kind === 'spec' && ((c as any).key === 'boykott_kampagne' || c.name === 'Boykott-Kampagne');

export const isSystemrelevant = (c: Card) =>
  c.kind === 'spec' && ((c as any).key === 'systemrelevant' || c.name === 'Systemrelevant');

/** Karte mit einmaligem Schutz markieren */
export function grantOneTimeProtection(target: Card, log: (msg: string) => void) {
  if (isPol(target)) {
    (target as PoliticianCard).protected = true;
    log(`🛡️ ${target.name} erhält einmaligen Schutz.`);
  }
}

/** Trap verdeckt ablegen */
export function registerTrap(state: GameState, p: Player, trapCard: Card, log: (msg: string) => void) {
  state.traps[p].push(trapCard);
  log(`🪤 ${trapCard.name} wird verdeckt vorbereitet.`);
}

/** Prüft gegnerische Traps, wenn Spieler p gerade "played" gelegt hat */
export function checkTrapsOnOpponentPlay(state: GameState, p: Player, played: Card, log: (msg: string) => void) {
  const opponent = (p === 1 ? 2 : 1) as Player;
  const traps = state.traps[opponent];
  if (!traps?.length) return;

  // Wir iterieren rückwärts, damit wir während des Splice nicht verschieben
  for (let i = traps.length - 1; i >= 0; i--) {
    const trap = traps[i];

    // BOYKOTT: triggert gegen NGO/Unternehmen/Plattform (anpassbar)
    if (isBoycottTrap(trap)) {
      const tag = (played as any).tag ?? (played as any).tags ?? '';
      const targetIsNGOorCompany =
        isPol(played) &&
        (tag === 'NGO' || tag === 'Unternehmen' || tag === 'Plattform' || tag === 'Big Tech');

      if (targetIsNGOorCompany) {
        traps.splice(i, 1); // Trap verbrauchen
        log(`🪤 BOYKOTT aktiviert gegen ${played.name}.`);

        if (isPol(played) && (played as PoliticianCard).protected) {
          (played as PoliticianCard).protected = false; // Schutz verbraucht
          log(`🛡️ Schutz verhindert Deaktivierung von ${played.name} – Schutz verbraucht.`);
        } else if (isPol(played)) {
          (played as PoliticianCard).deactivated = true;
          log(`🚫 ${played.name} wird dauerhaft deaktiviert (Boykott).`);
        } else {
          log(`ℹ️ Boykott hätte kein gültiges Ziel gefunden.`);
        }
      }
    }
  }
}
