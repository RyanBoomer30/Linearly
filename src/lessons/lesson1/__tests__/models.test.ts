import { describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../../../core/matrix';
import { q } from '../../../core/rational';
import {
  columnPictureScene,
  columnSpaceScene,
  crView,
  eliminationView,
  freeParameterState,
  productsView,
  rowPictureAtStep,
  rowPictureScene,
  solveTarget,
  subspacesView,
} from '../models';

const A2 = matrix([[1, 1], [2, -1]]);
const b2 = vector([5, 1]);
const A3 = matrix([[1, 0, 1], [2, 1, 3], [3, -2, 1]]);
const bOk = vector([2, 5, 4]);
const bBad = vector([2, 5, 5]);

describe('row picture (§5.1 acceptance)', () => {
  it('2×2: two lines meeting at (2, 3)', () => {
    const s = rowPictureScene(A2, b2);
    expect(s.dim).toBe(2);
    expect(s.lines.map((l) => l.tex)).toEqual(['x_1 + x_2 = 5', '2x_1 - x_2 = 1']);
    expect(s.solution).toEqual({ kind: 'point', at: [2, 3, 0] });
  });

  it('3×3 consistent: three planes meeting along (2,1,0) + t(−1,−1,1)', () => {
    const s = rowPictureScene(A3, bOk);
    expect(s.planes).toHaveLength(3);
    expect(s.solution).toEqual({ kind: 'line', point: [2, 1, 0], dir: [-1, -1, 1] });
  });

  it('3×3 inconsistent: no common point, with a message', () => {
    const s = rowPictureScene(A3, bBad);
    expect(s.solution.kind).toBe('none');
    if (s.solution.kind === 'none') expect(s.solution.message).toMatch(/no common point/);
  });

  it('rows by columns: Ax as dot products', () => {
    expect(rowPictureScene(A2, b2).dotProductTex).toContain('(1,1)\\cdot(x_1,x_2)');
  });

  it('refuses dimensions it cannot draw', () => {
    expect(() => rowPictureScene(matrix([[1, 2, 3, 4]]), vector([1]))).toThrow(/ℝ² or ℝ³/);
  });
});

describe('column picture (§5.2 acceptance)', () => {
  it('x = (2, 3) reaches b = (5, 1) and hits', () => {
    const s = columnPictureScene(A2, b2, [q(2), q(3)]);
    expect(s.Ax).toEqual([5, 1, 0]);
    expect(s.hit).toBe(true);
    expect(s.distance).toBe(0);
    expect(s.tipToTail.map((t) => t.to)).toEqual([[2, 4, 0], [5, 1, 0]]);
  });

  it('a miss reports the distance', () => {
    const s = columnPictureScene(A2, b2, [q(0), q(0)]);
    expect(s.hit).toBe(false);
    expect(s.distance).toBeCloseTo(Math.hypot(5, 1));
  });

  it('Solve targets the exact solution, or null when there is none', () => {
    expect(solveTarget(A2, b2)!.map(String)).toEqual(['2', '3']);
    expect(solveTarget(A3, bBad)).toBeNull();
  });
});

describe('free-variable slider (§5.3 acceptance)', () => {
  it('t = 0 gives (2,1,0); t = 1 gives (1,0,1); both reach (2,5,4)', () => {
    const s0 = freeParameterState(A3, bOk, q(0));
    const s1 = freeParameterState(A3, bOk, q(1));
    expect(vectorToStrings(s0.x)).toEqual(['2', '1', '0']);
    expect(vectorToStrings(s1.x)).toEqual(['1', '0', '1']);
    expect(s0.columnScene.hit && s1.columnScene.hit).toBe(true);
  });
});

describe('elimination (§5.4 acceptance)', () => {
  it('pivots in columns 1 and 2, x₃ free, parametric form', () => {
    const v = eliminationView(A3, bOk);
    expect(v.rref.pivotCols).toEqual([0, 1]);
    expect(v.freeCols).toEqual([2]);
    expect(v.parametricTex).toContain('+ t');
  });

  it('the row picture changes per step but the solution set does not (L1-G5)', () => {
    const v = eliminationView(A3, bOk);
    for (let k = 0; k < v.rref.trace.steps.length; k++) {
      expect(rowPictureAtStep(v, k).solution).toEqual({ kind: 'line', point: [2, 1, 0], dir: [-1, -1, 1] });
    }
  });
});

describe('column space (§5.5 acceptance)', () => {
  it('C(A) is the plane spanned by (1,2,3) and (0,1,−2)', () => {
    const s = columnSpaceScene(A3, bOk);
    expect(s.shape).toBe('plane');
    expect(s.basis.map((v) => v.to)).toEqual([[1, 2, 3], [0, 1, -2]]);
    expect(s.basis.map((v) => v.column)).toEqual([0, 1]);
  });

  it('(2,5,4) is in C(A); (2,5,5) is not, 1/√54 away, with y·b = 1', () => {
    expect(columnSpaceScene(A3, bOk).inSpace).toBe(true);
    const bad = columnSpaceScene(A3, bBad);
    expect(bad.inSpace).toBe(false);
    expect(bad.distance).toBeCloseTo(1 / Math.sqrt(54));
    expect(bad.leftNullChecks.map((c) => c.dot)).toEqual(['1']);
  });
});

describe('products and CR (§5.6 acceptance)', () => {
  it('uᵀv = 6, uvᵀ rank 1, CR of uvᵀ is u times vᵀ', () => {
    const p = productsView(vector([1, 1, 1]), vector([1, 2, 3]));
    expect(p.innerTex.endsWith('= 6')).toBe(true);
    expect(p.outerRank).toBe(1);
    expect(p.outerCR.C.map((r) => r.map(String))).toEqual([['1'], ['1'], ['1']]);
    expect(p.innerShapeTex).toBe('(1\\times 3)(3\\times 1) = 1\\times 1');
  });

  it('clicking column 3 shows (1,3,1) = 1·(1,2,3) + 1·(0,1,−2)', () => {
    const v = crView(A3, 2);
    expect(v.recipeTex).not.toBeNull();
    expect(v.recipeTex!.startsWith('\\begin{bmatrix}1 \\\\ 3 \\\\ 1\\end{bmatrix} = ')).toBe(true);
    expect(v.recipeTex).toContain(' + ');
    expect(v.columnProductTex).toBe('a_3 = C \\begin{bmatrix}1 \\\\ 1\\end{bmatrix}');
  });

  it('no column selected: no recipe', () => {
    expect(crView(A3, null).recipeTex).toBeNull();
  });
});

describe('four subspaces (§5.7 acceptance)', () => {
  it('all paired dot products are 0, rank + nullity = n', () => {
    const v = subspacesView(A3);
    expect(v.rowNullDots.every((d) => d === '0')).toBe(true);
    expect(v.colLeftNullDots.every((d) => d === '0')).toBe(true);
    expect(v.rankNullityTex).toContain('2 + 1 = 3');
  });
});
