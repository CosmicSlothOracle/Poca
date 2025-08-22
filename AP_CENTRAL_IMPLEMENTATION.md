# 🎯 Zentrale AP-Kostenlogik: Implementation Guide

## ✅ Schritt 1: Zentrale Kostenberechnung (Abgeschlossen)

### **🔧 `src/utils/ap.ts` - Neue saubere Implementation**

```typescript
import type { GameState, Player } from "../types/game";
import type { Card } from "../types/game";

export type APCostInfo = { cost: number; reasons: string[] };

export function getCardActionPointCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: "innen" | "aussen"
): APCostInfo {
  let cost = 1;
  const reasons: string[] = [];

  const kind = (card as any).kind ?? "";
  const typeStr = (card as any).type ?? "";
  const isInitiative = kind === "spec" && /initiative/i.test(typeStr);
  const isGovernment = kind === "pol";

  // 1) Harte Freistellungen
  if (isGovernment && state.effectFlags?.[player]?.freeGovernmentAvailable) {
    cost = 0;
    reasons.push("Greta: Regierungskarten kosten 0 AP");
  }
  if (isInitiative && state.effectFlags?.[player]?.freeInitiativeAvailable) {
    cost = 0;
    reasons.push("Freie Initiative: 0 AP");
  }

  // 2) Rabatte (nur wenn noch Kosten > 0)
  if (isInitiative && cost > 0) {
    const disc = state.effectFlags?.[player]?.ngoInitiativeDiscount ?? 0;
    if (disc > 0) {
      const before = cost;
      cost = Math.max(0, cost - disc);
      reasons.push(`NGO-Rabatt: -${disc} AP (${before}→${cost})`);
    }
    if (state.effectFlags?.[player]?.nextInitiativeDiscounted) {
      const before = cost;
      cost = Math.max(0, cost - 1);
      reasons.push(`Nächste Initiative: -1 AP (${before}→${cost})`);
    }
  }

  return { cost, reasons };
}
```

### **✅ Key Features:**

- **Inline Type-Checks**: `kind === 'spec' && /initiative/i.test(typeStr)`
- **Hierarchische Logik**: Freistellungen vor Rabatten
- **Nur relevante Rabatte**: Initiative-Rabatte nur bei Initiativen
- **Keine Legacy-Referenzen**: Kein `nextInitiativeMinus1` mehr

## 🔧 Schritt 2: Post-Play Flag-Consumption (Implementierung erforderlich)

### **🎯 Wo hinzufügen: Nach Kartenspielen, vor Discard-Update**

```typescript
// --- POST-PLAY: AP-relevante Flag-Consumption & Refunds ---
{
  const f = newState.effectFlags[player];
  const kind = (playedCard as any)?.kind ?? "";
  const typeStr = (playedCard as any)?.type ?? "";
  const isInitiative = kind === "spec" && /initiative/i.test(typeStr);
  const isGovernment = kind === "pol";

  // a) Einmalrabatt "nächste Initiative -1" nach Nutzung entfernen
  if (isInitiative && f?.nextInitiativeDiscounted) {
    f.nextInitiativeDiscounted = false;
    log('🎟️ Rabatt verbraucht: "nächste Initiative -1 AP" deaktiviert.');
  }

  // b) Plattform-Refund: 1x pro Zug 1 AP zurück, falls freigeschaltet
  if (isInitiative && f?.platformRefundAvailable && !f.platformRefundUsed) {
    const before = newState.actionPoints[player] ?? 0;
    newState.actionPoints[player] = Math.min(4, before + 1);
    f.platformRefundUsed = true;
    log(
      `♻️ Plattform-Refund: +1 AP (${before}→${newState.actionPoints[player]}) — 1x pro Zug.`
    );
  }

  // (Optional) Wenn du NGO-Rabatte „verbrauchend" machen willst (z. B. nur 1x):
  // if (isInitiative && f.ngoInitiativeDiscount > 0) {
  //   f.ngoInitiativeDiscount = Math.max(0, f.ngoInitiativeDiscount - 1);
  //   log('🏷️ NGO-Rabatt teilweise verbraucht (-1).');
  // }
}
// --- /POST-PLAY ---
```

### **🔍 Integration-Punkte:**

#### **Option A: `useGameState.ts` (wahrscheinlichster Ort)**

```typescript
// Nach: Card erfolgreich ausgespielt + Effekte angewendet
// Vor: Discard-Pile-Update / Slot-Updates
```

#### **Option B: `useGameActions.ts`**

```typescript
// Falls Card-Play-Logic in useGameActions refactored wird
```

#### **Option C: Resolve-Engine**

```typescript
// Falls Part des Event-Resolution-Systems
```

## 🔄 Schritt 3: Turn-Reset für nutzungsgebundene Flags

### **🎯 Wo hinzufügen: `nextTurn()` Funktion**

