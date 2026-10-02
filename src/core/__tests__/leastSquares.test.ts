import { describe, expect, it } from 'vitest';
import { describeDependency, diagnoseDependencies, leastSquares, residual, rss } from '../leastSquares';
import { matrix, matrixToStrings, vector, vectorToStrings } from '../matrix';
import { DEPENDENT, HOUSES, s, sv } from './fixtures';

/** The houses from the Lesson 2 notes as plain Ax = b (§10.2). */
const ORIGIN_A = matrix(HOUSES.x.map((x) => [x]));
const LINE_A = matrix(HOUSES.x.map((x) => [1, x]));
const b = vector(HOUSES.y);

describe('leastSquares (F-M13)', () => {
  it('houses, one column: x̂ = 400/133', () => {
    const ls = leastSquares(ORIGIN_A, b);
    expect(matrixToStrings(ls.AtA)).toEqual([['133/16']]);
    expect(vectorToStrings(ls.Atb)).toEqual(sv([25]));
    expect(vectorToStrings(ls.xHat!)).toEqual(['400/133']);
    expect(vectorToStrings(ls.p)).toEqual(['400/133', '900/133', '600/133']);
    expect(vectorToStrings(ls.e)).toEqual(['132/133', '-102/133', '65/133']);
    expect(ls.meanRss.toString()).toBe('241/399');
  });

  it('houses, two columns: x̂ = (5/2, 30/19) and Aᵀe = 0', () => {
    const ls = leastSquares(LINE_A, b);
    expect(matrixToStrings(ls.AtA)).toEqual([['3', '19/4'], ['19/4', '133/16']]);
    expect(vectorToStrings(ls.Atb)).toEqual(sv([15, 25]));
    expect(vectorToStrings(ls.xHat!)).toEqual(['5/2', '30/19']);
    expect(vectorToStrings(ls.p)).toEqual(['155/38', '115/19', '185/38']);
    expect(vectorToStrings(ls.e)).toEqual(['-3/38', '-1/19', '5/38']);
    expect(vectorToStrings(ls.Ate)).toEqual(sv([0, 0]));
    expect(ls.meanRss.toString()).toBe('1/114');
  });

  it('dependent columns: AᵀA is singular, x̂ is null, p is still the projection', () => {
    const ls = leastSquares(matrix(DEPENDENT.x.map((x) => [1, x])), vector(DEPENDENT.y));
    expect(matrixToStrings(ls.AtA)).toEqual(s([[3, 3], [3, 3]]));
    expect(ls.xHat).toBeNull();
    expect(vectorToStrings(ls.p)).toEqual(sv([5, 5, 5]));
  });
});

describe('residual and rss at any x (notes §2.3)', () => {
  it('the notes\' rounded θ* = 3: e = (1, −0.75, 0.5), mean RSS 29/48 ≈ 0.604', () => {
    expect(vectorToStrings(residual(ORIGIN_A, b, vector([3])))).toEqual(['1', '-3/4', '1/2']);
    expect(rss(ORIGIN_A, b, vector([3])).toString()).toBe('29/16');
  });

  it('the notes\' rounded θ* = (2.5, 1.58): mean RSS exactly 0.008775', () => {
    expect(rss(LINE_A, b, vector(['2.5', '1.58'])).toString()).toBe('1053/40000'); // ÷ 3 = 0.008775
  });

  it('at x̂ the residual is e and rss = ‖e‖²', () => {
    const ls = leastSquares(LINE_A, b);
    expect(vectorToStrings(residual(LINE_A, b, ls.xHat!))).toEqual(vectorToStrings(ls.e));
    expect(rss(LINE_A, b, ls.xHat!).toString()).toBe(ls.rss.toString());
  });

  it('x̂ beats every other x: ‖b − Ax̂‖ ≤ ‖b − Ax‖ (notes §2.2)', () => {
    const best = leastSquares(LINE_A, b).rss;
    for (const x of [[2.5, 1.58], [3, 1], [0, 3], ['5/2', '31/19']]) {
      expect(rss(LINE_A, b, vector(x)).cmp(best)).toBe(1);
    }
  });

  it('wrong sizes throw', () => {
    expect(() => residual(LINE_A, b, vector([1]))).toThrow(RangeError);
  });
});

describe('leastSquares, normal-equation trace (L2-N3)', () => {
  it('the trace solves [AᵀA | Aᵀb] and ends at x̂', () => {
    const ls = leastSquares(LINE_A, b);
    const last = ls.normalTrace.trace.steps.at(-1)!.matrix;
    expect(last.map((r) => r[2].toString())).toEqual(['5/2', '30/19']);
    expect(ls.normalTrace.inconsistent).toBe(false);
  });

  it('a consistent system has e = 0 and x̂ = the exact solution', () => {
    const ls = leastSquares(matrix([[1, 1], [2, -1]]), vector([5, 1]));
    expect(vectorToStrings(ls.xHat!)).toEqual(sv([2, 3]));
    expect(vectorToStrings(ls.e)).toEqual(sv([0, 0]));
    expect(ls.rss.toString()).toBe('0');
  });
});

describe('diagnoseDependencies (F-M14)', () => {
  it('names column 2 as 1 × column 1', () => {
    const diagnosis = diagnoseDependencies(matrix(DEPENDENT.x.map((x) => [1, x])));
    expect(diagnosis).toMatchObject({ rank: 1, independent: false });
    expect(diagnosis.dependencies).toHaveLength(1);
    expect(diagnosis.dependencies[0].column).toBe(1);
    expect(diagnosis.dependencies[0].combination.map((c) => [c.column, c.coeff.toString()])).toEqual([[0, '1']]);
    expect(describeDependency(diagnosis.dependencies[0], ['1', 'x'])).toBe('x = 1');
  });

  it('names a combination of two columns: a₃ = a₁ + a₂', () => {
    const d = diagnoseDependencies(matrix([[1, 0, 1], [2, 1, 3], [3, -2, 1]]));
    expect(d.rank).toBe(2);
    expect(d.dependencies[0].combination.map((c) => [c.column, c.coeff.toString()])).toEqual([
      [0, '1'],
      [1, '1'],
    ]);
    expect(describeDependency(d.dependencies[0], ['a₁', 'a₂', 'a₃'])).toBe('a₃ = a₁ + a₂');
  });

  it('describes multiples with ×: bedrooms = 2 × living area', () => {
    const d = diagnoseDependencies(matrix([[1, 2], [2, 4], [3, 6]]));
    expect(describeDependency(d.dependencies[0], ['living area', 'bedrooms'])).toBe('bedrooms = 2 × living area');
  });

  it('independent columns: AᵀA invertible', () => {
    expect(diagnoseDependencies(LINE_A)).toMatchObject({ rank: 2, independent: true });
  });
});
