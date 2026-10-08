import type { FloatMatrix, FloatVector } from './float';
import type { Matrix, Vector } from './matrix';
import { Rational } from './rational';

/*
 * F-M51: statistics on data-table columns, exact where the inputs are exact
 * (means, centering, variances and covariances); standardizing needs square
 * roots and is floating point. Sample variance and covariance divide by n − 1,
 * as in the notes (§7.2).
 */

/** Mean of each column. */
export function columnMeans(X: Matrix): Vector {
  const n = X.length;
  if (n === 0) throw new RangeError('No rows, so no means');
  return X[0].map((_, j) => X.reduce((acc, row) => acc.add(row[j]), Rational.ZERO).div(Rational.of(n)));
}

/** X with each column's mean subtracted. */
export function center(X: Matrix): Matrix {
  const means = columnMeans(X);
  return X.map((row) => row.map((x, j) => x.sub(means[j])));
}

/** s² = Σ(x − x̄)²/(n − 1). Throws for fewer than 2 values. */
export function sampleVariance(x: Vector): Rational {
  return sampleCovariance(x, x);
}

/** Cov(x, y) = Σ(x − x̄)(y − ȳ)/(n − 1). */
export function sampleCovariance(x: Vector, y: Vector): Rational {
  const n = x.length;
  if (n < 2) throw new RangeError('A sample variance or covariance needs at least 2 values (it divides by n − 1)');
  if (y.length !== n) throw new RangeError('Both variables need the same number of values');
  const mx = x.reduce((a, v) => a.add(v), Rational.ZERO).div(Rational.of(n));
  const my = y.reduce((a, v) => a.add(v), Rational.ZERO).div(Rational.of(n));
  return x.reduce((acc, xi, i) => acc.add(xi.sub(mx).mul(y[i].sub(my))), Rational.ZERO).div(Rational.of(n - 1));
}

/** S: variances on the diagonal, covariances off it; equals XcᵀXc/(n − 1) for centered Xc (L7-C3). */
export function covarianceMatrix(X: Matrix): Matrix {
  const cols = X[0].map((_, j) => X.map((row) => row[j]));
  return cols.map((a) => cols.map((b) => sampleCovariance(a, b)));
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
  const cols = X[0].map((_, j) => X.map((row) => row[j]));
  const variances = cols.map((c) => sampleVariance(c));
  variances.forEach((v, j) => {
    if (v.isZero()) throw new RangeError(`Column ${j + 1} is constant (s = 0), so it cannot be standardized`);
  });
  const means = columnMeans(X).map((m) => m.toNumber());
  const stds = variances.map((v) => Math.sqrt(v.toNumber()));
  return { Z: X.map((row) => row.map((x, j) => (x.toNumber() - means[j]) / stds[j])), means, stds, variances };
}

/** The correlation matrix: the covariance matrix of the standardized columns. */
export function correlationMatrix(X: Matrix): FloatMatrix {
  const S = covarianceMatrix(X);
  const s = S.map((row, i) => Math.sqrt(row[i].toNumber()));
  return S.map((row, i) => row.map((c, j) => c.toNumber() / (s[i] * s[j])));
}
