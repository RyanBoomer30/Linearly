import { describe, expect, it } from 'vitest';
import {
  ABSORBING,
  columnSigns,
  CYCLE,
  FLIP,
  MINI_WEB,
  MINI_WEB_LAYERS,
  MINI_WEB_V,
  MINI_WEB_X0,
  NOTES_P_HAT,
  NOTES_SEQUENCE,
  over,
  s,
} from '../../../core/__tests__/fixtures';
import { identity, matrix, matrixToStrings, vector, vectorToStrings, type Matrix, type Vector } from '../../../core/matrix';
import { estimateTransition, parseSequence } from '../../../core/markov';
import {
  chainView,
  componentsChart,
  componentsScene,
  componentsView,
  convergenceChart,
  countingTrace,
  eigenScene,
  eigenView,
  estimateView,
  evolutionView,
  longRunView,
  numpyView,
  perronView,
  powerLayersTrace,
  powerLayersView,
  practiceCheck,
  simplexView,
  surferView,
} from '../models';

const P = matrix(MINI_WEB);
const x0 = vector(MINI_WEB_X0);
const NAMES = ['Page 1', 'Page 2', 'Page 3'];
const strings = (M: unknown) => matrixToStrings(M as Matrix);
const vstrings = (v: unknown) => vectorToStrings(v as Vector);
const sequence = () => parseSequence(NOTES_SEQUENCE, 3).states;

// §9.1 -----------------------------------------------------------------------------

describe('§9.1 Chain and transition matrix', () => {
  const view = () => chainView(P, NAMES, null, null, 'decimal');

  it('three pages with the notes\' arrows, every column summing to 1 (acceptance)', () => {
    expect(view().nodes.map((n) => n.label)).toEqual(NAMES);
    // Every entry of the mini web is positive: 9 arrows, 3 of them self-loops.
    expect(view().edges).toHaveLength(9);
    expect(view().edges.filter((e) => e.from === e.to).map((e) => e.label)).toEqual(['0.7', '0.4', '0.6']);
    expect(view().check.valid).toBe(true);
    expect(view().columnMessages).toEqual([null, null, null]);
  });

  it('the arrow from page 2 to page 3 is p₃₂ = 0.5 (L5-MC3)', () => {
    expect(view().edges.find((e) => e.from === 1 && e.to === 2)?.label).toBe('0.5');
    expect(view().columnLabels).toEqual(['from 1', 'from 2', 'from 3']);
    expect(view().rowLabels).toEqual(['to 1', 'to 2', 'to 3']);
  });

  it('selecting a state highlights its column and its outgoing arrows only (L5-MC3)', () => {
    const sel = chainView(P, NAMES, null, 1, 'fraction');
    expect(sel.edges.filter((e) => e.highlighted).every((e) => e.from === 1)).toBe(true);
    expect(sel.edges.filter((e) => e.highlighted)).toHaveLength(3);
    expect(sel.entries[0][1]).toBe('\\frac{1}{10}');
  });

  it('a column that does not sum to 1 is flagged (L5-MC4)', () => {
    const bad = chainView(matrix([['0.6', '0.1', '0.2'], ['0.2', '0.4', '0.2'], ['0.1', '0.5', '0.6']]), NAMES, null, null, 'fraction');
    expect(bad.check.valid).toBe(false);
    expect(bad.columnMessages[0]).toMatch(/9\/10/);
    expect(bad.columnMessages.slice(1)).toEqual([null, null]);
  });

  it('zero entries draw no arrow', () => {
    expect(chainView(matrix(FLIP), ['A', 'B'], null, null, 'fraction').edges).toHaveLength(2);
  });
});

// §9.2 -----------------------------------------------------------------------------

