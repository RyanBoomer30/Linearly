import { beforeAll, describe, expect, it } from 'vitest';
import { columnRecipe, crFactorization, type CRFactorization } from '../factorization';
import { getColumn, matrix, matrixToStrings, vectorToStrings } from '../matrix';
import { matMul, matVec } from '../products';
import { A3, OUTER, s } from './fixtures';

describe('CR factorization (F-M7, L1-P acceptance)', () => {
  let cr: CRFactorization;
  beforeAll(() => {
    cr = crFactorization(matrix(A3));
  });

  it('C is the pivot columns of A', () => {
    expect(matrixToStrings(cr.C)).toEqual(s([[1, 0], [2, 1], [3, -2]]));
    expect(cr.pivotCols).toEqual([0, 1]);
  });

  it('R is the nonzero rows of rref(A)', () => {
    expect(matrixToStrings(cr.R)).toEqual(s([[1, 0, 1], [0, 1, 1]]));
  });

  it('CR = A', () => {
    expect(matrixToStrings(matMul(cr.C, cr.R))).toEqual(s(A3));
  });

  it('column 3 = 1·(column 1) + 1·(column 2) (L1-P4)', () => {
    expect(columnRecipe(cr, 2).map(String)).toEqual(['1', '1']);
  });

  it('pivot columns rebuild themselves', () => {
    expect(columnRecipe(cr, 0).map(String)).toEqual(['1', '0']);
    expect(columnRecipe(cr, 1).map(String)).toEqual(['0', '1']);
  });

  it('each column of A is C times the matching column of R (§1.3)', () => {
    const A = matrix(A3);
    for (let j = 0; j < 3; j++) {
      expect(vectorToStrings(matVec(cr.C, getColumn(cr.R, j)))).toEqual(vectorToStrings(getColumn(A, j)));
    }
  });

  it('#cols of C = #rows of R (L1-P5)', () => {
    expect(cr.C[0].length).toBe(cr.R.length);
  });
});

describe('outer product as CR (§1.3)', () => {
  it('uvᵀ = C R with C = u and R = vᵀ', () => {
    const A = matrix([OUTER.v, OUTER.v, OUTER.v]); // uvᵀ for u = (1,1,1)
    const cr = crFactorization(A);
    expect(matrixToStrings(cr.C)).toEqual(s([[1], [1], [1]]));
    expect(matrixToStrings(cr.R)).toEqual(s([OUTER.v]));
    expect(cr.pivotCols).toEqual([0]);
  });

  it('works for non-square matrices', () => {
    const A = matrix([[1, 2, 0, 3], [2, 4, 1, 7]]);
    const cr = crFactorization(A);
    expect(cr.pivotCols).toEqual([0, 2]);
    expect(matrixToStrings(matMul(cr.C, cr.R))).toEqual(matrixToStrings(A));
  });
});
