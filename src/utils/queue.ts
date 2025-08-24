import { GameState, Player, EffectEvent, PoliticianCard, Card } from '../types/game';
import { getStrongestGovCardUid } from './effectUtils';

function other(p: Player): Player { return p === 1 ? 2 : 1; }
function logPush(state: GameState, msg: string) { state.log.push(msg); }

function strongestGov(state: GameState, p: Player): PoliticianCard | null {
  const row = state.board[p].aussen as PoliticianCard[];
  if (!row.length) return null;
  return row.slice().sort((a,b) => (b.influence + (b.tempBuffs||0) - (b.tempDebuffs||0)) - (a.influence + (a.tempBuffs||0) - (a.tempDebuffs||0)))[0];
}

function publicNames(state: GameState, p: Player): string[] {
  return state.board[p].innen.map(c => c.name);
}

function hasPublic(state: GameState, p: Player, name: string): boolean {
  return publicNames(state, p).includes(name);
}

function findCardByUidOnBoard(state: GameState, uid: number): Card | null {
  for (const p of [1,2] as const) {
    for (const lane of ['innen','aussen','sofort'] as const) {
      const arr = state.board[p][lane];
      const hit = arr.find(c => c.uid === uid);
      if (hit) return hit;
    }
  }
  return null;
}

export function resolveQueue(state: GameState, events: EffectEvent[]) {
  // Single pass FIFO
  while (events.length) {
    const ev = events.shift()!;

    switch (ev.type) {
      case 'LOG': {
        logPush(state, ev.msg);
        break;
      }

      case 'ADD_AP': {
        const cur = state.actionPoints[ev.player];
        const next = Math.max(0, Math.min(4, cur + ev.amount)); // Guidelines §15: AP-Cap: 4
        state.actionPoints[ev.player] = next;
        logPush(state, `⚡ AP P${ev.player}: ${cur} → ${next}`);
        break;
      }

      case 'DRAW_CARDS': {
        for (let i = 0; i < ev.amount; i++) {
          const top = state.decks[ev.player].shift();
          if (top) {
            state.hands[ev.player].push(top);
            logPush(state, `🃏 P${ev.player} zieht: ${top.name}`);
          }
        }
        break;
      }

      case 'DISCARD_RANDOM_FROM_HAND': {
        const hand = state.hands[ev.player];
        for (let i = 0; i < ev.amount && hand.length > 0; i++) {
          const idx = Math.floor(Math.random() * hand.length);
          const [card] = hand.splice(idx, 1);
          state.discard.push(card);
          logPush(state, `🗑️ P${ev.player} wirft zufällig ab: ${card.name}`);
        }
        break;
      }

      case 'DEACTIVATE_RANDOM_HAND': {
        // Deaktivieren von Handkarten (nicht entfernen)
        const hand = state.hands[ev.player];
        for (let i = 0; i < ev.amount && hand.length > 0; i++) {
          const idx = Math.floor(Math.random() * hand.length);
          const card = hand[idx];
          (card as any).deactivated = true;
          logPush(state, `⛔ P${ev.player} Handkarte deaktiviert: ${card.name}`);
        }
        break;
      }

      case 'SET_DISCOUNT': {
        const prev = state.effectFlags[ev.player].initiativeDiscount || 0;
        const next = Math.max(0, Math.min(2, prev + ev.amount));
        state.effectFlags[ev.player].initiativeDiscount = next;
        logPush(state, `🏷️ Discount P${ev.player}: ${prev} → ${next}`);
        break;
      }

      case 'REFUND_NEXT_INITIATIVE': {
        const prev = state.effectFlags[ev.player].initiativeRefund || 0;
        const next = Math.max(0, Math.min(2, prev + ev.amount));
        state.effectFlags[ev.player].initiativeRefund = next;
        logPush(state, `↩️ Refund-Pool P${ev.player}: ${prev} → ${next}`);
        break;
      }

      case 'GRANT_SHIELD': {
        if (!state.shields) state.shields = new Set();
        state.shields.add(ev.targetUid);
        logPush(state, `🛡️ Schutz gewährt: UID ${ev.targetUid}`);
        break;
      }

      case 'DEACTIVATE_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          (card as any).deactivated = true;
          logPush(state, `⛔ Karte deaktiviert: ${card.name}`);
        }
        break;
      }

      case 'BUFF_STRONGEST_GOV':
      case 'ADJUST_INFLUENCE': { // Alias auf BUFF_STRONGEST_GOV
        const player = ev.player;
        const amount = (ev as any).amount;
        const tgt = strongestGov(state, player);
        if (tgt) {
          if (amount >= 0) {
            (tgt as PoliticianCard).tempBuffs = ((tgt as PoliticianCard).tempBuffs || 0) + amount;
          } else {
            (tgt as PoliticianCard).tempDebuffs = ((tgt as PoliticianCard).tempDebuffs || 0) + Math.abs(amount);
          }
          logPush(state, `📈 Einfluss P${player} stärkste Regierung ${amount >= 0 ? '+' : ''}${amount} (${tgt.name})`);

          // Opportunist-Spiegelung (falls aktiv beim Gegner)
          if (state.effectFlags[other(player)]?.opportunistActive && amount > 0) {
            const mirror = { type: 'BUFF_STRONGEST_GOV', player: other(player), amount } as EffectEvent;
            events.unshift(mirror);
            logPush(state, `🪞 Opportunist: P${other(player)} spiegelt +${amount}`);
          }
        }
        break;
      }

      case 'INITIATIVE_ACTIVATED': {
        const p = ev.player;
        const opp = other(p);

        // Cluster-3: temporäre Auren für Sofort-Initiativen (namenbasiert, keine Tags)
        let delta = 0;
        delta += state.effectFlags[p].initiativeInfluenceBonus || 0;                 // z.B. +1 (Doudna/Fauci)
        delta -= state.effectFlags[opp].initiativeInfluencePenaltyForOpponent || 0;  // z.B. -1 (Chomsky)

        if (delta !== 0) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: p, amount: delta });
          logPush(state, `🔥 Initiative-Aura: Einfluss Δ=${delta} auf stärkste Regierung von P${p}`);
        }

        if (state.effectFlags[p].initiativeOnPlayDraw1Ap1) {
          events.unshift({ type: 'ADD_AP', player: p, amount: 1 });
          events.unshift({ type: 'DRAW_CARDS', player: p, amount: 1 });
          logPush(state, `🎨 Ai Weiwei: +1 Karte & +1 AP bei Sofort-Initiative`);
        }

        // Plattform: Einmal pro Runde nach Initiative +1 AP, wenn Mark Zuckerberg liegt und nicht verbraucht
        if (hasPublic(state, p, 'Mark Zuckerberg') && !state.effectFlags[p].markZuckerbergUsed) {
          state.effectFlags[p].markZuckerbergUsed = true;
          events.unshift({ type: 'ADD_AP', player: p, amount: 1 });
          logPush(state, `🖥️ Plattform-Bonus (Zuckerberg): +1 AP (einmal pro Runde)`);
        }
        break;
      }

      case 'ADJUST_STRONGEST_GOV': {
        const uid = getStrongestGovCardUid(state, ev.player);
        if (uid != null) {
          const row = state.board[ev.player].aussen as PoliticianCard[];
          const target = row.find(c => c.uid === uid) as PoliticianCard | undefined;
          if (target) {
            target.tempBuffs = (target.tempBuffs ?? 0) + ev.amount;
            logPush(state, `🔺 stärkste Regierung ${target.name}: ${ev.amount >= 0 ? '+' : ''}${ev.amount} Einfluss`);
          }
        }
        break;
      }
    }
  }
}