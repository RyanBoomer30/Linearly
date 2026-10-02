import { describe, expect, it } from 'vitest';
import { luFloat, solveFloat } from '../floatLu';

const TINY = [
  [1e-20, 1],
  [1, 1],
];

describe('float LU (F-M22, L3-PM6)', () => {
  it('without pivoting the tiny pivot ruins x₁: x = (0, 1)', () => {
    expect(solveFloat(TINY, [1, 2], 'none')).toEqual([0, 1]);
  });

  it('partial pivoting gets x = (1, 1)', () => {
    expect(solveFloat(TINY, [1, 2], 'partial')).toEqual([1, 1]);
  });

  it('partial pivoting swaps the rows', () => {
    expect(luFloat(TINY, 'partial').P).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it('agrees with exact LU on a well-behaved matrix', () => {
    const { L, U } = luFloat(
      [
        [1, 2, 2],
        [2, 6, 5],
        [-1, 8, 7],
      ],
      'none',
    );
    expect(L).toEqual([
      [1, 0, 0],
      [2, 1, 0],
      [-1, 5, 1],
    ]);
    expect(U).toEqual([
      [1, 2, 2],
      [0, 2, 1],
      [0, 0, 4],
    ]);
  });
});
