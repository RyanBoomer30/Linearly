import { describe, expect, it } from 'vitest';
import { expectRealThrow } from '../../../core/__tests__/fixtures';
import { matrix, matrixToStrings, vector } from '../../../core/matrix';
import { q } from '../../../core/rational';
import { rrefAugmented } from '../../../core/rref';
import { dataRowColor } from '../../../theme/colors';
import {
  comparisonChoices,
  currentTheta,
  dataModelView,
  dataPlotScene,
  designMatrixBuilder,
  inconsistentSystemView,
  lessonData,
  lineHandles,
  lossLandscape,
  lossView,
  modelComparison,
  parameterSpaceScene,
  polynomialView,
  predict,
  pythonCode,
  snapPath,
  thetaControls,
  thetaFromHandles,
  toggleTerm,
  type VocabId,
} from '../models';
import {
  CURVED_DS,
  DEPENDENT_DS,
  houses,
  HOUSES_DS,
  LINE,
  ORIGIN,
  poly,
  QUADRATIC_DS,
  TWO_FEATURES_DS,
} from './helpers';

const THETA_ORIGIN = 400 / 133;
const THETA_LINE = [5 / 2, 30 / 19];

// Shared ------------------------------------------------------------------------

describe('lessonData', () => {
  it('builds X from the dataset and the model, then fits it', () => {
    const data = houses(LINE);
    expect(data.design.labels).toEqual(['1', 'x']);
    expect(matrixToStrings([data.fit.xHat!])).toEqual([['5/2', '30/19']]);
  });
});

describe('currentTheta and thetaControls', () => {
  it('null θ follows θ*', () => {
    const t = currentTheta(houses(LINE), null);
    expect(t[0]).toBeCloseTo(THETA_LINE[0], 12);
    expect(t[1]).toBeCloseTo(THETA_LINE[1], 12);
  });

  it('a chosen θ is kept as is', () => {
    expect(currentTheta(houses(LINE), [1, 2])).toEqual([1, 2]);
  });

  it('one slider per parameter, θ* inside each range, and the at-optimum indicator', () => {
    const at = thetaControls(houses(LINE), null);
    expect(at.params.map((p) => p.tex)).toEqual(['\\theta_0', '\\theta_1']);
    at.params.forEach((p, k) => {
      expect(p.min).toBeLessThan(THETA_LINE[k]);
      expect(p.max).toBeGreaterThan(THETA_LINE[k]);
    });
    expect(at.atOptimum).toBe(true);
    expect(thetaControls(houses(LINE), [0, 0]).atOptimum).toBe(false);
  });

  it('origin model has a single θ', () => {
    expect(thetaControls(houses(ORIGIN), null).params).toHaveLength(1);
  });
});

// Data plot -------------------------------------------------------------------------

