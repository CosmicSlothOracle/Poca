import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Card, PoliticianCard, Player, Lane } from '../types/game';
import { LAYOUT, getZone, computeSlotRects, getUiTransform, getLaneCapacity, getPublicRects, getGovernmentRects, getSofortRect } from '../ui/layout';
import { drawCardImage, sortHandCards } from '../utils/gameUtils';
import { getNetApCost } from '../utils/ap';

interface GameCanvasProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  onCardClick: (data: any) => void;
  onCardHover: (data: any) => void;
  devMode?: boolean; // 🔧 DEV MODE: Show P2 hand when true
}



export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  selectedHandIndex,
  onCardClick,
  onCardHover,
  devMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clickZonesRef = useRef<Array<{ x: number; y: number; w: number; h: number; data: any }>>([]);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);



  const drawCardAt = useCallback((
    ctx: CanvasRenderingContext2D,
    card: Card,
    x: number,
    y: number,
    size: number,
    selected: boolean = false,
    showAPCost: boolean = false,
    player?: Player
  ) => {
    let dx = x, dy = y, s = size;
    if (selected) {
      s = Math.floor(size * 1.05);
      dx = x - Math.floor((s - size) / 2);
      dy = y - Math.floor((s - size) / 2);
    }

    drawCardImage(ctx, card, dx, dy, s, 'ui');

    // Status-Indikatoren (für alle Board-Karten)
    // Einfluss-Wert unten links – nur für Politiker
    if ((card as any).kind === 'pol') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(dx, dy + s - 22, s, 22);
      ctx.fillStyle = '#D7E7F8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${(card as any).influence ?? 0}`, dx + 8, dy + s - 6);
    }
    // Schutz-Status (blauer Punkt)
    if ((card as any).protected || ((card as any).shield ?? 0) > 0) {
      ctx.fillStyle = '#1da1f2';
      ctx.fillRect(dx + s - 22, dy + 6, 16, 16);
    }
    // Deaktiviert-Status (roter Punkt)
    if ((card as any).deactivated) {
      ctx.fillStyle = '#b63838';
      ctx.fillRect(dx + s - 22, dy + 26, 16, 16);
    }

    // Netto-AP Badge anzeigen (modern) - nur für Handkarten
    if (showAPCost && player) {
      const apInfo = getNetApCost(gameState, player, card, 'innen'); // Default auf innen
      const netText = `⚡${apInfo.net}`;

      // Badge-Größe berechnen
      const badgeHeight = Math.max(16, Math.floor(s * 0.12));
      const badgeWidth = badgeHeight * 2;
      const badgeX = dx + s - badgeWidth - 6;
      const badgeY = dy + 6;

      // Badge-Hintergrund (grün für 0 AP, gelb für > 0)
      const bgColor = apInfo.net === 0 ? '#E7F8EF' : '#FFF7E6';
      const borderColor = apInfo.net === 0 ? '#10b981' : '#f59e0b';

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();

      // Badge-Rand
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Text
      ctx.fillStyle = apInfo.net === 0 ? '#065f46' : '#92400e';
      ctx.font = `bold ${Math.floor(badgeHeight * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(netText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

      // Reset text align
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    // Auswahl-Rahmen
    if (selected) {
      ctx.strokeStyle = '#61dafb';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx + 1, dy + 1, s - 2, s - 2);
      ctx.lineWidth = 1;
    }

    // Return exact 256x256 click zone over the card
    // Since all cards are 256x256, the click zone should match exactly
    return { x: dx, y: dy, w: 256, h: 256 };
  }, [gameState]);







  // Slot-Benennungs-Funktion basierend auf Glossar
  const getSlotDisplayName = useCallback((zoneId: string, index: number, player: Player): string => {
    const slotNumber = index + 1;

    if (zoneId.includes('government')) {
      if (zoneId.includes('player')) {
        return `Regierungsreihe Slot ${slotNumber}`;
      } else {
        return `Gegner Regierung Slot ${slotNumber}`;
      }
    } else if (zoneId.includes('public')) {
      if (zoneId.includes('player')) {
        return `Öffentlichkeitsreihe Slot ${slotNumber}`;
      } else {
        return `Gegner Öffentlichkeit Slot ${slotNumber}`;
      }
    } else if (zoneId.includes('permanent.government')) {
      if (zoneId.includes('player')) {
        return 'Regierung Spezial-Slot';
      } else {
        return 'Gegner Regierung Spezial-Slot';
      }
    } else if (zoneId.includes('permanent.public')) {
      if (zoneId.includes('player')) {
        return 'Öffentlichkeit Spezial-Slot';
      } else {
        return 'Gegner Öffentlichkeit Spezial-Slot';
      }
    } else if (zoneId.includes('instant')) {
      if (zoneId.includes('player')) {
        return 'Sofort-Slot';
      } else {
        return 'Gegner Sofort-Slot';
      }
    } else if (zoneId.includes('hand')) {
      return 'Hand';
    } else if (zoneId.includes('interventions')) {
      return 'Interventionen';
    }

    return `Slot ${slotNumber}`;
  }, []);

  const drawLane = useCallback((
    ctx: CanvasRenderingContext2D,
    zoneId: string,
    player: Player,
    lane: Lane,
    clickable: boolean
  ) => {
    const zone = getZone(zoneId);
    if (!zone) return;

    const slots = computeSlotRects(zone);
    const arr = gameState.board[player][lane];

    slots.forEach((s, idx) => {
      const card = arr[idx];

      // Hintergrundfarbe nach Kategorie
      let bgColor = 'rgba(0,0,0,0.1)'; // Standard
      if (zoneId.includes('government')) {
        bgColor = 'rgba(255, 197, 0, 0.15)'; // Hellgelb für Regierung
      } else if (zoneId.includes('public')) {
        bgColor = 'rgba(0, 255, 0, 0.15)'; // Hellgrün für Öffentlichkeit
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(s.x, s.y, s.w, s.h);

      // Slot-Rahmen
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);

      if (card) {
        const isSelected = player === 1 && selectedHandIndex !== null && gameState.hands[1][selectedHandIndex] === card;
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, isSelected, false);

        // Kartenname unter dem Slot anzeigen
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const textY = s.y + s.h + 16;
        ctx.fillText(card.name, s.x + s.w/2, textY);

        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'board_card', player, lane, index: idx, card }
        });
      } else if (clickable && gameState.current === player) {
        // Slot-Benennung anzeigen (für den aktuellen Spieler)
        const slotName = getSlotDisplayName(zoneId, idx, player);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const textY = s.y + s.h/2;
        ctx.fillText(slotName, s.x + s.w/2, textY);

        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
          data: { type: 'row_slot', lane, index: idx }
        });
      }
    });
  }, [gameState, selectedHandIndex, drawCardAt, getSlotDisplayName]);

  const drawHandP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    const hand = sortHandCards(gameState.hands[1]);
    const zone = getZone('hand.player');
    if (!zone) return;

    const slots = computeSlotRects(zone);
    slots.forEach((s: { x: number; y: number; w: number; h: number }, i: number) => {
      const card = hand[i];
      if (!card) return;
      // Find original index in unsorted hand for click handling
      const originalIndex = gameState.hands[1].findIndex(c => c.uid === card.uid);
      const isSel = selectedHandIndex === originalIndex;
      const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, isSel, true, 1); // Show AP cost for player 1 hand
      clickZonesRef.current.push({ ...clickZone, data: { type: 'hand_p1', index: originalIndex, card } });
    });
  }, [gameState.hands, selectedHandIndex, drawCardAt]);

      // 🔧 DEV MODE: Player 2 Hand (rechts unten, kompakter)
  const drawHandP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    const hand = sortHandCards(gameState.hands[2]);
    const zone = getZone('hand.opponent');
    if (!zone) return;

    const slots = computeSlotRects(zone);

    // Hintergrund für P2 Hand
    const [x, y, w, h] = zone.rectPx;
    ctx.fillStyle = 'rgba(255, 100, 100, 0.15)'; // Rötlicher Hintergrund für P2
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    // Label für P2 Hand
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Player 2 Hand', x + w/2, y - 8);

    slots.forEach((s: { x: number; y: number; w: number; h: number }, i: number) => {
      const card = hand[i];
      if (!card) return;
      // Find original index in unsorted hand for click handling
      const originalIndex = gameState.hands[2].findIndex(c => c.uid === card.uid);
      const isSel = gameState.current === 2 && selectedHandIndex === originalIndex;
      const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, isSel, true, 2); // Show AP cost for player 2 hand
      clickZonesRef.current.push({ ...clickZone, data: { type: 'hand_p2', index: originalIndex, card } });
    });
  }, [gameState, selectedHandIndex, drawCardAt]);
  // Interventions strip (player traps)
  const drawInterventionsP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    const traps = gameState.traps[1] || [];
    const zone = getZone('interventions.player');
    if (!zone) return;

    // Single intervention slot
    const [zx, zy, zw, zh] = zone.rectPx;
    const card = traps[0]; // Only first trap

    // Hintergrund für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.15)'; // Lavendelfarben für Interventionen
    ctx.fillRect(zx, zy, zw, zh);
    ctx.strokeStyle = 'rgba(200, 160, 255, 0.3)';
    ctx.strokeRect(zx + 0.5, zy + 0.5, zw - 1, zh - 1);

    // Slot-Benennung für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Intervention', zx + 8, zy + zh - 6);

    if (card) {
      const clickZone = drawCardAt(ctx, card, zx, zy, zw, false, false);
      clickZonesRef.current.push({ ...clickZone, data: { type: 'trap_p1', index: 0, card } });
    }
  }, [gameState.traps, drawCardAt]);

  // Interventions strip (opponent traps)
  const drawInterventionsP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    const traps = gameState.traps[2] || [];
    const zone = getZone('interventions.opponent');
    if (!zone) return;

    // Single intervention slot
    const [zx, zy, zw, zh] = zone.rectPx;
    const card = traps[0]; // Only first trap

    // Hintergrund für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.15)'; // Lavendelfarben für Interventionen
    ctx.fillRect(zx, zy, zw, zh);
    ctx.strokeStyle = 'rgba(200, 160, 255, 0.3)';
    ctx.strokeRect(zx + 0.5, zy + 0.5, zw - 1, zh - 1);

    // Slot-Benennung für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Intervention', zx + 8, zy + zh - 6);

    if (card) {
      const clickZone = drawCardAt(ctx, card, zx, zy, zw, false, false);
      clickZonesRef.current.push({ ...clickZone, data: { type: 'trap_p2', index: 0, card } });
    }
  }, [gameState.traps, drawCardAt]);

  // Single slot drawing function
  const drawSingleSlot = useCallback((
    ctx: CanvasRenderingContext2D,
    zoneId: string,
    card: Card | null,
    clickType: string,
    player: Player
  ) => {
    const zone = getZone(zoneId);
    if (!zone) return;
    const [x, y, w, h] = zone.rectPx;

    // Hintergrundfarbe nach Kategorie
    let bgColor = 'rgba(0,0,0,0.1)'; // Standard
    if (zoneId.includes('government')) {
      bgColor = 'rgba(255, 197, 0, 0.15)'; // Hellgelb für Regierung
    } else if (zoneId.includes('public')) {
      bgColor = 'rgba(0, 255, 0, 0.15)'; // Hellgrün für Öffentlichkeit
    } else if (zoneId.includes('instant')) {
      bgColor = 'rgba(127, 116, 91, 0.15)'; // Neutral für Sofort-Slots
    } else if (zoneId.includes('permanent')) {
      // Unterscheide zwischen government und public permanent slots
      if (zoneId.includes('government')) {
        bgColor = 'rgba(255, 197, 0, 0.15)';
      } else if (zoneId.includes('public')) {
        bgColor = 'rgba(0, 255, 0, 0.15)';
      }
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    // Draw slot border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    if (card) {
      const isSelected = player === 1 && selectedHandIndex !== null && gameState.hands[1][selectedHandIndex] === card;
      const clickZone = drawCardAt(ctx, card, x, y, w, isSelected, false);

      // Kartenname unter dem Slot anzeigen
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const textY = y + h + 16;
      ctx.fillText(card.name, x + w/2, textY);

      clickZonesRef.current.push({ ...clickZone, data: { type: 'slot_card', slot: clickType, card } });

      // 🔧 NEU: Sofort-Initiative-Slots sind klickbar für Aktivierung
      if (clickType === 'instant' && gameState.current === player) {
        clickZonesRef.current.push({
          x, y, w, h,
          data: { type: 'activate_instant', player, card }
        });
      }
    } else if (gameState.current === player) {
      // Slot-Benennung für leere Slots anzeigen (für den aktuellen Spieler)
      const slotName = getSlotDisplayName(zoneId, 0, player);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      const textY = y + h/2;
      ctx.fillText(slotName, x + w/2, textY);

      clickZonesRef.current.push({ x, y, w, h, data: { type: 'empty_slot', slot: clickType } });
    }
  }, [selectedHandIndex, gameState, drawCardAt, getSlotDisplayName]);

  // Draw permanent slots for player
  const drawPermanentSlotsP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    drawSingleSlot(ctx, 'slot.permanent.government.player', gameState.permanentSlots[1].government, 'permanent_government', 1);
    drawSingleSlot(ctx, 'slot.permanent.public.player', gameState.permanentSlots[1].public, 'permanent_public', 1);
  }, [gameState.permanentSlots, drawSingleSlot]);

  // Draw permanent slots for opponent
  const drawPermanentSlotsP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    drawSingleSlot(ctx, 'slot.permanent.government.opponent', gameState.permanentSlots[2].government, 'permanent_government', 2);
    drawSingleSlot(ctx, 'slot.permanent.public.opponent', gameState.permanentSlots[2].public, 'permanent_public', 2);
  }, [gameState.permanentSlots, drawSingleSlot]);

  // Draw instant slots
  const drawInstantSlots = useCallback((ctx: CanvasRenderingContext2D) => {
    // Sofort-Initiative-Slots aus dem Board zeichnen
    const sofortPlayerCard = gameState.board[1].sofort[0];
    const sofortOppCard = gameState.board[2].sofort[0];

    drawSingleSlot(ctx, 'slot.instant.player', sofortPlayerCard, 'instant', 1);
    drawSingleSlot(ctx, 'slot.instant.opponent', sofortOppCard, 'instant', 2);
  }, [gameState.board, drawSingleSlot]);

  // Aktive Schlüsselwörter und Unterkategorien ermitteln
  const getActiveKeywordsAndSubcategories = useCallback((player: Player) => {
    const board = gameState.board[player];
    const permanentSlots = gameState.permanentSlots[player];
    const allCards = [
      ...board.innen,
      ...board.aussen,
      permanentSlots.government,
      permanentSlots.public
    ].filter(c => c && c.kind === 'pol') as PoliticianCard[];

    const keywords = new Set<string>();
    const subcategories = new Set<string>();

    allCards.forEach(card => {
      if (!card.deactivated) {
        // Regierungskarten-Schlüsselwörter
        if (card.tag === 'Leadership') {
          keywords.add('Leadership');
        }
        if (card.tag === 'Diplomat') {
          keywords.add('Diplomat');
        }

        // Öffentlichkeits-Unterkategorien (für Karten in Öffentlichkeitsreihe)
        if (board.innen.includes(card)) {
          const publicCard = card as any;
          if (publicCard.tag) {
            // Oligarch
            const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'];
            if (oligarchNames.includes(publicCard.name)) {
              subcategories.add('Oligarch');
            }

            // Plattform
            const platformNames = ['Mark Zuckerberg', 'Tim Cook', 'Sam Altman', 'Jack Ma'];
            if (platformNames.includes(publicCard.name)) {
              subcategories.add('Plattform');
            }

            // Bewegung
            const movementNames = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
            if (movementNames.includes(publicCard.name)) {
              subcategories.add('Bewegung');
            }

            // NGO/Think-Tank
            const ngoNames = ['Bill Gates', 'George Soros', 'Jennifer Doudna', 'Noam Chomsky', 'Anthony Fauci'];
            if (ngoNames.includes(publicCard.name)) {
              subcategories.add('NGO/Think-Tank');
            }

            // Intelligenz
            const intelligenceNames = ['Jennifer Doudna', 'Noam Chomsky', 'Edward Snowden', 'Julian Assange', 'Yuval Noah Harari', 'Ai Weiwei', 'Alexei Navalny', 'Anthony Fauci'];
            if (intelligenceNames.includes(publicCard.name)) {
              subcategories.add('Intelligenz');
            }

            // Medien
            const mediaNames = ['Oprah Winfrey'];
            if (mediaNames.includes(publicCard.name)) {
              subcategories.add('Medien');
            }
          }
        }
      }
    });

    return {
      keywords: Array.from(keywords),
      subcategories: Array.from(subcategories)
    };
  }, [gameState]);

  // Info-Panels zeichnen
  const drawInfoPanels = useCallback((ctx: CanvasRenderingContext2D) => {
    const { keywords, subcategories } = getActiveKeywordsAndSubcategories(1);

    // Panel für Regierungsschlüsselwörter (rechts neben Regierungsslots)
    const govPanelX = 1640 + 256 + 20; // Nach dem letzten permanenten Slot
    const govPanelY = 300; // Auf Höhe der Regierungsslots
    const govPanelW = 120;
    const govPanelH = 256;

    // Regierungspanel Hintergrund
    ctx.fillStyle = 'rgba(255, 197, 0, 0.15)';
    ctx.fillRect(govPanelX, govPanelY, govPanelW, govPanelH);
    ctx.strokeStyle = 'rgba(255, 197, 0, 0.3)';
    ctx.strokeRect(govPanelX + 0.5, govPanelY + 0.5, govPanelW - 1, govPanelH - 1);

    // Regierungspanel Titel
    ctx.fillStyle = 'rgba(255, 197, 0, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Regierung', govPanelX + govPanelW/2, govPanelY + 16);

    // Schlüsselwörter auflisten
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    if (keywords.length > 0) {
      keywords.forEach((keyword, idx) => {
        ctx.fillText(`• ${keyword}`, govPanelX + 8, govPanelY + 36 + idx * 16);
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('Keine aktiven', govPanelX + 8, govPanelY + 36);
      ctx.fillText('Schlüsselwörter', govPanelX + 8, govPanelY + 52);
    }

    // Panel für Öffentlichkeits-Unterkategorien (rechts neben Öffentlichkeitsslots)
    const pubPanelX = 1640 + 256 + 20;
    const pubPanelY = 580; // Auf Höhe der Öffentlichkeitsslots
    const pubPanelW = 120;
    const pubPanelH = 256;

    // Öffentlichkeitspanel Hintergrund
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.fillRect(pubPanelX, pubPanelY, pubPanelW, pubPanelH);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.strokeRect(pubPanelX + 0.5, pubPanelY + 0.5, pubPanelW - 1, pubPanelH - 1);

    // Öffentlichkeitspanel Titel
    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Öffentlichkeit', pubPanelX + pubPanelW/2, pubPanelY + 16);

    // Unterkategorien auflisten
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    if (subcategories.length > 0) {
      subcategories.forEach((subcategory, idx) => {
        const displayName = subcategory.length > 12 ? subcategory.substring(0, 10) + '...' : subcategory;
        ctx.fillText(`• ${displayName}`, pubPanelX + 8, pubPanelY + 36 + idx * 16);
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('Keine aktiven', pubPanelX + 8, pubPanelY + 36);
      ctx.fillText('Unterkategorien', pubPanelX + 8, pubPanelY + 52);
    }
  }, [getActiveKeywordsAndSubcategories]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear click zones
    clickZonesRef.current = [];

    // Background: prefer PNG if configured
    if (LAYOUT.background?.enabled && LAYOUT.background?.src) {
      if (backgroundImageRef.current) {
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#0c131b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = '#0c131b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply UI transform (new signature)
    const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw opponent board (top rows) - clickable im Dev Mode
    // Draw opponent board using new layout system
    const opponentPublicRects = getPublicRects('opponent');
    const opponentGovRects = getGovernmentRects('opponent');

    // Draw opponent public slots
    opponentPublicRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[2].innen[idx];
      if (card) {
        drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 2);
      }
    });

    // Draw opponent government slots
    opponentGovRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[2].aussen[idx];
      if (card) {
        drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 2);
      }
    });

    // Draw opponent permanent slots
    drawPermanentSlotsP2(ctx);

    // Draw player board (middle rows)
    // Draw player board using new layout system
    const playerPublicRects = getPublicRects('player');
    const playerGovRects = getGovernmentRects('player');

    // Draw player public slots
    playerPublicRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[1].innen[idx];
      if (card) {
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 1);
        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'row_slot', player: 1, lane: 'innen', index: idx }
        });
      } else {
        // Empty slot click zone
        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
          data: { type: 'row_slot', player: 1, lane: 'innen', index: idx }
        });
      }
    });

    // Draw player government slots
    playerGovRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[1].aussen[idx];
      if (card) {
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 1);
        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'row_slot', player: 1, lane: 'aussen', index: idx }
        });
      } else {
        // Empty slot click zone
        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
          data: { type: 'row_slot', player: 1, lane: 'aussen', index: idx }
        });
      }
    });

    // Draw player permanent slots
    drawPermanentSlotsP1(ctx);

    // Draw instant slots (both players)
    drawInstantSlots(ctx);

    // Draw interventions strip (player)
    drawInterventionsP1(ctx);

    // Draw interventions strip (opponent) - nur im Dev Mode
    if (devMode) {
      drawInterventionsP2(ctx);
    }

    // Draw hand (P1)
    drawHandP1(ctx);

    // 🔧 DEV MODE: Draw hand (P2) - nur im Dev Mode
    if (devMode) {
      drawHandP2(ctx);
    }

    // Draw info panels
    drawInfoPanels(ctx);

    ctx.restore();

    // expose zones for debug snapshot
    (window as any).__politicardDebug = {
      uiTransform: getUiTransform(canvas.width, canvas.height),
      canvasSize: { width: canvas.width, height: canvas.height },
      zones: LAYOUT.zones,
      clickZones: clickZonesRef.current.slice(0, 1000)
    };

    // Diagnostics: verify UI hand click zones match authoritative gameState.hands[1]
    try {
      const handZones = clickZonesRef.current.filter(z => z.data && z.data.type === 'hand_p1');
      const uiUIDs = handZones.map(z => (z.data.card && (z.data.card.uid ?? z.data.card.id)) ).filter(Boolean);
      const stateHand = gameState.hands && gameState.hands[1] ? gameState.hands[1] : [];
      const stateUIDs = stateHand.map((c: any) => c.uid ?? c.id).filter(Boolean);

      const missingInState = uiUIDs.filter((u: any) => !stateUIDs.includes(u));
      const missingInUI = stateUIDs.filter((u: any) => !uiUIDs.includes(u));

      if (uiUIDs.length !== stateUIDs.length || missingInState.length > 0 || missingInUI.length > 0) {
        const mismatch = {
          ts: Date.now(),
          uiCount: uiUIDs.length,
          stateCount: stateUIDs.length,
          uiUIDs,
          stateUIDs,
          missingInState,
          missingInUI,
          stack: (new Error('mismatch-stack')).stack
        };
        (window as any).__politicardDebug = {
          ...(window as any).__politicardDebug,
          mismatch: [ ...(window as any).__politicardDebug?.mismatch || [] ].slice(-19).concat([mismatch])
        };
        // Clear, then log to console so user can copy/paste trace
        console.warn('POLITICARD DIAGNOSTIC: hand mismatch detected', mismatch);
      }
    } catch (e) {
      // swallow diagnostic errors to avoid breaking rendering
      console.error('Diagnostic error', e);
    }
  }, [drawLane, drawHandP1, drawHandP2, drawInterventionsP1, drawInterventionsP2, drawPermanentSlotsP1, drawPermanentSlotsP2, drawInstantSlots, drawInfoPanels, devMode, gameState.hands]);

  const DRAW_LAYOUT_OVERLAY = false; // force off per new layout system

  // Load background image if configured
  useEffect(() => {
    if (LAYOUT.background?.enabled && LAYOUT.background?.src) {
      const img = new Image();
      img.onload = () => { backgroundImageRef.current = img; requestAnimationFrame(draw); };
      img.onerror = () => { console.warn('Failed to load background image', LAYOUT.background?.src); };
      img.src = LAYOUT.background.src as string;
    }
  }, [draw]);

  const handleCardClick = useCallback((data: any) => {
    // Hand-Klick
    if (data.type === 'hand_p1') {
      const uid = data.card?.uid ?? data.card?.id;
      const stateHand = gameState.hands?.[1] || [];
      const idxInState = stateHand.findIndex((c: any) => (c.uid ?? c.id) === uid);
      onCardClick(data);
      return;
    }

    // Slot-Klick
    if (data.type === 'row_slot') {
      const lane: 'public' | 'government' = data.lane;
      const cap = getLaneCapacity(lane);

      // Hole aktuelle Row-Länge aus gameState
      const rowCards = lane === 'public'
        ? gameState.board?.[1]?.innen ?? []
        : gameState.board?.[1]?.aussen ?? [];

      if (rowCards.length >= cap) {
        // Optional: UI Feedback
        console.warn(`Row ${lane} is full (${rowCards.length}/${cap})`);
        return;
      }

      onCardClick(data);
      return;
    }

    // Andere Klicks (empty_slot, board_card, etc.)
    onCardClick(data);
  }, [gameState, onCardClick]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
    const mx = (e.clientX - rect.left - offsetX) / scale;
    const my = (e.clientY - rect.top - offsetY) / scale;

    const hit = clickZonesRef.current.find(z => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h);
    if (hit) handleCardClick(hit.data);
  }, [handleCardClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
    const mx = (e.clientX - rect.left - offsetX) / scale;
    const my = (e.clientY - rect.top - offsetY) / scale;

    const hit = clickZonesRef.current.find(z => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h);
    if (hit) {
      onCardHover({ ...hit.data, x: e.clientX, y: e.clientY });
    } else {
      onCardHover(null);
    }
  }, [onCardHover]);

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        imageRendering: 'auto',
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    />
  );
};
