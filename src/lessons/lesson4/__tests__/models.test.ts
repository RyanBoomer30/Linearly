import { describe, expect, it } from 'vitest';
import { QR_A, QR_B, REFLECTOR, s, sv } from '../../../core/__tests__/fixtures';
import { matrix, matrixToStrings, vector, vectorToStrings, type Matrix, type Vector } from '../../../core/matrix';
import {
  conditioningSweep,
  conditioningView,
  gramSchmidtView,
  housesByQr,
  leastSquaresQrView,
  lockToLength,
  nearCollinearView,
  propertiesView,
  qrView,
  reducedQrView,
  reflectorView,
  wOnAxis,
} from '../models';

const A = matrix(QR_A);
const b = vector(QR_B);
const x = vector(REFLECTOR.x);
const w = vector(REFLECTOR.w);
const y = vector([1, 0, 2]);
const strings = (M: unknown) => matrixToStrings(M as Matrix);
const vstrings = (v: unknown) => vectorToStrings(v as Vector);

// §8.1 -----------------------------------------------------------------------------

describe('§8.1 Householder reflector', () => {
  const view = reflectorView(x, w, y);

  it('the scene: v = x − w, Px = v/2, Hx = w (L4-H2, L4-H3)', () => {
    const sc = view.scene!;
    expect(sc.dim).toBe(3);
    expect(sc.v).toEqual([-1, 2, 1]);
    expect(sc.Px).toEqual([-0.5, 1, 0.5]);
    expect(sc.Hx).toEqual([3, 0, 0]);
    expect(sc.precision).toEqual({ kind: 'exact' });
  });

  it('y is reflected too (L4-H5): Hy = y − 2(y·v/v·v)v', () => {
    // y·v = −1 + 0 + 2 = 1, v·v = 6: Hy = (1,0,2) − (1/3)(−1,2,1) = (4/3, −2/3, 5/3)
    view.scene!.Hy.forEach((c, i) => expect(c).toBeCloseTo([4 / 3, -2 / 3, 5 / 3][i], 14));
  });

  it('the formula step by step, with numbers (L4-H4)', () => {
    expect(view.formula.map((f) => f.label)).toEqual(['v = x − w', '‖v‖²', 'P = vvᵀ/‖v‖²', 'H = I − 2P']);
    expect(view.identities.join(' ')).toMatch(/v = 2Px/);
  });

  it('notes correction: the §4.1 matrix is P, not H (L4-H7)', () => {
    expect(view.notesCorrection).toMatch(/P/);
    expect(view.lengthMismatch).toBeNull();
  });

  it('different lengths: no scene, and the reason (L4-H6)', () => {
    const bad = reflectorView(x, vector([1, 0, 0]), y);
    expect(bad.scene).toBeNull();
    expect(bad.lengthMismatch).toMatch(/length/i);
    expect(bad.notesCorrection).toBeNull();
  });

  it('ℝ² works too', () => {
    expect(reflectorView(vector([3, 4]), vector([5, 0]), vector([1, 1])).scene?.dim).toBe(2);
  });

  it('snap to the axis: w = ‖x‖e₁ (L4-H1)', () => {
    expect(vstrings(wOnAxis(x))).toEqual(sv([3, 0, 0]));
    expect((wOnAxis(vector([1, 1])) as number[])[0]).toBeCloseTo(Math.SQRT2, 15);
  });

  it('dragging w keeps its length (L4-H1)', () => {
    expect(lockToLength([3, 4], 10)).toEqual([6, 8]);
    expect(lockToLength([0, 0, 2], 3)).toEqual([0, 0, 3]);
  });
});

// §8.2 -----------------------------------------------------------------------------

describe('§8.2 reflector properties', () => {
  const view = propertiesView(x, w, y, A);

  it('Hᵀ = H, H² = I, HᵀH = I, all exact (L4-HP1)', () => {
    expect(view.precision).toEqual({ kind: 'exact' });
    expect(view.checks.map((c) => c.holds)).toEqual([true, true, true]);
    expect(view.checks).toHaveLength(3);
  });

  it('each property carries the notes\' reason (§4.2)', () => {
    const [symmetric, selfInverse, orthogonal] = view.checks.map((c) => c.reason ?? '');
    expect(symmetric).toMatch(/\\hat v\\hat v\^T/);
    expect(selfInverse).toMatch(/reflection is itself/);
    expect(orthogonal).toMatch(/Q\^TQ = I/);
  });

  it('reflecting twice, lengths and dot products (L4-HP2)', () => {
    expect(view.demos.length).toBeGreaterThanOrEqual(3);
    expect(view.demos.every((d) => d.holds)).toBe(true);
  });

  it('H₁H₂ from the QR example is orthogonal (L4-HP3)', () => {
    expect(view.productCheck.holds).toBe(true);
  });

  it('eigen preview: two vectors in U, v flipped (L4-HP4)', () => {
    expect(view.eigenPreview.mirrorVectors).toHaveLength(2);
    expect(view.eigenPreview.note).toMatch(/eigenvalue/i);
  });
});

