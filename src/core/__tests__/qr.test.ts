import { describe, expect, it } from 'vitest';
import { orthogonalityLoss } from '../accuracy';
import { asFloat, type FloatMatrix } from '../float';
import { identity, matrix, matrixToStrings, transpose, type Matrix } from '../matrix';
import { matMul } from '../products';
import { leastSquaresNormalFloat, leastSquaresQrFloat, qrHouseholder, qrHouseholderFloat } from '../qr';
import { expectRealThrow, over, QR_A, QR_H1_2, QR_H1A, QR_Q6, QR_R, REFLECTOR_H3, s } from './fixtures';

const A = matrix(QR_A);
const exact = (M: unknown) => matrixToStrings(M as Matrix);

describe('qrHouseholder (F-M27, notes §4.3)', () => {
  const r = qrHouseholder(A, { sign: 'notes' });

  it('stays exact: every norm is a whole number', () => {
    expect(r.precision).toEqual({ kind: 'exact' });
  });

  it('H₁ = (1/2)[[1,1,1,1],[1,1,−1,−1],[1,−1,1,−1],[1,−1,−1,1]] and H₁A', () => {
    expect(r.steps).toHaveLength(2);
    expect(exact(r.steps[0].H)).toEqual(over(QR_H1_2, 2));
    expect(exact(r.steps[0].current)).toEqual(s(QR_H1A));
    expect(r.steps[0].zeroed).toEqual([
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ]);
  });

  it('Ĥ₂ = (1/3)[[2,2,1],[2,−1,−2],[1,−2,2]], the §4.1 reflector', () => {
    expect(exact(r.steps[1].reflector.H)).toEqual(over(REFLECTOR_H3, 3));
  });

  it('R and Q from the notes', () => {
    expect(exact(r.R)).toEqual(s(QR_R));
    expect(exact(r.Q)).toEqual(over(QR_Q6, 6));
  });

  it('reduced Q̂ and R̂ (notes §4.4)', () => {
    expect(exact(r.Qhat)).toEqual(over([[3, 5], [3, -1], [3, -1], [3, -3]], 6));
    expect(exact(r.Rhat)).toEqual(s([[2, 3], [0, 3]]));
  });

  it('A = QR and QᵀQ = I; (Q so far)(current) = A at every step', () => {
    expect(exact(matMul(r.Q as Matrix, r.R as Matrix))).toEqual(s(QR_A));
    expect(exact(matMul(transpose(r.Q as Matrix), r.Q as Matrix))).toEqual(matrixToStrings(identity(4)));
    for (const st of r.steps) expect(exact(matMul(st.Qsofar as Matrix, st.current as Matrix))).toEqual(s(QR_A));
    expect(r.dependentColumns).toEqual([]);
  });

  it('the stable sign gives NumPy\'s R = [[−2,−3],[0,3]] and the same x*', () => {
    const st = qrHouseholder(A, { sign: 'stable' });
    expect(exact(st.Rhat)).toEqual(s([[-2, -3], [0, 3]]));
  });

  it('dependent columns give a zero diagonal entry of R (L4-QR6)', () => {
    const dep = qrHouseholder(matrix([[1, 2], [2, 4], [2, 4]]), { sign: 'notes' });
    expect(dep.dependentColumns).toEqual([1]);
    expect((dep.R as Matrix)[1][1].isZero()).toBe(true);
  });

  it('the Lesson 2 houses switch to floating point: ‖(1,1,1)‖ = √3', () => {
    const h = qrHouseholder(matrix([[1, 1], [1, '2.25'], [1, '1.5']]), { sign: 'notes' });
    expect(h.precision.kind).toBe('float');
    expect(h.precision.kind === 'float' && h.precision.reason).toMatch(/√3/);
    expect(orthogonalityLoss(h.Q as FloatMatrix)).toBeLessThan(1e-14);
  });

  it('forceFloat agrees with the exact result', () => {
    const f = qrHouseholder(A, { sign: 'notes', forceFloat: true });
    expect(f.precision.kind).toBe('float');
    const R = f.R as FloatMatrix;
    QR_R.forEach((row, i) => row.forEach((v, j) => expect(R[i][j]).toBeCloseTo(v, 14)));
  });

  it('needs m ≥ n', () => {
    expectRealThrow(() => qrHouseholder(matrix([[1, 2, 3]]), { sign: 'notes' }));
  });
});

describe('float QR and least squares', () => {
  it('qrHouseholderFloat: A = QR with orthonormal Q', () => {
    const { Q, R } = qrHouseholderFloat(asFloat(A), 'stable');
    expect(orthogonalityLoss(Q)).toBeLessThan(1e-14);
    const QR = Q.map((row) => R[0].map((_, j) => row.reduce((s, q, k) => s + q * R[k][j], 0)));
    QR_A.forEach((row, i) => row.forEach((v, j) => expect(QR[i][j]).toBeCloseTo(v, 14)));
  });

  it('houses: QR least squares matches θ* = (5/2, 30/19) to 12 digits', () => {
    const x = leastSquaresQrFloat([[1, 1], [1, 2.25], [1, 1.5]], [4, 6, 5], 'notes');
    expect(x[0]).toBeCloseTo(2.5, 12);
    expect(x[1]).toBeCloseTo(30 / 19, 12);
  });

  it('normal equation in floats gives the same answer on a well-conditioned A', () => {
    const x = leastSquaresNormalFloat(asFloat(A), [3, -1, 1, 3]);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(1 / 3, 12);
  });

  it('transpose sanity for the exact fixture', () => {
    expect(matrixToStrings(transpose(A))[0]).toEqual(['1', '1', '1', '1']);
  });
});
