import { describe, expect, it } from 'vitest';
import {
  augment,
  fromColumns,
  getColumn,
  getRow,
  identity,
  matrix,
  matrixEquals,
  matrixToStrings,
  shape,
  splitAugmented,
  toFloatMatrix,
  transpose,
  vector,
  vectorToStrings,
} from '../matrix';
import { A3, B_CONSISTENT, s, sv } from './fixtures';

describe('Matrix (F-M2)', () => {
  it('builds from numbers and fraction strings', () => {
    expect(matrixToStrings(matrix([[1, '1/2'], ['0.25', -3]]))).toEqual(s([[1, '1/2'], ['1/4', -3]]));
  });

  it('reports shape', () => {
    expect(shape(matrix([[1, 2, 3], [4, 5, 6]]))).toEqual({ rows: 2, cols: 3 });
  });

  it('gets rows and columns', () => {
    const A = matrix(A3);
    expect(vectorToStrings(getRow(A, 1))).toEqual(sv([2, 1, 3]));
    expect(vectorToStrings(getColumn(A, 2))).toEqual(sv([1, 3, 1]));
  });

  it('transposes', () => {
    expect(matrixToStrings(transpose(matrix(A3)))).toEqual(s([[1, 2, 3], [0, 1, -2], [1, 3, 1]]));
  });

  it('builds from columns', () => {
    const C = fromColumns([vector([1, 2, 3]), vector([0, 1, -2])]);
    expect(matrixToStrings(C)).toEqual(s([[1, 0], [2, 1], [3, -2]]));
  });

  it('augments and splits', () => {
    const Ab = augment(matrix(A3), vector(B_CONSISTENT));
    expect(matrixToStrings(Ab)).toEqual(s([[1, 0, 1, 2], [2, 1, 3, 5], [3, -2, 1, 4]]));
    const [A, b] = splitAugmented(Ab);
    expect(matrixEquals(A, matrix(A3))).toBe(true);
    expect(vectorToStrings(b)).toEqual(sv(B_CONSISTENT));
  });

  it('identity', () => {
    expect(matrixToStrings(identity(2))).toEqual(s([[1, 0], [0, 1]]));
  });

  it('converts to floats for rendering', () => {
    expect(toFloatMatrix(matrix([['1/2', -1]]))).toEqual([[0.5, -1]]);
  });
});
