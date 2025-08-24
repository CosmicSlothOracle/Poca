import { UID } from '../types/primitives';

// Minimal, deterministic-ish UID ohne Crypto-Abhängigkeit
let __uidCounter = 0;

export function makeUid(prefix = 'card'): UID {
  __uidCounter = (__uidCounter + 1) % Number.MAX_SAFE_INTEGER;
  return __uidCounter;
}
