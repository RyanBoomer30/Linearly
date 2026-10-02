import { describe, expect, it } from 'vitest';
import { ldu, lu, peel } from '../lu';
import { matrix, matrixToStrings, transpose } from '../matrix';
import { matMul } from '../products';
import { A3, HOUSES_XTX, LU_A, LU_L, LU_U, PALU_A, PALU_L, PALU_P, PALU_U, s } from './fixtures';

const strings = (M: Parameters<typeof matrixToStrings>[0]) => matrixToStrings(M);

describe('lu without pivoting (F-M17, notes §3.2)', () => {
  const r = lu(matrix(LU_A), { pivoting: 'none' });

  it('L and U from the notes', () => {
    expect(strings(r.L)).toEqual(s(LU_L));
    expect(strings(r.U)).toEqual(s(LU_U));
    expect(strings(r.P)).toEqual(s([[1, 0, 0], [0, 1, 0], [0, 0, 1]]));
    expect(r.status).toEqual({ kind: 'complete' });
  });

  it('multipliers 2, −1, then 5, in the order found', () => {
    expect(r.multipliers.map((m) => [m.row, m.col, m.value.toString()])).toEqual([
      [1, 0, '2'],
      [2, 0, '-1'],
      [2, 1, '5'],
    ]);
  });

  it('compact storage: multipliers below the diagonal of U (L3-LU4)', () => {
    expect(strings(r.compact)).toEqual(s([[1, 2, 2], [2, 2, 1], [-1, 5, 4]]));
  });

  it('trace: A first, one step per row operation', () => {
    expect(r.trace.steps).toHaveLength(1 + 3);
    expect(strings(r.trace.steps[0].matrix)).toEqual(s(LU_A));
    expect(r.trace.steps.slice(1).map((st) => st.op?.kind)).toEqual(['eliminate', 'eliminate', 'eliminate']);
  });

  it('at every step, (L so far)(current matrix) = A (L3-LU2)', () => {
    for (const st of r.trace.steps) expect(strings(matMul(st.L, st.matrix))).toEqual(s(LU_A));
  });

  it('LU = A', () => {
    expect(strings(matMul(r.L, r.U))).toEqual(s(LU_A));
  });

  it('pivots on the diagonal of U', () => {
    expect(r.pivots).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]);
  });
});

describe('lu of a singular matrix (L3-LU7)', () => {
  it('the Lesson 1 matrix factors with a zero last pivot', () => {
    const r = lu(matrix(A3), { pivoting: 'none' });
    expect(strings(r.L)).toEqual(s([[1, 0, 0], [2, 1, 0], [3, -2, 1]]));
    expect(strings(r.U)).toEqual(s([[1, 0, 1], [0, 1, 1], [0, 0, 0]]));
    expect(r.status).toEqual({ kind: 'singular', column: 2 });
  });
});

