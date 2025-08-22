import { useCallback } from 'react';
import { GameState, Card, Player, BuilderEntry } from '../types/game';
import { createDefaultEffectFlags } from '../types/game';
import { buildDeckFromEntries, sumGovernmentInfluenceWithAuras } from '../utils/gameUtils';
import { PRESET_DECKS } from '../data/gameData';
import { getCardActionPointCost, applyApRefundsAfterPlay, getNetApCost, canPlayCard, isInitiativeCard, isGovernmentCard } from '../utils/ap';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isNetZeroMove } from '../utils/ap';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { drawOne } from '../utils/draw';
import { triggerCardEffects } from '../effects/cards';
import { resolveQueue } from '../utils/queue';
import { applyStartOfTurnHooks } from '../utils/startOfTurnHooks';
import { checkTrapsOnOpponentPlay, registerTrap, isSystemrelevant, grantOneTimeProtection, isBoycottTrap } from '../utils/traps';
import { PoliticianCard } from '../types/game';

// Hilfsfunktion: stellt sicher, dass effectFlags vorhanden sind
const ensureFlags = (s: GameState, p: Player) => {
  if (!s.effectFlags) {
    (s as any).effectFlags = { 1: createDefaultEffectFlags(), 2: createDefaultEffectFlags() };
  } else {
    s.effectFlags[p] = { ...createDefaultEffectFlags(), ...s.effectFlags[p] };
  }
};

// Lane-Heuristik wie in playCard
const pickLane = (c: Card): 'innen'|'aussen' => {
  const tag = (c as any).tag;
  if (c.kind === 'pol' && (tag === 'Staatsoberhaupt' || tag === 'Regierungschef' || tag === 'Diplomat')) return 'aussen';
  return 'innen';
};

const isCardPlayableNow = (state: GameState, player: Player, card: Card): boolean => {
  if ((card as any).deactivated) return false;

  if (card.kind === 'pol') {
    const lane = pickLane(card);
    return state.board[player][lane].length < 5;
  }

  if (card.kind === 'spec') {
    const t = String((card as any).type || '').toLowerCase();
    if (t === 'öffentlichkeitskarte' || t === 'oeffentlichkeitskarte' || t === 'public') {
      return state.board[player].innen.length < 5;
    }
    if (t === 'dauerhaft-initiative') {
      const slot = 'government'; // wie bei dir „simplified"
      return !state.permanentSlots[player][slot];
    }
    // sonst: Fallen/Interventionen – aktuell immer erlaubt
    return true;
  }

  return false;
};

export const hasPlayableZeroCost = (state: GameState, player: Player): boolean => {
  for (const c of state.hands[player]) {
    const { cost } = getCardActionPointCost(state, player, c);
    if (cost === 0 && isCardPlayableNow(state, player, c)) return true;
  }
  return false;
};

// Helper function to apply auras for a player (instant updates for Joschka Fischer + NGO synergy)
function applyAurasForPlayer(state: GameState, player: Player, log?: (msg: string) => void) {
  const board = state.board[player];
  const hasNgo = board.innen.some(c =>
    c.kind === 'spec' &&
    (c as any).type === 'Öffentlichkeitskarte' &&
    (c as any).tag === 'NGO' &&
    !(c as any).deactivated
  );

  const newAussen = board.aussen.map(card => {
    if (card.kind !== 'pol') return card;
    const pol: any = { ...card };
    if (pol.baseInfluence == null) pol.baseInfluence = pol.influence;
    const prev = pol.influence as number;

    let bonus = 0;
    if (!pol.deactivated && pol.name === 'Joschka Fischer' && pol.effect === 'ngo_boost' && hasNgo) {
      bonus += 1;
    }
    pol.influence = (pol.baseInfluence as number) + bonus;
    if (log && pol.influence > prev) log(`PASSIV: ${pol.name} +${pol.influence - prev} I (jetzt ${pol.influence}).`);
    return pol;
  });

  state.board = {
    ...state.board,
    [player]: { ...state.board[player], aussen: newAussen },
  } as any;
}



// Helper function to check if round should end
function checkRoundEnd(gameState: GameState): boolean {
  // Round ends if both players have passed
  const result = gameState.passed[1] && gameState.passed[2];
  console.log(`🔧 DEBUG: checkRoundEnd - P1 passed: ${gameState.passed[1]}, P2 passed: ${gameState.passed[2]}, result: ${result}`);
  return result;
}

// Helper function to draw cards from deck
function drawCardsFromDeck(gameState: GameState, player: Player, count: number): Card[] {
  const deck = [...gameState.decks[player]];
  const drawnCards = deck.splice(0, Math.min(count, deck.length));
  return drawnCards;
}

