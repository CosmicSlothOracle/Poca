// UI Layout Converter - Konvertiert zwischen Editor-Format und Spiel-Format

export interface EditorSlot {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  locked: boolean;
}

export interface EditorLayout {
  canvas: {
    width: number;
    height: number;
    grid: number;
  };
  background?: { src: string };
  slots: EditorSlot[];
}

export interface GameZone {
  id: string;
  rectPx: [number, number, number, number]; // [x, y, width, height]
  rectNorm: [number, number, number, number]; // normalized coordinates
  layout: {
    type: "fixedSlots" | "singleSlot" | "strip";
    slots?: number;
    slotSize?: [number, number];
    gap?: number;
    alignment?: "center" | "start" | "end";
    max?: number;
    cardSize?: [number, number];
  };
  z: number;
}

export interface GameLayout {
  version: number;
  canvas: { width: number; height: number; aspect: string };
  generatedFrom?: {
    colorMap: string;
    legend: string;
  };
  scaling: { mode: string; letterbox: boolean; safeMargin: number };
  render: { opponentRotationDeg: number };
  colors: Record<string, string>;
  zones: GameZone[];
}

// Konvertiert Editor-Layout zu Spiel-Layout
export function convertEditorToGame(editorLayout: EditorLayout): GameLayout {
  const zones: GameZone[] = editorLayout.slots.map((slot, index) => {
    // Bestimme Layout-Typ basierend auf Slot-Name und Typ
    let layoutType: "fixedSlots" | "singleSlot" | "strip" = "singleSlot";
    let slots = 1;
    let slotSize: [number, number] = [slot.width, slot.height];
    let gap = 16;
    let alignment: "center" | "start" | "end" = "center";
    let max: number | undefined;
    let cardSize: [number, number] | undefined;

    // Automatische Erkennung basierend auf Namen
    if (slot.name.includes("government-") && slot.name.match(/\d+$/)) {
      layoutType = "fixedSlots";
      slots = 5;
      slotSize = [256, 256];
      gap = 16;
    } else if (slot.name.includes("public-") && slot.name.match(/\d+$/)) {
      layoutType = "fixedSlots";
      slots = 5;
      slotSize = [256, 256];
      gap = 16;
    } else if (slot.name.includes("hand-")) {
      layoutType = "fixedSlots";
      slots = 10;
      slotSize = slot.name.includes("opponent") ? [64, 144] : [180, 180];
      gap = slot.name.includes("opponent") ? 4 : 8;
    } else if (slot.name.includes("interventions")) {
      layoutType = "strip";
      max = 6;
      cardSize = [64, 64];
      gap = 8;
    }

    return {
      id: slot.name,
      rectPx: [slot.x, slot.y, slot.width, slot.height] as [number, number, number, number],
      rectNorm: [
        slot.x / editorLayout.canvas.width,
        slot.y / editorLayout.canvas.height,
        slot.width / editorLayout.canvas.width,
        slot.height / editorLayout.canvas.height
      ] as [number, number, number, number],
      layout: {
        type: layoutType,
        slots: layoutType === "fixedSlots" ? slots : undefined,
        slotSize: layoutType === "fixedSlots" ? slotSize : undefined,
        gap: layoutType !== "singleSlot" ? gap : undefined,
        alignment: layoutType === "fixedSlots" ? alignment : undefined,
        max: layoutType === "strip" ? max : undefined,
        cardSize: layoutType === "strip" ? cardSize : undefined,
      },
      z: index + 10, // Einfache Z-Index-Berechnung
    };
  });

  return {
    version: 3,
    canvas: {
      width: editorLayout.canvas.width,
      height: editorLayout.canvas.height,
      aspect: "16:9"
    },
    generatedFrom: {
      colorMap: "UI Layout Editor",
      legend: "Generated from UI Layout Editor"
    },
    scaling: { mode: "fit", letterbox: true, safeMargin: 0.02 },
    render: { opponentRotationDeg: 180 },
    colors: {
      "#ff0035": "hand.player",
      "#ffc500": "row.government.player",
      "#00ff00": "row.public.player",
      "#ff00fa": "slot.permanent.government.player",
      "#08cdf4": "slot.permanent.public.player",
      "#7b745b": "slot.instant.player",
      "#aa0700": "row.government.opponent",
      "#ff6553": "slot.permanent.government.opponent",
      "#2693a9": "slot.permanent.public.opponent",
      "#073842": "slot.instant.opponent"
    },
    zones
  };
}

// Konvertiert Spiel-Layout zu Editor-Layout
export function convertGameToEditor(gameLayout: GameLayout): EditorLayout {
  const slots: EditorSlot[] = gameLayout.zones.map((zone) => {
    const [x, y, width, height] = zone.rectPx;

    // Bestimme Slot-Typ basierend auf Zone-ID
    let type = "other";
    if (zone.id.includes("government")) type = "government";
    else if (zone.id.includes("public")) type = "public";
    else if (zone.id.includes("permanent") || zone.id.includes("dauerhaft")) type = "dauerhaft";
    else if (zone.id.includes("instant") || zone.id.includes("sofort")) type = "sofort";

    return {
      id: zone.id,
      name: zone.id,
      type,
      x,
      y,
      width,
      height,
      color: "#4ade80", // Standard-Farbe
      locked: false,
    };
  });

  return {
    canvas: {
      width: gameLayout.canvas.width,
      height: gameLayout.canvas.height,
      grid: 16,
    },
    slots
  };
}

// Exportiert das aktuelle Layout als JSON-Datei
export function exportLayoutAsGameFormat(editorLayout: EditorLayout, filename: string = "ui_layout_1920x1080.json") {
  const gameLayout = convertEditorToGame(editorLayout);
  const dataStr = JSON.stringify(gameLayout, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
