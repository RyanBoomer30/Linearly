import { describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../matrix';
import { matVec } from '../products';
import { q } from '../rational';
import { evaluateSolution, solve } from '../solve';
import { A3, B_CONSISTENT, B_INCONSISTENT, SYSTEM_2x2, sv } from './fixtures';

describe('solve (F-M5)', () => {
  it('2×2: unique solution (2, 3)', () => {
    const sol = solve(matrix(SYSTEM_2x2.A), vector(SYSTEM_2x2.b));
    expect(sol.kind).toBe('unique');
    if (sol.kind !== 'unique') return;
    expect(vectorToStrings(sol.x)).toEqual(sv([2, 3]));
  });

  it('3×3 consistent: x = (2,1,0) + t(−1,−1,1)', () => {
    const sol = solve(matrix(A3), vector(B_CONSISTENT));
    expect(sol.kind).toBe('parametric');
    if (sol.kind !== 'parametric') return;
    expect(vectorToStrings(sol.particular)).toEqual(sv([2, 1, 0]));
    expect(sol.nullBasis.map(vectorToStrings)).toEqual([sv([-1, -1, 1])]);
    expect(sol.freeVars).toEqual([2]);
  });

  it('3×3 inconsistent: no solution', () => {
    const sol = solve(matrix(A3), vector(B_INCONSISTENT));
    expect(sol.kind).toBe('none');
    if (sol.kind !== 'none') return;
    expect(sol.inconsistentRow).toBe(2);
  });

  it('t = 0 and t = 1 give the two combinations from the notes (L1-S4)', () => {
    const particular = vector([2, 1, 0]);
    const nullBasis = [vector([-1, -1, 1])];
    expect(vectorToStrings(evaluateSolution(particular, nullBasis, [q(0)]))).toEqual(sv([2, 1, 0]));
    expect(vectorToStrings(evaluateSolution(particular, nullBasis, [q(1)]))).toEqual(sv([1, 0, 1]));
  });

  it('every point on the solution line solves Ax = b', () => {
    const A = matrix(A3);
    for (const t of [q(-2), q(1, 3), q(5)]) {
      const x = evaluateSolution(vector([2, 1, 0]), [vector([-1, -1, 1])], [t]);
      expect(vectorToStrings(matVec(A, x))).toEqual(sv(B_CONSISTENT));
    }
  });
});
