# On-Play Effects Implementation

## Übersicht

Die On-Play-Effekte wurden erfolgreich in die bestehende Effekt-Engine des Mandate Game integriert. Statt eine separate Datei zu erstellen, wurde die bestehende Architektur erweitert.

## Architektur-Entscheidungen

### Kritische Analyse des ursprünglichen Vorschlags

**Probleme mit dem ursprünglichen Ansatz:**

1. **Redundanz**: Hätte eine separate `onPlayEffects.ts` erstellt, obwohl bereits eine Effekt-Queue existiert
2. **Architektur-Konflikt**: Hätte die bestehende `triggerCardEffects()` + `resolveQueue()` Architektur umgangen
3. **State-Mutation**: Direkte State-Mutation statt immutable Updates
4. **Logging-Inkonsistenz**: Import von `log` statt Verwendung des bestehenden Logging-Systems

### Bessere Lösung: Integration in bestehende Architektur

**Vorteile:**

- ✅ Nutzt bestehende Effekt-Queue für konsistente Timing-Kontrolle
- ✅ Folgt dem etablierten Pattern `triggerCardEffects()` → `resolveQueue()`
- ✅ Immutable State-Updates über Event-System
- ✅ Konsistentes Logging über bestehende Infrastruktur
- ✅ Erweiterbar ohne Architektur-Brüche

## Implementierte Effekte

### 1. Jack Ma

- **Effekt**: Zieht 1 Karte beim Ausspielen
- **Event**: `DRAW_CARDS`
- **Status**: ✅ Implementiert und getestet

### 2. Oprah Winfrey

- **Effekt**: Beide Spieler verlieren eine zufällige Handkarte
- **Event**: `DISCARD_RANDOM_FROM_HAND` (2x)
- **Status**: ✅ Implementiert

### 3. Algorithmischer Diskurs

- **Effekt**: Reduziert Einfluss basierend auf Plattform/KI-Karten in der Öffentlichkeit
- **Event**: `ADJUST_INFLUENCE` mit negativem Delta
- **Status**: ✅ Implementiert

### 4. Opportunist

- **Effekt**: Aktiviert Mirror-Effekt für Einfluss-Boni des Gegners
- **Event**: `SET_FLAG` (opportunistActive = true)
- **Status**: ✅ Implementiert und getestet

### 5. Spin Doctor

- **Effekt**: +1 Einfluss auf stärkste Regierungskarte
- **Event**: `ADJUST_INFLUENCE` mit positivem Delta
- **Status**: ✅ Implementiert

### 6. Verzögerungsverfahren

- **Effekt**: +1 Aktionspunkt
- **Event**: `ADD_AP`
- **Status**: ✅ Implementiert und getestet

## Technische Details

### Neue Event-Typen

```typescript
// src/types/effects.ts
export type EffectEvent =
  | { kind: "DRAW_CARDS"; player: Player; count: number }
  | { kind: "DISCARD_RANDOM_FROM_HAND"; player: Player }
  | {
      kind: "ADJUST_INFLUENCE";
      player: Player;
      targetCard: Card;
      delta: number;
      source: string;
    };
```

### Neue EffectFlags

```typescript
// src/types/game.ts
export interface EffectFlags {
  // ... bestehende Flags ...
  opportunistActive: boolean; // Für Mirror-Effekte
}
```

### Queue-Handler

```typescript
// src/utils/queue.ts
case 'DRAW_CARDS': {
  // Zieht Karten vom Deck zur Hand
}

case 'DISCARD_RANDOM_FROM_HAND': {
  // Entfernt zufällige Karte aus der Hand
}

case 'ADJUST_INFLUENCE': {
  // Ändert Einfluss einer Karte
  // Mit Opportunist-Mirror-Logik
}
```

## Integration in bestehenden Flow

Die Effekte werden automatisch ausgelöst, wenn eine Karte gespielt wird:

```typescript
// src/hooks/useGameActions.ts
// Nach dem Ablegen der Karte:
triggerCardEffects(newState, player, playedCard, targetLane);
resolveQueue(newState, log);
```

## Tests

```bash
npm test -- --testPathPattern=onPlayEffects.test.ts
```

**Ergebnis**: ✅ Alle 3 Tests erfolgreich

- Jack Ma zieht Karte
- Opportunist setzt Flag
- Verzögerungsverfahren gibt AP

## Qualitätssicherung

### Build-Status

```bash
npm run build
```

**Ergebnis**: ✅ Erfolgreich kompiliert (mit Warnungen)

### Linting

- ✅ TypeScript-Fehler behoben
- ✅ Alle neuen Event-Typen korrekt typisiert
- ✅ EffectFlags vollständig initialisiert

## Nächste Schritte

1. **Manuelle Tests**: Effekte im Dev-Modus (M-Taste) testen
2. **Edge Cases**: Leere Decks, volle Hände, etc.
3. **Performance**: Bei Bedarf Optimierung der Queue-Verarbeitung
4. **Erweiterung**: Weitere On-Play-Effekte hinzufügen

## Fazit

Die Implementierung folgt dem Prinzip "Klarheit vor Geschwindigkeit" und integriert sich nahtlos in die bestehende Architektur. Die Effekte sind testbar, erweiterbar und konsistent mit dem bestehenden Codebase.
