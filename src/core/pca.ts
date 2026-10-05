import type { FloatMatrix, FloatVector } from './float';
import type { Matrix } from './matrix';
import { notImplemented } from './notImplemented';

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
  return notImplemented('pca');
}
