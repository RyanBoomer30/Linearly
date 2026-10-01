import { beforeAll, describe, expect, it } from 'vitest';
import { matrix, matrixToStrings } from '../matrix';
import { q } from '../rational';
import { applyRowOp, describeRowOp, rowsChangedBy } from '../rowops';
import { A3, s } from './fixtures';

describe('row operations', () => {
  let A: ReturnType<typeof matrix>;
  beforeAll(() => {
    A = matrix(A3);
  });

  it('addMultiple: r₂ − 2r₁', () => {
    const out = applyRowOp(A, { kind: 'addMultiple', target: 1, source: 0, factor: q(-2) });
    expect(matrixToStrings(out)).toEqual(s([[1, 0, 1], [0, 1, 1], [3, -2, 1]]));
  });

  it('swap', () => {
    const out = applyRowOp(A, { kind: 'swap', i: 0, j: 2 });
    expect(matrixToStrings(out)).toEqual(s([[3, -2, 1], [2, 1, 3], [1, 0, 1]]));
  });

  it('scale', () => {
    const out = applyRowOp(A, { kind: 'scale', i: 1, factor: q(1, 2) });
    expect(matrixToStrings(out)).toEqual(s([[1, 0, 1], [1, '1/2', '3/2'], [3, -2, 1]]));
  });

  it('does not mutate the input', () => {
    applyRowOp(A, { kind: 'swap', i: 0, j: 1 });
    expect(matrixToStrings(A)).toEqual(s(A3));
  });

  it('reports changed rows', () => {
    expect(rowsChangedBy({ kind: 'swap', i: 0, j: 2 })).toEqual([0, 2]);
    expect(rowsChangedBy({ kind: 'scale', i: 1, factor: q(2) })).toEqual([1]);
    expect(rowsChangedBy({ kind: 'addMultiple', target: 2, source: 0, factor: q(-3) })).toEqual([2]);
  });

  it('describes operations in words and notation (F-S2)', () => {
    expect(describeRowOp({ kind: 'addMultiple', target: 1, source: 0, factor: q(-2) })).toEqual({
      text: 'Subtract 2 × row 1 from row 2',
      tex: 'r_2 - 2r_1',
    });
    expect(describeRowOp({ kind: 'addMultiple', target: 2, source: 1, factor: q(2) })).toEqual({
      text: 'Add 2 × row 2 to row 3',
      tex: 'r_3 + 2r_2',
    });
    expect(describeRowOp({ kind: 'swap', i: 0, j: 1 })).toEqual({
      text: 'Swap row 1 and row 2',
      tex: 'r_1 \\leftrightarrow r_2',
    });
    expect(describeRowOp({ kind: 'scale', i: 0, factor: q(1, 2) })).toEqual({
      text: 'Multiply row 1 by 1/2',
      tex: '\\tfrac{1}{2} r_1',
    });
  });
});
