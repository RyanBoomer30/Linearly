import type { Vector } from './matrix';
import { dot } from './products';
import { Rational } from './rational';

/** ⌊√n⌋ for a non-negative bigint (Newton's method). */
function isqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  // Correct the float guess for large n.
  while (x * x > n) x = (x + n / x) / 2n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}

/** √r when it is rational (r = p²/q² with whole p, q), else null. */
export function exactSqrt(r: Rational): Rational | null {
  if (r.isNegative()) return null;
  const n = isqrt(r.num);
  const d = isqrt(r.den);
  // r is in lowest terms, so √r is rational exactly when both parts are perfect squares.
  return n * n === r.num && d * d === r.den ? Rational.of(n, d) : null;
}

export type NormResult =
  | { kind: 'exact'; value: Rational }
  /** ‖x‖² is not the square of a rational: e.g. "‖x‖ = √3 is irrational". */
  | { kind: 'float'; value: number; reason: string };

/** F-M25: ‖x‖ exactly when possible, otherwise a float with the reason. */
export function norm(x: Vector): NormResult {
  const squared = dot(x, x);
  const exact = exactSqrt(squared);
  if (exact) return { kind: 'exact', value: exact };
  const shown = squared.isInteger() ? squared.toString() : `(${squared.toString()})`;
  return { kind: 'float', value: Math.sqrt(squared.toNumber()), reason: `‖x‖ = √${shown} is irrational` };
}