describe('dataPlotScene', () => {
  it('one feature: 2D, one point per row in its row color (L2-D2)', () => {
    const scene = dataPlotScene(houses(LINE), THETA_LINE);
    expect(scene.dim).toBe(2);
    expect(scene.points.map((p) => p.at)).toEqual([
      [1, 4],
      [2.25, 6],
      [1.5, 5],
    ]);
    expect(scene.points.map((p) => p.color)).toEqual([0, 1, 2].map(dataRowColor));
    expect(scene.surface).toBeNull();
  });

  it('axis titles carry the units from the table (F-C7)', () => {
    const { frame } = dataPlotScene(houses(LINE), THETA_LINE);
    expect(frame.x).toMatchObject({ title: 'Living area', unit: '1000 sq ft' });
    expect(frame.y).toMatchObject({ title: 'Price', unit: '$100,000' });
  });

  it('the frame contains every data point', () => {
    const { frame, points } = dataPlotScene(houses(LINE), THETA_LINE);
    for (const p of points) {
      expect(p.at[0]).toBeGreaterThanOrEqual(frame.x.min);
      expect(p.at[0]).toBeLessThanOrEqual(frame.x.max);
      expect(p.at[1]).toBeGreaterThanOrEqual(frame.y.min);
      expect(p.at[1]).toBeLessThanOrEqual(frame.y.max);
    }
  });

  it('the curve follows h(x) = θ₀ + θ₁x', () => {
    const { curve } = dataPlotScene(houses(LINE), [1, 2]);
    expect(curve.length).toBeGreaterThan(1);
    for (const [x, y] of curve) expect(y).toBeCloseTo(1 + 2 * x, 9);
  });

  it('residuals run from (x, y) to (x, h(x)) (L2-P4)', () => {
    const { residuals } = dataPlotScene(houses(LINE), THETA_LINE);
    expect(residuals).toHaveLength(3);
    expect(residuals[0].from).toEqual([1, 4]);
    expect(residuals[0].to[0]).toBe(1);
    expect(residuals[0].prediction).toBeCloseTo(155 / 38, 12);
    expect(residuals[0].color).toBe(dataRowColor(0));
  });

  it('equalAspect is passed to the frame (L2-L1)', () => {
    expect(dataPlotScene(houses(LINE), THETA_LINE, { equalAspect: true }).frame.equalAspect).toBe(true);
  });

  it('notes §2.2 figure: h(x) = θx and h(x) = θ₀ + θ₁x on the same plot', () => {
    const scene = dataPlotScene(houses(LINE), THETA_LINE, { compareWith: [ORIGIN, LINE] });
    expect(scene.overlays).toHaveLength(2);
    const [origin, line] = scene.overlays;
    for (const [x, y] of origin.curve) expect(y).toBeCloseTo(THETA_ORIGIN * x, 9);
    for (const [x, y] of line.curve) expect(y).toBeCloseTo(THETA_LINE[0] + THETA_LINE[1] * x, 9);
    expect(origin.color).not.toBe(line.color);
  });

  it('no overlays unless asked for', () => {
    expect(dataPlotScene(houses(LINE), THETA_LINE).overlays).toEqual([]);
  });

  it('two features: 3D with a fitted surface (L2-M3)', () => {
    const data = lessonData(TWO_FEATURES_DS, { kind: 'linear' });
    const scene = dataPlotScene(data, currentTheta(data, null));
    expect(scene.dim).toBe(3);
    expect(scene.surface).not.toBeNull();
    expect(scene.points[0].at).toEqual([1, 2, 4]);
    expect(scene.frame.z).toBeDefined();
  });

  it('three features cannot be drawn: RangeError with a reason (§7)', () => {
    const ds = lessonData(
      { ...TWO_FEATURES_DS, features: [...TWO_FEATURES_DS.features, { name: 'Lot', unit: '' }], inputs: TWO_FEATURES_DS.inputs.map((r, i) => [...r, q(i + 1)]) },
      { kind: 'linear' },
    );
    expect(() => dataPlotScene(ds, [0, 0, 0, 0])).toThrow(RangeError);
  });
});

// §6.1 Data and model (notes §2.1) ------------------------------------------------------

describe('§6.1 data and model', () => {
  it('vocabulary covers every term the notes define', () => {
    const ids = dataModelView(houses(LINE)).vocabulary.map((v) => v.id);
    const expected: VocabId[] = ['regression', 'machineLearning', 'feature', 'target', 'predictor', 'parameters', 'dataPoint', 'affine'];
    expect(new Set(ids)).toEqual(new Set(expected));
  });

  it('vocabulary names what is on screen (L2-D4)', () => {
    const vocab = Object.fromEntries(dataModelView(houses(LINE)).vocabulary.map((v) => [v.id, v]));
    expect(vocab.feature.meaning).toMatch(/Living area/);
    expect(vocab.target.meaning).toMatch(/Price/);
    expect(vocab.machineLearning.meaning).toMatch(/data and algorithms/);
  });

  it('formulas: h(x) = θx and h(x) = θ₀ + θ₁x (L2-D3)', () => {
    expect(dataModelView(houses(ORIGIN)).formulaTex.replace(/\s/g, '')).toContain('h(x)=\\thetax');
    expect(dataModelView(houses(LINE)).formulaTex.replace(/\s/g, '')).toContain('h(x)=\\theta_0+\\theta_1x');
  });

  it('rounding note for the notes\' figures (L2-N6)', () => {
    expect(dataModelView(houses(ORIGIN)).roundingNote).toMatch(/400\/133/);
    expect(dataModelView(houses(LINE)).roundingNote).toMatch(/30\/19/);
    expect(dataModelView(houses(LINE)).roundingNote).toMatch(/1\.58/);
  });

  it('no rounding note when the notes\' values are exact (quadratic: −0.15, −0.45, 0.75)', () => {
    expect(dataModelView(lessonData(QUADRATIC_DS, poly(2))).roundingNote).toBeNull();
  });

  it('predict, line model: h(2) = 215/38 ≈ 5.658 (L2-D5)', () => {
    const p = predict(houses(LINE), q(2));
    expect(p.y.toString()).toBe('215/38');
    expect(p.y.toNumber()).toBeCloseTo(5.658, 3);
  });

  it('predict, origin model: h(2) = 800/133', () => {
    expect(predict(houses(ORIGIN), q(2)).y.toString()).toBe('800/133');
  });

  it('predict is exact for decimal input: h(2.25) is the fitted value p₂ = 115/19', () => {
    expect(predict(houses(LINE), q('2.25')).y.toString()).toBe('115/19');
  });

  it('predict throws when θ* does not exist', () => {
    expectRealThrow(() => predict(lessonData(DEPENDENT_DS, LINE), q(2)));
  });
});