describe('§9.2 Evolution', () => {
  it('from x₀ = (1, 0, 0): x(1) = (0.7, 0.2, 0.1) and x(2) = (0.53, 0.24, 0.23), exactly (acceptance)', () => {
    const view = evolutionView(P, x0, 2, NAMES, 'decimal');
    expect(view.xs.map(vstrings)).toEqual([
      ['1', '0', '0'],
      ['7/10', '1/5', '1/10'],
      ['53/100', '6/25', '23/100'],
    ]);
    expect(view.table.map((r) => r.entries)).toEqual([
      ['1', '0', '0'],
      ['0.7', '0.2', '0.1'],
      ['0.53', '0.24', '0.23'],
    ]);
    expect(view.bars.map((b) => b.value)).toEqual([0.53, 0.24, 0.23]);
    expect(view.bars.map((b) => b.label)).toEqual(NAMES);
    expect(view.x0Problem).toBeNull();
  });

  it('the last step as a rows × columns trace, one step per entry (L5-EV2)', () => {
    const view = evolutionView(P, x0, 2, NAMES, 'decimal');
    expect(view.rowsTrace).toHaveLength(3);
    expect(view.rowsTrace[0].tex).toMatch(/0\.53/);
  });

  it('x₀ that is not a distribution is flagged', () => {
    expect(evolutionView(P, vector([1, 1, 0]), 1, NAMES, 'fraction').x0Problem).toMatch(/sum/i);
  });

  it('surfers: N from a seed, counts summing to N, repeatable (L5-EV3)', () => {
    const a = surferView(P, x0, 200, 2, 42);
    expect(a.counts.reduce((x, y) => x + y, 0)).toBe(200);
    expect(a.shares.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 12);
    expect(surferView(P, x0, 200, 2, 42).counts).toEqual(a.counts);
    expect(a.caption).toMatch(/42/);
  });

  it('simplex: a triangle with paths from x₀ and every pure state, plus x_eq (L5-EV4)', () => {
    const view = simplexView(P, x0, 10);
    expect(view.n).toBe(3);
    expect(view.paths.length).toBeGreaterThanOrEqual(3);
    for (const path of view.paths) expect(path.points).toHaveLength(11);
    const last = view.paths[0].points[10];
    [0.35, 0.25, 0.4].forEach((p, i) => expect(last[i]).toBeCloseTo(p, 2));
    expect(view.markers.some((m) => m.label?.includes('eq'))).toBe(true);
  });
});

// §9.3 -----------------------------------------------------------------------------

describe('§9.3 Estimate P from data', () => {
  it('counting walks the 39 pairs, filling N(i → j) (L5-ES2)', () => {
    const steps = countingTrace(sequence(), 3);
    expect(steps).toHaveLength(40);
    expect(steps[0].index).toBe(-1);
    expect(steps[1]).toMatchObject({ index: 0, from: 2, to: 0 });
    expect(steps[39].counts).toEqual([
      [2, 5, 6],
      [6, 5, 4],
      [4, 5, 2],
    ]);
  });

  it('state 1 is left 12 times, 2 of them to state 1, so p̂₁₁ = 2/12 = 1/6 (acceptance)', () => {
    const view = estimateView(sequence(), 3, 'fraction');
    expect(view.estimate.leaving).toEqual([12, 15, 12]);
    expect(view.example).toMatch(/2\/12 = 1\/6/);
    expect(view.estimate.estimate.map((r) => r.map((x) => x!.toString()))).toEqual(NOTES_P_HAT);
    expect(view.mleNote).toMatch(/maximum likelihood/i);
    expect(view.undefinedMessages).toEqual([]);
  });

  it('a state never left: "?" entries and a message (L5-ES6)', () => {
    const view = estimateView([0, 1, 0, 0], 3, 'fraction');
    expect(view.entries.map((r) => r[2])).toEqual(['?', '?', '?']);
    expect(view.undefinedMessages).toHaveLength(1);
    expect(view.undefinedMessages[0]).toMatch(/3/);
  });

  it('practice mode checks entry by entry; 0.5 and 1/2 both count (L5-ES7)', () => {
    const estimate = estimateTransition(sequence(), 3);
    const answer = [
      ['1/6', '1/3', '0.5'],
      ['1/2', '1/3', '1/3'],
      ['1/3', '1/4', ''],
    ];
    const check = practiceCheck(answer, estimate);
    expect(check.cells).toEqual([
      ['correct', 'correct', 'correct'],
      ['correct', 'correct', 'correct'],
      ['correct', 'wrong', 'empty'],
    ]);
    expect(check.correct).toBe(7);
    expect(check.total).toBe(9);
    expect(check.allCorrect).toBe(false);
    expect(practiceCheck(NOTES_P_HAT, estimate).allCorrect).toBe(true);
    expect(practiceCheck([['x', '', ''], ['', '', ''], ['', '', '']], estimate).cells[0][0]).toBe('invalid');
  });
});

