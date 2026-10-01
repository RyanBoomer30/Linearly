import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { Matrix } from './matrix';

export interface CRFactorization {
  /** Pivot columns of A (m × r). */
  C: Matrix;
  /** Nonzero rows of rref(A) (r × n). */
  R: Matrix;
  /** 0-based pivot column indices of A. */
  pivotCols: number[];
}

/** F-M7 */
export function crFactorization(A: Matrix): CRFactorization {
  return notImplemented('crFactorization');
}

/**
 * Coefficients that rebuild column j of A from the columns of C:
 * column j of A = Σ R[i][j] · C[:, i] (L1-P4).
 */
export function columnRecipe(cr: CRFactorization, j: number): Rational[] {
  return notImplemented('columnRecipe');
}
