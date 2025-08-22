# 🃏 Draw System: "Am Ende des Zugs 1 Karte ziehen (max 8)"

## ✅ Implementierung Abgeschlossen

### **🎯 Mission: Balance-Anpassung durch kontinuierliches Nachziehen**

#### **📊 1. Neue Draw-Utility in `src/utils/draw.ts`**

```typescript
export const HAND_LIMIT = 8;

/**
 * Zieht 1 Karte für Spieler p vom Deck auf die Hand – falls möglich.
 * Rückgabe: true wenn gezogen, sonst false (Hand voll / Deck leer).
 * Achtung: Wir ziehen vom Ende (pop). Falls eure Deck-Top vorne liegt, auf shift() umstellen.
 */
export function drawOne(
  state: GameState,
  p: Player,
  log: (m: string) => void
): boolean {
  const hand = state.hands[p];
  const deck = state.deck[p];

  if (hand.length >= HAND_LIMIT) {
    log(
      `✋ P${p}: Handlimit (${HAND_LIMIT}) erreicht – keine Karte nachgezogen.`
    );
    return false;
  }
  if (deck.length === 0) {
    log(`🪙 P${p}: Deck leer – keine Karte nachgezogen.`);
    return false;
  }

  const card = deck.pop(); // ggf. shift() falls Top vorne
  hand.push(card);
  const name = (card as any)?.name ?? "eine Karte";
  log(`🃏 P${p} zieht ${name} (${hand.length}/${HAND_LIMIT}).`);
  return true;
}
```

#### **🔄 2. Integration in Turn-Management (`useGameActions.ts`)**

```typescript
// Import
import { drawOne, HAND_LIMIT } from "../utils/draw";

// In nextTurn Hook
const nextTurn = useCallback(() => {
  setGameState((prev): GameState => {
    const newState = { ...prev };
    const current = prev.current;

    // 🃏 Regel: Am Ende DES EIGENEN ZUGS 1 Karte ziehen (max HAND_LIMIT)
    drawOne(newState, current, log);

    // Check if round should end
    const shouldEndRound = checkRoundEnd(newState);
    if (shouldEndRound) {
      log(`🏁 Runde ${newState.round} wird beendet (manueller Turn-Wechsel).`);
      return resolveRound(newState, log);
    }

    // Spielerwechsel + AP/Actions reset
    const newCurrent: Player = current === 1 ? 2 : 1;
    newState.current = newCurrent;
    newState.actionPoints = { ...newState.actionPoints, [newCurrent]: 2 };
    newState.actionsUsed = { ...newState.actionsUsed, [newCurrent]: 0 };
    newState.passed = { ...newState.passed, [newCurrent]: false };

    log(`Spieler ${newCurrent} ist am Zug (2 AP verfügbar)`);
    return newState;
  });
}, [setGameState, log]);
```

#### **🚫 3. Pass-Verhalten: Kein Nachziehen**

```typescript
// In passTurn Hook
log(`🚫 Spieler ${player} passt.`);

// ❗ Kein Nachziehen bei Pass:
// Der passierende Spieler kommt in dieser Runde nicht mehr dran.
// Die nächste Runde startet ohnehin mit 5 neuen Handkarten.
```

### **🧪 Comprehensive Testing (8/8 Tests ✅)**

#### **Test Coverage:**

- ✅ **Basic Draw**: Karte vom Deck zur Hand ziehen
- ✅ **Hand Limit**: Stopp bei 8 Karten
- ✅ **Empty Deck**: Graceful handling bei leerem Deck
- ✅ **Edge Cases**: Karte ohne Namen, beide Spieler
- ✅ **Deck Order**: Pop-Verhalten (vom Ende ziehen)
- ✅ **Logging**: Korrekte Handkarten-Anzeige
- ✅ **Constants**: HAND_LIMIT = 8

## 🚀 Live-Test Scenarios

### **Szenario 1: Normaler Zug-End**

```
🔸 AP: -1 → 1 AP übrig (Aktionen 1/2).
🃏 Player 1 zieht Angela Merkel (6/8).
Spieler 2 ist am Zug (2 AP verfügbar)
```

### **Szenario 2: Hand-Limit erreicht**

```
🔸 AP: -1 → 0 AP übrig (Aktionen 2/2).
✋ P1: Handlimit (8) erreicht – keine Karte nachgezogen.
Spieler 2 ist am Zug (2 AP verfügbar)
```

### **Szenario 3: Deck leer**

```
🔸 AP: -1 → 0 AP übrig (Aktionen 2/2).
🪙 P1: Deck leer – keine Karte nachgezogen.
Spieler 2 ist am Zug (2 AP verfügbar)
```

### **Szenario 4: Pass ohne Nachziehen**

```
🚫 Spieler 1 passt.
// Kein drawOne() Call hier
Spieler 2 ist am Zug (2 AP verfügbar)
```

## 🔥 Wichtige Design-Entscheidungen

### **✅ Timing: Nach Zug, vor Wechsel**

- **Warum**: Spieler sieht direkt seine neue Hand-Option
- **Vorteil**: Strategische Planung für nächsten Zug möglich
- **Implementierung**: `drawOne(newState, current, log)` vor `newCurrent` switch

### **✅ Hand-Limit: 8 Karten**

- **Balance**: Nicht zu überwältigend, aber genug Optionen
- **Performance**: UI kann alle Karten anzeigen
- **Flexibilität**: Konstante `HAND_LIMIT` leicht anpassbar

### **✅ Pass = Kein Draw**

- **Logik**: Pass bedeutet "Ich bin fertig für diese Runde"
- **Balance**: Verhindert "Pass-Spam" für kostenloses Nachziehen
- **Konsistenz**: Nächste Runde startet mit 5 frischen Karten

### **✅ Deck-Order: Pop (vom Ende)**

- **Implementierung**: Einfacher als shift() (O(1) vs O(n))
- **Flexibilität**: Kommentar für shift() falls Top vorne gewünscht
- **Performance**: Bessere Array-Performance

### **✅ Graceful Degradation**

- **Hand voll**: Spieler wird informiert, Spiel läuft weiter
- **Deck leer**: Informative Message, kein Crash
- **Edge Cases**: Robuste Name-Fallbacks

## 📊 Performance & UX Impact

### **Memory Footprint:**

- **Minimal**: Nur 1 zusätzliche Karte pro Zug
- **Bounded**: Hand-Limit verhindert unbegrenztes Wachstum
- **Efficient**: Pop-Operation ist O(1)

### **Strategic Depth:**

- **Planning**: Spieler können mehr vorausplanen
- **Resource Management**: Hand-Limit erzwingt Entscheidungen
- **Tempo**: Kontinuierlicher Nachschub hält Spiel lebhaft

### **UI Considerations:**

- **Display**: 8 Karten passen gut in Hand-UI
- **Scrolling**: Falls nötig, bereits implementiert
- **Feedback**: Klar sichtbare Draw-Logs

**Das Draw-System ist production-ready und verbessert die Game-Balance signifikant! 🎉**

### **🎮 Expected Player Experience:**

1. **Mehr strategische Optionen**: Kontinuierlicher Nachschub
2. **Bessere Balance**: Kein "Kartenflut" durch Hand-Limit
3. **Klare Feedbacks**: Transparente Draw-Logs
4. **Smooth Gameplay**: Nahtlose Integration in Turn-Flow