// Helper function to really end a turn (extracted from nextTurn logic)
function reallyEndTurn(gameState: GameState, log: (msg: string) => void): GameState {
  const current = gameState.current;

  // Flag zurücksetzen - Zug-Ende wird jetzt wirklich durchgeführt
  gameState.isEndingTurn = false;

  // ✅ Karte nachziehen am Ende eines Zugs (nur wenn NICHT "pass")
  if (!gameState.passed[current]) {
    const drawnCard = gameState.decks[current].shift();
    if (drawnCard) {
      gameState.hands[current].push(drawnCard);
      log(`🔥 Zug-Ende: +1 Karte gezogen (${drawnCard.name})`);
    }
  } else {
    log(`⏭️ P${current} hat gepasst – kein Nachziehen.`);
  }

  // Check if round should end
  const shouldEndRound = checkRoundEnd(gameState);
  if (shouldEndRound) {
    log(`🏁 Runde ${gameState.round} wird beendet (Zug-Ende).`);
    return resolveRound(gameState, log);
  }

  // Spielerwechsel + AP/Actions reset
  const newCurrent: Player = current === 1 ? 2 : 1;
  gameState.current = newCurrent;
  gameState.actionPoints = { ...gameState.actionPoints, [newCurrent]: 2 };
  gameState.actionsUsed = { ...gameState.actionsUsed, [newCurrent]: 0 };
  gameState.passed = { ...gameState.passed, [newCurrent]: false };

  // Apply new start-of-turn hooks
  applyStartOfTurnHooks(gameState, newCurrent, log);

  // Reset turn-bezogener Flag-Nutzungen
  const f = gameState.effectFlags?.[newCurrent];
  if (f) {
    f.platformRefundUsed = false;
  }

  log(`🔄 Zug-Ende: Spieler ${newCurrent} ist am Zug (2 AP verfügbar)`);

  return gameState;
}

// Helper function to resolve round and start new one
function resolveRound(gameState: GameState, log: (msg: string) => void): GameState {
  // Calculate influence for both players
  const p1Influence = sumGovernmentInfluenceWithAuras(gameState, 1);
  const p2Influence = sumGovernmentInfluenceWithAuras(gameState, 2);

  log(`📊 Rundenauswertung: P1 ${p1Influence} Einfluss vs P2 ${p2Influence} Einfluss`);

  // Determine winner
  let roundWinner: Player;
  if (p1Influence > p2Influence) {
    roundWinner = 1;
    log(`🏆 Spieler 1 gewinnt die Runde! (${p1Influence} > ${p2Influence})`);
  } else if (p2Influence > p1Influence) {
    roundWinner = 2;
    log(`🏆 Spieler 2 gewinnt die Runde! (${p2Influence} > ${p1Influence})`);
  } else {
    // Tie - current player wins
    roundWinner = gameState.current;
    log(`🤝 Unentschieden! Spieler ${roundWinner} gewinnt als aktiver Spieler.`);
  }

  // Collect all cards to move to discard
  const cardsToDiscard: Card[] = [
    ...gameState.board[1].innen,
    ...gameState.board[1].aussen,
    ...gameState.board[2].innen,
    ...gameState.board[2].aussen,
    ...(gameState.permanentSlots[1].government ? [gameState.permanentSlots[1].government] : []),
    ...(gameState.permanentSlots[1].public ? [gameState.permanentSlots[1].public] : []),
    ...(gameState.permanentSlots[2].government ? [gameState.permanentSlots[2].government] : []),
    ...(gameState.permanentSlots[2].public ? [gameState.permanentSlots[2].public] : []),
    ...(gameState.instantSlot[1] ? [gameState.instantSlot[1]] : []),
    ...(gameState.instantSlot[2] ? [gameState.instantSlot[2]] : [])
  ];

  // Draw 5 new cards for each player
  const newP1Hand = drawCardsFromDeck(gameState, 1, 5);
  const newP2Hand = drawCardsFromDeck(gameState, 2, 5);

  // Calculate new rounds won
  const newRoundsWon = {
    ...gameState.roundsWon,
    [roundWinner]: gameState.roundsWon[roundWinner] + 1
  };

  // Check if game should end (Best of 3: first to 2 wins)
  const p1Wins = newRoundsWon[1];
  const p2Wins = newRoundsWon[2];

  if (p1Wins >= 2 || p2Wins >= 2) {
    const gameWinner = p1Wins >= 2 ? 1 : 2;
    log(`🏆🎉 SPIEL BEENDET! Spieler ${gameWinner} gewinnt das Match! (${p1Wins}-${p2Wins})`);
    log(`🔥 Gesamtergebnis: Player ${gameWinner} ist der Sieger!`);

    // Return final state with game winner
    return {
      ...gameState,
      roundsWon: newRoundsWon,
      gameWinner,
      // Keep current board state for final display
      passed: { 1: true, 2: true }, // Both passed to indicate game end
    };
  }

  // Create new state for next round
  const newState: GameState = {
    ...gameState,
    round: gameState.round + 1,
    current: roundWinner, // Winner starts next round
    passed: { 1: false, 2: false }, // Reset pass status
    actionPoints: { 1: 2, 2: 2 }, // Reset AP
    actionsUsed: { 1: 0, 2: 0 }, // Reset actions
    roundsWon: newRoundsWon,
    // Clear all board positions
    board: {
      1: { innen: [], aussen: [] },
      2: { innen: [], aussen: [] }
    },
    // Clear permanent and instant slots
    permanentSlots: {
      1: { government: null, public: null },
      2: { government: null, public: null }
    },
    instantSlot: { 1: null, 2: null },
    // New hands with 5 cards each
    hands: {
      1: newP1Hand,
      2: newP2Hand
    },
    // Update decks (cards were removed during drawing)
    decks: {
      1: gameState.decks[1].slice(newP1Hand.length),
      2: gameState.decks[2].slice(newP2Hand.length)
    },
    // Update discard pile
    discard: [...gameState.discard, ...cardsToDiscard]
  };

  log(`🆕 Runde ${newState.round} startet! Spieler ${roundWinner} beginnt. (Rundenstand: P1 ${newState.roundsWon[1]} - P2 ${newState.roundsWon[2]})`);
  log(`🃏 Beide Spieler erhalten 5 neue Handkarten.`);

  return newState;
}

