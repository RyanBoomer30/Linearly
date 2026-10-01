import { beforeAll, describe, expect, it } from 'vitest';
import { augment, matrix, matrixEquals, matrixToStrings, vector, type Matrix, type Vector } from '../matrix';
import type { Trace } from '../trace';
import { applyRowOp } from '../rowops';
import { rowSpaceBasis } from '../subspaces';
import { splitAugmented, transpose, vectorToStrings } from '../matrix';
import { freeVariables, pivotColumns, rank, rref, rrefAugmented } from '../rref';
import { A3, B_CONSISTENT, B_INCONSISTENT, SYSTEM_2x2, s } from './fixtures';

describe('rref (F-M3, F-M4)', () => {
  it('2×2 system reduces to the identity', () => {
    const r = rrefAugmented(matrix(SYSTEM_2x2.A), vector(SYSTEM_2x2.b));
    expect(matrixToStrings(r.matrix)).toEqual(s([[1, 0, 2], [0, 1, 3]]));
    expect(r.pivotCols).toEqual([0, 1]);
    expect(r.inconsistent).toBe(false);
  });

  it('3×3 consistent: rref [A|b] matches the notes (L1-G1 acceptance)', () => {
    const r = rrefAugmented(matrix(A3), vector(B_CONSISTENT));
    expect(matrixToStrings(r.matrix)).toEqual(s([[1, 0, 1, 2], [0, 1, 1, 1], [0, 0, 0, 0]]));
    expect(r.pivotCols).toEqual([0, 1]);
    expect(r.inconsistent).toBe(false);
    expect(r.inconsistentRow).toBeNull();
  });

  it('3×3 inconsistent: last row is 0 = 1 (L1-G3)', () => {
    const r = rrefAugmented(matrix(A3), vector(B_INCONSISTENT));
    expect(matrixToStrings(r.matrix)).toEqual(s([[1, 0, 1, 2], [0, 1, 1, 1], [0, 0, 0, 1]]));
    expect(r.inconsistent).toBe(true);
    expect(r.inconsistentRow).toBe(2);
    expect(r.pivotCols).toEqual([0, 1]);
  });

  it('rref(A) for the 3×3 matrix', () => {
    expect(matrixToStrings(rref(matrix(A3)).matrix)).toEqual(s([[1, 0, 1], [0, 1, 1], [0, 0, 0]]));
  });

  it('pivots, rank, free variables', () => {
    const A = matrix(A3);
    expect(pivotColumns(A)).toEqual([0, 1]);
    expect(rank(A)).toBe(2);
    expect(freeVariables(A)).toEqual([2]);
  });

  it('handles a zero matrix', () => {
    const Z = matrix([[0, 0], [0, 0]]);
    expect(rank(Z)).toBe(0);
    expect(freeVariables(Z)).toEqual([0, 1]);
  });

  it('handles a needed row swap', () => {
    const r = rref(matrix([[0, 1], [1, 0]]));
    expect(matrixToStrings(r.matrix)).toEqual(s([[1, 0], [0, 1]]));
    expect(r.trace.steps.some((st) => st.op?.kind === 'swap')).toBe(true);
  });
});

describe('rref trace', () => {
  let A: Matrix;
  let b: Vector;
  let trace: Trace;
  let final: Matrix;
  beforeAll(() => {
    A = matrix(A3);
    b = vector(B_CONSISTENT);
    ({ trace, matrix: final } = rrefAugmented(A, b));
  });

  it('starts with the untouched input', () => {
    expect(trace.steps[0].op).toBeNull();
    expect(matrixEquals(trace.steps[0].matrix, augment(A, b))).toBe(true);
  });

  it('ends at the rref', () => {
    expect(matrixEquals(trace.steps[trace.steps.length - 1].matrix, final)).toBe(true);
  });

  it('each step is its op applied to the previous matrix', () => {
    for (let k = 1; k < trace.steps.length; k++) {
      const { op, matrix: after } = trace.steps[k];
      expect(op).not.toBeNull();
      expect(matrixEquals(applyRowOp(trace.steps[k - 1].matrix, op!), after)).toBe(true);
    }
  });

  it('every non-initial step has a description and notation', () => {
    for (const st of trace.steps.slice(1)) {
      expect(st.description.length).toBeGreaterThan(0);
      expect(st.tex.length).toBeGreaterThan(0);
      expect(st.changedRows.length).toBeGreaterThan(0);
    }
  });

  it('final step reports the pivots (L1-G2)', () => {
    expect(trace.steps[trace.steps.length - 1].pivots).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
  });
});

describe('row space and rank (§1.3)', () => {
  it('row operations never change the row space: every trace step has the same row space as A', () => {
    const A = matrix(A3);
    const expected = rowSpaceBasis(A).map(vectorToStrings);
    for (const st of rref(A).trace.steps) {
      expect(rowSpaceBasis(st.matrix).map(vectorToStrings)).toEqual(expected);
    }
  });

  it('row operations on [A|b] keep the A-part row space too', () => {
    const A = matrix(A3);
    const expected = rowSpaceBasis(A).map(vectorToStrings);
    for (const st of rrefAugmented(A, vector(B_CONSISTENT)).trace.steps) {
      const [Ak] = splitAugmented(st.matrix);
      expect(rowSpaceBasis(Ak).map(vectorToStrings)).toEqual(expected);
    }
  });

  it('row rank = column rank: rank(A) = rank(Aᵀ)', () => {
    for (const A of [matrix(A3), matrix(SYSTEM_2x2.A), matrix([[1, 2, 3], [1, 2, 3], [1, 2, 3]]), matrix([[1, 2], [2, 4], [0, 1]])]) {
      expect(rank(A)).toBe(rank(transpose(A)));
    }
  });
});
