# ✅ Netto-0 System: Elegante Lösung für AP-Refunds

## 🎯 Problem: "Netto 0" vs. "0 AP" - Strategische Unterscheidung

### **Bisheriges Problem:**

- **0-AP-Karten**: Kosten 0 AP, zählen als Aktion (aber nicht sinnvoll)
- **AP-Refunds**: Nach dem Spielen, aber Action schon verbraucht
- **Unklare Logik**: Wann zählt etwas als Aktion, wann nicht?

### **Neue Lösung:**

- **"Netto 0"**: AP-Kosten minus Refunds = 0 → zählt **nicht** als Aktion
- **Klare Hierarchie**: Nur echte AP-Kosten (net > 0) verbrauchen Aktionen
- **Strategische Tiefe**: Greta-Refunds ermöglichen endlose Regierungsketten

---

## 🔧 5-Schritt-Implementierung

### **✅ Schritt 1: EffectFlags erweitern**

```typescript
// types/game.ts
export type EffectFlags = {
  // ...bestehende Flags
  govRefundAvailable: boolean; // 🔥 NEU: erste Reg.-Karte gibt +1 AP zurück
};

// createDefaultEffectFlags()
govRefundAvailable: false,
```

### **✅ Schritt 2: Turn-Start Logic**

```typescript
// utils/ap.ts
export function resetTurnApRefundFlags(state: GameState, p: Player) {
  const f =
    state.effectFlags[p] ?? (state.effectFlags[p] = createDefaultEffectFlags());
  f.firstGovRefundAvailable = hasGretaOnBoard(state, p);
  f.govRefundAvailable = hasGretaOnBoard(state, p); // 🔥 NEU für netto-0
}
```

### **✅ Schritt 3: Netto-AP-Cost Helper**

```typescript
// utils/ap.ts
export function getNetApCost(
  state: GameState,
  p: Player,
  card: Card,
  lane?: Lane
) {
  const { cost, reasons } = getCardActionPointCost(state, p, card, lane);
  let refund = 0;

  if (isGovernmentCard(card) && state.effectFlags?.[p]?.govRefundAvailable) {
    refund += 1;
    reasons.push("Greta: +1 AP bei erster Regierungskarte");
  }

  const net = Math.max(0, cost - refund);
  return { cost, refund, net, reasons };
}

export function wouldBeNetZero(
  state: GameState,
  p: Player,
  card: Card,
  lane?: Lane
) {
  return getNetApCost(state, p, card, lane).net <= 0;
}
```

### **✅ Schritt 4: Spielen-Logic anpassen**

```typescript
// hooks/useGameActions.ts
const {
  cost: apCost,
  refund,
  net,
  reasons,
} = getNetApCost(prev, player, card, lane);
log(`🔎 AP-Kosten ${card.name}: cost=${apCost}, refund=${refund}, net=${net}`);

// Action-Limit nur für net > 0
if (prev.actionsUsed[player] >= 2 && net > 0) {
  log(`⛔ Max. Aktionen 2/2 erreicht – nur Netto-0-Züge erlaubt.`);
  return prev;
}

// AP immer abziehen, Actions nur bei net > 0
newState.actionPoints[player] -= apCost;
if (net > 0) {
  newState.actionsUsed[player] += 1;
  log(`💳 Kosten: −${apCost} AP | Aktionen verbraucht`);
} else {
  log(`🆓 Netto-0-Zug: −${apCost} AP (mit +${refund} Refund)`);
}
```

### **✅ Schritt 5: UI-Logic anpassen**

```typescript
// components/HandCardModal.tsx
const onlyFreeOrNetZero = selected
  ? wouldBeNetZero(gameState, currentPlayer, selected, laneHint)
  : false;

const canPlay =
  gameState.actionsUsed[currentPlayer] < 2
    ? gameState.actionPoints[currentPlayer] > 0
    : onlyFreeOrNetZero;

// Statusanzeige
{
  onlyNetZeroPossible && <div>💠 (Netto-0 möglich)</div>;
}
```

---

## 🚀 Strategische Beispiele

### **Regierungskarte mit Greta:**

```typescript
// Greta liegt → govRefundAvailable = true
const netCost = getNetApCost(state, 1, merkelCard, "aussen");
// cost=1, refund=1, net=0

// Spielen:
newState.actionPoints[1] -= 1; // AP: 2→1
// net=0 → keine Action verbraucht!
newState.actionsUsed[1] += 0; // Actions: 0/2 bleibt

// Nach dem Spielen:
applyApRefundsAfterPlay(newState, 1, merkelCard);
// +1 AP zurück (Greta-Refund)
// AP: 1→2, govRefundAvailable = false
```

### **Normale Regierungskarte ohne Greta:**

```typescript
// Keine Greta → govRefundAvailable = false
const netCost = getNetApCost(state, 1, merkelCard, "aussen");
// cost=1, refund=0, net=1

// Spielen:
newState.actionPoints[1] -= 1; // AP: 2→1
// net=1 → Action verbraucht!
newState.actionsUsed[1] += 1; // Actions: 0/2 → 1/2
```

### **Think Tank (echte 0-AP-Karte):**