export function useGameActions(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void
) {
  const startMatchWithDecks = useCallback((p1DeckEntries: BuilderEntry[], p2DeckEntries: BuilderEntry[]) => {
    const p1Cards = buildDeckFromEntries(p1DeckEntries);
    const p2Cards = buildDeckFromEntries(p2DeckEntries);

        // Debug: Log deck composition with detailed tag analysis
    const p1NgoCarten = p1Cards.filter(c => (c as any).tag === 'NGO');
    const p1PlatformCards = p1Cards.filter(c => (c as any).tag === 'Plattform');
    const p1JoschaCards = p1Cards.filter(c => (c as any).effect === 'ngo_boost');
    const p1PublicCards = p1Cards.filter(c => c.kind === 'spec' && (c as any).type === 'Öffentlichkeitskarte');

    log(`🔍 DECK DEBUG P1: ${p1Cards.length} Karten total`);
    log(`🧪 P1 Public Cards: ${p1PublicCards.map(c => `${c.name}${(c as any).tag ? `[${(c as any).tag}]` : ''}`).join(', ')}`);
    log(`🌱 P1 NGO-Karten: ${p1NgoCarten.length > 0 ? p1NgoCarten.map(c => c.name).join(', ') : 'Keine'}`);
    log(`💻 P1 Plattform-Karten: ${p1PlatformCards.length > 0 ? p1PlatformCards.map(c => c.name).join(', ') : 'Keine'}`);
    log(`🎯 JOSCHKA FISCHER: ${p1JoschaCards.length > 0 ? '✅ IM DECK' : '❌ NICHT IM DECK'}`);

    const d1 = [...p1Cards];
    const d2 = [...p2Cards];
    const h1 = d1.splice(0, Math.min(5, d1.length));
    const h2 = d2.splice(0, Math.min(5, d2.length));

    setGameState({
      ...gameState,
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      decks: { 1: d1, 2: d2 },
      hands: { 1: h1, 2: h2 },
      board: { 1: { innen: [], aussen: [] }, 2: { innen: [], aussen: [] } },
      traps: { 1: [], 2: [] },
      permanentSlots: {
        1: { government: null, public: null },
        2: { government: null, public: null },
      },
      instantSlot: { 1: null, 2: null },
      discard: [],
      shields: new Set(), // Set<UID>
      effectFlags: {
        1: {
          ...createDefaultEffectFlags(),
          freeInitiativeAvailable: true,
          govRefundAvailable: false,      // ✅ Start: kein Refund aktiv
        },
        2: {
          ...createDefaultEffectFlags(),
          freeInitiativeAvailable: true,
          govRefundAvailable: false,      // ✅ Start: kein Refund aktiv
        }
      },
      log: [
        `Match gestartet. P1 und P2 erhalten je ${h1.length}/${h2.length} Startkarten.`,
        `🔍 DECK DEBUG P1: ${p1Cards.length} Karten total`,
        `🧪 P1 Public Cards: ${p1PublicCards.map(c => `${c.name}${(c as any).tag ? `[${(c as any).tag}]` : ''}`).join(', ')}`,
        `🌱 P1 NGO-Karten: ${p1NgoCarten.length > 0 ? p1NgoCarten.map(c => c.name).join(', ') : 'Keine'}`,
        `💻 P1 Plattform-Karten: ${p1PlatformCards.length > 0 ? p1PlatformCards.map(c => c.name).join(', ') : 'Keine'}`,
        `🎯 JOSCHKA FISCHER: ${p1JoschaCards.length > 0 ? '✅ IM DECK' : '❌ NICHT IM DECK'}`,
        `📋 INITIAL BOARD P1: Regierung=[] | Öffentlichkeit=[]`,
        `📋 INITIAL BOARD P2: Regierung=[] | Öffentlichkeit=[]`,
        `🏠 PERMANENT SLOTS: Alle leer`
      ],
      activeRefresh: { 1: 0, 2: 0 },
    });
  }, [gameState, setGameState, log]);

  const startMatchVsAI = useCallback((p1DeckEntries: BuilderEntry[], presetKey: keyof typeof PRESET_DECKS = 'AUTORITAERER_REALIST') => {
    const p2DeckEntries = PRESET_DECKS[presetKey] as BuilderEntry[];
    startMatchWithDecks(p1DeckEntries, p2DeckEntries);
  }, [startMatchWithDecks]);

  const playCard = useCallback((player: Player, handIndex: number, lane?: 'innen' | 'aussen') => {
    setGameState(prev => {
      // Validate input parameters
      if (prev.current !== player) {
        log(`❌ ERROR: Not player turn - Current: ${prev.current}, Attempted: ${player}`);
        return prev;
      }

      const hand = prev.hands[player];
      if (handIndex < 0 || handIndex >= hand.length) {
        log(`❌ ERROR: Invalid hand index - Index: ${handIndex}, Hand length: ${hand.length}`);
        return prev;
      }

      // Debug: Log current hand contents with detailed tag info
      log(`🔍 HAND DEBUG P${player}: ${hand.map((c, i) => `${i}:${c.name}${(c as any).tag ? `[${(c as any).tag}]` : ''}`).join(', ')}`);
      const ngoCards = hand.filter(c => (c as any).tag === 'NGO');
      const platformCards = hand.filter(c => (c as any).tag === 'Plattform');
      if (ngoCards.length > 0) {
        log(`🌱 NGO-Karten in Hand P${player}: ${ngoCards.map(c => c.name).join(', ')}`);
      }
      if (platformCards.length > 0) {
        log(`💻 Plattform-Karten in Hand P${player}: ${platformCards.map(c => c.name).join(', ')}`);
      }

      // PATCH C: Beim Ausspielen NETTO verbuchen & Flags verbrauchen
      const selectedCard = hand[handIndex];
      if (!canPlayCard(prev, player, selectedCard)) {
        log('🚫 Kann Karte nicht spielen (Aktionslimit & nicht 0-AP).');
        return prev;
      }

      const { net } = getNetApCost(prev, player, selectedCard);

      // AP NETTO abziehen
      const newState = { ...prev };
      newState.actionPoints[player] = Math.max(0, prev.actionPoints[player] - net);

      // Aktionen nur bei net>0 erhöhen
      if (net > 0) {
        newState.actionsUsed[player] = (prev.actionsUsed[player] ?? 0) + 1;
      } else {
        log('🆓 Netto-0-Zug: keine Aktion verbraucht.');
      }

      // 🔧 Flags sicher initialisieren
      ensureFlags(newState, player);

      // Consume single-use flags
      if (isGovernmentCard(selectedCard) && newState.effectFlags[player].govRefundAvailable) {
        newState.effectFlags[player].govRefundAvailable = false;
      }

      if (isInitiativeCard(selectedCard) && (newState.effectFlags[player].nextInitiativeRefund ?? 0) > 0) {
        newState.effectFlags[player].nextInitiativeRefund!--;
      }

      // 🔧 Flags sicher initialisieren
      ensureFlags(newState, player);

      // Remove card from hand
      const newHand = [...newState.hands[player]];
      const [playedCard] = newHand.splice(handIndex, 1);
      newState.hands = { ...newState.hands, [player]: newHand };

      // Handle different card types
      if (playedCard.kind === 'pol') {
        const polCard = playedCard as any;
        const targetLane = lane || (polCard.tag === 'Staatsoberhaupt' || polCard.tag === 'Regierungschef' || polCard.tag === 'Diplomat' ? 'aussen' : 'innen');

        if (newState.board[player][targetLane].length >= 5) {
          log(`❌ ERROR: Lane full - Lane: ${targetLane}, Current: ${newState.board[player][targetLane].length}/5`);
          return prev;
        }

        // Add to board (immutable clone to avoid accidental double references)
        const laneArray = [...newState.board[player][targetLane], playedCard];
        const playerBoardCloned = { ...newState.board[player], [targetLane]: laneArray } as any;
        newState.board = { ...newState.board, [player]: playerBoardCloned } as any;
        log(`🃏 Player ${player}: ${playedCard.name} gespielt in ${targetLane === 'aussen' ? 'Regierung' : 'Öffentlichkeit'}`);

        // 3) Nachdem die Karte gelegt wurde: gegnerische Traps prüfen
        checkTrapsOnOpponentPlay(newState, player, playedCard, log);

        // 🎓 Think-tank / generischer Bonus konsumieren
        ensureFlags(newState, player);
        const pf = (newState.effectFlags as any)[player];
        if (pf.nextGovPlus2) {
          const laneRef = newState.board[player][targetLane] as any[];
          const justPlaced = laneRef[laneRef.length - 1];
          if (justPlaced && justPlaced.kind === 'pol') {
            if (justPlaced.baseInfluence == null) {
              // baseInfluence einfrieren (falls noch nicht gesetzt)
              justPlaced.baseInfluence = justPlaced.influence ?? 0;
            }
            justPlaced.baseInfluence += 2;        // dauerhaft
            justPlaced.influence = justPlaced.baseInfluence; // auf neue Basis setzen
            pf.nextGovPlus2 = false;
            log(`🧠 Think-tank: ${justPlaced.name} erhält dauerhaft +2 I-Basis (jetzt ${justPlaced.influence}).`);
          }
        }
        const govBonus = newState.effectFlags[player]?.nextGovernmentCardBonus ?? 0;
        if (govBonus > 0) {
          const laneRef = newState.board[player][targetLane] as any[];
          const justPlaced = laneRef[laneRef.length - 1];
          if (justPlaced && justPlaced.kind === 'pol') {
            if (justPlaced.baseInfluence == null) {
              justPlaced.baseInfluence = justPlaced.influence ?? 0;
            }
            justPlaced.baseInfluence += govBonus;
            justPlaced.influence = justPlaced.baseInfluence;
            newState.effectFlags[player].nextGovernmentCardBonus = 0;
            log(`🎓 Government-Bonus: ${justPlaced.name} erhält +${govBonus} Einfluss (einmalig).`);
          }
        }

        // 👉 Erst JETZT Auren anwenden (damit +2 Basis erhalten bleibt)
        applyAurasForPlayer(newState, player, log);

        // 6) Karteneffekte enqueuen + Queue auflösen
        triggerCardEffects(newState, player, playedCard, targetLane);
        resolveQueue(newState, log);

        // 🔄 Refund-Verbrauch NUR beim tatsächlichen Spielen

        // 1) Initiative: Refund-Becken teilweise/ganz abbauen
        if (isInitiativeCard(playedCard)) {
          const poolBefore = newState.effectFlags[player]?.nextInitiativeRefund ?? 0;
          if (poolBefore > 0) {
            const consumed = Math.min(1, poolBefore); // verbrauche bis zur Höhe der (rabattierten) Kosten
            newState.effectFlags[player].nextInitiativeRefund = Math.max(0, poolBefore - consumed);
            if (consumed > 0) {
              log(`🎟️ Initiative-Refund verbraucht: −${consumed} aus Becken (verblieben: ${newState.effectFlags[player].nextInitiativeRefund}).`);
            }
          }
        }



        // *** Karten-Soforteffekte (Beispiel Bill Gates -> Plattform-Refund für nächste Initiative) ***
        try {
          const name = (playedCard as any).name ?? '';
          if (name === 'Bill Gates') {
            const before = newState.effectFlags[player].nextInitiativeRefund ?? 0;
            newState.effectFlags[player].nextInitiativeRefund = before + 1;
            log(`🎟️ Bill Gates: nächste Initiative +1 AP Refund (Becken: ${before}→${newState.effectFlags[player].nextInitiativeRefund}).`);
          }
        } catch {}

        // 🔍 BOARD DEBUG: Zeige aktuelles Board nach dem Spielen
        const currentBoard = newState.board[player];
        const regierungKarten = currentBoard.aussen.map(c => `${c.name}[${c.kind === 'pol' ? (c as any).influence + 'I' : 'S'}]`);
        const öffentlichkeitKarten = currentBoard.innen.map(c => `${c.name}[${c.kind === 'spec' ? (c as any).tag || 'S' : 'P'}]`);
        log(`📋 P${player} BOARD: Regierung=[${regierungKarten.join(', ')}] | Öffentlichkeit=[${öffentlichkeitKarten.join(', ')}]`);

                // 🔥 JOSCHKA FISCHER NGO-EFFEKT: Jetzt als kontinuierlicher Aura-Effekt in sumRowWithAuras implementiert
        log(`🔍 DEBUG: Karte gespielt - Name: ${playedCard.name}, Tag: ${(playedCard as any).tag || 'Kein Tag'}, Lane: ${targetLane}, Kind: ${playedCard.kind}`);

        if ((playedCard as any).tag === 'NGO') {
          log(`🔍 NGO-Karte gespielt: ${playedCard.name} [NGO] - Kontinuierliche Aura-Effekte werden bei Rundenauswertung berechnet`);

          // 🎯 SOFORTIGE SYNERGIE-PRÜFUNG: Joschka Fischer + NGO
          const joschaFischer = currentBoard.aussen.find(card =>
            card.kind === 'pol' && (card as any).effect === 'ngo_boost'
          );

          if (joschaFischer) {
            log(`🔥🔥🔥 SYNERGIE AKTIVIERT! 🔥🔥🔥 Joschka Fischer + ${playedCard.name}[NGO] → +1 Einfluss bei Rundenauswertung`);
          }
        }

      } else if (playedCard.kind === 'spec') {
        const specCard = playedCard as any;
        const typeStr = String(specCard.type || '').toLowerCase();
        const isInitiative = /initiative/.test(typeStr); // matcht "Initiative", "Sofort-Initiative", etc.

                  // 1) Falls es eine "Systemrelevant" ist (sofortiger Buff auf letzte eigene Regierungskarte)
        if (isSystemrelevant(playedCard)) {
          const ownBoard = newState.board[player];
          const candidates = [...ownBoard.aussen, ...ownBoard.innen].filter(c => c.kind === 'pol') as PoliticianCard[];
          const target = candidates[candidates.length - 1]; // letzte eigene Regierungskarte
          if (target) {
            grantOneTimeProtection(target, log);
          } else {
            log('🛈 Systemrelevant: Keine eigene Regierungskarte im Spiel – Effekt verpufft.');
          }
          // danach die Spezialkarte normal entsorgen
          newState.discard.push(playedCard);
          return newState;
        }

        // 1) Dauerhaft-Initiative (Ongoing)
        if (typeStr.includes('dauerhaft')) {
          const slotType = 'government'; // ggf. später per specCard.slot dynamisch
          if (!newState.permanentSlots[player][slotType]) {
            newState.permanentSlots[player][slotType] = playedCard;
            log(`P${player} spielt ${playedCard.name} als Dauerhafte Initiative`);
          } else {
            log(`⚠️ WARN: Slot occupied - Slot ${slotType} already has ${newState.permanentSlots[player][slotType]?.name}`);
          }

          // 6) Karteneffekte enqueuen + Queue auflösen
          triggerCardEffects(newState, player, playedCard);
          resolveQueue(newState, log);

          // 🔄 Refund-Verbrauch für Dauerhaft-Initiative
          const poolBefore = newState.effectFlags[player]?.nextInitiativeRefund ?? 0;
          if (poolBefore > 0) {
            const consumed = Math.min(1, poolBefore);
            newState.effectFlags[player].nextInitiativeRefund = Math.max(0, poolBefore - consumed);
            if (consumed > 0) {
              log(`🎟️ Initiative-Refund verbraucht: −${consumed} aus Becken (verblieben: ${newState.effectFlags[player].nextInitiativeRefund}).`);
            }
          }
          return newState;
        }

        // 2) Sofort-/Sofort-Initiativen (Instant)
        if (isInitiative) {
          if (!specCard.effectKey) {
            log(`❌ Initiative ohne effectKey: ${specCard.name}`);
          } else {
            log(`🧩 INIT: ${specCard.name} [${String(specCard.effectKey)}] gespielt`);
          }

          // Initiative in den Ablagestapel
          newState.discard = [...newState.discard, playedCard];
          log(`P${player} spielt Initiative: ${playedCard.name}`);

          // 6) Karteneffekte enqueuen + Queue auflösen
          triggerCardEffects(newState, player, playedCard);
          resolveQueue(newState, log);

          // 🔄 Refund-Verbrauch für Instant-Initiative
          const poolBefore = newState.effectFlags[player]?.nextInitiativeRefund ?? 0;
          if (poolBefore > 0) {
            const consumed = Math.min(1, poolBefore);
            newState.effectFlags[player].nextInitiativeRefund = Math.max(0, poolBefore - consumed);
            if (consumed > 0) {
              log(`🎟️ Initiative-Refund verbraucht: −${consumed} aus Becken (verblieben: ${newState.effectFlags[player].nextInitiativeRefund}).`);
            }
          }
          return newState;
        }

        // 3) Öffentlichkeit (Public)
        if (
          typeStr === 'öffentlichkeitskarte' ||
          typeStr === 'oeffentlichkeitskarte' ||
          typeStr === 'öffentlichkeit' ||
          typeStr === 'public'
        ) {
          if (newState.board[player].innen.length < 5) {
            const innenArray = [...newState.board[player].innen, playedCard];
            const playerBoardCloned = { ...newState.board[player], innen: innenArray } as any;
            newState.board = { ...newState.board, [player]: playerBoardCloned } as any;
            log(`P${player} spielt ${playedCard.name} in Öffentlichkeit`);

            // Sofort Auren prüfen (z.B. JF +1, wenn JF schon liegt)
            applyAurasForPlayer(newState, player, log);

            // 6) Karteneffekte enqueuen + Queue auflösen
            triggerCardEffects(newState, player, playedCard, 'innen');
            resolveQueue(newState, log);

            // 3) Nachdem die Karte gelegt wurde: gegnerische Traps prüfen
            checkTrapsOnOpponentPlay(newState, player, playedCard, log);

            // 🔥 PUBLIC CARD EFFECTS - Passive effects when played

            // Helper function to draw a card for the player
            const drawCardForPlayer = (cardName: string) => {
              if (newState.decks[player].length > 0) {
                const drawnCard = newState.decks[player].shift();
                if (drawnCard) {
                  newState.hands[player].push(drawnCard);
                  log(`🔥 ${cardName.toUpperCase()} EFFEKT: +1 Karte gezogen (${drawnCard.name})`);
                  return true;
                }
              }
              return false;
            };

            if (specCard.name === 'Elon Musk') {
              // Effect: "Ziehe 1 Karte. Deine erste Initiative pro Runde kostet 1 Aktionspunkt weniger."
              drawCardForPlayer('Elon Musk');
              // 🔥 QUEUE-SYSTEM: Erste Initiative pro Runde → Refund wird über triggerCardEffects gehandhabt

            } else if (specCard.name === 'Bill Gates') {
              // Effect: "Ziehe 1 Karte. Deine nächste Initiative kostet 1 Aktionspunkt weniger."
              drawCardForPlayer('Bill Gates');
              // 🔥 QUEUE-SYSTEM: Nächste Initiative → Refund wird über triggerCardEffects gehandhabt

            } else if (specCard.name === 'Jeff Bezos') {
              // Effect: "Ziehe 1 Karte beim Ausspielen. Wenn eine Plattform liegt: +1 Aktionspunkt."
              drawCardForPlayer('Jeff Bezos');
              const hasPlatform = newState.board[player].innen.some(c =>
                c.kind === 'spec' && (c as any).tag === 'Plattform'
              );
              if (hasPlatform) {
                newState.actionPoints[player] = Math.min(4, newState.actionPoints[player] + 1);
                log(`🔥 JEFF BEZOS: +1 AP durch Plattform-Synergie! (${newState.actionPoints[player] - 1} → ${newState.actionPoints[player]})`);
              }

            } else if (specCard.name === 'Warren Buffett') {
              // Effect: "Ziehe 1 Karte. Bei einer Wirtschafts-Initiative: +1 Effekt."
              drawCardForPlayer('Warren Buffett');
              // TODO: Implement "Wirtschafts-Initiative +1 Effect" logic
              log(`📊 WARREN BUFFETT: Bei Wirtschafts-Initiativen +1 Effekt! (TODO: Implementierung)`);

            } else if (specCard.name === 'Gautam Adani') {
              // Effect: "Ziehe 1 Karte. Bei einer Infrastruktur-Initiative: +1 Effekt."
              drawCardForPlayer('Gautam Adani');
              // TODO: Implement "Infrastruktur-Initiative +1 Effect" logic
              log(`📊 GAUTAM ADANI: Bei Infrastruktur-Initiativen +1 Effekt! (TODO: Implementierung)`);

            } else if (specCard.name === 'Zhang Yiming') {
              // Effect: "Ziehe 1 Karte. Bei Medien auf dem Feld: -1 Aktionspunkt auf deine nächste Initiative."
              drawCardForPlayer('Zhang Yiming');
              const hasMedia = newState.board[player].innen.some(c =>
                c.kind === 'spec' && (c as any).tag === 'Medien'
              );
              if (hasMedia) {
                // TODO: Implement "nächste Initiative -1 AP" logic
                log(`🔥 ZHANG YIMING: Nächste Initiative kostet 1 AP weniger durch Medien-Synergie! (TODO: Implementierung)`);
              }

            } else if (specCard.name === 'George Soros') {
              // Effect: "+1 Aktionspunkt wenn der Gegner eine autoritäre Regierungskarte hat."
              const opponent = player === 1 ? 2 : 1;
              const hasAuthoritarianCard = newState.board[opponent].aussen.some(card => {
                const polCard = card as any;
                return polCard.tag === 'Staatsoberhaupt' && polCard.influence >= 8; // High influence leaders
              });

              if (hasAuthoritarianCard) {
                newState.actionPoints[player] = Math.min(4, newState.actionPoints[player] + 1);
                log(`🔥 GEORGE SOROS EFFEKT: +1 AP durch autoritäre Regierung des Gegners!`);
                log(`📊 SOROS: Aktionspunkte ${newState.actionPoints[player] - 1} → ${newState.actionPoints[player]}`);
              } else {
                log(`💭 George Soros: Keine autoritären Karten beim Gegner - Effekt nicht ausgelöst`);
              }
            }

            // 🔗 NGO-Synergie: Wenn eine NGO gelegt wird und Joschka Fischer liegt, erhält P${player} +1 Einfluss (Rundenauswertung)
            if ((specCard as any).tag === 'NGO') {
              const hasJoschka = newState.board[player].aussen.some(c => c.kind === 'pol' && (c as any).name === 'Joschka Fischer' && !(c as any).deactivated);
              if (hasJoschka) {
                log(`🔥🔥🔥 SYNERGIE AKTIVIERT! 🔥🔥🔥 Joschka Fischer + ${playedCard.name}[NGO] → +1 Einfluss bei Rundenauswertung`);
              }
            }
          } else {
            log(`❌ ERROR: Lane full - Öffentlichkeit ist voll (5/5)`);
          }

          // 🔥 AP-REFUNDS nach dem Kartenspielen anwenden
          applyApRefundsAfterPlay(newState, player, selectedCard);
          return newState;
        }

                  // 4) Default: Traps/Interventions
        // Falls "Boykott-Kampagne" als Trap gelegt wird
        if (isBoycottTrap(playedCard)) {
          registerTrap(newState, player, playedCard, log);
          // NICHT sofort checken – sie wartet auf den Gegner
          return newState;
        }

        newState.traps[player] = [...newState.traps[player], playedCard];
        log(`P${player} spielt ${playedCard.name} als ${specCard.type}`);

        // 6) Karteneffekte enqueuen + Queue auflösen
        triggerCardEffects(newState, player, playedCard);
        resolveQueue(newState, log);

        // 🔥 AP-REFUNDS nach dem Kartenspielen anwenden
        applyApRefundsAfterPlay(newState, player, selectedCard);
        return newState;
      }

      // 6) Karteneffekte enqueuen + Queue auflösen (fallback für unbekannte Kartentypen)
      triggerCardEffects(newState, player, selectedCard);
      resolveQueue(newState, log);

      // 🔥 AP-REFUNDS nach dem Kartenspielen anwenden
      applyApRefundsAfterPlay(newState, player, selectedCard);

            // 🔧 TURN MANAGEMENT: Nur wechseln, wenn 2 Aktionen verbraucht UND keine 0-AP-Plays mehr möglich
      if (newState.actionsUsed[player] >= 2) {
        const stillHasFree = hasPlayableZeroCost(newState, player);
        if (stillHasFree) {
          log('⏸️ Aktionenlimit 2/2 erreicht, aber 0-AP-Züge verfügbar → Du kannst weiterspielen oder „Zug beenden".');
        } else {
          const shouldEndRound = checkRoundEnd(newState);
          if (shouldEndRound) {
            log(`🏁 Runde ${newState.round} wird beendet (nach 2 Aktionen von Spieler ${player}).`);
            return resolveRound(newState, log);
          }
          const newCurrent: Player = player === 1 ? 2 : 1;
          if (newState.passed[newCurrent]) {
            log(`🏁 Runde ${newState.round} wird beendet (Spieler ${newCurrent} hatte bereits gepasst).`);
            return resolveRound(newState, log);
          }
          newState.current = newCurrent;
          newState.actionPoints = { ...newState.actionPoints, [newCurrent]: 2 };
          newState.actionsUsed = { ...newState.actionsUsed, [newCurrent]: 0 };

          // Apply new start-of-turn hooks
          applyStartOfTurnHooks(newState, newCurrent, log);

          log(`🔄 Auto-Turnwechsel: Spieler ${newCurrent} ist am Zug (2 AP verfügbar)`);
        }
      }

      // POST-PLAY: Rabatt-Verbrauch & Plattform-Refund (falls vorhanden)
      {
        const f = newState.effectFlags[player];
        const kind = (selectedCard as any)?.kind ?? '';
        const typeStr = (selectedCard as any)?.type ?? '';
        const isInitiative = kind === 'spec' && /initiative/i.test(typeStr);

        if (isInitiative && f?.nextInitiativeDiscounted) {
          f.nextInitiativeDiscounted = false;
          log('🎟️ Rabatt verbraucht: "nächste Initiative -1 AP" deaktiviert.');
        }
        if (isInitiative && f?.platformRefundAvailable && !f.platformRefundUsed) {
          const ap0 = newState.actionPoints[player] ?? 0;
          newState.actionPoints[player] = Math.min(4, ap0 + 1);
          f.platformRefundUsed = true;
          log(`♻️ Plattform-Refund: +1 AP (${ap0}→${newState.actionPoints[player]}) — 1x pro Zug.`);
        }

        // ✅ Greta-Refund nur einmal pro Zug
        if (isGovernmentCard(selectedCard) && newState.effectFlags?.[player]?.govRefundAvailable) {
          newState.effectFlags[player].govRefundAvailable = false;
        }
      }

      return newState;
    });
  }, [setGameState, log]);

  const endTurn = useCallback((reason: 'button_end_turn' | 'auto' = 'button_end_turn') => {
    setGameState((prev): GameState => {
      const current = prev.current;

      // 1) Schon im Abschluss? -> Nichts tun (Idempotenz)
      if (prev.isEndingTurn) {
        log('🔁 Zugabschluss läuft bereits – warte auf Queue.');
        return prev;
      }

      const newState = { ...prev, isEndingTurn: true };

      // 2) Hängen noch Effekte in der Queue? -> Auflösen lassen
      if (newState._effectQueue && newState._effectQueue.length > 0) {
        log('⏳ Effekte werden noch aufgelöst – Zugwechsel folgt automatisch.');
        resolveQueue(newState, log);
        // Nach Queue-Auflösung: Wenn Flag noch gesetzt, Zug beenden
        if (newState.isEndingTurn) {
          return reallyEndTurn(newState, log);
        }
        return newState;
      }

      // 3) Keine Effekte mehr -> sofort beenden
      return reallyEndTurn(newState, log);
    });
  }, [setGameState, log]);

  // Legacy: nextTurn als Alias für endTurn für Kompatibilität
  const nextTurn = useCallback(() => {
    endTurn('auto');
  }, [endTurn]);

    const passTurn = useCallback((player: Player) => {
    console.log(`🔧 DEBUG: passTurn called for player ${player}`);

    setGameState(prev => {
      console.log(`🔧 DEBUG: passTurn setState - current: ${prev.current}, player: ${player}`);

      if (prev.current !== player) {
        console.log(`🔧 DEBUG: Wrong player turn - current: ${prev.current}, attempted: ${player}`);
        return prev;
      }

      const newState = { ...prev, passed: { ...prev.passed, [player]: true } };
      console.log(`🔧 DEBUG: Pass status updated - P1: ${newState.passed[1]}, P2: ${newState.passed[2]}`);
      log(`🚫 Spieler ${player} passt.`);

      // ❗ Kein Nachziehen bei Pass:
      // Der passierende Spieler kommt in dieser Runde nicht mehr dran.
      // Die nächste Runde startet ohnehin mit 5 neuen Handkarten.

      // Check if round should end (both players passed)
      const shouldEndRound = checkRoundEnd(newState);
      console.log(`🔧 DEBUG: Should end round? ${shouldEndRound}`);

      if (shouldEndRound) {
        log(`🏁 Runde ${newState.round} wird beendet und ausgewertet.`);
        return resolveRound(newState, log);
      } else {
        // Switch turn to other player for their final chance
        const otherPlayer: Player = player === 1 ? 2 : 1;
        console.log(`🔧 DEBUG: Switching to other player ${otherPlayer}, has passed: ${newState.passed[otherPlayer]}`);

        // Only switch if other player hasn't passed yet
        if (!newState.passed[otherPlayer]) {
          newState.current = otherPlayer;
          newState.actionPoints = { ...newState.actionPoints, [otherPlayer]: 2 };
          newState.actionsUsed = { ...newState.actionsUsed, [otherPlayer]: 0 };

          // Apply new start-of-turn hooks
          applyStartOfTurnHooks(newState, otherPlayer, log);

          log(`⏭️ Spieler ${otherPlayer} hat noch einen letzten Zug.`);
          console.log(`🔧 DEBUG: Turn switched to player ${otherPlayer}`);
        } else {
          // Both players have passed now, end round
          log(`🏁 Runde ${newState.round} wird beendet (beide Spieler haben gepasst).`);
          return resolveRound(newState, log);
        }
      }

      return newState;
    });
  }, [setGameState, log]);

  return {
    startMatchWithDecks,
    startMatchVsAI,
    playCard,
    nextTurn,
    endTurn,
    passTurn,
  };
}