// §8.3 -----------------------------------------------------------------------------

describe('§8.3 Householder QR', () => {
  const view = qrView(A, 'notes');

  it('one step per column, each checking (Q so far)(current) = A (L4-QR2)', () => {
    expect(view.steps).toHaveLength(2);
    expect(view.steps.every((st) => st.check.holds)).toBe(true);
  });

  it('step 1: x = (1,1,1,1), w = (2,0,0,0), v = (−1,1,1,1)', () => {
    expect(vstrings(view.steps[0].x)).toEqual(sv([1, 1, 1, 1]));
    expect(vstrings(view.steps[0].w)).toEqual(sv([2, 0, 0, 0]));
    expect(vstrings(view.steps[0].v)).toEqual(sv([-1, 1, 1, 1]));
  });

  it('step 2 draws its reflection: the active column has 3 entries (L4-QR3)', () => {
    expect(view.steps[0].scene).toBeNull();
    expect(view.steps[1].scene?.dim).toBe(3);
  });

  it('the target shape: R is ∗ above the diagonal and 0 below (§4.3)', () => {
    expect(view.shapeTex).toMatch(/\\times/);
    expect(view.shapeTex).toMatch(/\*/);
  });

  it('step 5: A = (H₂H₁)⁻¹R = H₁⁻¹H₂⁻¹R = H₁H₂R = QR (§4.3)', () => {
    const tex = view.qDerivation.map((d) => d.tex).join(' ');
    expect(tex).toMatch(/H_1\^\{-1\}H_2\^\{-1\}/);
    expect(view.qDerivation.some((d) => /own inverse/.test(d.reason))).toBe(true);
    expect(view.qDerivation.some((d) => /product of .*orthogonal/.test(d.reason))).toBe(true);
  });

  it('final checks A = QR and QᵀQ = I hold (L4-QR7)', () => {
    expect(view.finalChecks.map((c) => c.holds)).toEqual([true, true]);
    expect(view.dependentNote).toBeNull();
  });

  it('the sign note is marked beyond the notes (L4-QR5)', () => {
    expect(view.signNote).toMatch(/cancel/i);
  });

  it('dependent columns: R is not invertible (L4-QR6)', () => {
    expect(qrView(matrix([[1, 2], [2, 4], [2, 4]]), 'notes').dependentNote).toMatch(/dependent/i);
  });
});

// §8.4 -----------------------------------------------------------------------------

describe('§8.4 reduced QR', () => {
  const view = reducedQrView(A, 'notes');

  it('Q̂ = (1/6)[[3,5],[3,−1],[3,−1],[3,−3]], R̂ = [[2,3],[0,3]]', () => {
    expect(strings(view.Qhat)).toEqual([['1/2', '5/6'], ['1/2', '-1/6'], ['1/2', '-1/6'], ['1/2', '-1/2']]);
    expect(strings(view.Rhat)).toEqual(s([[2, 3], [0, 3]]));
  });

  it('the last two columns of Q and rows of R are dropped, with the reason (L4-RQ1)', () => {
    expect(view.dropped).toMatchObject({ columns: [2, 3], rows: [2, 3] });
    expect(view.dropped.reason).toMatch(/zero rows/i);
  });

  it('A = Σ qₖrₖ*: the layers from the zero rows of R are zero (L4-RQ2)', () => {
    expect(view.layers.map((l) => l.zero)).toEqual([false, false, true, true]);
  });

  it('q₃ = (−1,5,−1,−3)/6 and q₄ = (1,1,−5,3)/6 span N(Aᵀ): Aᵀq₃ = Aᵀq₄ = 0 (L4-RQ3)', () => {
    expect(view.bases.columnSpace).toHaveLength(2);
    expect(view.bases.leftNullSpace.map(vstrings)).toEqual([
      ['-1/6', '5/6', '-1/6', '-1/2'],
      ['1/6', '1/6', '-5/6', '1/2'],
    ]);
    expect(view.bases.checks.every((c) => c.holds)).toBe(true);
  });
});

// §8.5 -----------------------------------------------------------------------------

