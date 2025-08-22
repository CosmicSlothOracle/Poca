import { GameState } from '../types/game';

type DebugUIInfo = {
  zones?: any;
  clickZones?: Array<{ x: number; y: number; w: number; h: number; data: any }>;
  uiTransform?: { scale: number; offX: number; offY: number };
  canvasSize?: { width: number; height: number };
};

function sanitizeGameState(state: GameState) {
  // Create a shallow sanitized copy without function fields that could break JSON.stringify
  const {
    effectQueue, // drop queue with functions
    activeAbilities,
    pendingAbilitySelect,
    ...rest
  } = state as any;
  return {
    ...rest,
    // keep minimal flags for debugging
    activeAbilities: undefined,
    pendingAbilitySelect: pendingAbilitySelect ? { ...pendingAbilitySelect, actorCard: pendingAbilitySelect.actorCard?.uid } : undefined
  };
}

export function buildDebugSnapshot(gameState: GameState) {
  const dbg: DebugUIInfo = (window as any).__politicardDebug || {};
  const now = new Date();
  const payload = {
    meta: {
      ts: now.toISOString(),
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 }
    },
    ui: {
      zones: dbg.zones || null,
      clickZones: dbg.clickZones || [],
      uiTransform: dbg.uiTransform || null,
      canvasSize: dbg.canvasSize || null
    },
    state: sanitizeGameState(gameState)
  };
  return payload;
}

export async function copyDebugSnapshotToClipboard(gameState: GameState) {
  const json = JSON.stringify(buildDebugSnapshot(gameState), null, 2);
  await navigator.clipboard?.writeText(json);
}

export function downloadDebugSnapshot(gameState: GameState) {
  const json = JSON.stringify(buildDebugSnapshot(gameState), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `politicard_debug_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}



