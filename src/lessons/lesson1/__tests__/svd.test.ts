import { describe, expect, it } from 'vitest';
import { A3, QR_A, QR_B } from '../../../core/__tests__/fixtures';
import { matrix, vector, vectorToStrings } from '../../../core/matrix';
import { pseudoinverseView, svdBigPicture } from '../models';

describe('big picture: orthonormal bases from the SVD (Lesson 4 §8.8)', () => {
  const view = svdBigPicture(matrix(A3));

  it('σ ≈ 4.789, 2.658, 0 and rank 2 (L4-BP1)', () => {
    expect(view.sigma[0]).toBeCloseTo(4.789, 3);
    expect(view.sigma[1]).toBeCloseTo(2.658, 3);
    expect(view.rank).toBe(2);
  });

  it('orthonormal bases of all four subspaces: 2 + 1 in ℝ³ and 2 + 1 in ℝ³', () => {
    expect(view.bases.row).toHaveLength(2);
    expect(view.bases.null).toHaveLength(1);
    expect(view.bases.column).toHaveLength(2);
    expect(view.bases.leftNull).toHaveLength(1);
    // N(A) is spanned by (−1, −1, 1)/√3.
    const v3 = view.bases.null[0].vector;
    expect(Math.abs(v3[0] + v3[2])).toBeLessThan(1e-12);
    expect(Math.abs(Math.abs(v3[0]) - 1 / Math.sqrt(3))).toBeLessThan(1e-12);
  });

  it('Avᵢ = σᵢuᵢ for i ≤ r, Av₃ = 0 (L4-BP2)', () => {
    expect(view.arrows.map((a) => a.zero)).toEqual([false, false, true]);
  });

  it('the companion views get the v’s in ℝⁿ and the u’s in ℝᵐ', () => {
    expect(view.scene.domain).toHaveLength(3);
    expect(view.scene.codomain).toHaveLength(3);
  });
});

describe('pseudoinverse mode (L4-BP3, L4-BP4)', () => {
  it('Lesson 1 A: A⁺(2,5,5) ≈ (1.185, −0.241, 0.944) = (64, −13, 51)/54, the shortest least squares solution', () => {
    const view = pseudoinverseView(matrix(A3), vector([2, 5, 5]));
    [64 / 54, -13 / 54, 51 / 54].forEach((v, i) => expect(view.xr[i]).toBeCloseTo(v, 10));
    expect(vectorToStrings(view.exact)).toEqual(['32/27', '-13/54', '17/18']);
    expect(view.matches).toBe(true);
    expect(view.meaning).toMatch(/shortest/i);
  });

  it('independent columns: A⁺b is the least squares x* = (1, 1/3)', () => {
    const view = pseudoinverseView(matrix(QR_A), vector(QR_B));
    expect(vectorToStrings(view.exact)).toEqual(['1', '1/3']);
    expect(view.matches).toBe(true);
    expect(view.meaning).toMatch(/least squares/i);
  });
});
