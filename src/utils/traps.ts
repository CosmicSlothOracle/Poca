import { GameState, Player, Card, PoliticianCard } from '../types/game';

const isPol = (c: Card): c is PoliticianCard => c && c.kind === 'pol';

export const isBoycottTrap = (c: Card) =>
  c.kind === 'spec' && ((c as any).key === 'boykott_kampagne' || c.name === 'Boykott-Kampagne');

export const isSystemrelevant = (c: Card) =>
  c.kind === 'spec' && ((c as any).key === 'systemrelevant' || c.name === 'Systemrelevant');

export function grantOneTimeProtection(target: Card, log: (msg: string) => void) {
  if (isPol(target)) {
    (target as PoliticianCard).protected = true;
    log(`🛡️ ${target.name} erhält einmaligen Schutz.`);
  }
}

export function registerTrap(state: GameState, p: Player, trapCard: Card, log: (msg: string) => void) {
  state.traps[p].push(trapCard);
  log(`🪤 ${trapCard.name} wird verdeckt vorbereitet.`);
}

export function checkTrapsOnOpponentPlay(state: GameState, owner: Player, playedCardUid: number, isTargetNGOorPlatform: boolean, log: (m: string) => void) {
  const traps = state.traps[owner];
  if (!traps || traps.length === 0) return;

  const targetAll = [
    ...state.board[1].innen, ...state.board[1].aussen, ...state.board[1].sofort,
    ...state.board[2].innen, ...state.board[2].aussen, ...state.board[2].sofort,
  ];
  const target = targetAll.find(c => c.uid === playedCardUid);
  if (!target) return;

  if (isTargetNGOorPlatform) {
    if (state.shields && state.shields.has(target.uid)) {
      state.shields.delete(target.uid);
      log(`🛡️ Schutz hat Boykott verhindert: ${target.name}.`);
    } else {
      if (!state._queue) state._queue = [];
      state._queue.push({ type: 'DEACTIVATE_CARD', targetUid: target.uid });
      log(`⛔ Boykott deaktiviert: ${target.name}.`);
    }
    traps.shift();
  }
}