import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../random';
import { bidiagonalize, svdLarge } from '../svdLarge';

const randomMatrix = (m: number, n: number, seed: number) => {
  const rng = mulberry32(seed);
  return Array.from({ length: m }, () => Array.from({ length: n }, () => rng() * 2 - 1));
};
const mul = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
const T = (A: number[][]) => A[0].map((_, j) => A.map((r) => r[j]));
const frob = (A: number[][]) => Math.sqrt(A.flat().reduce((s, x) => s + x * x, 0));

describe('large SVD (F-M48)', () => {
  it('bidiagonalization: A = U₀BV₀ᵀ with B upper bidiagonal', () => {
    const A = randomMatrix(6, 4, 1);
    const b = bidiagonalize(A);
    const B = b.diagonal.map((d, i) => b.diagonal.map((_, j) => (i === j ? d : j === i + 1 ? b.superdiagonal[i] : 0)));
    const back = mul(mul(b.U, B), T(b.V));
    back.flat().forEach((x, i) => expect(x).toBeCloseTo(A.flat()[i], 10));
  });

  it("the notes' 2 × 3 example: σ = √3, 1", () => {
    const r = svdLarge([[0, 1, 1], [1, 1, 0]]);
    expect(r.sigma[0]).toBeCloseTo(Math.sqrt(3), 12);
    expect(r.sigma[1]).toBeCloseTo(1, 12);
  });

  it('a random 40 × 30: UΣVᵀ = A, orthonormal U and V, σ decreasing', () => {
    const A = randomMatrix(40, 30, 7);
    const r = svdLarge(A);
    expect(r.sigma).toHaveLength(30);
    for (let i = 1; i < 30; i++) expect(r.sigma[i]).toBeLessThanOrEqual(r.sigma[i - 1]);
    const back = mul(r.U.map((row) => row.map((x, j) => x * r.sigma[j])), T(r.V));
    expect(frob(back.map((row, i) => row.map((x, j) => x - A[i][j])))).toBeLessThan(1e-10 * frob(A));
    const VtV = mul(T(r.V), r.V);
    VtV.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(i === j ? 1 : 0, 10)));
  });

  it('wide matrices (m < n) work by transposing', () => {
    const r = svdLarge(randomMatrix(5, 9, 3));
    expect(r.U).toHaveLength(5);
    expect(r.V).toHaveLength(9);
    expect(r.sigma).toHaveLength(5);
  });

  it('reports progress and stops when cancelled', () => {
    const fractions: number[] = [];
    svdLarge(randomMatrix(30, 30, 2), { onProgress: (f) => fractions.push(f) });
    expect(fractions.length).toBeGreaterThan(0);
    expect(fractions.at(-1)).toBe(1);
    expect(() => svdLarge(randomMatrix(30, 30, 2), { isCancelled: () => true })).toThrow(/abort|cancel/i);
  });
});
