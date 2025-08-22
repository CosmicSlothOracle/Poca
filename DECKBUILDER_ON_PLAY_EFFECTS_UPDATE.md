# Deckbuilder On-Play Effects Update

## Übersicht

Die Deckbuilder-Detailansicht wurde aktualisiert, um die neuen On-Play-Effekte korrekt anzuzeigen. Die `gameEffect`-Beschreibungen in `src/data/cardDetails.ts` wurden entsprechend der implementierten Funktionalität angepasst.

## Aktualisierte Karten

### 1. Jack Ma

**Vorher:**

```
gameEffect: 'Nach einer Initiative: Ziehe 1 Karte + optional -1 HP auf gegnerische Regierungs-Plattform.'
```

**Nachher:**

```
gameEffect: 'Beim Ausspielen: Ziehe 1 Karte. Nach einer Initiative: Optional -1 HP auf gegnerische Regierungs-Plattform.'
```

**Änderung:** Klarstellung, dass das Kartenziehen beim Ausspielen passiert.

### 2. Oprah Winfrey

**Vorher:**

```
gameEffect: 'Wenn du eine Initiative spielst, darfst du 1 Karte abwerfen und 1 ziehen.'
```

**Nachher:**

```
gameEffect: 'Beim Ausspielen: Beide Spieler verlieren eine zufällige Handkarte.'
```

**Änderung:** Komplett neue Funktionalität - jetzt On-Play-Effekt statt Initiative-Trigger.

### 3. Spin Doctor

**Vorher:**

```
gameEffect: '+2 Einfluss auf eine Regierungskarte (oder +1 bei Medien)'
```

**Nachher:**

```
gameEffect: 'Beim Ausspielen: +1 Einfluss auf deine stärkste Regierungskarte.'
```

**Änderung:** Vereinfachung auf automatischen On-Play-Effekt ohne Wahlmöglichkeit.

### 4. Verzögerungsverfahren

**Vorher:**

```
gameEffect: '+1 Aktionspunkt oder ziehe 1 Karte'
```

**Nachher:**

```
gameEffect: 'Beim Ausspielen: +1 Aktionspunkt.'
```

**Änderung:** Entfernung der Wahlmöglichkeit - jetzt nur noch AP-Bonus.

### 5. Opportunist

**Vorher:**

```
gameEffect: 'Eine Regierungskarte -2 Einfluss, eine andere +2 Einfluss (Wahl gleicher Spieler)'
```

**Nachher:**

```
gameEffect: 'Beim Ausspielen: Aktiviert Mirror-Effekt. Einfluss-Boni des Gegners werden auf deine stärkste Regierungskarte gespiegelt.'
```

**Änderung:** Komplett neue Funktionalität - jetzt Mirror-Effekt statt Umverteilung.

### 6. Algorithmischer Diskurs

**Vorher:**

```
gameEffect: 'Bei Plattform-Karten: +1 Aktionspunkt oder ziehe 1 Karte nach Initiative'
```

**Nachher:**

```
gameEffect: 'Beim Ausspielen: Reduziert Einfluss basierend auf Plattform/KI-Karten in der Öffentlichkeit. Für jede Plattform/KI-Karte: -1 Einfluss auf stärkste Regierungskarte.'
```

**Änderung:** Komplett neue Funktionalität - jetzt On-Play-Effekt statt Initiative-Trigger.

## Technische Details

### Datei: `src/data/cardDetails.ts`

- **Aktualisierte Einträge**: 6 Karten
- **Neue Beschreibungen**: Alle On-Play-Effekte klar als "Beim Ausspielen:" gekennzeichnet
- **Konsistenz**: Alle Beschreibungen entsprechen der implementierten Funktionalität

### Build-Status

```bash
npm run build
```

**Ergebnis**: ✅ Erfolgreich kompiliert (mit Warnungen)

## Benutzerfreundlichkeit

### Verbesserungen

1. **Klarheit**: Alle On-Play-Effekte sind explizit als solche gekennzeichnet
2. **Konsistenz**: Einheitliche Beschreibungssprache
3. **Genauigkeit**: Beschreibungen entsprechen der tatsächlichen Implementierung

### Beispiel-Integration

Die neuen Beschreibungen werden automatisch in der Deckbuilder-Detailansicht angezeigt:

```typescript
// In DeckBuilder.tsx wird automatisch verwendet:
const cardDetails = getCardDetails(selectedCard.base.name);
// cardDetails.gameEffect wird in der UI angezeigt
```

## Nächste Schritte

1. **Manuelle Tests**: Deckbuilder öffnen und Karten-Details prüfen
2. **Benutzer-Feedback**: Beschreibungen auf Verständlichkeit testen
3. **Weitere Karten**: Bei Bedarf weitere On-Play-Effekte hinzufügen

## Fazit

Die Deckbuilder-Detailansicht zeigt jetzt korrekt die neuen On-Play-Effekte an. Die Beschreibungen sind klar, konsistent und entsprechen der implementierten Funktionalität. Spieler können jetzt genau sehen, was passiert, wenn sie diese Karten ausspielen.
