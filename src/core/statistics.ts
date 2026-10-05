import type { FloatMatrix, FloatVector } from './float';
import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';

/*
 * F-M51: statistics on data-table columns, exact where the inputs are exact
 * (means, centering, variances and covariances); standardizing needs square
 * roots and is floating point. Sample variance and covariance divide by n − 1,
 * as in the notes (§7.2).
 */

/** Mean of each column. */
export function columnMeans(X: Matrix): Vector {
  return notImplemented('columnMeans');
}

/** X with each column's mean subtracted. */
export function center(X: Matrix): Matrix {
  return notImplemented('center');
}

/** s² = Σ(x − x̄)²/(n − 1). Throws for fewer than 2 values. */
export function sampleVariance(x: Vector): Rational {
  return notImplemented('sampleVariance');
}

/** Cov(x, y) = Σ(x − x̄)(y − ȳ)/(n − 1). */
export function sampleCovariance(x: Vector, y: Vector): Rational {
  return notImplemented('sampleCovariance');
}

/** S: variances on the diagonal, covariances off it; equals XcᵀXc/(n − 1) for centered Xc (L7-C3). */
export function covarianceMatrix(X: Matrix): Matrix {
  return notImplemented('covarianceMatrix');
}

export interface Standardized {
  /** (x − x̄)/s for each column. */
  Z: FloatMatrix;
  means: FloatVector;
  /** s for each column, and s² exactly. */
  stds: FloatVector;
  variances: Rational[];
}

/** (x − x̄)/s. Throws when a column is constant (s = 0). */
export function standardize(X: Matrix): Standardized {
  return notImplemented('standardize');
}

/** The correlation matrix: the covariance matrix of the standardized columns. */
export function correlationMatrix(X: Matrix): FloatMatrix {
  return notImplemented('correlationMatrix');
}
