import { crFactorization } from './factorization';
import { shape, transpose, type Matrix, type Vector } from './matrix';
import { dot, matMul, matVec, subVectors } from './products';
import { projectOnto } from './projection';
import { Rational } from './rational';
import { rrefAugmented, type AugmentedRrefResult } from './rref';
import { columnSpaceBasis } from './subspaces';

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
  const { rows: m, cols: n } = shape(A);
  if (b.length !== m) throw new RangeError('leastSquares: b must have one entry per row of A');
  const At = transpose(A);
  const AtA = matMul(At, A);
  const Atb = matVec(At, b);
  // The normal equation is always consistent; it has a unique solution exactly when AᵀA is invertible.
  const normalTrace = rrefAugmented(AtA, Atb);
  const xHat = normalTrace.pivotCols.length === n ? normalTrace.matrix.slice(0, n).map((r) => r[n]) : null;
  // p is unique even when x̂ is not, so project directly.
  const p = xHat ? matVec(A, xHat) : projectOnto(columnSpaceBasis(A), b);
  const e = subVectors(b, p);
  const rssValue = dot(e, e);
  return {
    AtA,
    Atb,
    xHat,
    p,
    e,
    Ate: matVec(At, e),
    rss: rssValue,
    meanRss: m === 0 ? Rational.ZERO : rssValue.div(Rational.of(m)),
    normalTrace,
  };
}

/** b − Ax for any x, exactly. */
export function residual(A: Matrix, b: Vector, x: Vector): Vector {
  return subVectors(b, matVec(A, x));
}

/** ‖b − Ax‖², exactly. */
export function rss(A: Matrix, b: Vector, x: Vector): Rational {
  const e = residual(A, b, x);
  return dot(e, e);
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
  const n = shape(A).cols;
  const { R, pivotCols } = crFactorization(A);
  const dependencies = Array.from({ length: n }, (_, j) => j)
    .filter((j) => !pivotCols.includes(j))
    .map((column) => ({
      column,
      // Column j of R holds the weights on the pivot columns (L1-CR3).
      combination: pivotCols
        .map((pc, i) => ({ column: pc, coeff: R[i][column] }))
        .filter((c) => !c.coeff.isZero()),
    }));
  return { rank: pivotCols.length, independent: pivotCols.length === n, dependencies };
}

/** "bedrooms = 2 × living area", using the given column labels (a₁, a₂, … in Lesson 1). */
export function describeDependency(dep: ColumnDependency, labels: string[]): string {
  const term = (coeff: Rational, label: string) => (coeff.equals(Rational.ONE) ? label : `${coeff.toString()} × ${label}`);
  const rhs = dep.combination
    .map(({ column, coeff }, k) => {
      const sign = coeff.isNegative() ? (k === 0 ? '−' : ' − ') : k === 0 ? '' : ' + ';
      return sign + term(coeff.abs(), labels[column]);
    })
    .join('');
  return `${labels[dep.column]} = ${rhs || '0'}`;
}
