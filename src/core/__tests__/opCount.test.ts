import { describe, expect, it } from 'vitest';
import { lu } from '../lu';
import { matrix, vector } from '../matrix';
import { costFormulas, costOfRightHandSides, countOperations, measuredCosts, tick } from '../opCount';
import { backSub, forwardSub } from '../substitution';
import { LU_A, LU_B, LU_L, LU_U } from './fixtures';

describe('operation counting (F-M21)', () => {
  it('factoring the 3 × 3 LU example costs 8', () => {
    expect(countOperations(() => lu(matrix(LU_A), { pivoting: 'none' })).count).toBe(8);
  });

  it('the two triangular solves cost 9 together (L is unit lower: its diagonal is free)', () => {
    const { count } = countOperations(() => {
      const c = forwardSub(matrix(LU_L), vector(LU_B)).solution!;
      return backSub(matrix(LU_U), c);
    });
    expect(count).toBe(9);
  });

  it('scopes nest: the inner count is added to the outer one', () => {
    const outer = countOperations(() => {
      tick(2);
      const inner = countOperations(() => tick(3));
      expect(inner.count).toBe(3);
    });
    expect(outer.count).toBe(5);
  });

  it('closed forms at n = 3 match the counts: 8, 9, 17', () => {
    expect(costFormulas(3)).toEqual({ factor: 8, solvePair: 9, fromScratch: 17 });
  });

  it('closed forms at n = 4 and n = 100', () => {
    expect(costFormulas(4)).toEqual({ factor: 20, solvePair: 16, fromScratch: 36 });
    expect(costFormulas(100).factor).toBe(333300);
    expect(costFormulas(100).solvePair).toBe(10000);
  });

  it('4 right-hand sides: 68 from scratch versus 44 with LU (L3-K2)', () => {
    const b = vector(LU_B);
    const { fromScratch, withLu } = costOfRightHandSides(matrix(LU_A), [b, b, b, b]);
    expect(fromScratch).toEqual([17, 34, 51, 68]);
    expect(withLu).toEqual([17, 26, 35, 44]);
  });

  it('measured counts never exceed the closed forms and are the same every time (L3-K3)', () => {
    const first = measuredCosts([2, 3, 4, 5], 7);
    expect(measuredCosts([2, 3, 4, 5], 7)).toEqual(first);
    for (const m of first) {
      const f = costFormulas(m.n);
      expect(m.factor).toBeLessThanOrEqual(f.factor);
      expect(m.solvePair).toBeLessThanOrEqual(f.solvePair);
    }
  });
});
