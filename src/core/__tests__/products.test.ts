import { describe, expect, it } from 'vitest';
import { getColumn, getRow, matrix, matrixToStrings, vector, vectorToStrings } from '../matrix';
import { dot, linearCombination, matMul, matVec, normFloat, outer } from '../products';
import { q } from '../rational';
import { rank } from '../rref';
import { A3, OUTER, SYSTEM_2x2, expectRealThrow, s, sv } from './fixtures';

describe('products (F-M8)', () => {
  it('inner product uᵀv = 6', () => {
    expect(dot(vector(OUTER.u), vector(OUTER.v)).toString()).toBe('6');
  });

  it('outer product uvᵀ and its rank', () => {
    const P = outer(vector(OUTER.u), vector(OUTER.v));
    expect(matrixToStrings(P)).toEqual(s([[1, 2, 3], [1, 2, 3], [1, 2, 3]]));
    expect(rank(P)).toBe(1);
  });

  it('matVec: column picture of the 2×2 system hits b at x = (2, 3) (L1-C acceptance)', () => {
    expect(vectorToStrings(matVec(matrix(SYSTEM_2x2.A), vector([2, 3])))).toEqual(sv(SYSTEM_2x2.b));
  });

  it('linear combination 2·(1,2) + 3·(1,−1) = (5,1) (L1-C5)', () => {
    const v = linearCombination([q(2), q(3)], [vector([1, 2]), vector([1, -1])]);
    expect(vectorToStrings(v)).toEqual(sv([5, 1]));
  });

  it('matMul', () => {
    const C = matrix([[1, 0], [2, 1], [3, -2]]);
    const R = matrix([[1, 0, 1], [0, 1, 1]]);
    expect(matrixToStrings(matMul(C, R))).toEqual(s(A3));
  });

  it('matMul rejects mismatched shapes', () => {
    expectRealThrow(() => matMul(matrix([[1, 2]]), matrix([[1, 2]])));
  });

  it('normFloat', () => {
    expect(normFloat(vector([3, 4]))).toBeCloseTo(5);
  });
});

describe('two ways to compute Ax (§1.1)', () => {
  it('rows by columns: entry i of Ax is (row i of A)·x', () => {
    const A = matrix(SYSTEM_2x2.A);
    const x = vector([2, 3]);
    const Ax = matVec(A, x);
    expect(Ax.map((_, i) => dot(getRow(A, i), x).toString())).toEqual(vectorToStrings(Ax));
  });

  it('columns by rows: Ax = x₁a₁ + x₂a₂ + x₃a₃ (3×3, t = 0 and t = 1)', () => {
    const A = matrix(A3);
    const cols = [0, 1, 2].map((j) => getColumn(A, j));
    for (const x of [[2, 1, 0], [1, 0, 1]]) {
      expect(vectorToStrings(linearCombination(x.map((xi) => q(xi)), cols))).toEqual(sv([2, 5, 4]));
      expect(vectorToStrings(matVec(A, vector(x)))).toEqual(sv([2, 5, 4]));
    }
  });
});

describe('matrix times columns (§1.3): A[c₁ … cₖ] = [Ac₁ … Acₖ]', () => {
  it('column j of AB is A · (column j of B)', () => {
    const C = matrix([[1, 0], [2, 1], [3, -2]]);
    const R = matrix([[1, 0, 1], [0, 1, 1]]);
    const CR = matMul(C, R);
    for (let j = 0; j < 3; j++) {
      expect(vectorToStrings(getColumn(CR, j))).toEqual(vectorToStrings(matVec(C, getColumn(R, j))));
    }
  });

  it('inner product as a 1×1 matrix: uᵀv = [6]', () => {
    const uT = matrix([OUTER.u]);
    const v = matrix(OUTER.v.map((x) => [x]));
    expect(matrixToStrings(matMul(uT, v))).toEqual([['6']]);
  });

  it('outer product as a matrix product: u (3×1) times vᵀ (1×3)', () => {
    const u = matrix(OUTER.u.map((x) => [x]));
    const vT = matrix([OUTER.v]);
    expect(matrixToStrings(matMul(u, vT))).toEqual(s([[1, 2, 3], [1, 2, 3], [1, 2, 3]]));
  });
});
