import { describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../matrix';
import { backSub, forwardSub } from '../substitution';
import { LU_B, LU_L, LU_U, sv } from './fixtures';

describe('forwardSub (F-M18)', () => {
  it('notes §3.3: Lc = (2, 5, −1) gives c = (2, 1, −4)', () => {
    const r = forwardSub(matrix(LU_L), vector(LU_B));
    expect(vectorToStrings(r.solution!)).toEqual(sv([2, 1, -4]));
    expect(r.stopped).toBeNull();
  });

  it('one step per unknown, top to bottom, using that row of L', () => {
    const r = forwardSub(matrix(LU_L), vector(LU_B));
    expect(r.steps.map((st) => [st.index, st.row])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    expect(r.steps.map((st) => st.value.toString())).toEqual(['2', '1', '-4']);
    for (const st of r.steps) expect(st.tex).toMatch(/c_/);
  });
});

describe('backSub (F-M18)', () => {
  it('notes §3.3: Ux = (2, 1, −4) gives x = (2, 1, −1)', () => {
    const r = backSub(matrix(LU_U), vector([2, 1, -4]));
    expect(vectorToStrings(r.solution!)).toEqual(sv([2, 1, -1]));
  });

  it('one step per unknown, bottom to top', () => {
    expect(backSub(matrix(LU_U), vector([2, 1, -4])).steps.map((st) => st.index)).toEqual([2, 1, 0]);
  });

  it('stops with a reason at a zero pivot (L3-S5)', () => {
    const r = backSub(matrix([[1, 0, 1], [0, 1, 1], [0, 0, 0]]), vector([2, 1, 0]));
    expect(r.solution).toBeNull();
    expect(r.stopped?.index).toBe(2);
    expect(r.stopped?.reason).toMatch(/pivot/i);
    expect(r.steps).toHaveLength(0);
  });
});
