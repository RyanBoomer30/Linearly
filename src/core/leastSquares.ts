import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { AugmentedRrefResult } from './rref';

/**
 * Least squares for any Ax = b (Lesson 1 projection and normal equation
 * views); Lesson 2 calls it with A = X, b = Y. Exact throughout.
 */

export interface LeastSquaresResult {
  AtA: Matrix;
  Atb: Vector;
  /** x̂ solving AᵀAx̂ = Aᵀb; null when AᵀA is singular (F-M14). */
  xHat: Vector | null;
  /** p = Ax̂, the projection of b onto C(A). Unique even when x̂ is not. */
  p: Vector;
  /** e = b − p. */
  e: Vector;
  /** Aᵀe — always the zero vector (the F-M13 check). */
  Ate: Vector;
  /** ‖e‖². */
  rss: Rational;
  /** ‖e‖² / m. */
  meanRss: Rational;
  /** rref of [AᵀA | Aᵀb] (L2-N3). */
  normalTrace: AugmentedRrefResult;
}

/** F-M13: exact least squares via the normal equation. Built on matMul, rref and projectOnto. */
export function leastSquares(A: Matrix, b: Vector): LeastSquaresResult {
  return notImplemented('leastSquares');
}

/** b − Ax for any x, exactly. */
export function residual(A: Matrix, b: Vector, x: Vector): Vector {
  return notImplemented('residual');
}

/** ‖b − Ax‖², exactly. */
export function rss(A: Matrix, b: Vector, x: Vector): Rational {
  return notImplemented('rss');
}

/** Column j of A equals Σ coeff · column (earlier pivot columns). */
export interface ColumnDependency {
  column: number;
  combination: { column: number; coeff: Rational }[];
}

export interface DependencyDiagnosis {
  rank: number;
  /** True exactly when AᵀA is invertible (L2-N4). */
  independent: boolean;
  dependencies: ColumnDependency[];
}

/** F-M14: use CR to name each dependent column of A as a combination of earlier ones. */
export function diagnoseDependencies(A: Matrix): DependencyDiagnosis {
  return notImplemented('diagnoseDependencies');
}

/** "bedrooms = 2 × living area", using the given column labels (a₁, a₂, … in Lesson 1). */
export function describeDependency(dep: ColumnDependency, labels: string[]): string {
  return notImplemented('describeDependency');
}
