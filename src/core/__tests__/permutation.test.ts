import { describe, expect, it } from 'vitest';
import { identity, matrix, matrixToStrings, vector, vectorToStrings } from '../matrix';
import {
  allPermutations,
  composePermutations,
  factorial,
  isPermutation,
  permutationFromSwaps,
  permuteRows,
  permuteVector,
} from '../permutation';
import { PALU_A, PALU_P, s, sv } from './fixtures';

describe('permutations (F-M20)', () => {
  it('no swaps is the identity', () => {
    expect(matrixToStrings(permutationFromSwaps(3, []))).toEqual(matrixToStrings(identity(3)));
  });

  it('notes §3.4: swap rows 1, 2 then rows 2, 3 gives P = P₂P₁', () => {
    expect(matrixToStrings(permutationFromSwaps(3, [[0, 1], [1, 2]]))).toEqual(s(PALU_P));
  });

  it('composition: the later swap is on the left (L3-PM3)', () => {
    const P1 = permutationFromSwaps(3, [[0, 1]]);
    const P2 = permutationFromSwaps(3, [[1, 2]]);
    expect(matrixToStrings(composePermutations(P2, P1))).toEqual(s(PALU_P));
    expect(matrixToStrings(composePermutations(P1, P2))).not.toEqual(s(PALU_P));
  });

  it('PA reorders the rows of A', () => {
    expect(matrixToStrings(permuteRows(matrix(PALU_P), matrix(PALU_A)))).toEqual(s([[2, 4, 2], [-1, 1, 0], [1, 2, 2]]));
  });

  it('Pb reorders the entries of b', () => {
    expect(vectorToStrings(permuteVector(matrix(PALU_P), vector([1, 2, 3])))).toEqual(sv([2, 3, 1]));
  });

  it('isPermutation', () => {
    expect(isPermutation(matrix(PALU_P))).toBe(true);
    expect(isPermutation(matrix([[1, 1], [0, 0]]))).toBe(false);
    expect(isPermutation(matrix([[2, 0], [0, 1]]))).toBe(false);
  });

  it('n! permutation matrices: 2, 6, 24 (L3-PM2)', () => {
    expect([2, 3, 4].map((n) => allPermutations(n).length)).toEqual([2, 6, 24]);
    expect([1, 2, 3, 4].map(factorial)).toEqual([1, 2, 6, 24]);
  });

  it('all distinct permutation matrices, identity first', () => {
    const all = allPermutations(3);
    expect(matrixToStrings(all[0])).toEqual(matrixToStrings(identity(3)));
    expect(new Set(all.map((P) => JSON.stringify(matrixToStrings(P)))).size).toBe(6);
    expect(all.every(isPermutation)).toBe(true);
  });
});