// §9.4 -----------------------------------------------------------------------------

describe('§9.4 Eigendecomposition', () => {
  const view = () => eigenView(P, 'integer', 3);

  it('λ = 1, 1/2, 1/5, exact, with the characteristic polynomial (acceptance)', () => {
    expect(view().precision).toEqual({ kind: 'exact' });
    expect(view().rows.map((r) => r.lambdaTex)).toEqual(['1', '\\frac{1}{2}', '\\frac{1}{5}']);
    expect(view().polynomialTex).toContain('\\frac{17}{10}');
  });

  it('each eigenvector is N(P − λI), with P − λI for the Lesson 1 link (L5-EG2)', () => {
    expect(strings(view().rows[0].shifted)).toEqual([['-3/10', '1/10', '1/5'], ['1/5', '-3/5', '1/5'], ['1/10', '1/2', '-2/5']]);
    expect(view().rows[0].vectors).toEqual(['(7, 5, 8)']);
  });

  it('V, Λ, V⁻¹ with VΛV⁻¹ = P exactly (acceptance, V up to column signs)', () => {
    const d = view().decomposition;
    if (d.kind !== 'available') throw new Error(d.reason);
    expect(columnSigns(strings(d.V))).toEqual(columnSigns(s(MINI_WEB_V)));
    expect(d.check.holds).toBe(true);
  });

  it('Pᵏ = VΛᵏV⁻¹ agrees with repeated multiplication (L5-EG4)', () => {
    expect(view().power?.k).toBe(3);
    expect(view().power?.check.holds).toBe(true);
  });

  it('probability scaling for λ = 1 (L5-EG3)', () => {
    expect(eigenView(P, 'probability', 1).rows[0].vectors).toEqual(['(\\frac{7}{20}, \\frac{1}{4}, \\frac{2}{5})']);
  });

  it('the notes\' estimate P̂ is not diagonalizable: λ = −1/6 twice with one eigenvector (acceptance, L5-EG5)', () => {
    const hat = eigenView(matrix(NOTES_P_HAT), 'integer', 2);
    expect(hat.decomposition.kind).toBe('unavailable');
    if (hat.decomposition.kind === 'unavailable') expect(hat.decomposition.reason).toMatch(/-1\/6|−1\/6/);
    expect(hat.power).toBeNull();
  });

  it('a vector on an eigenvector line maps to λ times itself; others turn (L5-EG6)', () => {
    const on = eigenScene(P, [1, 0, -1]);
    expect(on.onLine?.lambdaTex).toBe('\\frac{1}{2}');
    on.image.forEach((c, i) => expect(c).toBeCloseTo([0.5, 0, -0.5][i], 12));
    expect(on.lines).toHaveLength(3);
    expect(eigenScene(P, [1, 0, 0]).onLine).toBeNull();
  });

  it('NumPy export and rescaling back to the notes\' integers (L5-EG7)', () => {
    const np = numpyView(P);
    expect(np.code).toContain('np.linalg.eig');
    expect(np.code).toContain('0.7');
    expect(np.rescaled.map((v) => v && vstrings(v))).toContainEqual(['7', '5', '8']);
    expect(np.note).toMatch(/length 1/);
  });
});

// §9.5 -----------------------------------------------------------------------------