describe('PA = LU (F-M17, notes §3.4)', () => {
  it('partial pivoting reproduces the notes: P₁ swaps rows 1, 2; P₂ swaps rows 2, 3', () => {
    const r = lu(matrix(PALU_A), { pivoting: 'partial' });
    expect(r.swaps).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(strings(r.P)).toEqual(s(PALU_P));
    expect(strings(r.L)).toEqual(s(PALU_L));
    expect(strings(r.U)).toEqual(s(PALU_U));
    expect(strings(matMul(r.P, matrix(PALU_A)))).toEqual(strings(matMul(r.L, r.U)));
    expect(strings(matMul(r.L, r.U))).toEqual(s([[2, 4, 2], [-1, 1, 0], [1, 2, 2]]));
  });

  it('the multipliers are 1/2 and −1/2', () => {
    const r = lu(matrix(PALU_A), { pivoting: 'partial' });
    expect(r.multipliers.map((m) => m.value.toString()).sort()).toEqual(['-1/2', '1/2']);
  });

  it('compact storage: stored multipliers move with their rows', () => {
    expect(strings(lu(matrix(PALU_A), { pivoting: 'partial' }).compact)).toEqual(s([[2, 4, 2], ['-1/2', 3, 1], ['1/2', 0, 1]]));
  });

  it('every swap is a step of its own (L3-PM4)', () => {
    const kinds = lu(matrix(PALU_A), { pivoting: 'partial' }).trace.steps.slice(1).map((st) => st.op?.kind);
    expect(kinds.filter((k) => k === 'swap')).toHaveLength(2);
    expect(kinds[0]).toBe('swap');
  });

  it('with pivoting, (L so far)(current) = (P so far)A at every step', () => {
    const A = matrix(PALU_A);
    for (const st of lu(A, { pivoting: 'partial' }).trace.steps) expect(strings(matMul(st.L, st.matrix))).toEqual(strings(matMul(st.P, A)));
  });

  it('no pivoting stops at the second pivot with a reason (L3-LU6)', () => {
    const r = lu(matrix(PALU_A), { pivoting: 'none' });
    expect(r.status.kind).toBe('stopped');
    if (r.status.kind !== 'stopped') return;
    expect(r.status.column).toBe(1);
    expect(r.status.reason).toMatch(/row exchange/i);
  });

  it('swapping only at a zero pivot gives a different, valid factorization', () => {
    const A = matrix(PALU_A);
    const r = lu(A, { pivoting: 'zero-only' });
    expect(r.swaps).toEqual([[1, 2]]);
    expect(strings(r.U)).toEqual(s([[1, 2, 2], [0, 3, 2], [0, 0, -2]]));
    expect(strings(matMul(r.P, A))).toEqual(strings(matMul(r.L, r.U)));
  });

  it('partial pivoting swaps even when the pivot is nonzero: |2| > |1| in column 1 of the LU example', () => {
    expect(lu(matrix(LU_A), { pivoting: 'partial' }).swaps[0]).toEqual([0, 1]);
  });
});

describe('peel (L3-LU3)', () => {
  it('remainders [[0,0,0],[0,2,1],[0,10,9]] then [[0,0,0],[0,0,0],[0,0,4]]', () => {
    const { layers, remainders } = peel(matrix(LU_L), matrix(LU_U));
    expect(layers).toHaveLength(3);
    expect(strings(layers[0])).toEqual(s([[1, 2, 2], [2, 4, 4], [-1, -2, -2]]));
    expect(strings(remainders[0])).toEqual(s([[0, 0, 0], [0, 2, 1], [0, 10, 9]]));
    expect(strings(remainders[1])).toEqual(s([[0, 0, 0], [0, 0, 0], [0, 0, 4]]));
    expect(strings(remainders[2])).toEqual(s([[0, 0, 0], [0, 0, 0], [0, 0, 0]]));
  });
});

describe('ldu (F-M19, notes §3.4)', () => {
  it('D = diag(1, 2, 4), U = [[1,2,2],[0,1,1/2],[0,0,1]]', () => {
    const r = ldu(matrix(LU_L), matrix(LU_U));
    expect(strings(r.D)).toEqual(s([[1, 0, 0], [0, 2, 0], [0, 0, 4]]));
    expect(strings(r.U)).toEqual(s([[1, 2, 2], [0, 1, '1/2'], [0, 0, 1]]));
    expect(strings(r.L)).toEqual(s(LU_L));
    expect(r.zeroPivots).toEqual([]);
    expect(strings(matMul(matMul(r.L, r.D), r.U))).toEqual(s(LU_A));
  });

  it('a zero pivot is reported (L3-D3)', () => {
    const { L, U } = lu(matrix(A3), { pivoting: 'none' });
    expect(ldu(L, U).zeroPivots).toEqual([2]);
  });

  it('housing XᵀX: L = [[1,0],[19/12,1]], U = [[3,19/4],[0,19/24]], and LDU gives U = Lᵀ (L3-D4)', () => {
    const r = lu(matrix(HOUSES_XTX), { pivoting: 'none' });
    expect(strings(r.L)).toEqual(s([[1, 0], ['19/12', 1]]));
    expect(strings(r.U)).toEqual(s([[3, '19/4'], [0, '19/24']]));
    const d = ldu(r.L, r.U);
    expect(strings(d.D)).toEqual(s([[3, 0], [0, '19/24']]));
    expect(strings(d.U)).toEqual(strings(transpose(r.L)));
  });
});
