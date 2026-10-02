/** Generateur pseudo-aleatoire deterministe (mulberry32). */
export function mulberry32(graine: number): () => number {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash de chaine -> entier 32 bits (pour deriver une graine numerique). */
export function hashChaine(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Outils tires d'un PRNG. */
export class Alea {
  private r: () => number;
  constructor(graine: string | number) {
    this.r = mulberry32(typeof graine === "string" ? hashChaine(graine) : graine);
  }
  /** Flottant dans [0, 1). */
  prochain(): number {
    return this.r();
  }
  /** Entier dans [min, max] inclus. */
  entier(min: number, max: number): number {
    return min + Math.floor(this.r() * (max - min + 1));
  }
  /** Element aleatoire d'un tableau. */
  choix<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length)]!;
  }
  /** true avec probabilite p. */
  chance(p: number): boolean {
    return this.r() < p;
  }
}
