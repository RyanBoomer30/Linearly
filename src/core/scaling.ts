import type { FloatVector } from './float';
import type { Vector } from './matrix';
import { notImplemented } from './notImplemented';

/**
 * F-M37: how an eigenvector is written. "integer" as the notes write (7, 5, 8);
 * "probability" with entries summing to 1 (for λ = 1); "unit" with length 1, as
 * NumPy returns it (L5-EG7).
 */
export type VectorScaling = 'integer' | 'probability' | 'unit';

/** Clear denominators, divide by the gcd, and make the first nonzero entry positive: (7/8, 5/8, 1) → (7, 5, 8). */
export function scaleInteger(v: Vector): Vector {
  return notImplemented('scaleInteger');
}

/** Entries summing to 1: (7, 5, 8) → (7/20, 1/4, 2/5). Throws when the entries sum to 0. */
export function scaleProbability(v: Vector): Vector {
  return notImplemented('scaleProbability');
}

/** Length 1 in floating point, sign unchanged. */
export function scaleUnit(v: Vector | FloatVector): FloatVector {
  return notImplemented('scaleUnit');
}

/**
 * L5-EG7 "rescale to the notes' form": a float vector (e.g. a NumPy column)
 * turned back into the integer vector it is a multiple of, when its entries
 * are within `tolerance` of small-integer ratios; null otherwise.
 */
export function integerFromFloat(v: FloatVector, tolerance = 1e-9): Vector | null {
  return notImplemented('integerFromFloat');
}
