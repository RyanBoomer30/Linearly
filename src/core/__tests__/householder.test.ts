import { describe, expect, it } from 'vitest';
import { embedReflector, householder, householderFloat, householderToAxis } from '../householder';
import { identity, matrix, matrixToStrings, transpose, vector, vectorToStrings, type Vector } from '../matrix';
import { matMul, matVec } from '../products';
import { expectRealThrow, over, REFLECTOR, REFLECTOR_H3, REFLECTOR_P6, s, sv } from './fixtures';

describe('householder (F-M26, notes §4.1)', () => {
  const r = householder(vector(REFLECTOR.x), vector(REFLECTOR.w));

  it('v = x − w = (−1, 2, 1)', () => {
    expect(vectorToStrings(r.v)).toEqual(sv([-1, 2, 1]));
  });

  it('P = vvᵀ/‖v‖² = (1/6)[[1,−2,−1],[−2,4,2],[−1,2,1]]', () => {
    expect(matrixToStrings(r.P)).toEqual(over(REFLECTOR_P6, 6));
  });

  it('H = I − 2P = (1/3)[[2,2,1],[2,−1,−2],[1,−2,2]]', () => {
    expect(matrixToStrings(r.H)).toEqual(over(REFLECTOR_H3, 3));
  });

  it('Hx = w, Hᵀ = H, H² = I', () => {
    expect(vectorToStrings(matVec(r.H, vector(REFLECTOR.x)))).toEqual(sv(REFLECTOR.w));
    expect(matrixToStrings(transpose(r.H))).toEqual(matrixToStrings(r.H));
    expect(matrixToStrings(matMul(r.H, r.H))).toEqual(matrixToStrings(identity(3)));
  });

  it('x = w gives v = 0 and H = I', () => {
    expect(matrixToStrings(householder(vector([3, 4]), vector([3, 4])).H)).toEqual(s([[1, 0], [0, 1]]));
  });

  it('different lengths: no reflection exists (RangeError)', () => {
    expectRealThrow(() => householder(vector([2, 2, 1]), vector([1, 0, 0])));
    expect(() => householder(vector([2, 2, 1]), vector([1, 0, 0]))).toThrow(RangeError);
  });
});

describe('householderToAxis', () => {
  it('notes sign: w = +‖x‖e₁, exact', () => {
    const r = householderToAxis(vector(REFLECTOR.x), 'notes');
    expect(r.precision.kind).toBe('exact');
    expect(r.precision.kind === 'exact' && vectorToStrings(r.w as Vector)).toEqual(sv([3, 0, 0]));
  });

  it('stable sign: w = −sign(x₁)‖x‖e₁', () => {
    const r = householderToAxis(vector(REFLECTOR.x), 'stable');
    expect(r.precision.kind === 'exact' && vectorToStrings(r.w as Vector)).toEqual(sv([-3, 0, 0]));
    const neg = householderToAxis(vector([-2, 2, 1]), 'stable');
    expect(neg.precision.kind === 'exact' && vectorToStrings(neg.w as Vector)).toEqual(sv([3, 0, 0]));
  });

  it('an irrational norm switches to floating point and says why', () => {
    const r = householderToAxis(vector([1, 1, 1]), 'notes');
    expect(r.precision.kind).toBe('float');
    if (r.precision.kind !== 'float') return;
    expect(r.precision.reason).toMatch(/√3/);
    expect((r.w as number[])[0]).toBeCloseTo(Math.sqrt(3), 15);
  });

  it('float reflector agrees with the exact one', () => {
    const f = householderFloat([2, 2, 1], [3, 0, 0]);
    REFLECTOR_H3.forEach((row, i) => row.forEach((h, j) => expect(f.H[i][j]).toBeCloseTo(h / 3, 15)));
  });
});

describe('embedReflector', () => {
  it('Hₖ = [[I, 0], [0, Ĥₖ]]', () => {
    const H = embedReflector(matrix([[0, 1], [1, 0]]), 3);
    expect(matrixToStrings(H)).toEqual(s([[1, 0, 0], [0, 0, 1], [0, 1, 0]]));
  });
});