// §6.2 Inconsistent system (notes §2.2) -----------------------------------------------------

describe('§6.2 inconsistent system', () => {
  it('one equation per data point, in its row color (L2-I1)', () => {
    const view = inconsistentSystemView(houses(ORIGIN));
    expect(view.equations).toHaveLength(3);
    expect(view.equations.map((e) => e.color)).toEqual([0, 1, 2].map(dataRowColor));
    expect(view.equations[1].equationTex).toMatch(/2\.25/);
  });

  it('[X | Y] is the augmented system', () => {
    expect(matrixToStrings(inconsistentSystemView(houses(LINE)).XY)).toEqual([
      ['1', '1', '4'],
      ['1', '9/4', '6'],
      ['1', '3/2', '5'],
    ]);
  });

  it('origin model: the trace passes through (1 | 4), (0 | −3), (0 | −1) and reports 0 = −3', () => {
    const view = inconsistentSystemView(houses(ORIGIN));
    expect(view.rref.inconsistent).toBe(true);
    const states = view.rref.trace.steps.map((st) => matrixToStrings(st.matrix).map((r) => r.join(',')).join('|'));
    expect(states).toContain('1,4|0,-3|0,-1');
    expect(view.inconsistentMessage).toMatch(/0 = −3/);
  });

  it('line model: inconsistent, starting like the notes (r₂ − r₁, r₃ − r₁)', () => {
    // The notes stop at the echelon form [[1,1|4],[0,1|2],[0,0|−0.5]], reached by a different
    // order of row operations; Gauss–Jordan gets there from the same first step.
    const view = inconsistentSystemView(houses(LINE));
    expect(view.rref.inconsistent).toBe(true);
    const rows = view.rref.trace.steps.flatMap((st) => matrixToStrings(st.matrix).map((r) => r.join(',')));
    expect(rows).toContain('0,5/4,2');
    expect(rows).toContain('0,1/2,1');
    expect(view.inconsistentMessage).not.toBeNull();
  });

  it('the notes\' echelon form for the line model is itself inconsistent (0 = −0.5)', () => {
    expect(rrefAugmented(matrix([[1, 1], [0, 1], [0, 0]]), vector([4, 2, '-1/2'])).inconsistent).toBe(true);
  });

  it('a consistent system has no message (two points, line model)', () => {
    const two = lessonData({ ...HOUSES_DS, inputs: HOUSES_DS.inputs.slice(0, 2), y: HOUSES_DS.y.slice(0, 2), rowLabels: ['House 1', 'House 2'] }, LINE);
    expect(inconsistentSystemView(two).inconsistentMessage).toBeNull();
  });

  it('origin model: each equation gives its own θ = 4, 8/3, 10/3 with θ* = 400/133 among them (L2-I3)', () => {
    const scene = parameterSpaceScene(houses(ORIGIN));
    expect(scene.kind).toBe('numberLine');
    if (scene.kind !== 'numberLine') return;
    expect(scene.values.map((v) => v.exact.toString())).toEqual(['4', '8/3', '10/3']);
    expect(scene.thetaStar).toBeCloseTo(THETA_ORIGIN, 12);
    expect(scene.range[0]).toBeLessThan(8 / 3);
    expect(scene.range[1]).toBeGreaterThan(4);
  });

  it('line model: three lines meeting pairwise at (2.4, 1.6), (2, 2), (3, 4/3), no common point', () => {
    const scene = parameterSpaceScene(houses(LINE));
    expect(scene.kind).toBe('lines');
    if (scene.kind !== 'lines') return;
    expect(scene.rowPicture.lines).toHaveLength(3);
    expect(scene.rowPicture.solution.kind).toBe('none');
    const expected = [
      [2.4, 1.6],
      [2, 2],
      [3, 4 / 3],
    ];
    expect(scene.intersections).toHaveLength(3);
    for (const [a, b] of expected) {
      expect(scene.intersections.some((p) => Math.abs(p[0] - a) < 1e-9 && Math.abs(p[1] - b) < 1e-9)).toBe(true);
    }
    expect(scene.thetaStar[0]).toBeCloseTo(THETA_LINE[0], 12);
    expect(scene.thetaStar[1]).toBeCloseTo(THETA_LINE[1], 12);
  });

  it('three parameters cannot be drawn in parameter space', () => {
    expect(parameterSpaceScene(lessonData(QUADRATIC_DS, poly(2))).kind).toBe('none');
  });

  it('fitsLesson1: X at most 4×4 can be opened in Lesson 1 (L2-P6)', () => {
    expect(inconsistentSystemView(houses(LINE)).fitsLesson1).toBe(true);
    expect(inconsistentSystemView(lessonData(CURVED_DS, LINE)).fitsLesson1).toBe(false);
  });
});

