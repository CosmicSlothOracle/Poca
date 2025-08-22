import type { GameState, Player, Card } from '../types/game';
import { EK, EffectKey } from '../data/effectKeys';
import { MAX_AP } from '../utils/ap';

function normalizeEffectKey(card: any): EffectKey | undefined {
  const raw = String(card.effectKey || '').toLowerCase();
  if (raw) return raw as EffectKey;
  // Fallback-Mapping per Name (für Seed/Importer-Lücken)
  const name = String(card.name || '').toLowerCase();
  const map: Record<string, EffectKey> = {
    'symbolpolitik': EK.DRAW_1,
    'verzögerungsverfahren': EK.AP_PLUS_1,
    'verzoegerungsverfahren': EK.AP_PLUS_1,
    'think-tank': EK.THINK_TANK,
    'spin doctor': EK.SPIN_DOCTOR,
  };
  return map[name];
}

export function handleInstantInitiative(state: GameState, actor: Player, card: Card, log: (m: string) => void): void {
  const ek = normalizeEffectKey(card);
  if (!ek) {
    log(`❌ Initiative ohne effectKey (auch kein Fallback): ${card.name}`);
    return;
  }

  switch (ek) {
    case EK.DRAW_1: { // Symbolpolitik
      const deck = state.decks[actor];
      if (deck.length) {
        const drawn = deck.shift()!;
        state.hands[actor].push(drawn);
        log(`🃏 ${card.name}: +1 Karte gezogen (${drawn.name}).`);
      } else {
        log(`🃏 ${card.name}: Kein Nachziehstapel.`);
      }
      break;
    }

    case EK.AP_PLUS_1: { // Verzögerungsverfahren
      state.actionPoints[actor] = Math.min(4, (state.actionPoints[actor] ?? 0) + 1);
      log(`⏱️ ${card.name}: +1 AP (jetzt ${state.actionPoints[actor]}).`);
      break;
    }

    case EK.AP_MOD: {
      const delta = Number((card as any).apDelta ?? 0);
      const before = state.actionPoints[actor] ?? 0;
      const after = Math.max(0, Math.min(MAX_AP, before + delta));
      state.actionPoints[actor] = after;
      const s = delta >= 0 ? `+${delta}` : `${delta}`;
      log(`⏱️ ${card.name}: AP ${before} → ${after} (${s}).`);
      break;
    }

    case EK.THINK_TANK: {
      const deck = state.decks[actor];
      if (deck.length) {
        const drawn = deck.shift()!;
        state.hands[actor].push(drawn);
        log(`🧠 ${card.name}: +1 Karte (${drawn.name}).`);
      } else {
        log(`🧠 ${card.name}: Kein Nachziehstapel.`);
      }

      // Initialisiere effectFlags falls nicht vorhanden
      if (!state.effectFlags) {
        state.effectFlags = { 1: {} as any, 2: {} as any };
      }
      if (!state.effectFlags[actor]) {
        state.effectFlags[actor] = {} as any;
      }

      state.effectFlags[actor].nextGovPlus2 = true;
      log(`🧠 ${card.name}: Nächster Regierungs-Play erhält +2 I.`);
      break;
    }

    case EK.SPIN_DOCTOR: {
      const gov = state.board[actor].aussen.filter(c => c.kind === 'pol') as any[];
      if (!gov.length) {
        log(`ℹ️ ${card.name}: Keine Regierungs-Karte im Spiel.`);
        break;
      }

      gov.sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0));
      const target = gov[0];
      target.influence = (target.influence ?? 0) + 2;
      log(`🗞️ ${card.name}: +2 I auf ${target.name} (jetzt ${target.influence}).`);
      break;
    }

    default:
      log(`⚠️ Unbekannter effectKey: ${String(ek)} (${card.name})`);
  }
}
