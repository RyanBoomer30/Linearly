import type { Pivoting } from './lu';

/**
 * F-M22: 64-bit floating-point LU, used only for the pivoting demo (L3-PM6).
 * Floats here are the point: rounding is what the demo shows.
 */
export function luFloat(A: number[][], pivoting: Pivoting): { P: number[][]; L: number[][]; U: number[][] } {
  const n = A.length;
  const U = A.map((r) => [...r]);
  const L: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const P = L.map((r) => [...r]);
  for (let c = 0; c < n; c++) {
    let p = c;
    if (pivoting === 'partial') {
      for (let r = c + 1; r < n; r++) if (Math.abs(U[r][c]) > Math.abs(U[p][c])) p = r;
    } else if (pivoting === 'zero-only' && U[c][c] === 0) {
      for (let r = c + 1; r < n; r++) if (U[r][c] !== 0) { p = r; break; }
    }
    if (p !== c) {
      [U[c], U[p]] = [U[p], U[c]];
      [P[c], P[p]] = [P[p], P[c]];
      for (let k = 0; k < c; k++) [L[c][k], L[p][k]] = [L[p][k], L[c][k]];
    }
    if (U[c][c] === 0) continue;
    for (let r = c + 1; r < n; r++) {
      const l = U[r][c] / U[c][c];
      L[r][c] = l;
      for (let j = c; j < n; j++) U[r][j] = j === c ? 0 : U[r][j] - l * U[c][j];
    }
  }
  return { P, L, U };
}

/** Solve Ax = b in floats through PA = LU. */
export function solveFloat(A: number[][], b: number[], pivoting: Pivoting): number[] {
  const { P, L, U } = luFloat(A, pivoting);
  const n = A.length;
  const Pb = P.map((row) => row.reduce((s, p, j) => s + p * b[j], 0));
  const c: number[] = [];
  for (let i = 0; i < n; i++) c[i] = Pb[i] - L[i].slice(0, i).reduce((s, l, j) => s + l * c[j], 0);
  const x: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let s = c[i];
    for (let j = i + 1; j < n; j++) s -= U[i][j] * x[j];
    x[i] = s / U[i][i];
  }
  return x;
}
