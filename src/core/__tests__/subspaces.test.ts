import { beforeAll, describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../matrix';
import { dot, outer } from '../products';
import {
  columnSpaceBasis,
  distanceToColumnSpace,
  fourSubspaces,
  inColumnSpace,
  leftNullSpaceBasis,
  nullSpaceBasis,
  rowSpaceBasis,
} from '../subspaces';
import { A3, B_CONSISTENT, B_INCONSISTENT, OUTER, RANK1_2x2, STRANG_3x4, sv } from './fixtures';

describe('four subspaces (F-M6, L1-F acceptance)', () => {
  let A: ReturnType<typeof matrix>;
  beforeAll(() => {
    A = matrix(A3);
  });

  it('C(A) basis is the pivot columns (1,2,3), (0,1,−2)', () => {
    expect(columnSpaceBasis(A).map(vectorToStrings)).toEqual([sv([1, 2, 3]), sv([0, 1, -2])]);
  });

  it('C(Aᵀ) basis is (1,0,1), (0,1,1)', () => {
    expect(rowSpaceBasis(A).map(vectorToStrings)).toEqual([sv([1, 0, 1]), sv([0, 1, 1])]);
  });

  it('N(A) basis is (−1,−1,1)', () => {
    expect(nullSpaceBasis(A).map(vectorToStrings)).toEqual([sv([-1, -1, 1])]);
  });

  it('N(Aᵀ) basis is (−7,2,1)', () => {
    expect(leftNullSpaceBasis(A).map(vectorToStrings)).toEqual([sv([-7, 2, 1])]);
  });

  it('dimensions r, n − r, m − r', () => {
    const f = fourSubspaces(A);
    expect(f.rank).toBe(2);
    expect(f.row).toHaveLength(2);
    expect(f.nullSpace).toHaveLength(f.n - f.rank);
    expect(f.column).toHaveLength(2);
    expect(f.leftNull).toHaveLength(f.m - f.rank);
  });

  it('rank + nullity = n (L1-F5)', () => {
    const f = fourSubspaces(A);
    expect(f.rank + f.nullSpace.length).toBe(f.n);
  });

  it('N(A) ⟂ C(Aᵀ) and N(Aᵀ) ⟂ C(A)', () => {
    const f = fourSubspaces(A);
    for (const n of f.nullSpace) for (const r of f.row) expect(dot(n, r).isZero()).toBe(true);
    for (const y of f.leftNull) for (const c of f.column) expect(dot(y, c).isZero()).toBe(true);
  });
});

describe('column space membership (L1-CS acceptance)', () => {
  let A: ReturnType<typeof matrix>;
  beforeAll(() => {
    A = matrix(A3);
  });

  it('(2,5,4) is in C(A), (2,5,5) is not', () => {
    expect(inColumnSpace(A, vector(B_CONSISTENT))).toBe(true);
    expect(inColumnSpace(A, vector(B_INCONSISTENT))).toBe(false);
  });

  it('left null vector test: (−7,2,1)·b is 0 for (2,5,4) and 1 for (2,5,5)', () => {
    const y = vector([-7, 2, 1]);
    expect(dot(y, vector(B_CONSISTENT)).toString()).toBe('0');
    expect(dot(y, vector(B_INCONSISTENT)).toString()).toBe('1');
  });

  it('distance to C(A) is 0 inside and 1/‖(−7,2,1)‖ for (2,5,5)', () => {
    expect(distanceToColumnSpace(A, vector(B_CONSISTENT))).toBeCloseTo(0);
    expect(distanceToColumnSpace(A, vector(B_INCONSISTENT))).toBeCloseTo(1 / Math.sqrt(54));
  });
});

describe('outer product subspaces (§1.3)', () => {
  it('C(uvᵀ) has basis {(1,1,1)} and C((uvᵀ)ᵀ) has basis {(1,2,3)}', () => {
    const A = outer(vector(OUTER.u), vector(OUTER.v));
    expect(columnSpaceBasis(A).map(vectorToStrings)).toEqual([sv([1, 1, 1])]);
    expect(rowSpaceBasis(A).map(vectorToStrings)).toEqual([sv([1, 2, 3])]);
  });

  it('rank 1, nullity 2, left nullity 2', () => {
    const f = fourSubspaces(outer(vector(OUTER.u), vector(OUTER.v)));
    expect(f.rank).toBe(1);
    expect(f.nullSpace).toHaveLength(2);
    expect(f.leftNull).toHaveLength(2);
  });
});

describe('null space as orthogonality to every row (§1.4)', () => {
  it('Ax = 0 ⇔ rᵢ·x = 0 for every row rᵢ of A', () => {
    const A = matrix(A3);
    for (const x of nullSpaceBasis(A)) {
      for (const row of A) expect(dot(row, x).isZero()).toBe(true);
    }
  });

  it('C(A) is a subspace of ℝᵐ and C(Aᵀ) of ℝⁿ', () => {
    const A = matrix([[1, 2, 0, 3], [2, 4, 1, 7]]); // 2×4
    const f = fourSubspaces(A);
    expect(f.m).toBe(2);
    expect(f.n).toBe(4);
    for (const c of f.column) expect(c).toHaveLength(2);
    for (const r of f.row) expect(r).toHaveLength(4);
    for (const n of f.nullSpace) expect(n).toHaveLength(4);
    for (const y of f.leftNull) expect(y).toHaveLength(2);
  });
});

describe("Strang's 3×4 example (four subspaces paper §2)", () => {
  let f: ReturnType<typeof fourSubspaces>;
  beforeAll(() => {
    f = fourSubspaces(matrix(STRANG_3x4));
  });

  it('dimensions r = 2, n − r = 2, m − r = 1', () => {
    expect([f.m, f.n, f.rank]).toEqual([3, 4, 2]);
    expect(f.row).toHaveLength(2);
    expect(f.nullSpace).toHaveLength(2);
    expect(f.column).toHaveLength(2);
    expect(f.leftNull).toHaveLength(1);
  });

  it('bases match the paper', () => {
    expect(f.column.map(vectorToStrings)).toEqual([sv([1, 0, 0]), sv([0, 1, 0])]);
    expect(f.leftNull.map(vectorToStrings)).toEqual([sv([0, 0, 1])]);
    expect(f.row.map(vectorToStrings)).toEqual([sv([1, 0, 2, 3]), sv([0, 1, 4, 5])]);
    expect(f.nullSpace.map(vectorToStrings)).toEqual([sv([-2, -4, 1, 0]), sv([-3, -5, 0, 1])]);
  });
});

describe("Strang's rank one 2×2 (four lines in ℝ²)", () => {
  it('C(Aᵀ) = line through (1,1), N(A) through (−1,1), C(A) through (1,2), N(Aᵀ) through (−2,1)', () => {
    const f = fourSubspaces(matrix(RANK1_2x2));
    expect(f.row.map(vectorToStrings)).toEqual([sv([1, 1])]);
    expect(f.nullSpace.map(vectorToStrings)).toEqual([sv([-1, 1])]);
    expect(f.column.map(vectorToStrings)).toEqual([sv([1, 2])]);
    expect(f.leftNull.map(vectorToStrings)).toEqual([sv([-2, 1])]);
  });
});
