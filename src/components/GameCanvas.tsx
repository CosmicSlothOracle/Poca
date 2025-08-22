import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Card, PoliticianCard, SpecialCard, Player, Lane } from '../types/game';
import layoutDef from '../ui/ui_layout_1920x1080.json';
import { drawCardImage, sortHandCards } from '../utils/gameUtils';
import { getNetApCost } from '../utils/ap';

interface GameCanvasProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  onCardClick: (data: any) => void;
  onCardHover: (data: any) => void;
  devMode?: boolean; // 🔧 DEV MODE: Show P2 hand when true
}

const UI_BASE = { width: 1920, height: 1080 };

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  selectedHandIndex,
  onCardClick,
  onCardHover,
  devMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clickZonesRef = useRef<Array<{ x: number; y: number; w: number; h: number; data: any }>>([]);

  type Zone = (typeof layoutDef)['zones'][number];
  const ZONES: Record<string, Zone> = (layoutDef.zones as Zone[]).reduce((acc, z) => {
    acc[z.id] = z;
    return acc;
  }, {} as Record<string, Zone>);

  const getUiTransform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { scale: 1, offX: 0, offY: 0 };

    const scale = Math.min(canvas.width / UI_BASE.width, canvas.height / UI_BASE.height);
    const offX = Math.floor((canvas.width - UI_BASE.width * scale) / 2);
    const offY = Math.floor((canvas.height - UI_BASE.height * scale) / 2);
    // expose for debug
    (window as any).__politicardDebug = {
      ...(window as any).__politicardDebug,
      uiTransform: { scale, offX, offY },
      canvasSize: { width: canvas.width, height: canvas.height }
    };
    return { scale, offX, offY };
  }, []);

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

    if (card.kind === 'pol') {
      const polCard = card as PoliticianCard;
      // influence tag bottom-left
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(dx, dy + s - 22, s, 22);
      ctx.fillStyle = '#D7E7F8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${polCard.influence ?? 0}`, dx + 8, dy + s - 6);

      if (polCard.protected) {
        ctx.fillStyle = '#1da1f2';
        ctx.fillRect(dx + s - 22, dy + 6, 16, 16);
      }
      if (polCard.deactivated) {
        ctx.fillStyle = '#b63838';
        ctx.fillRect(dx + s - 22, dy + 26, 16, 16);
      }
    } else if (card.kind === 'spec') {
      const specCard = card as SpecialCard;
      if (specCard.type === 'Öffentlichkeitskarte') {
        // Public cards don't show influence values, but can show status effects
        if (specCard.deactivated) {
          ctx.fillStyle = '#b63838';
          ctx.fillRect(dx + s - 22, dy + 6, 16, 16);
        }
      }
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
  }, [gameState]);

  const computeFixedSlots = useCallback((zoneId: string): Array<{ x: number; y: number; w: number; h: number }> => {
    const z = ZONES[zoneId];
    if (!z || (z.layout as any).type !== 'fixedSlots') return [];
    const rect = z.rectPx as [number, number, number, number];
    const [zx, zy, zw, zh] = rect;
    const layout = z.layout as { type: 'fixedSlots'; slots: number; slotSize: [number, number]; gap: number; alignment: 'center' | 'start' | 'end' };
    const count = layout.slots;
    const [slotW, slotH] = layout.slotSize;
    const gap = layout.gap;
    const totalWidth = count * slotW + (count - 1) * gap;
    let startX = zx;
    if (layout.alignment === 'center') startX = zx + Math.max(0, Math.floor((zw - totalWidth) / 2));
    if (layout.alignment === 'end') startX = zx + Math.max(0, zw - totalWidth);
    const y = zy + Math.floor((zh - slotH) / 2);
    const slots: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let i = 0; i < count; i++) {
      const x = startX + i * (slotW + gap);
      slots.push({ x, y, w: slotW, h: slotH });
    }
    return slots;
  }, [ZONES]);



  const computeStripSlots = useCallback((zoneId: string, count: number): Array<{ x: number; y: number; w: number; h: number }> => {
    const z = ZONES[zoneId];
    if (!z || (z.layout as any).type !== 'strip') return [];
    const rect = z.rectPx as [number, number, number, number];
    const [zx, zy, zw, zh] = rect;
    const layout = z.layout as { type: 'strip'; cardSize: [number, number]; max: number; gap: number };
    const [cardW, cardH] = layout.cardSize;
    const n = Math.min(count, layout.max);
    const totalWidth = n * cardW + (n - 1) * layout.gap;
    const startX = zx + Math.max(0, Math.floor((zw - totalWidth) / 2));
    const y = zy + Math.floor((zh - cardH) / 2);
    const slots: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let i = 0; i < n; i++) {
      const x = startX + i * (cardW + layout.gap);
      slots.push({ x, y, w: cardW, h: cardH });
    }
    return slots;
  }, [ZONES]);

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
    const slots = computeFixedSlots(zoneId);
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
        drawCardAt(ctx, card, s.x, s.y, s.w, isSelected, false);

        // Kartenname unter dem Slot anzeigen
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const textY = s.y + s.h + 16;
        ctx.fillText(card.name, s.x + s.w/2, textY);

        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
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
  }, [gameState, selectedHandIndex, drawCardAt, computeFixedSlots, getSlotDisplayName]);

  const drawHandP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    const hand = sortHandCards(gameState.hands[1]);
    const slots = computeFixedSlots('hand.player');
    slots.forEach((s, i) => {
      const card = hand[i];
      if (!card) return;
      // Find original index in unsorted hand for click handling
      const originalIndex = gameState.hands[1].findIndex(c => c.uid === card.uid);
      const isSel = selectedHandIndex === originalIndex;
      drawCardAt(ctx, card, s.x, s.y, s.w, isSel, true, 1); // Show AP cost for player 1 hand
      clickZonesRef.current.push({ x: s.x, y: s.y, w: s.w, h: s.h, data: { type: 'hand_p1', index: originalIndex, card } });
    });
  }, [gameState.hands, selectedHandIndex, drawCardAt, computeFixedSlots]);

      // 🔧 DEV MODE: Player 2 Hand (rechts unten, kompakter)
  const drawHandP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    const hand = sortHandCards(gameState.hands[2]);
    const slots = computeFixedSlots('hand.opponent');

    // Hintergrund für P2 Hand
    const z = ZONES['hand.opponent'];
    if (z) {
      const rect = z.rectPx as [number, number, number, number];
      const [x, y, w, h] = rect;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.15)'; // Rötlicher Hintergrund für P2
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      // Label für P2 Hand
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Player 2 Hand', x + w/2, y - 8);
    }

    slots.forEach((s, i) => {
      const card = hand[i];
      if (!card) return;
      // Find original index in unsorted hand for click handling
      const originalIndex = gameState.hands[2].findIndex(c => c.uid === card.uid);
      const isSel = gameState.current === 2 && selectedHandIndex === originalIndex;
      drawCardAt(ctx, card, s.x, s.y, s.w, isSel, true, 2); // Show AP cost for player 2 hand
      clickZonesRef.current.push({ x: s.x, y: s.y, w: s.w, h: s.h, data: { type: 'hand_p2', index: originalIndex, card } });
    });
  }, [gameState, selectedHandIndex, drawCardAt, computeFixedSlots, ZONES]);
  // Interventions strip (player traps)
  const drawInterventionsP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    const traps = gameState.traps[1] || [];
    const slots = computeStripSlots('interventions.player', traps.length);

    // Hintergrund für Interventions-Stripe
    const z = ZONES['interventions.player'];
    if (z) {
      const rect = z.rectPx as [number, number, number, number];
      const [x, y, w, h] = rect;
      ctx.fillStyle = 'rgba(200, 160, 255, 0.15)'; // Lavendelfarben für Interventionen
      ctx.fillRect(x, y, w, h);

      // Slot-Benennung für Interventions-Stripe
      ctx.fillStyle = 'rgba(200, 160, 255, 0.8)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Interventionen', x + 8, y + h - 6);
    }

    slots.forEach((s, i) => {
      const card = traps[i];
      if (!card) return;
      drawCardAt(ctx, card, s.x, s.y, s.w, false, false);
      clickZonesRef.current.push({ x: s.x, y: s.y, w: s.w, h: s.h, data: { type: 'trap_p1', index: i, card } });
    });
  }, [gameState.traps, computeStripSlots, drawCardAt, ZONES]);

  // Single slot drawing function
  const drawSingleSlot = useCallback((
    ctx: CanvasRenderingContext2D,
    zoneId: string,
    card: Card | null,
    clickType: string,
    player: Player
  ) => {
    const z = ZONES[zoneId];
    if (!z || (z.layout as any).type !== 'singleSlot') return;
    const rect = z.rectPx as [number, number, number, number];
    const [x, y, w, h] = rect;

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
      drawCardAt(ctx, card, x, y, w, isSelected, false);

      // Kartenname unter dem Slot anzeigen
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const textY = y + h + 16;
      ctx.fillText(card.name, x + w/2, textY);

      clickZonesRef.current.push({ x, y, w, h, data: { type: 'slot_card', slot: clickType, card } });
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
  }, [ZONES, selectedHandIndex, gameState, drawCardAt, getSlotDisplayName]);

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
    drawSingleSlot(ctx, 'slot.instant.player', gameState.instantSlot[1], 'instant', 1);
    drawSingleSlot(ctx, 'slot.instant.opponent', gameState.instantSlot[2], 'instant', 2);
  }, [gameState.instantSlot, drawSingleSlot]);

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

    // Background
    ctx.fillStyle = '#0c131b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply UI transform
    const { scale, offX, offY } = getUiTransform();
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // Draw opponent board (top rows) - clickable im Dev Mode
    drawLane(ctx, 'row.public.opponent', 2, 'innen', devMode);
    drawLane(ctx, 'row.government.opponent', 2, 'aussen', devMode);

    // Draw opponent permanent slots
    drawPermanentSlotsP2(ctx);

    // Draw player board (middle rows)
    drawLane(ctx, 'row.public.player', 1, 'innen', true);
    drawLane(ctx, 'row.government.player', 1, 'aussen', true);

    // Draw player permanent slots
    drawPermanentSlotsP1(ctx);

    // Draw instant slots (both players)
    drawInstantSlots(ctx);

    // Draw interventions strip (player)
    drawInterventionsP1(ctx);

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
    const zoneDump = Object.entries(ZONES).map(([id, z]) => ({ id, rectPx: z.rectPx, layout: z.layout }));
    (window as any).__politicardDebug = {
      ...(window as any).__politicardDebug,
      zones: zoneDump,
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
  }, [getUiTransform, drawLane, drawHandP1, drawHandP2, drawInterventionsP1, drawPermanentSlotsP1, drawPermanentSlotsP2, drawInstantSlots, drawInfoPanels, devMode, ZONES, gameState.hands]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offX, offY } = getUiTransform();

    const mx = (e.clientX - rect.left - offX) / scale;
    const my = (e.clientY - rect.top - offY) / scale;

    // Find clicked zone
    for (let i = clickZonesRef.current.length - 1; i >= 0; i--) {
      const z = clickZonesRef.current[i];
      if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
        onCardClick(z.data);
        return;
      }
    }
  }, [getUiTransform, onCardClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offX, offY } = getUiTransform();

    const mx = (e.clientX - rect.left - offX) / scale;
    const my = (e.clientY - rect.top - offY) / scale;

    // Find hovered zone
    for (let i = clickZonesRef.current.length - 1; i >= 0; i--) {
      const z = clickZonesRef.current[i];
      if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
        onCardHover({ ...z.data, x: e.clientX, y: e.clientY });
        return;
      }
    }
    onCardHover(null);
  }, [getUiTransform, onCardHover]);

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