// §6.5 Loss explorer (notes §2.3) -------------------------------------------------------------

describe('§6.5 loss', () => {
  it('one squared-error term per row, in its row color (L2-L2)', () => {
    const view = lossView(houses(LINE), THETA_LINE);
    expect(view.terms).toHaveLength(3);
    expect(view.terms.map((t) => t.color)).toEqual([0, 1, 2].map(dataRowColor));
    expect(view.terms[0].value).toBeCloseTo((3 / 38) ** 2, 12);
  });

  it('at θ*: loss = ‖e‖² and mean RSS 1/114 (line) and 241/399 (origin)', () => {
    const line = lossView(houses(LINE), THETA_LINE);
    expect(line.loss).toBeCloseTo(3 / 114, 12);
    expect(line.meanRss).toBeCloseTo(1 / 114, 12);
    expect(lossView(houses(ORIGIN), [THETA_ORIGIN]).meanRss).toBeCloseTo(241 / 399, 12);
  });

  it('the notes\' mean RSS values are at the rounded θ: 0.604 at θ = 3, 0.008775 at θ = (2.5, 1.58)', () => {
    expect(lossView(houses(ORIGIN), [3]).meanRss).toBeCloseTo(29 / 48, 12); // 0.6041…
    expect(lossView(houses(LINE), [2.5, 1.58]).meanRss).toBeCloseTo(0.008775, 12);
  });

  it('‖Xθ* − Y‖ ≤ ‖Xθ − Y‖ for every θ (notes §2.2)', () => {
    const best = lossView(houses(LINE), THETA_LINE).loss;
    for (const [d0, d1] of [[0.1, 0], [0, 0.1], [-0.2, 0.05], [1, -1], [-3, 2]]) {
      expect(lossView(houses(LINE), [THETA_LINE[0] + d0, THETA_LINE[1] + d1]).loss).toBeGreaterThan(best);
    }
  });

  it('more parameters, smaller error: the line beats the origin model (notes §2.3)', () => {
    expect(lossView(houses(LINE), THETA_LINE).meanRss).toBeLessThan(lossView(houses(ORIGIN), [THETA_ORIGIN]).meanRss);
  });

  it('Y − Xθ read by rows, with uᵀv = vᵀu (notes §2.3)', () => {
    const rows = lossView(houses(LINE), THETA_LINE).residualRows;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.reason.includes('uᵀv = vᵀu'))).toBe(true);
    expect(rows.some((r) => r.tex.includes('\\theta^T x^{(1)}'))).toBe(true);
  });

  it('origin model: the landscape is a parabola with its minimum at θ* (L2-L4)', () => {
    const scene = lossLandscape(houses(ORIGIN));
    expect(scene.kind).toBe('parabola');
    if (scene.kind !== 'parabola') return;
    expect(scene.thetaStar).toBeCloseTo(THETA_ORIGIN, 12);
    const lowest = scene.curve.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(lowest[0]).toBeCloseTo(THETA_ORIGIN, 1);
  });

  it('line model: a heatmap with θ* at the bottom of the bowl (L2-L3)', () => {
    const scene = lossLandscape(houses(LINE));
    expect(scene.kind).toBe('heatmap');
    if (scene.kind !== 'heatmap') return;
    expect(scene.thetaStar[0]).toBeCloseTo(THETA_LINE[0], 12);
    expect(scene.thetaStar[1]).toBeCloseTo(THETA_LINE[1], 12);
    const { xs, ys, values, min } = scene.grid;
    expect(values).toHaveLength(ys.length);
    expect(values[0]).toHaveLength(xs.length);
    expect(min).toBeGreaterThanOrEqual(3 / 114 - 1e-12);
  });

  it('more than two parameters: no landscape', () => {
    expect(lossLandscape(lessonData(QUADRATIC_DS, poly(2))).kind).toBe('none');
  });

  it('line handles round-trip to θ (L2-L1)', () => {
    const theta = [1.2, 2.3];
    const back = thetaFromHandles(lineHandles(houses(LINE), theta));
    expect(back[0]).toBeCloseTo(theta[0], 9);
    expect(back[1]).toBeCloseTo(theta[1], 9);
  });

  it('handles sit on the line, inside the plot', () => {
    for (const [x, y] of lineHandles(houses(LINE), [1, 2])) expect(y).toBeCloseTo(1 + 2 * x, 9);
  });

  it('snap to best ends exactly at θ* (L2-L5)', () => {
    const path = snapPath([0, 0], THETA_LINE, 30);
    expect(path).toHaveLength(30);
    expect(path[path.length - 1]).toEqual(THETA_LINE);
    expect(Math.hypot(path[0][0], path[0][1])).toBeLessThan(Math.hypot(...THETA_LINE));
  });

  it('model comparison: origin 241/399, line 1/114, current row marked (L2-L6)', () => {
    const rows = modelComparison(HOUSES_DS, [ORIGIN, LINE], LINE);
    expect(rows.map((r) => r.parameters)).toEqual([1, 2]);
    expect(rows.map((r) => r.meanRss?.toString())).toEqual(['241/399', '1/114']);
    expect(rows.map((r) => r.current)).toEqual([false, true]);
  });

  it('model comparison: singular models report null mean RSS', () => {
    expect(modelComparison(DEPENDENT_DS, [LINE], LINE)[0].meanRss).toBeNull();
  });

  it('comparison choices include the origin and line models for one feature', () => {
    const kinds = comparisonChoices(HOUSES_DS).map((c) => c.kind);
    expect(kinds).toContain('origin');
    expect(kinds).toContain('line');
  });
});

