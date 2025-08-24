/**
 * Deterministisches RNG-System
 * Ermöglicht reproduzierbare Zufallszahlen für Tests
 */

export interface RNG {
  /**
   * Wählt ein zufälliges Element aus einem Array
   */
  pick<T>(array: T[]): T | undefined;

  /**
   * Gibt eine Zufallszahl zwischen 0 (inklusiv) und 1 (exklusiv) zurück
   */
  random(): number;

  /**
   * Gibt eine ganze Zufallszahl zwischen 0 (inklusiv) und max (exklusiv) zurück
   */
  randomInt(max: number): number;
}

/**
 * Einfacher Pseudo-Zufallszahlengenerator (Linear Congruential Generator)
 * Basiert auf Park & Miller (1988)
 */
class SeededRNG implements RNG {
  private seed: number;

  constructor(seed: string | number = Date.now()) {
    // Konvertiere String-Seed zu Zahl
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed);
    } else {
      this.seed = seed;
    }

    // Stelle sicher, dass Seed positiv ist
    if (this.seed <= 0) {
      this.seed = 1;
    }
  }

  /**
   * Einfacher String-Hash für Seed-Konvertierung
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) || 1;
  }

  /**
   * Generiert nächste Pseudo-Zufallszahl
   */
  random(): number {
    // Park & Miller constants
    const a = 16807;
    const m = 2147483647;

    this.seed = (a * this.seed) % m;
    return (this.seed - 1) / (m - 1);
  }

  /**
   * Generiert Zufalls-Integer zwischen 0 und max (exklusiv)
   */
  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  /**
   * Wählt zufälliges Element aus Array
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const index = this.randomInt(array.length);
    return array[index];
  }
}

/**
 * Standard Math.random() basiertes RNG für Produktion
 */
class StandardRNG implements RNG {
  random(): number {
    return Math.random();
  }

  randomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }

  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }
}

/**
 * Factory-Funktion zum Erstellen eines RNG
 * @param seed Optional: Seed für deterministisches RNG (für Tests)
 */
export function makeRNG(seed?: string | number): RNG {
  if (seed !== undefined) {
    return new SeededRNG(seed);
  }
  return new StandardRNG();
}

/**
 * Globale RNG-Instanz (kann für Tests überschrieben werden)
 */
let globalRNG: RNG = new StandardRNG();

/**
 * Setzt die globale RNG-Instanz
 */
export function setGlobalRNG(rng: RNG): void {
  globalRNG = rng;
}

/**
 * Gibt die globale RNG-Instanz zurück
 */
export function getGlobalRNG(): RNG {
  return globalRNG;
}

/**
 * Convenience-Funktion: Setzt globales RNG mit Seed
 */
export function seedGlobalRNG(seed: string | number): void {
  globalRNG = new SeededRNG(seed);
}

/**
 * Convenience-Funktion: Setzt globales RNG auf Standard zurück
 */
export function resetGlobalRNG(): void {
  globalRNG = new StandardRNG();
}
