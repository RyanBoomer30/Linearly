import { describe, expect, it } from 'vitest';
import { characteristicPolynomial, diagonalize, eigenpairs, eigenvalueAbs, eigenvalues, eigenvalueTex, polynomialTex, type Eigenvalue } from '../eigen';
import { matrix, matrixToStrings, vectorToStrings, type Matrix, type Vector } from '../matrix';
import { matMul } from '../products';
import { q } from '../rational';
import { ABSORBING, columnSigns, CYCLE, FLIP, MINI_WEB, MINI_WEB_V, MINI_WEB_VINV_60, NOTES_P_HAT, over, rowSigns, s, sv } from './fixtures';

const P = matrix(MINI_WEB);
const strings = (M: unknown) => matrixToStrings(M as Matrix);
const rationalValues = (ls: Eigenvalue[]) => ls.map((l) => (l.kind === 'rational' ? `${l.value.toString()}×${l.multiplicity}` : l.kind));

describe('characteristic polynomial (F-M33)', () => {
  it('mini web: λ³ − (17/10)λ² + (4/5)λ − 1/10', () => {
    expect(characteristicPolynomial(P).map(String)).toEqual(['1', '-17/10', '4/5', '-1/10']);
  });

  it('2 × 2 flip: λ² − 1', () => {
    expect(characteristicPolynomial(matrix(FLIP)).map(String)).toEqual(['1', '0', '-1']);
  });

  it('TeX skips zero terms and writes signs once', () => {
    expect(polynomialTex([q(1), q(-17, 10), q(4, 5), q(-1, 10)])).toBe('\\lambda^3 - \\frac{17}{10}\\lambda^2 + \\frac{4}{5}\\lambda - \\frac{1}{10}');
    expect(polynomialTex([q(1), q(0), q(-1)])).toBe('\\lambda^2 - 1');
  });
});

describe('eigenvalues (F-M34)', () => {
  it('mini web: 1, 1/2, 1/5, exact, largest |λ| first', () => {
    expect(rationalValues(eigenvalues(P))).toEqual(['1×1', '1/2×1', '1/5×1']);
  });

  it('the notes\' estimate P̂: 1 and −1/6 twice', () => {
    expect(rationalValues(eigenvalues(matrix(NOTES_P_HAT)))).toEqual(['1×1', '-1/6×2']);
  });

  it('flip: 1 and −1 (positive first on a tie)', () => {
    expect(rationalValues(eigenvalues(matrix(FLIP)))).toEqual(['1×1', '-1×1']);
  });

  it('three-state cycle: 1 and the complex pair at ±120° on the unit circle', () => {
    const ls = eigenvalues(matrix(CYCLE));
    expect(ls.map((l) => l.kind)).toEqual(['rational', 'complex', 'complex']);
    for (const l of ls) expect(eigenvalueAbs(l)).toBeCloseTo(1, 12);
    const [, a, b] = ls;
    if (a.kind !== 'complex' || b.kind !== 'complex') throw new Error('expected complex');
    expect(a.value.re).toBeCloseTo(-0.5, 12);
    expect(a.value.im).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(b.value.im).toBeCloseTo(-Math.sqrt(3) / 2, 12);
  });

  it('absorbing chain: λ = 1 twice and 0', () => {
    expect(rationalValues(eigenvalues(matrix(ABSORBING)))).toEqual(['1×2', '0×1']);
  });

  it('irrational real roots come back as floats: [[1,1],[1,0]] has (1 ± √5)/2', () => {
    const ls = eigenvalues(matrix([[1, 1], [1, 0]]));
    expect(ls.map((l) => l.kind)).toEqual(['real', 'real']);
    expect(ls[0].kind === 'real' && ls[0].value).toBeCloseTo((1 + Math.sqrt(5)) / 2, 12);
    expect(ls[1].kind === 'real' && ls[1].value).toBeCloseTo((1 - Math.sqrt(5)) / 2, 12);
  });

  it('TeX', () => {
    const [one, half] = eigenvalues(P);
    expect(eigenvalueTex(one)).toBe('1');
    expect(eigenvalueTex(half)).toBe('\\frac{1}{2}');
  });
});