// §6.6 Multi-variable and polynomial (notes §2.3–2.4) ------------------------------------------------

describe('§6.6 multi-variable and polynomial', () => {
  it('each θᵢ goes with one column; θ₀ with the constant (notes §2.3)', () => {
    const { parameters } = designMatrixBuilder(lessonData(TWO_FEATURES_DS, { kind: 'linear' }));
    expect(parameters.map((p) => [p.tex, p.feature])).toEqual([
      ['\\theta_0', null],
      ['\\theta_1', 'Living area'],
      ['\\theta_2', 'Bedrooms'],
    ]);
  });

  it('two features offer cross terms x₁x₂ and x₁²x₂ (notes §2.4, L2-M1)', () => {
    const labels = designMatrixBuilder(lessonData(TWO_FEATURES_DS, { kind: 'linear' })).options.map((o) => o.label);
    expect(labels).toEqual(expect.arrayContaining(['1', 'x₁', 'x₂', 'x₁x₂', 'x₁²x₂']));
  });

  it('active terms match the model', () => {
    const { options } = designMatrixBuilder(lessonData(QUADRATIC_DS, poly(2)));
    expect(options.filter((o) => o.active).map((o) => o.label)).toEqual(['1', 'x', 'x²']);
  });

  it('X is shown with its column labels above it (1, x, x²)', () => {
    const tex = designMatrixBuilder(lessonData(QUADRATIC_DS, poly(2))).XTex;
    expect(tex).toContain('x^2');
  });

  it('toggleTerm keeps the notes\' column order', () => {
    const line = lessonData(QUADRATIC_DS, LINE).spec;
    const withSquare = toggleTerm(line, { kind: 'monomial', powers: [2] });
    expect(withSquare).toEqual([{ kind: 'intercept' }, { kind: 'monomial', powers: [1] }, { kind: 'monomial', powers: [2] }]);
    expect(toggleTerm({ terms: withSquare }, { kind: 'monomial', powers: [1] })).toEqual([
      { kind: 'intercept' },
      { kind: 'monomial', powers: [2] },
    ]);
  });

  it('quadratic: degree 2 of at most 3, mean RSS 1/80 (L2-M2)', () => {
    const view = polynomialView(lessonData(QUADRATIC_DS, poly(2)));
    expect(view).toMatchObject({ maxDegree: 3, degree: 2, exactFit: false });
    expect(view.meanRss?.toString()).toBe('1/80');
  });

  it('quadratic: degree n − 1 = 3 passes through every point', () => {
    const view = polynomialView(lessonData(QUADRATIC_DS, poly(3)));
    expect(view.exactFit).toBe(true);
    expect(view.meanRss?.toString()).toBe('0');
  });

  it('mean RSS never increases with the degree (notes §2.3: more parameters fit more closely)', () => {
    for (const ds of [QUADRATIC_DS, CURVED_DS]) {
      const max = polynomialView(lessonData(ds, poly(0))).maxDegree;
      const rss = Array.from({ length: Math.min(max, 5) + 1 }, (_, d) => polynomialView(lessonData(ds, poly(d))).meanRss!.toNumber());
      rss.slice(1).forEach((r, d) => expect(r).toBeLessThanOrEqual(rss[d] + 1e-15));
    }
  });

  it('curved data: a line underfits; a cubic does much better (notes §2.4 figure)', () => {
    const line = polynomialView(lessonData(CURVED_DS, poly(1))).meanRss!.toNumber();
    const cubic = polynomialView(lessonData(CURVED_DS, poly(3))).meanRss!.toNumber();
    expect(cubic).toBeLessThan(line / 2);
  });

  it('polynomial view needs exactly one feature', () => {
    expect(() => polynomialView(lessonData(TWO_FEATURES_DS, { kind: 'linear' }))).toThrow(RangeError);
  });
});

