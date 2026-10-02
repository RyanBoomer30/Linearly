import { describe, expect, it } from 'vitest';
import { gramSchmidt } from '../gramSchmidt';
import { matrix, matrixToStrings, type Matrix } from '../matrix';
import { expectRealThrow, over, QR_A, s } from './fixtures';


describe('gramSchmidt (F-M28)', () => {
  it('the notes\' A: exact, and the same Q̂, R̂ as Householder (L4-GS4)', () => {
    for (const variant of ['classical', 'modified'] as const) {
      const r = gramSchmidt(matrix(QR_A), variant);
      expect(r.precision).toEqual({ kind: 'exact' });
      expect(matrixToStrings(r.Q as Matrix)).toEqual(over([[3, 5], [3, -1], [3, -1], [3, -3]], 6));
      expect(matrixToStrings(r.R as Matrix)).toEqual(s([[2, 3], [0, 3]]));
    }
  });

  it('trace: normalize a₁, then project a₂ onto q₁ and normalize', () => {
    const steps = gramSchmidt(matrix(QR_A), 'classical').steps;
    expect(steps.map((st) => st.kind)).toEqual(['normalize', 'project', 'normalize']);
    expect(steps[1].kind === 'project' && String(steps[1].coefficient)).toBe('3');
    for (const st of steps) expect(st.tex.length).toBeGreaterThan(0);
  });

  it('dependent columns cannot be normalized', () => {
    expectRealThrow(() => gramSchmidt(matrix([[1, 2], [1, 2]]), 'classical'));
  });
});
