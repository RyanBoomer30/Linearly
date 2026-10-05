/** A source of uniform numbers in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32: a small seeded generator (§3.1, Phase 5). The same seed gives
 * the same sequence in every browser, so simulations repeat exactly.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw an index with probability proportional to its weight (weights ≥ 0, not all 0). */
export function sampleIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (!(total > 0)) throw new RangeError('sampleIndex: every weight is 0');
  let r = rng() * total;
  let last = -1;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (w === 0) continue;
    last = i;
    if (r < w) return i;
    r -= w;
  }
  // Rounding can leave r just above the last weight.
  return last;
}

/** A fresh 32-bit seed for the "new seed" button. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
