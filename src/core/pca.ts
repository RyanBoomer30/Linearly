import type { FloatMatrix, FloatVector } from './float';
import type { Matrix } from './matrix';
import type { Rational } from './rational';
import { svdLarge } from './svdLarge';

/**
 * F-M52 sign setting: "largest-positive" flips each component so its
 * largest-magnitude entry is positive (default; it gives the notes' v₁ and v₂);
 * "as-computed" keeps whatever the SVD returned.
 */
export type ComponentSign = 'largest-positive' | 'as-computed';

export interface PcaOptions {
  standardize?: boolean;
  sign?: ComponentSign;
}

export interface PcaResult {
  /** Column means subtracted, and (when standardizing) the standard deviations divided by. */
  means: FloatVector;
  scales: FloatVector | null;
  /** The centered (and maybe standardized) data, n × d. */
  X: FloatMatrix;
  /** Singular values of X, decreasing. */
  sigma: FloatVector;
  /** Components v₁ … v_d as the columns of a d × d matrix. */
  V: FloatMatrix;
  /** Left singular vectors u₁ … u_d (n × d), with the same sign choice as V. */
  U: FloatMatrix;
  /** Eigenvalues of S: λᵢ = σᵢ²/(n − 1). */
  eigenvalues: FloatVector;
  /** λᵢ/Σλ. */
  explained: FloatVector;
  /** Scores Z = XV (n × d): the new variables zᵢ = Xvᵢ. */
  scores: FloatMatrix;
}

/**
 * F-M52: centers (and optionally standardizes) X, takes its SVD (never forming
 * XᵀX), and returns the components, eigenvalues of S, variance explained and
 * scores. Throws for fewer than 2 rows.
 */
export function pca(X: Matrix | FloatMatrix, options?: PcaOptions): PcaResult {
  const rows = (X as (number | Rational)[][]).map((r) => r.map((x) => (typeof x === 'number' ? x : x.toNumber())));
  const n = rows.length;
  if (n < 2) throw new RangeError('PCA needs at least 2 rows');
  const d = rows[0].length;
  const means = Array.from({ length: d }, (_, j) => rows.reduce((acc, r) => acc + r[j], 0) / n);
  let scales: FloatVector | null = null;
  if (options?.standardize) {
    scales = means.map((mu, j) => Math.sqrt(rows.reduce((acc, r) => acc + (r[j] - mu) ** 2, 0) / (n - 1)));
    scales.forEach((s, j) => {
      if (s === 0) throw new RangeError(`Column ${j + 1} is constant (s = 0), so it cannot be standardized`);
    });
  }
  const Xc = rows.map((r) => r.map((x, j) => (x - means[j]) / (scales ? scales[j] : 1)));
  // The SVD of the centered data itself: XᵀX is never formed (Lesson 4).
  const svd = svdLarge(Xc);
  const r = svd.sigma.length;
  const V = svd.V.map((row) => row.slice(0, r));
  const U = svd.U.map((row) => row.slice(0, r));
  if ((options?.sign ?? 'largest-positive') === 'largest-positive') {
    for (let j = 0; j < r; j++) {
      const col = V.map((row) => row[j]);
      const big = col.reduce((b, x, i) => (Math.abs(x) > Math.abs(col[b]) * (1 + 1e-12) ? i : b), 0);
      if (col[big] < 0) {
        V.forEach((row) => (row[j] = -row[j]));
        U.forEach((row) => (row[j] = -row[j]));
      }
    }
  }
  const eigenvalues = svd.sigma.map((s) => (s * s) / (n - 1));
  const total = eigenvalues.reduce((a, b) => a + b, 0);
  return {
    means,
    scales,
    X: Xc,
    sigma: svd.sigma,
    V,
    U,
    eigenvalues,
    explained: eigenvalues.map((l) => (total === 0 ? 0 : l / total)),
    scores: Xc.map((row) => V[0].map((_, j) => row.reduce((acc, x, k) => acc + x * V[k][j], 0))),
  };
}
