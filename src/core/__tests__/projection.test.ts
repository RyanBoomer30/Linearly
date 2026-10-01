import { describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../matrix';
import { addVectors, dot, matVec } from '../products';
import { decomposeColumnLeftNull, decomposeRowNull, projectOnto, rowSpaceSolution } from '../projection';
import { leftNullSpaceBasis, nullSpaceBasis } from '../subspaces';
import { A3, B_CONSISTENT, B_INCONSISTENT, RANK1_2x2, STRANG_3x4, SYSTEM_2x2, sv } from './fixtures';

describe('projectOnto', () => {
  it('onto a line: (3,1) onto span{(1,1)} = (2,2)', () => {
    expect(vectorToStrings(projectOnto([vector([1, 1])], vector([3, 1])))).toEqual(sv([2, 2]));
  });

  it('onto a plane with a non-orthogonal basis stays exact', () => {
    // (2,5,5) onto C(A) = span{(1,2,3), (0,1,−2)}: p = b − (1/54)(−7,2,1)
    const p = projectOnto([vector([1, 2, 3]), vector([0, 1, -2])], vector(B_INCONSISTENT));
    expect(vectorToStrings(p)).toEqual(['115/54', '134/27', '269/54']);
  });

  it('a vector already in the span projects to itself', () => {
    expect(vectorToStrings(projectOnto([vector([1, 2, 3]), vector([0, 1, -2])], vector(B_CONSISTENT)))).toEqual(sv(B_CONSISTENT));
  });

  it('empty basis projects to 0', () => {
    expect(vectorToStrings(projectOnto([], vector([1, 2])))).toEqual(sv([0, 0]));
  });
});

describe('x = x_r + x_n (big picture, ℝⁿ side)', () => {
  it('3×3: the particular solution (2,1,0) splits into (1,0,1) + (1,1,−1)', () => {
    const { xr, xn } = decomposeRowNull(matrix(A3), vector([2, 1, 0]));
    expect(vectorToStrings(xr)).toEqual(sv([1, 0, 1]));
    expect(vectorToStrings(xn)).toEqual(sv([1, 1, -1]));
  });

  it('a row-space vector has x_n = 0', () => {
    const { xr, xn } = decomposeRowNull(matrix(A3), vector([1, 2, 3])); // (1,0,1) + 2(0,1,1)
    expect(vectorToStrings(xr)).toEqual(sv([1, 2, 3]));
    expect(vectorToStrings(xn)).toEqual(sv([0, 0, 0]));
  });

  it('invertible 2×2: N(A) = {0}, so x_r = x', () => {
    const { xr, xn } = decomposeRowNull(matrix(SYSTEM_2x2.A), vector([2, 3]));
    expect(vectorToStrings(xr)).toEqual(sv([2, 3]));
    expect(vectorToStrings(xn)).toEqual(sv([0, 0]));
  });

  it('Strang 3×4: x = (1,1,1,1) → x_r = (22,2,52,76)/59, x_n = (37,57,7,−17)/59', () => {
    const A = matrix(STRANG_3x4);
    const x = vector([1, 1, 1, 1]);
    const { xr, xn } = decomposeRowNull(A, x);
    expect(vectorToStrings(xr)).toEqual(['22/59', '2/59', '52/59', '76/59']);
    expect(vectorToStrings(xn)).toEqual(['37/59', '57/59', '7/59', '-17/59']);
    expect(vectorToStrings(addVectors(xr, xn))).toEqual(vectorToStrings(x));
    expect(dot(xr, xn).isZero()).toBe(true);
    // A sends x_n to 0, so A x_r = A x
    expect(vectorToStrings(matVec(A, xn))).toEqual(sv([0, 0, 0]));
    expect(vectorToStrings(matVec(A, xr))).toEqual(sv([6, 10, 0]));
  });

  it('rank one 2×2: (3,1) = (2,2) + (1,−1)', () => {
    const { xr, xn } = decomposeRowNull(matrix(RANK1_2x2), vector([3, 1]));
    expect(vectorToStrings(xr)).toEqual(sv([2, 2]));
    expect(vectorToStrings(xn)).toEqual(sv([1, -1]));
  });

  it('x_r is orthogonal to every N(A) basis vector', () => {
    const A = matrix(A3);
    const { xr } = decomposeRowNull(A, vector([5, -1, 2]));
    for (const n of nullSpaceBasis(A)) expect(dot(xr, n).isZero()).toBe(true);
  });
});

describe('b = p + e (big picture, ℝᵐ side)', () => {
  it('b in C(A): e = 0', () => {
    const { p, e } = decomposeColumnLeftNull(matrix(A3), vector(B_CONSISTENT));
    expect(vectorToStrings(p)).toEqual(sv(B_CONSISTENT));
    expect(vectorToStrings(e)).toEqual(sv([0, 0, 0]));
  });

  it('b = (2,5,5): e = (1/54)(−7,2,1), the left-null-space part', () => {
    const A = matrix(A3);
    const { p, e } = decomposeColumnLeftNull(A, vector(B_INCONSISTENT));
    expect(vectorToStrings(e)).toEqual(['-7/54', '1/27', '1/54']);
    expect(vectorToStrings(p)).toEqual(['115/54', '134/27', '269/54']);
    expect(dot(p, e).isZero()).toBe(true);
    for (const c of [vector([1, 2, 3]), vector([0, 1, -2])]) expect(dot(e, c).isZero()).toBe(true);
    expect(leftNullSpaceBasis(A)).toHaveLength(1);
  });

  it('Strang 3×4: b = (1,2,3) → p = (1,2,0), e = (0,0,3)', () => {
    const { p, e } = decomposeColumnLeftNull(matrix(STRANG_3x4), vector([1, 2, 3]));
    expect(vectorToStrings(p)).toEqual(sv([1, 2, 0]));
    expect(vectorToStrings(e)).toEqual(sv([0, 0, 3]));
  });

  it('rank one 2×2: b = (1,0) → p = (1/5,2/5), e = (4/5,−2/5)', () => {
    const { p, e } = decomposeColumnLeftNull(matrix(RANK1_2x2), vector([1, 0]));
    expect(vectorToStrings(p)).toEqual(['1/5', '2/5']);
    expect(vectorToStrings(e)).toEqual(['4/5', '-2/5']);
  });
});

describe('rowSpaceSolution: each b in C(A) comes from exactly one x_r', () => {
  it('3×3, b = (2,5,4): the row-space solution is (1,0,1) — the t = 1 solution from the notes', () => {
    expect(vectorToStrings(rowSpaceSolution(matrix(A3), vector(B_CONSISTENT))!)).toEqual(sv([1, 0, 1]));
  });

  it('every solution x = (2,1,0) + t(−1,−1,1) has the same x_r', () => {
    const A = matrix(A3);
    for (const x of [[2, 1, 0], [1, 0, 1], [0, -1, 2], [4, 3, -2]]) {
      expect(vectorToStrings(decomposeRowNull(A, vector(x)).xr)).toEqual(sv([1, 0, 1]));
    }
  });

  it('returns null when b is not in C(A)', () => {
    expect(rowSpaceSolution(matrix(A3), vector(B_INCONSISTENT))).toBeNull();
  });
});
