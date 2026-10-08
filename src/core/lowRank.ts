import type { FloatMatrix, FloatVector } from './float';
import { eigenvalues, shiftedMatrix } from './eigen';
import { transpose, type Matrix, type Vector } from './matrix';
import { matMul, matVec } from './products';
import { Rational } from './rational';
import { scaleInteger } from './scaling';
import { nullSpaceBasis } from './subspaces';
import type { ThinSvd } from './svdLarge';

/** A number written as a·√b (b squarefree) when it is a square root of a rational, as the notes write σ₁ = √3. */
export interface Surd {
  /** σ² exactly. */
  square: Rational;
  /** "\\sqrt{3}", "2\\sqrt{2}", "\\frac{\\sqrt{6}}{3}", "1". */
  tex: string;
  value: number;
}

/** Largest a with a² dividing x, and the squarefree rest b (x = a²b). */
function squarefree(x: bigint): { a: bigint; b: bigint } {
  let a = 1n;
  let b = x;
  for (let p = 2n; p * p <= b; p++) {
    while (b % (p * p) === 0n) {
      b /= p * p;
      a *= p;
    }
  }
  return { a, b };
}

/** √r = coefficient·√radicand, radicand squarefree (√(p/q) = √(pq)/q). */
export function surdParts(r: Rational): { coefficient: Rational; radicand: bigint } {
  const { a, b } = squarefree(r.num * r.den);
  return { coefficient: Rational.of(a, r.den), radicand: b };
}

/** √r for a rational r ≥ 0 in the form (a/q)√b: √(p/q) = √(pq)/q. */
export function surd(r: Rational): Surd {
  const { coefficient, radicand: b } = surdParts(r);
  const num = coefficient.num;
  const den = coefficient.den;
  const root = b === 1n ? '' : `\\sqrt{${b}}`;
  let tex: string;
  if (den === 1n) tex = num === 1n && root ? root : `${num}${root}`;
  else tex = `\\frac{${num === 1n && root ? '' : num}${root}}{${den}}`;
  return { square: r, tex, value: Math.sqrt(r.toNumber()) };
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
  const m = A.length;
  const n = A[0]?.length ?? 0;
  if (m > 4 || n > 4) throw new RangeError('Exact layers are for matrices up to 4 × 4');
  const AtA = matMul(transpose(A), A);
  const sigma: Surd[] = [];
  const layers: Matrix[] = [];
  const vs: Vector[] = [];
  for (const lambda of eigenvalues(AtA)) {
    if (lambda.kind !== 'rational') return null;
    if (lambda.value.isZero()) continue;
    // A repeated nonzero eigenvalue leaves vᵢ undetermined within its eigenspace.
    if (lambda.multiplicity > 1) return null;
    const v = scaleInteger(nullSpaceBasis(shiftedMatrix(AtA, lambda.value))[0]);
    const vv = v.reduce((acc, x) => acc.add(x.mul(x)), Rational.ZERO);
    const Av = matVec(A, v);
    // σᵢuᵢvᵢᵀ = Avᵢvᵢᵀ/‖vᵢ‖²: rational, though σᵢ, uᵢ and vᵢ need not be.
    layers.push(Av.map((a) => v.map((b) => a.mul(b).div(vv))));
    sigma.push(surd(lambda.value));
    vs.push(v);
  }
  return { sigma, layers, v: vs };
}

/** σᵢuᵢvᵢᵀ for i = 1 … r from a thin SVD, in floats. */
export function svdLayers(svd: ThinSvd): FloatMatrix[] {
  return svd.sigma.map((s, l) => svd.U.map((row) => svd.V.map((vrow) => row[l] * s * vrow[l])));
}

/** F-M50: Aₖ = σ₁u₁v₁ᵀ + ⋯ + σₖuₖvₖᵀ. */
export function truncate(svd: ThinSvd, k: number): FloatMatrix {
  const m = svd.U.length;
  const n = svd.V.length;
  const kk = Math.max(0, Math.min(k, svd.sigma.length));
  const out = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let l = 0; l < kk; l++) {
    const s = svd.sigma[l];
    for (let i = 0; i < m; i++) {
      const us = svd.U[i][l] * s;
      if (us === 0) continue;
      const row = out[i];
      for (let j = 0; j < n; j++) row[j] += us * svd.V[j][l];
    }
  }
  return out;
}

/**
 * F-M50, NF-13: Aₖ for a changing k, updated by adding or removing layers from
 * the last k rather than rebuilding (fast enough to redraw a 1024² image as
 * the slider moves).
 */
export function truncationUpdater(svd: ThinSvd): (k: number) => FloatMatrix {
  const m = svd.U.length;
  const n = svd.V.length;
  const r = svd.sigma.length;
  const sum = new Float64Array(m * n);
  let current = 0;
  const addLayer = (l: number, sign: 1 | -1) => {
    const s = sign * svd.sigma[l];
    for (let i = 0; i < m; i++) {
      const us = svd.U[i][l] * s;
      if (us === 0) continue;
      const base = i * n;
      for (let j = 0; j < n; j++) sum[base + j] += us * svd.V[j][l];
    }
  };
  return (k: number) => {
    const target = Math.max(0, Math.min(k, r));
    // Rebuild when that is cheaper than adding or removing the difference (removing also accumulates rounding).
    if (target < current && current - target > target) {
      sum.fill(0);
      current = 0;
    }
    while (current < target) addLayer(current++, 1);
    while (current > target) addLayer(--current, -1);
    return Array.from({ length: m }, (_, i) => Array.from(sum.subarray(i * n, (i + 1) * n)));
  };
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
  const squares = sigma.map((s) => s * s);
  const total = squares.reduce((a, b) => a + b, 0);
  const tail = squares.slice(Math.max(0, k)).reduce((a, b) => a + b, 0);
  return { frobeniusSquared: tail, spectral: sigma[k] ?? 0, energyKept: total === 0 ? 1 : 1 - tail / total };
}

/** F-M50, L7-I2: the number of σᵢ with σᵢ ≥ c·σ₁ (the notes use c = 0.01). */
export function cutoffRank(sigma: FloatVector, c: number): number {
  if (sigma.length === 0) return 0;
  const threshold = c * sigma[0];
  // A little slack so σᵢ exactly at the cutoff counts despite rounding.
  return sigma.filter((s) => s >= threshold * (1 - 1e-12)).length;
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
  const sent = k * (m + n);
  const original = m * n;
  return { sent, original, ratio: sent / original, withSigma: sent + k };
}
