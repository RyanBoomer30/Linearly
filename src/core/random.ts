import { notImplemented } from './notImplemented';

/** A source of uniform numbers in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32: a small seeded generator (§3.1, Phase 5). The same seed gives
 * the same sequence in every browser, so simulations repeat exactly.
 */
export function mulberry32(seed: number): Rng {
  return notImplemented('mulberry32');
}

/** Draw an index with probability proportional to its weight (weights ≥ 0, not all 0). */
export function sampleIndex(weights: readonly number[], rng: Rng): number {
  return notImplemented('sampleIndex');
}

/** A fresh 32-bit seed for the "new seed" button. */
export function newSeed(): number {
  return notImplemented('newSeed');
}