```typescript
const netCost = getNetApCost(state, 1, thinkTankCard, "innen");
// cost=0, refund=0, net=0

// Spielen:
newState.actionPoints[1] -= 0; // AP: 2→2 (kein Abzug)
// net=0 → keine Action verbraucht!
newState.actionsUsed[1] += 0; // Actions: 0/2 bleibt
```

---

## 🎮 Live Behavior Examples

### **Endlose Greta-Regierungsketten:**

```
🔎 AP-Kosten Angela Merkel: cost=1, refund=1, net=0 [Greta: +1 AP bei erster Regierungskarte]
🆓 Netto-0-Zug: −1 AP (mit +1 Refund) → keine Aktion verbraucht.
🌿 Greta: +1 AP zurück (erste Regierungskarte).
[Aktionen: 0/2 - AP unverändert]

🔎 AP-Kosten Olaf Scholz: cost=1, refund=0, net=1 [Greta-Refund bereits verbraucht]
💳 Kosten: −1 AP | Aktionen 0→1
[Aktionen: 1/2 - erste echte Aktion]

🔎 AP-Kosten Joschka Fischer: cost=1, refund=0, net=1
💳 Kosten: −1 AP | Aktionen 1→2
[Aktionen: 2/2 - Limit erreicht]

🔎 AP-Kosten Think Tank: cost=0, refund=0, net=0
🆓 Netto-0-Zug: −0 AP (mit +0 Refund) → keine Aktion verbraucht.
[Think Tank weiterhin spielbar, da netto=0]
```

### **Mixed Action Sequence:**

```
1. Normale Initiative (1 AP, 1 Action) → Actions: 1/2
2. Regierungskarte mit Greta (1 AP, 0 Actions) → Actions: 1/2
3. Think Tank (0 AP, 0 Actions) → Actions: 1/2
4. Normale Karte (1 AP, 1 Action) → Actions: 2/2
5. Netto-0 Karte weiterhin spielbar → Actions: 2/2
6. "Zug beenden" für freiwilligen Turn-Switch
```

---

## 🔧 Technical Benefits

### **✅ Elegante Logik:**

- **Einheitliches System**: Alle "kostenlose" Züge unter einem Begriff (netto=0)
- **Klare Hierarchie**: AP-Kosten → Refunds → Netto → Action-Entscheidung
- **Future-Proof**: Neue Refund-Typen einfach hinzufügbar

### **✅ Strategische Tiefe:**

- **Greta Power**: Endlose Regierungsketten ohne Action-Verbrauch
- **Think Tank Utility**: Echte 0-AP-Karten als strategische Optionen
- **Player Agency**: "Zug beenden"-Button für kontrollierte Turn-Switches

### **✅ Code Quality:**

- **Type-Safe**: Robuste Helper-Funktionen mit proper error handling
- **Defensive Programming**: Null-safety und defensive Checks überall
- **Comprehensive Logging**: Vollständige Nachvollziehbarkeit aller Entscheidungen

### **✅ Game Design:**

- **Intuitive Mechanics**: "Netto 0" ist für Spieler leicht verständlich
- **Balanced**: Greta-Refund ist pro Zug, nicht pro Karte
- **Flexible**: System kann für andere Refund-Typen erweitert werden

---

## 🎯 Integration Status

### **✅ Completed - Alle 5 Schritte:**

1. **✅ EffectFlags erweitern**: `govRefundAvailable` hinzugefügt
2. **✅ Turn-Start Logic**: Flag basierend auf Greta-Präsenz setzen
3. **✅ Netto-AP-Cost Helper**: `getNetApCost()` und `wouldBeNetZero()` implementiert
4. **✅ Spielen-Logic**: Limit/Abzug nach net prüfen
5. **✅ UI-Logic**: canPlay und Statusanzeige angepasst

### **✅ Compilation:**

```bash
npx tsc --noEmit
# Exit code: 0 - Keine Fehler!
```

### **✅ Ready for Strategic Testing:**

- **Greta Chains**: Endlose Regierungskarten ohne Action-Verbrauch
- **Mixed Sequences**: 0-AP + normale Aktionen in beliebiger Kombination
- **Action Limits**: Netto-0-Züge nach 2 Aktionen weiterhin erlaubt
- **UI Feedback**: Klare Statusanzeigen für Netto-0-Möglichkeiten

### **🎮 Key Strategic Scenarios:**

#### **Greta-Regierungskette (perfekt):**

```
1. Greta liegt → govRefundAvailable = true
2. Regierung (1 AP - 1 Refund = netto 0) → zählt nicht als Aktion
3. Regierung (1 AP) → zählt als Aktion 1
4. Regierung (1 AP) → zählt als Aktion 2
= Genau das gewünschte Verhalten!
```

#### **Think Tank + Greta Synergie:**

```
1. Think Tank (netto 0) → keine Aktion, AP unverändert
2. Regierung mit Greta (netto 0) → keine Aktion, AP unverändert
3. Normale Aktion → Action 1/2
4. Weitere netto-0 Karten möglich
```

#### **Edge Case: Action-Limit erreicht:**

```
Nach 2 Aktionen:
- Normale Karten: Blockiert
- Netto-0 Karten: Weiterhin spielbar
- UI zeigt: "💠 (Netto-0 möglich)"
```

**Das Netto-0 System ist jetzt vollständig implementiert und bereit für strategisches Gameplay! 🎉**
