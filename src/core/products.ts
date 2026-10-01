import { getColumn, shape, zeroVector, type Matrix, type Vector } from './matrix';
import { Rational } from './rational';

/** F-M8 */
export function matMul(A: Matrix, B: Matrix): Matrix {
  const a = shape(A);
  const b = shape(B);
  if (a.cols !== b.rows) throw new RangeError(`matMul: cannot multiply ${a.rows}×${a.cols} by ${b.rows}×${b.cols}`);
  const Bcols = Array.from({ length: b.cols }, (_, j) => getColumn(B, j));
  return A.map((row) => Bcols.map((col) => dot(row, col)));
}

export function matVec(A: Matrix, x: Vector): Vector {
  if (shape(A).cols !== x.length) throw new RangeError('matVec: x must have one entry per column of A');
  return A.map((row) => dot(row, x));
}

/** uᵀv */
export function dot(u: Vector, v: Vector): Rational {
  if (u.length !== v.length) throw new RangeError('dot: vectors have different lengths');
  return u.reduce((s, x, i) => s.add(x.mul(v[i])), Rational.ZERO);
}

/** uvᵀ */
export function outer(u: Vector, v: Vector): Matrix {
  return u.map((ui) => v.map((vj) => ui.mul(vj)));
}

export function addVectors(u: Vector, v: Vector): Vector {
  if (u.length !== v.length) throw new RangeError('addVectors: vectors have different lengths');
  return u.map((x, i) => x.add(v[i]));
}

export function subVectors(u: Vector, v: Vector): Vector {
  if (u.length !== v.length) throw new RangeError('subVectors: vectors have different lengths');
  return u.map((x, i) => x.sub(v[i]));
}

export function scaleVector(c: Rational, v: Vector): Vector {
  return v.map((x) => c.mul(x));
}

/** Σ coeffs[i] · vectors[i]. */
export function linearCombination(coeffs: Rational[], vectors: Vector[]): Vector {
  if (coeffs.length !== vectors.length) throw new RangeError('linearCombination: one coefficient per vector');
  if (vectors.length === 0) return [];
  return vectors.reduce((sum, v, i) => addVectors(sum, scaleVector(coeffs[i], v)), zeroVector(vectors[0].length));
}

/** Euclidean norm in floating point (for ‖Ax − b‖ display). */
export function normFloat(v: Vector): number {
  return Math.hypot(...v.map((x) => x.toNumber()));
}
