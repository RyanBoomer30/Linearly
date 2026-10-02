import type { Matrix, Vector } from './matrix';

/**
 * F-M24: floating-point (IEEE 754 double) matrices and vectors, the same
 * arithmetic NumPy uses. Only +, −, ×, ÷ and Math.sqrt are used, which are
 * exactly rounded in every browser, so results are reproducible (NF-10).
 * The float LU of F-M22 (floatLu.ts) works on these types.
 */
export type FloatMatrix = number[][];
export type FloatVector = number[];

/** Either kind of matrix: exact (Rational) or floating point. */
export type AnyMatrix = Matrix | FloatMatrix;
export type AnyVector = Vector | FloatVector;

/** F-D10: whether a result is exact, and if not, why floating point was needed. */
export type Precision = { kind: 'exact' } | { kind: 'float'; reason: string };

export const EXACT: Precision = { kind: 'exact' };

/** Machine epsilon for doubles, 2⁻⁵² ≈ 2.2 × 10⁻¹⁶ (L4-C4). */
export const MACHINE_EPSILON = 2 ** -52;

/** True when M holds exact rationals rather than floats. */
export function isExact(M: AnyMatrix): M is Matrix {
  return M.length === 0 || M[0].length === 0 || typeof M[0][0] !== 'number';
}

export function isExactVector(v: AnyVector): v is Vector {
  return v.length === 0 || typeof v[0] !== 'number';
}

export function fIdentity(n: number): FloatMatrix {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

export function fTranspose(A: FloatMatrix): FloatMatrix {
  return (A[0] ?? []).map((_, j) => A.map((r) => r[j]));
}

export function fMatMul(A: FloatMatrix, B: FloatMatrix): FloatMatrix {
  const inner = B.length;
  if ((A[0]?.length ?? 0) !== inner) throw new RangeError('fMatMul: inner sizes differ');
  const cols = B[0]?.length ?? 0;
  return A.map((r) => Array.from({ length: cols }, (_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
}

export function fMatVec(A: FloatMatrix, x: FloatVector): FloatVector {
  if ((A[0]?.length ?? 0) !== x.length) throw new RangeError('fMatVec: x must have one entry per column');
  return A.map((r) => r.reduce((s, a, k) => s + a * x[k], 0));
}

export function fDot(u: FloatVector, v: FloatVector): number {
  if (u.length !== v.length) throw new RangeError('fDot: vectors have different lengths');
  return u.reduce((s, x, i) => s + x * v[i], 0);
}

/** Euclidean norm, computed as √(Σ xᵢ²). */
export function fNorm(v: FloatVector): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/** Frobenius norm of a float matrix. */
export function fFrobenius(M: FloatMatrix): number {
  return Math.sqrt(M.reduce((s, r) => s + r.reduce((t, x) => t + x * x, 0), 0));
}

/** Any matrix as floats (exact entries converted). */
export function asFloat(M: AnyMatrix): FloatMatrix {
  return isExact(M) ? M.map((r) => r.map((x) => x.toNumber())) : M.map((r) => [...r]);
}

export function asFloatVector(v: AnyVector): FloatVector {
  return isExactVector(v) ? v.map((x) => x.toNumber()) : [...v];
}