describe('§9.5 Components over time', () => {
  it('c = (1/20, 11/15, 1/12) and the components at t = 2 add up to (0.53, 0.24, 0.23) (acceptance)', () => {
    const view = componentsView(P, x0, 2);
    expect(view.precision).toEqual({ kind: 'exact' });
    expect(vstrings(view.c)).toEqual(['1/20', '11/15', '1/12']);
    expect(vstrings(view.sum)).toEqual(['53/100', '6/25', '23/100']);
    expect(view.check.holds).toBe(true);
    expect(view.steps).toHaveLength(3);
    expect(view.negativeNote).toMatch(/negative/);
  });

  it('decay rates 0.5 and 0.2 are straight lines on a log axis (L5-CO3)', () => {
    const chart = componentsChart(P, x0, 10, true);
    expect(chart.frame.y.log).toBe(true);
    const [, half, fifth] = chart.series;
    const slope = (pts: [number, number][]) => Math.log10(pts[5][1]) - Math.log10(pts[4][1]);
    expect(slope(half.points)).toBeCloseTo(Math.log10(0.5), 10);
    expect(slope(fifth.points)).toBeCloseTo(Math.log10(0.2), 10);
  });

  it('tip to tail in ℝ³: the arrows end at x(t) (L5-CO4)', () => {
    const scene = componentsScene(P, x0, 2);
    expect(scene.arrows).toHaveLength(3);
    expect(scene.arrows[0].from).toEqual([0, 0, 0]);
    scene.total.forEach((c, i) => expect(c).toBeCloseTo([0.53, 0.24, 0.23][i], 12));
    scene.arrows[2].to.forEach((c, i) => expect(c).toBeCloseTo(scene.total[i], 12));
  });

  it('not diagonalizable: the reason, not a crash (L5-EG5)', () => {
    expect(() => componentsView(matrix(NOTES_P_HAT), vector([1, 0, 0]), 1)).toThrow(/eigenvector/);
  });
});

// §9.6 -----------------------------------------------------------------------------

describe('§9.6 Pᵗ as rank-1 layers', () => {
  it('the three layers from the acceptance criteria, and they add up to I at t = 0', () => {
    const view = powerLayersView(P, 0, 3);
    expect(strings(view.layers[0].matrix)).toEqual(over(MINI_WEB_LAYERS.one20, 20));
    expect(strings(view.layers[1].matrix)).toEqual(over(MINI_WEB_LAYERS.half60, 60));
    expect(strings(view.layers[2].matrix)).toEqual(over(MINI_WEB_LAYERS.fifth60, 60));
    expect(view.identityCheck.holds).toBe(true);
    expect(view.total).toEqual(matrixToStrings(identity(3)).map((r) => r.map(Number)));
  });

  it('the λ = 1 layer: every column is x_eq (L5-RK2)', () => {
    const view = powerLayersView(P, 5, 1);
    expect(view.layers[0].stationary).toBe(true);
    expect(view.stationaryCaption).toMatch(/stationary/);
  });

  it('keeping only the λ = 1 layer leaves little for large t (L5-RK3)', () => {
    expect(powerLayersView(P, 20, 1).leftoverSize).toBeLessThan(1e-5);
    expect(powerLayersView(P, 1, 1).leftoverSize).toBeGreaterThan(0.1);
  });

  it('the notes\' printed layers fail the t = 0 check (L5-RK5)', () => {
    expect(powerLayersView(P, 0, 3).notesCheck).toMatch(/sign/);
  });

  it('VΛᵗ first, then one layer per step (L5-RK6)', () => {
    const steps = powerLayersTrace(P, 0);
    expect(steps).toHaveLength(4);
    expect(columnSigns(strings(steps[0].matrix))).toEqual(columnSigns(s(MINI_WEB_V)));
    expect(steps.slice(1).map((st) => st.layer)).toEqual([0, 1, 2]);
    expect(strings(steps[3].matrix)).toEqual(matrixToStrings(identity(3)));
  });
});

// §9.7 -----------------------------------------------------------------------------