describe('§8.5 least squares via QR', () => {
  const view = leastSquaresQrView(A, b, 'notes');

  it('Qᵀb = (3, 1, −3, 1) splits into the fit (3, 1) and the residual (−3, 1) (L4-LS3)', () => {
    expect(vstrings(view.Qtb)).toEqual(sv([3, 1, -3, 1]));
    expect(vstrings(view.split.fit)).toEqual(sv([3, 1]));
    expect(vstrings(view.split.residual)).toEqual(sv([-3, 1]));
    expect(view.split.residualNormSquared).toBe(10);
  });

  it('x* = (1, 1/3) by back substitution (L4-LS2)', () => {
    expect(vstrings(view.xStar)).toEqual(['1', '1/3']);
    expect(view.back?.steps).toHaveLength(2);
  });

  it('the normal equation agrees: AᵀA = [[4,6],[6,18]], Aᵀb = (6,12) (L4-LS4)', () => {
    expect(matrixToStrings(view.normalEquation.AtA)).toEqual(s([[4, 6], [6, 18]]));
    expect(vectorToStrings(view.normalEquation.Atb)).toEqual(sv([6, 12]));
    expect(view.normalEquation.same).toBe(true);
  });

  it('the derivation uses QᵀQ = I and that Rᵀ is invertible (L4-LS1)', () => {
    expect(view.derivation.some((d) => d.uses === 'QtQ')).toBe(true);
    expect(view.derivation.some((d) => d.uses === 'Rt')).toBe(true);
    expect(view.derivation.at(-1)!.tex).toMatch(/Rx\^\*\s*=\s*Q\^Tb|R x\^\*/);
  });

  it('the stable sign changes Q and R but not x*', () => {
    expect(vstrings(leastSquaresQrView(A, b, 'stable').xStar)).toEqual(['1', '1/3']);
  });

  it('NumPy sign note: R = [[−2,−3],[0,3]]', () => {
    expect(view.signNote).toMatch(/-2|−2/);
  });

  it('Lesson 2 houses in floating point match the exact θ* to 12 digits (L4-LS5)', () => {
    const h = housesByQr('notes');
    expect(h.precision.kind).toBe('float');
    expect(vectorToStrings(h.exact)).toEqual(['5/2', '30/19']);
    expect(h.digits).toBeGreaterThanOrEqual(12);
  });
});

// §8.6 -----------------------------------------------------------------------------

describe('§8.6 conditioning', () => {
  it('the notes\' A: cond(A) ≈ 3.370, cond(AᵀA) ≈ 11.36 = cond(A)² (L4-C2)', () => {
    const view = conditioningView(A);
    expect(view.condA).toBeCloseTo(3.370, 3);
    expect(view.condAtA).toBeCloseTo(11.356, 2);
    expect(view.identity.holds).toBe(true);
  });

  it('near-collinear houses, δ = 10⁻⁶ (L4-C3)', () => {
    const v = nearCollinearView(-6, 'notes');
    expect(v.condX / 2.45e6).toBeCloseTo(1, 2);
    expect(v.normalError).toBeGreaterThan(1e-6);
    expect(v.qrError).toBeLessThan(1e-9);
  });

  it('digits lost: about log₁₀ cond for QR, twice that for the normal equation (L4-C5)', () => {
    const v = nearCollinearView(-6, 'notes');
    expect(v.digitsLost.qr).toBeCloseTo(Math.log10(v.condX), 5);
    expect(v.digitsLost.normal).toBeCloseTo(2 * Math.log10(v.condX), 5);
    expect(v.digitsLost.available).toBe(16);
  });

  it('the sweep: log–log axes, two methods over 50 values of δ, reference slopes 1 and 2 (L4-C4)', () => {
    const chart = conditioningSweep('notes');
    expect(chart.frame.x.log && chart.frame.y.log).toBe(true);
    expect(chart.series).toHaveLength(2);
    for (const s of chart.series) expect(s.points).toHaveLength(50);
    expect(chart.references.map((r) => r.slope)).toEqual([1, 2]);
  });
});

// §8.7 -----------------------------------------------------------------------------

describe('§8.7 Gram–Schmidt vs Householder', () => {
  it('on the notes\' A all three methods agree (L4-GS4)', () => {
    const view = gramSchmidtView(A, 'classical');
    expect(view.agreement.agree).toBe(true);
    expect(view.variantDifference).toMatch(/modified/i);
  });

  it('columns in ℝ³ are drawn; ℝ⁴ is not (L4-GS1)', () => {
    expect(gramSchmidtView(A, 'modified').scene).toBeNull();
    expect(gramSchmidtView(matrix([[1, 0], [0, 1], [1, 1]]), 'modified').scene?.q).toHaveLength(2);
  });
});
