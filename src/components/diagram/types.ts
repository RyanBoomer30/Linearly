export type SubspaceId = 'row' | 'null' | 'column' | 'leftNull';

/**
 * 'dimensions': Strang Fig. 1 — sizes, dimensions, right angles.
 * 'A':  x = x_r + x_n; A x_r = b, A x_n = 0 (ℝⁿ → ℝᵐ).
 * 'At': t = p + e; Aᵀt = Aᵀp, Aᵀe = 0 (ℝᵐ → ℝⁿ).
 */
export type BigPictureMode = 'dimensions' | 'A' | 'At';

/** Plain-text labels for the points in the diagram (computed exactly elsewhere). */
export interface BigPictureLabels {
  x?: string;
  xr?: string;
  xn?: string;
  b?: string;
  t?: string;
  p?: string;
  e?: string;
  Att?: string;
}
