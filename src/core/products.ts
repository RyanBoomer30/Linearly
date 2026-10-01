import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { Matrix, Vector } from './matrix';

/** F-M8 */
export function matMul(A: Matrix, B: Matrix): Matrix {
  return notImplemented('matMul');
}

export function matVec(A: Matrix, x: Vector): Vector {
  return notImplemented('matVec');
}

/** uᵀv */
export function dot(u: Vector, v: Vector): Rational {
  return notImplemented('dot');
}

/** uvᵀ */
export function outer(u: Vector, v: Vector): Matrix {
  return notImplemented('outer');
}

export function addVectors(u: Vector, v: Vector): Vector {
  return notImplemented('addVectors');
}

export function subVectors(u: Vector, v: Vector): Vector {
  return notImplemented('subVectors');
}

export function scaleVector(c: Rational, v: Vector): Vector {
  return notImplemented('scaleVector');
}

/** Σ coeffs[i] · vectors[i]. */
export function linearCombination(coeffs: Rational[], vectors: Vector[]): Vector {
  return notImplemented('linearCombination');
}

/** Euclidean norm in floating point (for ‖Ax − b‖ display). */
export function normFloat(v: Vector): number {
  return notImplemented('normFloat');
}
