import { describe, expect, it } from 'vitest';
import { A3, CR_PRODUCT, HOUSES_XTX, LU_A, LU_B, LU_L, LU_U, PALU_A, PALU_P, s, sv } from '../../../core/__tests__/fixtures';
import { matrix, matrixToStrings, vector, vectorToStrings, type Matrix } from '../../../core/matrix';
import {
  compositionView,
  growthChart,
  housingYearsView,
  layersView,
  lduView,
  luView,
  manyRhsView,
  matchingStep,
  paluView,
  peelingView,
  permutationBuilder,
  permutationGallery,
  productShape,
  solveView,
  solveWithFactorsView,
  tinyPivotDemo,
  twoWaysView,
} from '../models';

const B = matrix(CR_PRODUCT.B);
const C = matrix(CR_PRODUCT.C);
const strings = (M: Matrix) => matrixToStrings(M);
const input = (A: Matrix) => ({ A, B, C });

// §7.1 -----------------------------------------------------------------------------

describe('§7.1 two ways to multiply', () => {
  it('shape bookkeeping: (3 × 2)(2 × 3) = 3 × 3 (L3-MM1)', () => {
    const shape = productShape(B, C);
    expect(shape).toMatchObject({ m: 3, p: 2, n: 3, mismatch: null });
    expect(shape.tex).toMatch(/3 \\times 2.*2 \\times 3.*3 \\times 3/);
  });

  it('a mismatch explains itself', () => {
    expect(productShape(B, B).mismatch).toMatch(/inner/i);
  });

  it('rows × columns: entry (3, 3) is (3, −2)·(1, 1) = 1 (L3-MM2)', () => {
    const view = twoWaysView(B, C, 'rowsByColumns');
    const step = view.steps.find((st) => st.entry?.row === 2 && st.entry.col === 2)!;
    expect(step.tex).toMatch(/3.*-2.*= 1/);
    expect(strings(step.partial)[2][2]).toBe('1');
  });

  it('columns × rows: two layers whose running sum is A (L3-MM3)', () => {
    const view = twoWaysView(B, C, 'columnsByRows');
    expect(view.steps.filter((st) => st.layer)).toHaveLength(2);
    expect(strings(view.steps.at(-1)!.partial)).toEqual(s(A3));
  });

  it('both modes end at the same matrix, with a check (L3-MM4)', () => {
    for (const mode of ['rowsByColumns', 'columnsByRows'] as const) {
      const view = twoWaysView(B, C, mode);
      expect(strings(view.result)).toEqual(s(A3));
      expect(view.check.equal).toBe(true);
    }
  });

  it('switching modes keeps the position: start ↔ start, end ↔ end, middle ↔ middle', () => {
    expect(matchingStep(B, C, 'rowsByColumns', 0)).toBe(0);
    expect(matchingStep(B, C, 'rowsByColumns', 9)).toBe(2);
    expect(matchingStep(B, C, 'columnsByRows', 2)).toBe(9);
    const mid = matchingStep(B, C, 'columnsByRows', 1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(9);
  });

  it('one column in C: the row and column pictures (L3-MM5)', () => {
    expect(twoWaysView(B, matrix([[1], [2]]), 'rowsByColumns').vectorCase).not.toBeNull();
    expect(twoWaysView(B, C, 'rowsByColumns').vectorCase).toBeNull();
  });

  it('mismatched sizes throw a RangeError', () => {
    expect(() => twoWaysView(B, B, 'rowsByColumns')).toThrow(RangeError);
  });
});

// §7.2 -----------------------------------------------------------------------------

describe('§7.2 rank-1 layers', () => {
  it('CR of the Lesson 1 matrix: two rank-1 layers of ‖·‖² 28 and 10 (≈ 5.29, 3.16)', () => {
    const view = layersView('cr', input(matrix(A3)), 2, false);
    expect(view.layers.map((l) => l.normSquared.toString())).toEqual(['28', '10']);
    expect(view.layers.map((l) => l.rank)).toEqual([1, 1]);
    expect(view.layers[0].size).toBeCloseTo(5.29, 2);
    expect(view.layers[1].size).toBeCloseTo(3.16, 2);
    expect(strings(view.total)).toEqual(s(A3));
  });

  it('keeping only the first layer leaves [[0,0,0],[0,1,1],[0,−2,−2]] (L3-R3)', () => {
    const view = layersView('cr', input(matrix(A3)), 1, false);
    expect(strings(view.partial)).toEqual(s([[1, 0, 1], [2, 0, 2], [3, 0, 3]]));
    expect(strings(view.leftover)).toEqual(s([[0, 0, 0], [0, 1, 1], [0, -2, -2]]));
    expect(view.leftoverSize).toBeCloseTo(Math.sqrt(10), 12);
  });

  it('the product B × C gives the same layers as CR here', () => {
    expect(layersView('product', input(matrix(A3)), 2, false).layers.map((l) => l.normSquared.toString())).toEqual(['28', '10']);
  });

  it('sorting by size puts the largest layer first (L3-R2)', () => {
    const view = layersView('lu', input(matrix(LU_A)), 3, true);
    const sizes = view.layers.map((l) => l.size);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it('a zero factor gives a rank-0 layer', () => {
    const view = layersView('product', { A: matrix(A3), B: matrix([[1, 0], [2, 0]]), C: matrix([[1, 1], [3, 4]]) }, 2, false);
    expect(view.layers.map((l) => l.rank)).toEqual([1, 0]);
  });

  it('one shared color scale covers every heatmap', () => {
    const view = layersView('cr', input(matrix(A3)), 1, false);
    expect(view.maxAbs).toBe(3);
  });

  it('keep 0 leaves everything over; keep all leaves nothing', () => {
    expect(strings(layersView('cr', input(matrix(A3)), 0, false).leftover)).toEqual(s(A3));
    expect(layersView('cr', input(matrix(A3)), 2, false).leftoverSize).toBe(0);
  });

  it('L and U entered directly: layer k is (column k of L)(row k of U), summing to LU (L3-R4)', () => {
    const view = layersView('factors', { ...input(matrix(A3)), L: matrix(LU_L), U: matrix(LU_U) }, 1, false);
    expect(view.layers.map((l) => strings(l.matrix))).toEqual([
      s([[1, 2, 2], [2, 4, 4], [-1, -2, -2]]),
      s([[0, 0, 0], [0, 2, 1], [0, 10, 5]]),
      s([[0, 0, 0], [0, 0, 0], [0, 0, 4]]),
    ]);
    expect(view.layers.map((l) => l.normSquared.toString())).toEqual(['54', '130', '16']);
    expect(strings(view.total)).toEqual(s(LU_A));
    expect(strings(view.leftover)).toEqual(s([[0, 0, 0], [0, 2, 1], [0, 10, 9]]));
  });

  it('L and U ignore A: they are the factors on screen', () => {
    const a = layersView('factors', { ...input(matrix(A3)), L: matrix(LU_L), U: matrix(LU_U) }, 3, false);
    const b = layersView('factors', { ...input(matrix(LU_A)), L: matrix(LU_L), U: matrix(LU_U) }, 3, false);
    expect(strings(a.total)).toEqual(strings(b.total));
  });

  it('L and U must be triangular, naming the entry; L may have any diagonal', () => {
    expect(() => layersView('factors', { ...input(matrix(A3)), L: matrix([[1, 2], [0, 1]]), U: matrix([[1, 0], [0, 1]]) }, 1, false)).toThrow(
      /L must be lower triangular: entry \(1, 2\)/,
    );
    expect(strings(layersView('factors', { ...input(matrix(A3)), L: matrix([[2, 0], [1, 1]]), U: matrix([[1, 1], [0, 1]]) }, 2, false).total)).toEqual(
      s([[2, 2], [1, 2]]),
    );
  });

  it('the caption says no CR or LU layer dominates (L3-R5)', () => {
    expect(layersView('lu', input(matrix(LU_A)), 1, false).caption).toMatch(/SVD|eigen/i);
  });
});

// §7.3 -----------------------------------------------------------------------------

describe('§7.3 LU decomposition', () => {
  it('every step checks (L so far)(current) = A (L3-LU2)', () => {
    const view = luView(matrix(LU_A), 'none');
    expect(view.steps.every((st) => st.check.equal)).toBe(true);
    expect(view.finalCheck.equal).toBe(true);
  });

  it('each elimination step carries its multiplier for the flight into L (L3-LU1)', () => {
    const view = luView(matrix(LU_A), 'none');
    expect(view.steps.flatMap((st) => (st.multiplier ? [[st.multiplier.row, st.multiplier.col, st.multiplier.value.toString()]] : []))).toEqual([
      [1, 0, '2'],
      [2, 0, '-1'],
      [2, 1, '5'],
    ]);
    expect(strings(view.steps.at(-1)!.L)).toEqual(s(LU_L));
    expect(strings(view.steps.at(-1)!.current)).toEqual(s(LU_U));
  });

  it('the recipe and the corrected notation (L3-LU5, L3-LU8)', () => {
    const view = luView(matrix(LU_A), 'none');
    expect(view.recipe).toMatch(/1s on the diagonal/);
    expect(view.notationNote).toMatch(/\(0, 1, l₃₂\)/);
    expect(view.statusMessage).toBeNull();
  });

  it('a singular A factors, but Ux = c has no unique solution (L3-LU7)', () => {
    const view = luView(matrix(A3), 'none');
    expect(view.statusMessage).toMatch(/no unique solution/i);
    expect(view.needsRowExchange).toBe(false);
  });

  it('a zero pivot without pivoting stops and offers PA = LU (L3-LU6)', () => {
    const view = luView(matrix(PALU_A), 'none');
    expect(view.needsRowExchange).toBe(true);
    expect(view.statusMessage).toMatch(/row exchange/i);
  });

  it('peeling: remainders [[0,0,0],[0,2,1],[0,10,9]] then [[0,0,0],[0,0,0],[0,0,4]] (L3-LU3)', () => {
    const view = peelingView(matrix(LU_A), 'none');
    expect(strings(view.remainders[0])).toEqual(s([[0, 0, 0], [0, 2, 1], [0, 10, 9]]));
    expect(strings(view.remainders[1])).toEqual(s([[0, 0, 0], [0, 0, 0], [0, 0, 4]]));
    expect(view.captions).toHaveLength(3);
  });
});

// §7.4 -----------------------------------------------------------------------------

describe('§7.4 solving with LU', () => {
  it('b = (2, 5, −1): c = (2, 1, −4), x = (2, 1, −1), and Ax = b', () => {
    const view = solveView(matrix(LU_A), vector(LU_B), 'none');
    expect(vectorToStrings(view.forward.solution!)).toEqual(sv([2, 1, -4]));
    expect(vectorToStrings(view.x!)).toEqual(sv([2, 1, -1]));
    expect(view.check?.equal).toBe(true);
    expect(view.message).toBeNull();
  });

  it('the chain b → c → x: a lower then an upper triangular solve (L3-S3)', () => {
    const view = solveView(matrix(LU_A), vector(LU_B), 'none');
    expect(view.chain.map((l) => [l.from, l.to, l.shape])).toEqual([
      ['b', 'c', 'lower'],
      ['c', 'x', 'upper'],
    ]);
  });

  it('with row exchanges the chain starts from Pb', () => {
    const view = solveView(matrix(PALU_A), vector([5, 8, 0]), 'partial');
    expect(view.chain[0].from).toBe('Pb');
    expect(vectorToStrings(view.x!)).toEqual(sv([1, 1, 1]));
  });

  it('reports the matrix it solved: A itself when factoring', () => {
    expect(strings(solveView(matrix(LU_A), vector(LU_B), 'none').A)).toEqual(s(LU_A));
  });

  it('a zero pivot stops back substitution with a reason (L3-S5)', () => {
    const view = solveView(matrix(A3), vector([2, 5, 4]), 'none');
    expect(view.x).toBeNull();
    expect(view.message).toMatch(/pivot/i);
  });
});

describe('§7.4 solving from L and U entered directly (L3-S6)', () => {
  it('the notes\' factors: c = (2, 1, −4), x = (2, 1, −1), and A = LU', () => {
    const view = solveWithFactorsView(matrix(LU_L), matrix(LU_U), vector(LU_B));
    expect(vectorToStrings(view.forward.solution!)).toEqual(sv([2, 1, -4]));
    expect(vectorToStrings(view.x!)).toEqual(sv([2, 1, -1]));
    expect(strings(view.A)).toEqual(s(LU_A));
    expect(view.check?.equal).toBe(true);
    expect(view.message).toBeNull();
  });

  it('no row exchanges: P = I and the chain starts from b', () => {
    const view = solveWithFactorsView(matrix(LU_L), matrix(LU_U), vector(LU_B));
    expect(strings(view.P)).toEqual(s([[1, 0, 0], [0, 1, 0], [0, 0, 1]]));
    expect(view.chain.map((l) => [l.from, l.tex])).toEqual([
      ['b', 'Lc = b'],
      ['c', 'Ux = c'],
    ]);
  });

  it('L need not have 1s on its diagonal', () => {
    // A = LU = [[2,2],[1,2]]; c = (1, 2); x = (−1, 2).
    const view = solveWithFactorsView(matrix([[2, 0], [1, 1]]), matrix([[1, 1], [0, 1]]), vector([2, 3]));
    expect(vectorToStrings(view.x!)).toEqual(sv([-1, 2]));
    expect(strings(view.A)).toEqual(s([[2, 2], [1, 2]]));
  });

  it('a zero pivot in U stops back substitution with a reason', () => {
    const view = solveWithFactorsView(matrix(LU_L), matrix([[1, 2, 2], [0, 2, 1], [0, 0, 0]]), vector(LU_B));
    expect(view.x).toBeNull();
    expect(view.message).toMatch(/pivot/i);
  });

  it('L must be lower triangular and U upper triangular, naming the entry', () => {
    expect(() => solveWithFactorsView(matrix([[1, 5], [0, 1]]), matrix([[1, 0], [0, 1]]), vector([1, 1]))).toThrow(
      /L must be lower triangular: entry \(1, 2\) is 5/,
    );
    expect(() => solveWithFactorsView(matrix([[1, 0], [0, 1]]), matrix([[1, 0], [3, 1]]), vector([1, 1]))).toThrow(
      /U must be upper triangular: entry \(2, 1\) is 3/,
    );
  });

  it('sizes must match b', () => {
    expect(() => solveWithFactorsView(matrix(LU_L), matrix(LU_U), vector([1, 2]))).toThrow(RangeError);
  });
});

// §7.5 -----------------------------------------------------------------------------

describe('§7.5 many right-hand sides', () => {
  it('factor 8, solves 9, and 68 vs 44 for four right-hand sides (L3-K2)', () => {
    const b = vector(LU_B);
    const view = manyRhsView(matrix(LU_A), [b, b, b, b], 'none');
    expect(view.factorCost).toBe(8);
    expect(view.solveCost).toBe(9);
    expect(view.costs.fromScratch.at(-1)).toBe(68);
    expect(view.costs.withLu.at(-1)).toBe(44);
    expect(view.rows).toHaveLength(4);
    expect(vectorToStrings(view.rows[0].x!)).toEqual(sv([2, 1, -1]));
  });

  it('states the counting rule (L3-K5)', () => {
    expect(manyRhsView(matrix(LU_A), [vector(LU_B)], 'none').rule).toMatch(/multiplications and divisions/i);
  });

  it('growth chart: three closed-form curves up to n = 100, measured points for n ≤ 8 (L3-K3)', () => {
    const chart = growthChart(false);
    expect(chart.curves).toHaveLength(3);
    expect(Math.max(...chart.curves[0].points.map((p) => p[0]))).toBe(100);
    expect(chart.measured.every((m) => m.points.every((p) => p[0] <= 8))).toBe(true);
  });

  it('log–log slopes are about 3 for factoring and 2 for each solve', () => {
    const { slopes } = growthChart(true);
    expect(slopes.factor).toBeCloseTo(3, 1);
    expect(slopes.solve).toBeCloseTo(2, 1);
  });

  it('housing: XᵀX = LU once, θ* for each year (L3-K4)', () => {
    const view = housingYearsView();
    expect(strings(view.L)).toEqual(s([[1, 0], ['19/12', 1]]));
    expect(strings(view.U)).toEqual(s([[3, '19/4'], [0, '19/24']]));
    expect(view.years.map((y) => vectorToStrings(y.theta))).toEqual([
      ['5/2', '30/19'],
      ['14/5', '158/95'],
      ['5/2', '2'],
    ]);
    expect(strings(view.D)).toEqual(s([[3, 0], [0, '19/24']]));
    expect(new Set(view.years.map((y) => y.color)).size).toBe(3);
  });
});

// §7.6 -----------------------------------------------------------------------------

describe('§7.6 LDU', () => {
  it('D = diag(1, 2, 4), U = [[1,2,2],[0,1,1/2],[0,0,1]], A = LDU (L3-D1)', () => {
    const view = lduView(matrix(LU_A), 'none');
    expect(view.pivots.map(String)).toEqual(['1', '2', '4']);
    expect(strings(view.ldu.U)).toEqual(s([[1, 2, 2], [0, 1, '1/2'], [0, 0, 1]]));
    expect(strings(view.luU)).toEqual(s(LU_U));
    expect(view.check.equal).toBe(true);
    expect(view.unitDiagonalNote).toMatch(/1s on the diagonal/);
    expect(view.symmetric).toBeNull();
  });

  it('a zero pivot makes D singular (L3-D3)', () => {
    expect(lduView(matrix(A3), 'none').singular).toMatch(/singular/i);
  });

  it('symmetric XᵀX: the new U is Lᵀ, so A = LDLᵀ (L3-D4)', () => {
    const view = lduView(matrix(HOUSES_XTX), 'none');
    expect(view.symmetric?.uIsLTransposed).toBe(true);
    expect(view.symmetric?.note).toMatch(/LDL/);
  });
});

// §7.7 -----------------------------------------------------------------------------

describe('§7.7 row exchanges', () => {
  it('builder: swapping rows 1 and 2 moves the sample rows (L3-PM1)', () => {
    const view = permutationBuilder(3, [[0, 1]]);
    expect(strings(view.P)).toEqual(s([[0, 1, 0], [1, 0, 0], [0, 0, 1]]));
    expect(strings(view.permuted)).toEqual([strings(view.sample)[1], strings(view.sample)[0], strings(view.sample)[2]]);
    expect(view.destinations).toEqual([1, 0, 2]);
  });

  it('gallery: 2 and 6 matrices, and n! for n = 1 … 4 (L3-PM2)', () => {
    expect(permutationGallery(2).matrices).toHaveLength(2);
    expect(permutationGallery(3).matrices).toHaveLength(6);
    expect(permutationGallery(3).counts).toEqual([
      { n: 1, count: 1 },
      { n: 2, count: 2 },
      { n: 3, count: 6 },
      { n: 4, count: 24 },
    ]);
  });

  it('composition: P = P₂P₁ with the later swap on the left (L3-PM3)', () => {
    const view = compositionView(3, [0, 1], [1, 2]);
    expect(strings(view.P)).toEqual(s(PALU_P));
    expect(view.check.equal).toBe(true);
    expect(view.orderNote).toMatch(/left/);
  });

  it('PA = LU with partial pivoting, then solve through Lc = Pb (L3-PM5)', () => {
    const view = paluView(matrix(PALU_A), vector([5, 8, 0]), 'partial');
    expect(strings(view.lu.P)).toEqual(s(PALU_P));
    expect(view.check.equal).toBe(true);
    expect(view.swapsText).toHaveLength(2);
    expect(vectorToStrings(view.solve!.x!)).toEqual(sv([1, 1, 1]));
  });

  it('tiny pivot: x = (0, 1) without pivoting, (1, 1) with partial pivoting (L3-PM6)', () => {
    const demo = tinyPivotDemo();
    expect(demo.withoutPivoting).toEqual([0, 1]);
    expect(demo.withPivoting).toEqual([1, 1]);
    expect(demo.note).toMatch(/Lesson 4/);
  });
});