// §6.7 Python (notes §2.4) -------------------------------------------------------------------

describe('§6.7 Python', () => {
  const quad = () => pythonCode(lessonData(QUADRATIC_DS, poly(2)), { matplotlib: false, lstsq: false });

  it('mirrors the notes\' LeastSquares function (L2-X1)', () => {
    const { solve } = quad();
    expect(solve).toContain('import numpy as np');
    expect(solve).toContain('def LeastSquares(A,b):');
    expect(solve).toContain('np.linalg.solve(A.T @ A, A.T @ b)');
    expect(solve).toContain('theta = LeastSquares(X,Y)');
  });

  it('quadratic: X and Y exactly as in the notes', () => {
    const { solve } = quad();
    expect(solve).toContain('X = np.array([[1,-1,1],[1,0,0],[1,1,1],[1,2,4]])');
    expect(solve).toContain('Y = np.array([1,0,0,2])');
  });

  it('quadratic: the expected output comment reads theta = [-0.15 -0.45  0.75]', () => {
    expect(quad().solve).toContain('# Least squares solution: theta = [-0.15 -0.45  0.75]');
  });

  it('houses: decimals are written as decimals, and the output matches NumPy', () => {
    const { solve } = pythonCode(houses(LINE), { matplotlib: false, lstsq: false });
    expect(solve).toContain('X = np.array([[1,1],[1,2.25],[1,1.5]])');
    expect(solve).toMatch(/theta = \[2\.5\s+1\.57894737\]/);
  });

  it('optional snippets only when asked for (L2-X2, L2-X3)', () => {
    expect(quad().matplotlib).toBeNull();
    expect(quad().lstsq).toBeNull();
    const all = pythonCode(lessonData(QUADRATIC_DS, poly(2)), { matplotlib: true, lstsq: true });
    expect(all.matplotlib).toContain('matplotlib');
    expect(all.lstsq).toContain('np.linalg.lstsq');
  });
});