```typescript
const nextTurn = useCallback(() => {
  setGameState((prev) => {
    const state = clone(prev);
    const old = state.current;
    const next: Player = old === 1 ? 2 : 1;

    // Turn-Switch: AP reset etc.
    state.current = next;
    state.actionPoints[next] = 2;
    state.actionsUsed[next] = 0;

    // Reset turn-bezogener Flag-Nutzungen
    const f = state.effectFlags?.[next];
    if (f) {
      // Nur Nutzungsmarker zurücksetzen – KEINE permanenten Effekte löschen
      f.platformRefundUsed = false;
      // Falls du Free-Play einmal pro Turn willst, hier resetten:
      // f.freeInitiativeAvailable = false; // nur wenn design so will
      // f.freeGovernmentAvailable = false; // dto.
    }

    log(`Spieler ${next} ist am Zug (2 AP verfügbar)`);
    return state;
  });
}, [setGameState, log]);
```

### **✅ Wichtige Designentscheidung:**

- **Nur Nutzungsmarker resetten**: `platformRefundUsed = false`
- **Permanente Effekte behalten**: `ngoInitiativeDiscount`, `freeInitiativeAvailable`
- **Design-Choice**: Ob Free-Plays per Turn oder per Round

## 📝 Schritt 4: Klareres AP-Kosten-Logging

### **🎯 Wo aktualisieren: Beim `getCardActionPointCost` Call**

```typescript
// ❌ Vorher:
const { cost: apCost, reasons: apReasons } = getCardActionPointCost(
  prev,
  player,
  selectedCard,
  lane
);
log(
  `🔎 AP-Kosten für ${selectedCard.name}: ${apCost} [${apReasons.join(", ")}]`
);

// ✅ Nachher:
const { cost: apCost, reasons: apReasons } = getCardActionPointCost(
  prev,
  player,
  selectedCard,
  lane
);
log(
  `🔎 AP-Kosten für ${selectedCard.name}: ${apCost}${
    apReasons.length ? " • " + apReasons.join(" • ") : ""
  }`
);
```

### **✅ Verbesserung:**

- **Bessere Lesbarkeit**: `•` statt `[, ]`
- **Conditional Display**: Nur Reasons zeigen wenn vorhanden
- **Inline Format**: Kompakter Log-Output

## 🚀 Expected Live Behavior

### **Normale Initiative mit Rabatt:**

```
🔎 AP-Kosten für Symbolpolitik: 0 • NGO-Rabatt: -2 AP (1→0) • Nächste Initiative: -1 AP (1→0)
🆓 Kostenlose Aktion: Keine Aktionspunkte abgezogen und Aktion nicht verbraucht (Aktionen 0/2).
🎟️ Rabatt verbraucht: "nächste Initiative -1 AP" deaktiviert.
♻️ Plattform-Refund: +1 AP (2→3) — 1x pro Zug.
```

### **Government mit Greta:**

```
🔎 AP-Kosten für Angela Merkel: 0 • Greta: Regierungskarten kosten 0 AP
🆓 Kostenlose Aktion: Keine Aktionspunkte abgezogen und Aktion nicht verbraucht (Aktionen 0/2).
```

### **Turn-Reset:**

```
🃏 P1 zieht Karte XYZ (6/8).
Spieler 2 ist am Zug (2 AP verfügbar)
[platformRefundUsed für P2 ist jetzt false]
```

### **Normale Initiative ohne Rabatte:**

```
🔎 AP-Kosten für Klimaabkommen: 1
🔸 AP: -1 → 1 AP übrig (Aktionen 1/2).
```

## 🔧 Technical Implementation Notes

### **Type Safety:**

- **APCostInfo**: Verwendet für bessere Type-Safety statt alten `APCalc`
- **Card Union**: Robuste `(card as any)` Zugriffe für Union-Types
- **Optional Chaining**: `state.effectFlags?.[player]?.flag` Pattern

### **Performance:**

- **Early Returns**: Freistellungen stoppen weitere Berechnungen
- **Conditional Logic**: Rabatte nur berechnen wenn relevant
- **Inline Checks**: Keine Helper-Functions für bessere Performance

### **Maintainability:**

- **Clear Separation**: Freistellungen vs. Rabatte
- **Explicit Logic**: Keine impliziten Abhängigkeiten
- **Comprehensive Logging**: Jede Entscheidung wird geloggt

### **Integration Strategy:**

1. **✅ `ap.ts` bereits implementiert**
2. **🔧 Post-Play Integration**: In Card-Play-Function hinzufügen
3. **🔄 Turn-Reset Integration**: In nextTurn-Function hinzufügen
4. **📝 Logging Update**: Bei getCardActionPointCost-Calls

**Das zentrale AP-System ist jetzt architektiert und wartet auf Integration! 🎉**
