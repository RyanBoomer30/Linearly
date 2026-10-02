import { fIdentity, fMatMul, fTranspose, MACHINE_EPSILON, type FloatMatrix, type FloatVector } from './float';

export interface Svd {
  /** m × m orthogonal. */
  U: FloatMatrix;
  /** min(m, n) singular values, largest first. */
  sigma: FloatVector;
  /** n × n orthogonal. */
  V: FloatMatrix;
  /** Numerical rank: singular values above the tolerance. */
  rank: number;
}

const column = (M: FloatMatrix, j: number) => M.map((r) => r[j]);
const dotv = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/**
 * Extend orthonormal columns to an orthonormal basis of ℝᵐ by trying the
 * standard basis vectors and orthogonalizing each (twice, for accuracy).
 */
function completeBasis(cols: number[][], m: number): number[][] {
  const basis = cols.map((c) => [...c]);
  for (let e = 0; e < m && basis.length < m; e++) {
    let v: number[] = Array.from({ length: m }, (_, i) => (i === e ? 1 : 0));
    for (let pass = 0; pass < 2; pass++) {
      for (const b of basis) {
        const r = dotv(b, v);
        v = v.map((x, i) => x - r * b[i]);
      }
    }
    const len = Math.sqrt(dotv(v, v));
    if (len > 1e-8) basis.push(v.map((x) => x / len));
  }
  return basis;
}

/**
 * F-M29: SVD for matrices up to 4 × 4 by one-sided Jacobi rotations on A
 * itself. Never forms AᵀA, which would square the condition number.
 */
export function svd(A: FloatMatrix): Svd {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  if (m < n) {
    // A = (Aᵀ)ᵀ: swap the roles of U and V.
    const t = svd(fTranspose(A));
    return { U: t.V, sigma: t.sigma, V: t.U, rank: t.rank };
  }
  const W = A.map((r) => [...r]); // columns rotate toward orthogonality: W = AV
  const V = fIdentity(n);
  for (let sweep = 0; sweep < 60; sweep++) {
    let rotated = false;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const wp = column(W, p);
        const wq = column(W, q);
        const alpha = dotv(wp, wp);
        const beta = dotv(wq, wq);
        const gamma = dotv(wp, wq);
        if (Math.abs(gamma) <= MACHINE_EPSILON * Math.sqrt(alpha * beta) || gamma === 0) continue;
        rotated = true;
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (const M of [W, V]) {
          for (const row of M) {
            const a = row[p];
            const b = row[q];
            row[p] = c * a - s * b;
            row[q] = s * a + c * b;
          }
        }
      }
    }
    if (!rotated) break;
  }
  const lengths = Array.from({ length: n }, (_, j) => Math.sqrt(dotv(column(W, j), column(W, j))));
  const order = lengths.map((_, j) => j).sort((a, b) => lengths[b] - lengths[a]);
  const sigma = order.map((j) => lengths[j]);
  const tol = rankTolerance(sigma, m, n);
  const rank = sigma.filter((s) => s > tol).length;
  const us = order.slice(0, rank).map((j) => column(W, j).map((x) => x / lengths[j]));
  const U = fTranspose(completeBasis(us, m));
  return { U, sigma, V: V.map((row) => order.map((j) => row[j])), rank };
}

/** F-M30: σ_max / σ_min (∞ when σ_min = 0). */
export function cond(A: FloatMatrix): number {
  const { sigma, rank } = svd(A);
  return rank < sigma.length ? Infinity : sigma[0] / sigma[sigma.length - 1];
}

/** F-M32: A⁺ = VΣ⁺Uᵀ, dropping singular values below the tolerance. */
export function pseudoinverse(A: FloatMatrix): FloatMatrix {
  const { U, sigma, V, rank } = svd(A);
  const m = A.length;
  // VΣ⁺ is n × m with column i = vᵢ/σᵢ for i < rank.
  const VSigma = V.map((row) => Array.from({ length: m }, (_, i) => (i < rank ? row[i] / sigma[i] : 0)));
  return fMatMul(VSigma, fTranspose(U));
}

/** Tolerance for treating σ as 0: max(m, n) · σ_max · ε. */
export function rankTolerance(sigma: FloatVector, m: number, n: number): number {
  return Math.max(m, n) * (sigma[0] ?? 0) * MACHINE_EPSILON;
}
