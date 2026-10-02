import { describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../../../core/matrix';
import { normalEquationView, projectionView } from '../models';

/** Lesson 1 presets housesOrigin / housesLine / dependentColumns. */
const b = vector([4, 6, 5]);
const ORIGIN = matrix([[1], ['2.25'], ['1.5']]);
const LINE = matrix([[1, 1], [1, '2.25'], [1, '1.5']]);
const DEPENDENT = matrix([[1, 1], [1, 1], [1, 1]]);

describe('projection view', () => {
  it('houses, two columns: C(A) is a plane in ℝ³ and Aᵀe = 0', () => {
    const view = projectionView(LINE, b, null);
    expect(view.scene?.dim).toBe(3);
    expect(view.scene?.span.kind).toBe('plane');
    expect(vectorToStrings(view.p)).toEqual(['155/38', '115/19', '185/38']);
    expect(view.orthogonality.map((o) => o.value.toString())).toEqual(['0', '0']);
    expect(view.scene?.atOptimum).toBe(true);
  });

  it('houses, one column: C(A) is a line', () => {
    const view = projectionView(ORIGIN, b, null);
    expect(view.scene?.span.kind).toBe('line');
    expect(vectorToStrings(view.e)).toEqual(['132/133', '-102/133', '65/133']);
  });

  it('moving x away from x̂ increases ‖b − Ax‖', () => {
    const best = projectionView(LINE, b, null).scene!.distance;
    expect(projectionView(LINE, b, [2, 2]).scene!.distance).toBeGreaterThan(best);
  });

  it('more than 3 rows: numbers and a note instead of a canvas (L2-P7)', () => {
    const view = projectionView(matrix([[1], [2], [3], [4]]), vector([1, 2, 2, 5]), null);
    expect(view.scene).toBeNull();
    expect(view.note).toBeTruthy();
  });
});

describe('normal equation view', () => {
  it('houses, two columns: x̂ = (5/2, 30/19)', () => {
    expect(vectorToStrings(normalEquationView(LINE, b).xHat!)).toEqual(['5/2', '30/19']);
  });

  it('rounding note: the notes round x̂ = 3, the exact value is 400/133', () => {
    expect(normalEquationView(ORIGIN, b).roundingNote).toMatch(/400\/133/);
  });

  it('dependent columns are reported as singular', () => {
    const view = normalEquationView(DEPENDENT, b);
    expect(view.invertibility.independent).toBe(false);
    expect(view.xHat).toBeNull();
    expect(view.invertibility.dependencies).toEqual(['a₂ = a₁']);
  });
});
