import type { FloatMatrix, FloatVector } from './float';
import type { Matrix } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { ThinSvd } from './svdLarge';

/** A number written as a·√b (b squarefree) when it is a square root of a rational, as the notes write σ₁ = √3. */
export interface Surd {
  /** σ² exactly. */
  square: Rational;
  /** "\\sqrt{3}", "2\\sqrt{2}", "\\frac{\\sqrt{6}}{3}", "1". */
  tex: string;
  value: number;
}

export interface ExactLayers {
  /** σᵢ in surd form, decreasing. */
  sigma: Surd[];
  /** σᵢuᵢvᵢᵀ = Avᵢvᵢᵀ/‖vᵢ‖², exact (F-M49). */
  layers: Matrix[];
  /** vᵢ as integer vectors (eigenvectors of AᵀA); uᵢ = Avᵢ/σᵢ is shown as (Avᵢ)/(σᵢ‖vᵢ‖). */
  v: Matrix;
}

/**
 * F-M49: exact rank-1 layers when every nonzero eigenvalue of AᵀA is rational
 * (the layers are then rational even though σᵢ, uᵢ, vᵢ may not be). Null when
 * some eigenvalue of AᵀA is irrational or repeated in a way that leaves vᵢ
 * undetermined. Small matrices only (n ≤ 4).
 */
export function exactLayers(A: Matrix): ExactLayers | null {
  return notImplemented('exactLayers');
}

/** σᵢuᵢvᵢᵀ for i = 1 … r from a thin SVD, in floats. */
export function svdLayers(svd: ThinSvd): FloatMatrix[] {
  return notImplemented('svdLayers');
}

/** F-M50: Aₖ = σ₁u₁v₁ᵀ + ⋯ + σₖuₖvₖᵀ. */
export function truncate(svd: ThinSvd, k: number): FloatMatrix {
  return notImplemented('truncate');
}

/**
 * F-M50, NF-13: Aₖ for a changing k, updated by adding or removing layers from
 * the last k rather than rebuilding (fast enough to redraw a 1024² image as
 * the slider moves).
 */
export function truncationUpdater(svd: ThinSvd): (k: number) => FloatMatrix {
  return notImplemented('truncationUpdater');
}

export interface TruncationError {
  /** ‖A − Aₖ‖_F² = σₖ₊₁² + ⋯ + σᵣ². */
  frobeniusSquared: number;
  /** ‖A − Aₖ‖₂ = σₖ₊₁ (0 when k ≥ r). */
  spectral: number;
  /** Share of ‖A‖_F² kept: (σ₁² + ⋯ + σₖ²)/Σσᵢ². */
  energyKept: number;
}

/** F-M50 */
export function truncationError(sigma: FloatVector, k: number): TruncationError {
  return notImplemented('truncationError');
}

/** F-M50, L7-I2: the number of σᵢ with σᵢ ≥ c·σ₁ (the notes use c = 0.01). */
export function cutoffRank(sigma: FloatVector, c: number): number {
  return notImplemented('cutoffRank');
}

export interface StorageCost {
  /** k(m + n): the vectors sent. */
  sent: number;
  /** mn: the original. */
  original: number;
  /** sent / original. */
  ratio: number;
  /** k(m + n) + k, counting the singular values too. */
  withSigma: number;
}

/** F-M50, L7-I3 */
export function storageCost(m: number, n: number, k: number): StorageCost {
  return notImplemented('storageCost');
}
