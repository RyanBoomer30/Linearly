import { describe, expect, it } from 'vitest';
import { orthogonalityLoss } from '../accuracy';
import { cond, pseudoinverse, svd } from '../svd';
import { A3, QR_A } from './fixtures';

const mul = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
const T = (A: number[][]) => A[0].map((_, j) => A.map((r) => r[j]));

describe('svd by one-sided Jacobi (F-M29)', () => {
  const r = svd(A3);

  it('Lesson 1 A: σ ≈ 4.789, 2.658, 0 (rank 2)', () => {
    expect(r.sigma[0]).toBeCloseTo(4.789, 3);
    expect(r.sigma[1]).toBeCloseTo(2.658, 3);
    expect(Math.abs(r.sigma[2])).toBeLessThan(1e-12);
    expect(r.rank).toBe(2);
  });

  it('U and V are orthogonal, and A = UΣVᵀ', () => {
    expect(orthogonalityLoss(r.U)).toBeLessThan(1e-12);
    expect(orthogonalityLoss(r.V)).toBeLessThan(1e-12);
    const S = r.U.map((_, i) => r.V.map((_, j) => (i === j ? r.sigma[i] ?? 0 : 0)));
    const back = mul(mul(r.U, S), T(r.V));
    A3.forEach((row, i) => row.forEach((v, j) => expect(back[i][j]).toBeCloseTo(v, 12)));
  });

  it('works for tall matrices: the notes\' 4 × 2 A', () => {
    const t = svd(QR_A);
    expect(t.sigma).toHaveLength(2);
    expect(t.U).toHaveLength(4);
    expect(t.V).toHaveLength(2);
  });
});

describe('cond (F-M30)', () => {
  it('the notes\' 4 × 2 A: cond(A) ≈ 3.370, cond(AᵀA) ≈ 11.36', () => {
    expect(cond(QR_A)).toBeCloseTo(3.370, 3);
    expect(cond(mul(T(QR_A), QR_A))).toBeCloseTo(11.356, 2);
  });

  it('singular: ∞', () => {
    expect(cond(A3)).toBe(Infinity);
  });
});

describe('pseudoinverse (F-M32)', () => {
  it('Lesson 1 A: A⁺(2,5,5) = (64, −13, 51)/54, the row-space solution', () => {
    const x = mul(pseudoinverse(A3), [[2], [5], [5]]).map((r) => r[0]);
    [64 / 54, -13 / 54, 51 / 54].forEach((v, i) => expect(x[i]).toBeCloseTo(v, 10));
  });

  it('independent columns: A⁺b is the least squares x* = (1, 1/3)', () => {
    const x = mul(pseudoinverse(QR_A), [[3], [-1], [1], [3]]).map((r) => r[0]);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(1 / 3, 12);
  });
});
