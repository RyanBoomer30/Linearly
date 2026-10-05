import type { FloatMatrix, FloatVector } from './float';
import { notImplemented } from './notImplemented';

/** A thin SVD A = U diag(σ) Vᵀ: U is m × r, V is n × r, σ decreasing, r = min(m, n). */
export interface ThinSvd {
  U: FloatMatrix;
  sigma: FloatVector;
  V: FloatMatrix;
}

export interface Bidiagonal {
  /** U₀ (m × n) and V₀ (n × n) with A = U₀ B V₀ᵀ. */
  U: FloatMatrix;
  V: FloatMatrix;
  /** Main diagonal d₁ … dₙ and superdiagonal e₁ … eₙ₋₁ of B. */
  diagonal: FloatVector;
  superdiagonal: FloatVector;
}

/** F-M48 step 1: Householder bidiagonalization (reusing the Lesson 4 reflectors), m ≥ n. */
export function bidiagonalize(A: FloatMatrix): Bidiagonal {
  return notImplemented('bidiagonalize');
}

export interface LargeSvdOptions {
  /** Called with a fraction 0 … 1 as the work proceeds. */
  onProgress?: (fraction: number) => void;
  /** Checked between sweeps; when it reads true the computation stops with an "aborted" error. */
  isCancelled?: () => boolean;
}

/**
 * F-M48: the SVD of a matrix up to 1024 × 1024 — Householder
 * bidiagonalization, then implicit-shift Golub–Kahan QR on the bidiagonal.
 * Never forms AᵀA. Works for m < n by transposing.
 */
export function svdLarge(A: FloatMatrix, options?: LargeSvdOptions): ThinSvd {
  return notImplemented('svdLarge');
}