describe('§9.7 Perron–Frobenius and the stationary distribution', () => {
  it('mini web: x_eq = (7, 5, 8)/20 (35%, 25%, 40%), regular with k = 1, |λ₂| = 1/2 (acceptance)', () => {
    const view = perronView(P);
    expect(view.stationary.elimination && vstrings(view.stationary.elimination)).toEqual(['7/20', '1/4', '2/5']);
    expect(view.percentages).toEqual(['35%', '25%', '40%']);
    expect(view.regularity.regular && view.regularity.k).toBe(1);
    expect(view.lambda2Abs).toBeCloseTo(0.5, 12);
    expect(view.points.filter((p) => p.highlighted)).toHaveLength(1);
    expect(view.circles[0].radius).toBeCloseTo(0.5, 12);
  });

  it('the three ways agree (L5-PF3)', () => {
    const st = perronView(P).stationary;
    expect(st.eigenvector && vstrings(st.eigenvector)).toEqual(['7/20', '1/4', '2/5']);
    st.power.column.forEach((x, i) => expect(x).toBeCloseTo([0.35, 0.25, 0.4][i], 6));
  });

  it('captions state the theorem with the notes\' slips corrected (L5-PF7)', () => {
    const view = perronView(P);
    expect(view.theorem).toMatch(/Perron/);
    expect(view.theorem).not.toMatch(/Perrone/);
    expect(view.theorem).toMatch(/\|a\| < 1/);
    expect(view.summary).toMatch(/factorization/i);
  });

  it('flip: eigenvalues 1 and −1, not regular (acceptance)', () => {
    const view = perronView(matrix(FLIP));
    expect(view.points.map((p) => p.z.re)).toEqual([1, -1]);
    expect(view.regularity.regular).toBe(false);
    expect(view.lambda2Abs).toBe(1);
  });

  it('cycle: 1 and two complex eigenvalues of absolute value 1 (acceptance)', () => {
    const view = perronView(matrix(CYCLE));
    expect(view.points).toHaveLength(3);
    for (const p of view.points) expect(Math.hypot(p.z.re, p.z.im)).toBeCloseTo(1, 12);
    expect(view.points.filter((p) => p.z.im !== 0)).toHaveLength(2);
  });

  it('absorbing: λ = 1 twice; from state 3 the limit is (1/2, 1/2, 0) (acceptance)', () => {
    const view = perronView(matrix(ABSORBING));
    const ones = view.points.filter((p) => p.z.re === 1 && p.z.im === 0);
    expect(ones).toHaveLength(1);
    expect(ones[0].label).toMatch(/×2/);
    expect(view.stationary.elimination).toBeNull();
    const chart = convergenceChart(matrix(ABSORBING), vector([0, 0, 1]), 10);
    expect(chart.reference).toBeNull();
  });

  it('convergence: ‖x(t) − x_eq‖ falls with slope log|λ₂| on a log axis (L5-PF6)', () => {
    const chart = convergenceChart(P, x0, 20);
    expect(chart.frame.y.log).toBe(true);
    expect(chart.reference?.slope).toBeCloseTo(Math.log10(0.5), 12);
    const [a, b] = [chart.points[10], chart.points[11]];
    expect(Math.log10(b[1]) - Math.log10(a[1])).toBeCloseTo(Math.log10(0.5), 3);
    expect(chart.note).toBeNull();
  });

  it('the flip never converges: a note instead of a reference line', () => {
    const chart = convergenceChart(matrix(FLIP), vector([1, 0]), 10);
    expect(chart.note).toMatch(/−1|-1/);
  });

  it('long run: surfer shares near 35%, 25%, 40% (L5-PF4)', () => {
    const view = longRunView(P, x0, 1000, 7, NAMES);
    expect(view.exact).toEqual([0.35, 0.25, 0.4]);
    view.simulated.forEach((x, i) => expect(Math.abs(x - [0.35, 0.25, 0.4][i])).toBeLessThan(0.05));
  });
});
