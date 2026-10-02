import { fFrobenius, fMatMul, fNorm, fTranspose, type FloatMatrix, type FloatVector } from './float';
import { leastSquares } from './leastSquares';
import type { Vector } from './matrix';
import { rowSpaceSolution } from './projection';
import { Rational } from './rational';

/**
 * F-M31: the exact rational value of a double (every finite double is
 * m·2ᵏ), so a reference answer computed from stored floats is truly exact.
 * Unlike Rational.fromNumber, 0.1 becomes 3602879701896397/36028797018963968.
 */
export function exactRationalFromFloat(x: number): Rational {
  if (!Number.isFinite(x)) throw new RangeError(`exactRationalFromFloat: ${x} is not finite`);
  if (x === 0) return Rational.ZERO;
  // Read the IEEE 754 bits: x = (−1)^sign · mantissa · 2^exponent.
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  const sign = bits >> 63n ? -1n : 1n;
  const biased = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const mantissa = biased === 0 ? fraction : fraction | (1n << 52n);
  const exponent = (biased === 0 ? 1 : biased) - 1075;
  return exponent >= 0 ? Rational.of(sign * mantissa * (1n << BigInt(exponent))) : Rational.of(sign * mantissa, 1n << BigInt(-exponent));
}

/** The exact least squares solution for float data, from its exact stored values. */
export function exactLeastSquaresFromFloats(A: FloatMatrix, b: FloatVector): Vector {
  const exactA = A.map((r) => r.map(exactRationalFromFloat));
  const exactB = b.map(exactRationalFromFloat);
  const ls = leastSquares(exactA, exactB);
  return ls.xHat ?? rowSpaceSolution(exactA, ls.p)!;
}

/** ‖x − x_exact‖ / ‖x_exact‖ (F-M31). */
export function relativeError(x: FloatVector, exact: Vector): number {
  const reference = exact.map((r) => r.toNumber());
  const size = fNorm(reference);
  const diff = fNorm(x.map((v, i) => v - reference[i]));
  return size === 0 ? diff : diff / size;
}

/** Loss of orthogonality ‖QᵀQ − I‖ (Frobenius) (F-M31). */
export function orthogonalityLoss(Q: FloatMatrix): number {
  const G = fMatMul(fTranspose(Q), Q);
  return fFrobenius(G.map((r, i) => r.map((g, j) => g - (i === j ? 1 : 0))));
}
