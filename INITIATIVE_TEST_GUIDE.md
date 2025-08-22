# 🧪 INITIATIVE TEST DECK - Testing Guide

## Deck Übersicht (10 Karten total - perfekt für schnelle Tests)

### Regierungskarten (4 Karten)

- **Karl Rove** (6 I) - Schwächste Gov-Karte
- **Robert Gates** (6 I) - Mittlere Gov-Karte
- **Olaf Scholz** (7 I) - Stärkste Gov-Karte (Spin Doctor Ziel)
- **Joschka Fischer** (7 I) - Think-tank Combo-Test

### Phase 1 Initiativen (4 Karten)

- **Symbolpolitik** (1 BP) → `DRAW_1`: Ziehe 1 Karte
- **Verzögerungsverfahren** (1 BP) → `AP_PLUS_1`: +1 Aktionspunkt
- **Think-tank** (2 BP) → `THINK_TANK`: Ziehe 1 Karte + nächste Gov +2 I
- **Spin Doctor** (2 BP) → `SPIN_DOCTOR`: Stärkste Gov +2 I

### Support-Karten (2 Karten)

- **George Soros** (7 BP) - Autoritär-Bonus für AP-Tests
- **Greta Thunberg** (4 BP) - Gov kostet 0 AP (für Think-tank Combo)

## 🎯 Test-Szenarien

### Test 1: Grundfunktionen

1. Spiele **Symbolpolitik** → Sollte 1 Karte ziehen
2. Spiele **Verzögerungsverfahren** → Sollte AP von 2→3 erhöhen
3. Spiele **Spin Doctor** → Sollte stärkste Gov-Karte +2 I geben

### Test 2: Think-tank Combo

1. Spiele **Think-tank** → Ziehe 1 Karte + Flag setzen
2. Spiele **Joschka Fischer** → Sollte +2 I erhalten (7→9 I)
3. Validiere dass Flag konsumiert wurde

### Test 3: Edge Cases

1. Spiele **Spin Doctor** ohne Gov-Karten → "Keine Regierungs-Karte" Log
2. Spiele **Symbolpolitik** mit leerem Deck → "Kein Nachziehstapel" Log
3. Spiele **Verzögerungsverfahren** bei 4 AP → Sollte bei 4 bleiben

### Test 4: Event Queue Priority

1. Spiele mehrere Karten schnell hintereinander
2. Prüfe Game Log für korrekte Reihenfolge der Effekte

## 🔧 Test-Setup

1. **Deck auswählen**: Im DeckBuilder "INITIATIVE_TEST_DECK" wählen
2. **Dev-Modus**: M-Taste drücken für erweiterte Logs
3. **Game Log**: Öffnen um Engine-Messages zu sehen
4. **Quick Test**: Match vs AI für schnelle Iteration

## 🔍 Was zu beachten

- **Game Log Nachrichten**: Achte auf 🃏, ⏱️, 🧠, 🗞️ Emojis
- **AP-Anzeige**: Sollte sich bei Verzögerungsverfahren ändern
- **Einfluss-Werte**: Sollten sich bei Spin Doctor/Think-tank ändern
- **Kartenanzahl**: Hand sollte sich bei Symbolpolitik/Think-tank ändern
- **Error-Handling**: Sollte graceful mit Edge Cases umgehen

## 🎮 Optimaler Testflow

1. **Start**: Match mit INITIATIVE_TEST_DECK
2. **Hand prüfen**: Welche Initiativen verfügbar?
3. **Baseline**: Notiere aktuelle AP/Einfluss-Werte
4. **Execute**: Spiele Initiative und beobachte Changes
5. **Validate**: Prüfe Game Log für Engine-Messages
6. **Iterate**: Teste nächste Initiative oder Kombination
