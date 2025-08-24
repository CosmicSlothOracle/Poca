// src/state/instantRuntime.ts
import { GameState, Player } from '../types/game';
import { isInstantInitiative, cap } from '../utils/initiative';

// influence mods for instant initiatives (Doudna/Fauci/Chomsky)
export function applyInstantInfluenceMods(state: GameState, player: Player, base: number) {
  let influence = base;
  const rs: string[] = [];
  if (state.effectFlags[player].scienceInitiativeBonus) { influence += 1; rs.push('Doudna +1'); }
  if (state.effectFlags[player].healthInitiativeBonus)  { influence += 1; rs.push('Fauci +1'); }
  if (state.effectFlags[player].militaryInitiativePenalty) { influence -= 1; rs.push('Chomsky −1'); }
  return { influence, reasons: rs };
}

// Ai Weiwei: +1 card +1 AP on instant initiative
export function maybeAiWeiweiBonus(state: GameState, player: Player, log: (s: string)=>void) {
  if (!state.effectFlags[player].cultureInitiativeBonus) return;
  const draw = state.decks[player].shift();
  if (draw) {
    state.hands[player].push(draw);
    log(`Ai Weiwei: +1 Karte gezogen (${draw.name})`);
  }
  const before = state.actionPoints[player];
  state.actionPoints[player] = cap(before + 1, 0, 4);
  log(`Ai Weiwei: +1 AP (${before}→${state.actionPoints[player]})`);
}

// activate & resolve the card that currently sits in the player's instant slot
export function activateInstantInitiative(state: GameState, player: Player, log: (s: string)=>void) {
  const slot = state.board[player].sofort; // adjust if your slot key differs
  const card = slot?.[0];
  if (!card || !isInstantInitiative(card)) return false;

  // Example: apply mods to card's base influence if you use it somewhere
  const baseInf = (card as any).influence ?? 0;
  const mod = applyInstantInfluenceMods(state, player, baseInf);
  if (mod.reasons.length) log(`Sofort-Initiative: ${mod.reasons.join(' | ')}`);

  // card-specific outcomes (example: Verzögerungsverfahren = +1 AP)
  if ((card as any).name === 'Verzögerungsverfahren') {
    const b = state.actionPoints[player];
    state.actionPoints[player] = cap(b + 1, 0, 4);
    log(`Verzögerungsverfahren: +1 AP (${b}→${state.actionPoints[player]})`);
  }

  // Ai Weiwei generic bonus on any instant initiative
  maybeAiWeiweiBonus(state, player, log);

  // discard the instant card after resolving
  state.discard.push(card);
  state.board[player].sofort = []; // clear slot
  log(`Sofort-Initiative "${card.name}" wurde aktiviert und abgelegt.`);

  return true;
}
