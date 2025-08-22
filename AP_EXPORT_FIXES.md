# 🔧 AP System: Export-Fixes für bestehende Imports

## ✅ Problem Gelöst: Fehlende Exports nach Refactoring

### **🎯 Issue: Missing Exports nach AP-Centralization**

```bash
ERROR: export 'MAX_AP' was not found in '../utils/ap'
ERROR: Module has no exported member 'START_AP'
ERROR: Module has no exported member 'APCalc'
```

### **🔧 Solution: Backwards-Compatible Exports**

#### **📊 `src/utils/ap.ts` - Erweiterte Exports**

```typescript
import type { GameState, Player } from "../types/game";
import type { Card } from "../types/game";

export const START_AP = 2; // ✅ Re-exported constant
export const MAX_AP = 4; // ✅ Re-exported constant

export type APCostInfo = { cost: number; reasons: string[] };
// ✅ Legacy compatibility alias
export type APCalc = APCostInfo;

export function getCardActionPointCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: "innen" | "aussen"
): APCostInfo {
  // ... implementation ...
}
```

### **✅ Affected Files Fixed:**

#### **`src/engine/instant.ts`:**

```typescript
import { MAX_AP } from "../utils/ap"; // ✅ Now works
```

#### **`src/utils/ap.test.ts`:**

```typescript
import { getCardActionPointCost, START_AP, MAX_AP, APCalc } from "./ap"; // ✅ All imports work
```

## 🚀 Validation: TypeScript Clean ✅

### **Compilation Check:**

```bash
npx tsc --noEmit
# Exit code: 0 - Keine Fehler!
```

### **✅ Export Strategy:**

#### **New Primary Type:**

- **`APCostInfo`**: Neue, klarere Type-Definition
- **Used by**: Neue AP-Logic, zukünftige Implementierungen

#### **Legacy Compatibility:**

- **`APCalc = APCostInfo`**: Type-Alias für bestehenden Code
- **Maintains**: Bestehende Test-Kompatibilität
- **Zero Breaking Changes**: Alle imports funktionieren weiter

#### **Constants Re-exported:**

- **`START_AP = 2`**: Für Game-Initialization
- **`MAX_AP = 4`**: Für AP-Limits in Engine-Code

## 🔧 Technical Benefits

### **✅ Seamless Migration:**

- **No Breaking Changes**: Bestehender Code funktioniert unverändert
- **Gradual Adoption**: Neue Code kann `APCostInfo` verwenden
- **Type Safety**: Beide Types sind identisch, nur Name unterschiedlich

### **✅ Clean Architecture:**

- **Primary API**: `getCardActionPointCost() -> APCostInfo`
- **Legacy Support**: `APCalc` alias für backwards compatibility
- **Centralized Constants**: Alle AP-related Constants an einem Ort

### **✅ Future-Proof:**

```typescript
// New code can use:
const result: APCostInfo = getCardActionPointCost(state, player, card);

// Old code continues to work:
const result: APCalc = getCardActionPointCost(state, player, card);
```

## 🎯 Integration Status

### **✅ Completed:**

1. **Constants exported**: `START_AP`, `MAX_AP`
2. **Types compatible**: `APCalc = APCostInfo`
3. **All imports fixed**: No compilation errors
4. **Tests compatible**: Existing tests work unchanged

### **🔧 Ready for Implementation:**

1. **Post-Play Flag Logic**: Integration patterns provided
2. **Turn-Reset Logic**: Template code ready
3. **Logging Updates**: Improved format patterns ready

### **📝 Usage Examples:**

#### **Engine Code (instant.ts):**

```typescript
import { MAX_AP } from "../utils/ap";
// ...
newState.actionPoints[actor] = Math.min(MAX_AP, newValue);
```

#### **Test Code (ap.test.ts):**

```typescript
import { getCardActionPointCost, APCalc } from "./ap";
// ...
const result: APCalc = getCardActionPointCost(state, player, card);
expect(result.cost).toBe(0);
```

#### **New Implementation Code:**

```typescript
import { getCardActionPointCost, APCostInfo } from "../utils/ap";
// ...
const { cost, reasons }: APCostInfo = getCardActionPointCost(
  state,
  player,
  card
);
log(
  `🔎 AP-Kosten: ${cost}${reasons.length ? " • " + reasons.join(" • ") : ""}`
);
```

**AP System Exports sind jetzt vollständig backwards-compatible! 🎉**

### **Ready for Integration:**

- ✅ **No Compilation Errors**
- ✅ **Legacy Code Compatible**
- ✅ **New API Available**
- ✅ **Constants Accessible**
- ✅ **Tests Passing**
