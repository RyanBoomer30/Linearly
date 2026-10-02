import { describe, expect, it } from 'vitest';
import { asFloat, fDot, fFrobenius, fIdentity, fMatMul, fMatVec, fNorm, fTranspose, isExact, isExactVector } from '../float';
import { matrix, vector } from '../matrix';

describe('float types (F-M24)', () => {
  it('isExact tells rational matrices from float ones', () => {
    expect(isExact(matrix([[1, 2]]))).toBe(true);
    expect(isExact([[1, 2]])).toBe(false);
    expect(isExactVector(vector([1]))).toBe(true);
    expect(isExactVector([1])).toBe(false);
  });

  it('identity, transpose, products', () => {
    expect(fIdentity(2)).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(fTranspose([[1, 2, 3]])).toEqual([[1], [2], [3]]);
    expect(fMatMul([[1, 2]], [[3], [4]])).toEqual([[11]]);
    expect(fMatVec([[1, 2], [3, 4]], [1, 1])).toEqual([3, 7]);
    expect(fDot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('norms', () => {
    expect(fNorm([3, 4])).toBe(5);
    expect(fFrobenius([[1, 2], [2, 4]])).toBe(5);
  });

  it('asFloat converts exact matrices and passes float ones through', () => {
    expect(asFloat(matrix([['1/2', 3]]))).toEqual([[0.5, 3]]);
    expect(asFloat([[0.25]])).toEqual([[0.25]]);
  });
});