describe('eigenvectors (F-M35)', () => {
  it('mini web: integer eigenvectors span N(P − λI), matching the notes up to sign', () => {
    const pairs = eigenpairs(P);
    expect(pairs.map((p) => p.precision)).toEqual([{ kind: 'exact' }, { kind: 'exact' }, { kind: 'exact' }]);
    const V = pairs.map((p) => vectorToStrings(p.vectors[0] as Vector));
    expect(columnSigns(V[0].map((_, i) => V.map((v) => v[i])))).toEqual(columnSigns(s(MINI_WEB_V)));
  });

  it('probability scaling for λ = 1 gives x_eq = (7, 5, 8)/20', () => {
    const [first] = eigenpairs(P, 'probability');
    expect(vectorToStrings(first.vectors[0] as Vector)).toEqual(['7/20', '1/4', '2/5']);
  });

  it('a repeated eigenvalue can have a 2-dimensional eigenspace (absorbing chain)', () => {
    const [one] = eigenpairs(matrix(ABSORBING));
    expect(one.vectors).toHaveLength(2);
  });

  it('no eigenvectors for complex λ (non-goal)', () => {
    const pairs = eigenpairs(matrix(CYCLE));
    expect(pairs[1].vectors).toEqual([]);
  });

  it('irrational λ: a float eigenvector with Av ≈ λv', () => {
    const A = matrix([[1, 1], [1, 0]]);
    const [first] = eigenpairs(A);
    expect(first.precision.kind).toBe('float');
    const v = first.vectors[0] as number[];
    const phi = (1 + Math.sqrt(5)) / 2;
    expect(v[0] + v[1]).toBeCloseTo(phi * v[0], 10);
    expect(v[0]).toBeCloseTo(phi * v[1], 10);
  });
});

describe('diagonalize (F-M36)', () => {
  it('mini web: V, Λ and V⁻¹ as in the notes (up to column signs), and VΛV⁻¹ = P exactly', () => {
    const d = diagonalize(P);
    if (d.kind !== 'diagonalizable') throw new Error(d.kind);
    expect(d.precision).toEqual({ kind: 'exact' });
    expect(columnSigns(strings(d.V))).toEqual(columnSigns(s(MINI_WEB_V)));
    expect(strings(d.Lambda)).toEqual([['1', '0', '0'], ['0', '1/2', '0'], ['0', '0', '1/5']]);
    expect(rowSigns(strings(d.Vinv))).toEqual(rowSigns(over(MINI_WEB_VINV_60, 60)));
    expect(strings(matMul(matMul(d.V as Matrix, d.Lambda as Matrix), d.Vinv as Matrix))).toEqual(strings(P));
  });

  it('the notes\' estimate P̂ is not diagonalizable: λ = −1/6 twice with one eigenvector', () => {
    const d = diagonalize(matrix(NOTES_P_HAT));
    if (d.kind !== 'defective') throw new Error(d.kind);
    expect(d.eigenvalue.kind === 'rational' && d.eigenvalue.value.toString()).toBe('-1/6');
    expect(d.algebraic).toBe(2);
    expect(d.geometric).toBe(1);
    expect(d.reason).toMatch(/eigenvector/);
  });

  it('the absorbing chain is diagonalizable even with λ = 1 twice', () => {
    expect(diagonalize(matrix(ABSORBING)).kind).toBe('diagonalizable');
  });

  it('complex eigenvalues are reported, not decomposed', () => {
    const d = diagonalize(matrix(CYCLE));
    expect(d.kind).toBe('complex');
  });

  it('the flip: V = [[1,1],[1,−1]] up to signs', () => {
    const d = diagonalize(matrix(FLIP));
    if (d.kind !== 'diagonalizable') throw new Error(d.kind);
    expect(columnSigns(strings(d.V))).toEqual(columnSigns(s([[1, 1], [1, -1]])));
    expect(sv([1, -1])).toEqual(strings(d.Lambda).map((r, i) => r[i]));
  });
});
