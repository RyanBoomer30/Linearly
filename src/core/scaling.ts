import type { FloatVector } from './float';
import type { Vector } from './matrix';
import { Rational } from './rational';

/**
 * F-M37: how an eigenvector is written. "integer" as the notes write (7, 5, 8);
 * "probability" with entries summing to 1 (for λ = 1); "unit" with length 1, as
 * NumPy returns it (L5-EG7).
 */
export type VectorScaling = 'integer' | 'probability' | 'unit';

const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};
const lcm = (a: bigint, b: bigint) => (a / gcd(a, b)) * b;

/**
 * Which entry decides the sign: the largest in absolute value (the first of
 * any ties). This reproduces every eigenvector the notes print — (7, 5, 8),
 * (1, 0, −1) and (−1, −3, 4) — which "first nonzero entry positive" does not.
 */
function signEntry(v: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[best]) * (1 + 1e-12)) best = i;
  return best;
}

/** Clear denominators, divide by the gcd, and make the largest entry (the first of ties) positive: (7/8, 5/8, 1) → (7, 5, 8). */
export function scaleInteger(v: Vector): Vector {
  if (v.every((x) => x.isZero())) return v;
  const den = v.reduce((l, x) => lcm(l, x.den), 1n);
  const ints = v.map((x) => (x.num * den) / x.den);
  const g = ints.reduce((acc, x) => gcd(acc, x), 0n);
  const scaled = ints.map((x) => x / g);
  const flip = scaled[signEntry(scaled.map(Number))] < 0n;
  return scaled.map((x) => Rational.of(flip ? -x : x));
}

/** Entries summing to 1: (7, 5, 8) → (7/20, 1/4, 2/5). Throws when the entries sum to 0. */
export function scaleProbability(v: Vector): Vector {
  const sum = v.reduce((s, x) => s.add(x), Rational.ZERO);
  if (sum.isZero()) throw new RangeError('The entries sum to 0, so this vector cannot be scaled to a probability vector');
  return v.map((x) => x.div(sum));
}

/** Length 1 in floating point, sign unchanged. */
export function scaleUnit(v: Vector | FloatVector): FloatVector {
  const f = v.map((x) => (typeof x === 'number' ? x : x.toNumber()));
  const len = Math.hypot(...f);
  return len === 0 ? f : f.map((x) => x / len);
}

/**
 * L5-EG7 "rescale to the notes' form": a float vector (e.g. a NumPy column)
 * turned back into the integer vector it is a multiple of, when its entries
 * are within `tolerance` of small-integer ratios; null otherwise.
 */
export function integerFromFloat(v: FloatVector, tolerance = 1e-9): Vector | null {
  const nonzero = v.filter((x) => Math.abs(x) > tolerance * Math.max(...v.map(Math.abs)));
  if (nonzero.length === 0) return null;
  const smallest = Math.min(...nonzero.map(Math.abs));
  for (let d = 1; d <= 120; d++) {
    const r = v.map((x) => (x / smallest) * d);
    if (r.every((x) => Math.abs(x - Math.round(x)) <= tolerance * Math.max(1, Math.abs(x)))) {
      return scaleInteger(r.map((x) => Rational.of(Math.round(x))));
    }
  }
  return null;
}
