import { describe, expect, it } from 'vitest';
import { CORRIDOR, gridSpec, NOTES_GRID, NOTES_PI_STAR, st } from '../../../core/__tests__/fixtures';
import { policyIteration } from '../../../core/bellman';
import { buildGridMdp, uniformPolicy, type Policy } from '../../../core/mdp';
import { q, type Rational } from '../../../core/rational';
import { STATS_PRESETS, statsPresetById } from '../../../presets/lesson6';
import { collectExperience, estimateModel } from '../../../core/reinforcement';
import {
  actionCompass,
  actionMatrices,
  bellmanDerivation,
  bellmanEquation,
  bellmanSystem,
  cellOf,
  distributionView,
  finishView,
  gridCells,
  intendedPath,
  learningChart,
  learningView,
  mdpSummary,
  optimalityDerivation,
  optimalView,
  parseStatsTable,
  planWithEstimate,
  policyIterationView,
  qLearningView,
  qValuesView,
  returnView,
  robotSimulation,
  samplePaths,
  statisticsView,
  transitionInspector,
  valueIterationView,
} from '../models';

const gamma = q(9, 10);
const num = (x: Rational | number) => (typeof x === 'number' ? x : x.toNumber());
const routeOf = (pi: Policy) => Object.fromEntries(Object.keys(NOTES_PI_STAR).map((k) => [Number(k), pi[st(Number(k))]]));


/** Built on first use, so a stub that throws fails each test instead of the file's setup. */
const once = <T,>(make: () => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};
const mdp = once(() => buildGridMdp(gridSpec(NOTES_GRID)));
const perfect = once(() => buildGridMdp(gridSpec(NOTES_GRID, 0)));
const allLeft = once(() => uniformPolicy(mdp(), 'left'));
const piStar = once(() => policyIteration(mdp(), allLeft(), gamma).policy);

// Grid -------------------------------------------------------------------------------

describe('gridCells (F-D12)', () => {
  it("the notes' layout: numbers, the wall, +1 and −1, the robot at 10", () => {
    const cells = gridCells(mdp(), {}, 'fraction');
    expect(cells).toHaveLength(3);
    expect(cells[1][1].kind).toBe('wall');
    expect(cells[1][2]).toMatchObject({ kind: 'state', label: 6 });
    expect(cells[0][3]).toMatchObject({ label: 4, reward: '+1', terminal: true });
    expect(cells[1][3]).toMatchObject({ label: 7, reward: '−1', terminal: true });
    expect(cells[2][2].robot).toBe(true);
    expect(cellOf(mdp(), st(10))).toEqual([2, 2]);
  });

  it('layers: arrows, values with labels, overlay, changed arrows', () => {
    const V = mdp().R;
    const cells = gridCells(mdp(), { policy: allLeft(), values: V, overlay: new Array(11).fill(0.5), changed: [st(10)] }, 'fraction');
    expect(cells[2][2]).toMatchObject({ arrow: 'left', arrowChanged: true, value: 0, valueLabel: '0' });
    expect(cells[0][3].valueLabel).toBe('1');
    expect(cells[2][2].overlay?.p).toBe(0.5);
  });
});

// §10.1 --------------------------------------------------------------------------------

describe('§10.1 Gridworld and MDP', () => {
  it('lists S, A, R and the slip (L6-G2, L6-G3)', () => {
    const sum = mdpSummary(mdp(), q(1, 10), 'decimal');
    expect(sum.statesTex).toMatch(/11/);
    expect(sum.actionsTex).toMatch(/leftarrow/);
    expect(sum.slipText).toMatch(/0\.8/);
  });

  it('P₁₀,↑(6) = 4/5, P₁₀,↑(9) = P₁₀,↑(11) = 1/10 (acceptance)', () => {
    const t = transitionInspector(mdp(), st(10), 'up', 'fraction');
    expect(t.overlay[st(6)]).toBe(0.8);
    expect(t.overlay[st(9)]).toBe(0.1);
    expect(t.overlay.filter((p) => p > 0)).toHaveLength(3);
    expect(t.entries.map((e) => e.state)).toEqual([st(6), st(9), st(11)]);
    expect(t.entries[0].tex).toBe('P_{10,\\uparrow}(6) = \\frac{4}{5}');
  });

  it('four per-action matrices with the selected row (L6-G5)', () => {
    const ms = actionMatrices(mdp(), st(10));
    expect(ms.map((m) => m.action)).toEqual(['up', 'right', 'down', 'left']);
    expect(ms[0].entries[st(10)][st(6)]).toBe(0.8);
    expect(ms[0].highlightRow).toBe(st(10));
  });

  it('with perfect() locomotion ↑ ↑ → from 10 visits 6, 3, 4 every time (L6-G6 acceptance)', () => {
    const v = samplePaths(perfect(), st(10), ['up', 'up', 'right'], 20, 1);
    expect(v.paths.every((p) => p.states.join() === [st(10), st(6), st(3), st(4)].join())).toBe(true);
    expect(v.endCounts[st(4)]).toBe(20);
  });

  it('with slipping some runs end at −1 or elsewhere (L6-G6)', () => {
    const v = samplePaths(mdp(), st(10), ['up', 'up', 'right'], 200, 1);
    expect(v.endCounts[st(4)]).toBeLessThan(200);
    expect(v.caption).toMatch(/seed 1/);
  });
});

describe('the robot simulation (§6.1 figure, L6-G6)', () => {
  it('perfect locomotion, plan ↑ ↑ →: 10 → 6 → 3 → 4, no slips, return 0.9³ = 0.729', () => {
    const sim = robotSimulation(perfect(), { kind: 'plan', actions: ['up', 'up', 'right'] }, gamma, 1);
    expect(sim.frames.map((f) => f.state)).toEqual([st(10), st(6), st(3), st(4)]);
    expect(sim.frames[0]).toMatchObject({ t: 0, action: null, aimed: null, slipped: false });
    expect(sim.frames.slice(1).map((f) => f.action)).toEqual(['up', 'up', 'right']);
    expect(sim.frames.every((f) => !f.slipped)).toBe(true);
    expect(sim.endedAt).toBe(st(4));
    expect(sim.discountedReturn).toBeCloseTo(0.729, 12);
    expect(sim.frames[1].description).toMatch(/↑/);
  });

  it('with q = 1/10 the robot sometimes slips; a slip lands somewhere other than where it aimed', () => {
    const runs = Array.from({ length: 50 }, (_, seed) => robotSimulation(mdp(), { kind: 'plan', actions: ['up', 'up', 'right'] }, gamma, seed));
    expect(runs.some((r) => r.frames.some((f) => f.slipped))).toBe(true);
    for (const r of runs) {
      for (const f of r.frames.slice(1)) expect(f.slipped).toBe(f.state !== f.aimed);
    }
    expect(robotSimulation(mdp(), { kind: 'plan', actions: ['up', 'up', 'right'] }, gamma, 7)).toEqual(runs[7]);
  });

  it('following a policy runs to a terminal; the return accumulates frame by frame', () => {
    const sim = robotSimulation(mdp(), { kind: 'policy', policy: piStar() }, gamma, 3);
    expect([st(4), st(7)]).toContain(sim.endedAt);
    expect(sim.frames.at(-1)!.returnSoFar).toBeCloseTo(sim.discountedReturn, 12);
    expect(sim.caption).toMatch(/seed 3/);
  });
});

// §10.2 --------------------------------------------------------------------------------

describe('§10.2 Learning the model', () => {
  it('reproducible from a seed; the formula; unknown pairs flagged (L6-L1–L6-L3)', () => {
    const a = learningView(mdp(), null, 300, 5, { s: st(10), a: 'up' }, 'fraction');
    expect(a.total).toBe(300);
    expect(a.sample.length).toBeLessThanOrEqual(300);
    expect(learningView(mdp(), null, 300, 5, null, 'fraction').estimate).toEqual(a.estimate);
    expect(a.formulaTex).toMatch(/\\#/);
    expect(a.stateErrors).toHaveLength(11);
    // Terminal states are never acted in, so they are not listed; every listed pair really was never tried.
    expect(a.unknown.some((u) => u.startsWith('state 4,') || u.startsWith('state 7,'))).toBe(false);
    for (const u of a.unknown) {
      const [, label, arrow] = /state (\d+), (.)/.exec(u)!;
      expect(a.estimate.tried[Number(label) - 1]['↑→↓←'.indexOf(arrow)]).toBe(0);
    }
  });

  it('error falls as experience grows (L6-L3 acceptance)', () => {
    const c = learningChart(mdp(), null, 9);
    expect(c.frame.x.log && c.frame.y.log).toBe(true);
    expect(c.points.at(-1)![1]).toBeLessThan(c.points[0][1]);
  });

  it('planning with a good estimate finds the same π* (L6-L4)', () => {
    const estimate = estimateModel(mdp().n, collectExperience(mdp(), null, 40000, 9));
    const plan = planWithEstimate(mdp(), estimate, gamma, 'terminal');
    expect(routeOf(plan.truth)).toEqual(NOTES_PI_STAR);
    expect(plan.differences.length).toBeLessThanOrEqual(1);
  });
});

// §10.3 --------------------------------------------------------------------------------

describe('§10.3 Value of a policy', () => {
  it('a seeded return written term by term; the average approaches V^π(10) (L6-B2)', () => {
    const r = returnView(mdp(), piStar(), gamma, st(10), 2000, 3, 'terminal');
    expect(r.termsTex).toMatch(/\\gamma/);
    expect(r.exact).not.toBeNull();
    expect(Math.abs(r.average - r.exact!)).toBeLessThan(0.05);
    expect(r.runningMean).toHaveLength(2000);
  });

  it('the derivation ends at the Bellman equation (L6-B3)', () => {
    const steps = bellmanDerivation();
    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(steps.at(-1)!.tex).toMatch(/\\sum/);
  });

  it("one state's equation with numbers (L6-B4)", () => {
    const eq = bellmanEquation(mdp(), uniformPolicy(mdp(), 'up'), gamma, st(10), 'fraction', 'terminal');
    expect(eq).toMatch(/V\(10\)/);
    expect(eq).toMatch(/\\frac\{4\}\{5\}V\(6\)/);
    expect(bellmanEquation(mdp(), allLeft(), gamma, st(4), 'fraction', 'terminal')).toBe('V(4) = 1');
  });

  it('all ←: V = 0 except V(4) = 1, V(7) = −1, V(11) = −9/91 (acceptance)', () => {
    const sys = bellmanSystem(mdp(), allLeft(), gamma, 'fraction', 'terminal');
    expect(sys.precision).toEqual({ kind: 'exact' });
    expect((sys.evaluation.V as Rational[]).map(String)).toEqual(['0', '0', '0', '1', '0', '0', '-1', '0', '0', '0', '-9/91']);
    expect(sys.systemTex).toBeNull();
    expect(sys.matrix).toHaveLength(11);
    expect(sys.luSteps.length).toBeGreaterThan(0);
    expect(sys.pivotNote).toMatch(/diagonal/);
  });

  it('corridor, always →: V = (1296/1681, 36/41, 1), with the system in full (acceptance)', () => {
    const c = buildGridMdp(gridSpec(CORRIDOR));
    const sys = bellmanSystem(c, uniformPolicy(c, 'right'), gamma, 'fraction', 'terminal');
    expect((sys.evaluation.V as Rational[]).map(String)).toEqual(['1296/1681', '36/41', '1']);
    expect(sys.systemTex).toMatch(/begin/);
  });
});

// §10.4 --------------------------------------------------------------------------------

describe('§10.4 Where the robot ends up', () => {
  it('x(0) is the start; probabilities stay a distribution (L6-W1)', () => {
    const d = distributionView(mdp(), piStar(), 5);
    expect(d.history[0][st(10)]).toBe(1);
    expect(d.history).toHaveLength(6);
    expect(d.x.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('under π* the chances of ending at +1 and −1 from 10 add up to 1; rollouts approach them (acceptance)', () => {
    const f = finishView(mdp(), piStar(), gamma, st(10), 2000, 4);
    const total = f.exact.reduce((acc, e) => acc + num(e.probability), 0);
    expect(total).toBeCloseTo(1, 10);
    for (const e of f.exact) {
      const sim = f.simulated.find((x) => x.state === e.state)!;
      expect(Math.abs(sim.share - num(e.probability))).toBeLessThan(0.04);
    }
    expect(f.note).toMatch(/Lesson 5/);
  });
});

// §10.5 --------------------------------------------------------------------------------

describe('§10.5 Optimal value and best actions', () => {
  it('the optimality derivation ends with the max over actions (L6-O1)', () => {
    expect(optimalityDerivation().at(-1)!.tex).toMatch(/\\max_\{?a/);
  });

  it("q = 1/10: the notes' route, V*(10) ≈ 0.4755 (acceptance)", () => {
    const o = optimalView(mdp(), gamma, 'terminal', 'decimal');
    expect(o.precision).toEqual({ kind: 'exact' });
    expect(routeOf(o.policy)).toEqual(NOTES_PI_STAR);
    expect(num((o.V as Rational[])[st(10)])).toBeCloseTo(0.4755, 3);
  });

  it('perfect locomotion: V*(10) = 0.729 and ↑ ↑ → from 10 (acceptance, L6-O4)', () => {
    const o = optimalView(perfect(), gamma, 'terminal', 'decimal');
    expect((o.V as Rational[])[st(10)].toString()).toBe('729/1000');
    expect(o.valueLabels[st(10)]).toBe('0.729');
    expect(intendedPath(perfect(), o.policy, st(10))).toEqual([st(10), st(6), st(3), st(4)]);
  });

  it('γ = 99/100 takes the long way; changed arrows against the γ = 9/10 policy (acceptance, L6-O5)', () => {
    const o = optimalView(mdp(), q(99, 100), 'terminal', 'decimal', piStar());
    expect([o.policy[st(10)], o.policy[st(6)]]).toEqual(['left', 'left']);
    expect(o.changed).toEqual(expect.arrayContaining([st(6), st(10), st(11)]));
  });

  it('the compass picks ↑ at 10 (L6-O2)', () => {
    const o = optimalView(mdp(), gamma, 'terminal', 'decimal');
    const c = actionCompass(mdp(), o.V, st(10), 'decimal');
    expect(c.best).toBe('up');
    expect(c.values.up.value).toBeGreaterThan(c.values.left.value);
  });
});

// §10.6 --------------------------------------------------------------------------------

describe('§10.6 Policy iteration', () => {
  it('from all ←: 7 evaluations, 6 changes, ends at π* (acceptance)', () => {
    const v = policyIterationView(mdp(), allLeft(), gamma, 'terminal', [st(10)], 'decimal');
    expect(v.evaluations).toBe(7);
    expect(v.changes).toBe(6);
    expect(v.frames.filter((f) => f.kind === 'evaluate')).toHaveLength(7);
    expect(routeOf(v.frames.at(-1)!.policy)).toEqual(NOTES_PI_STAR);
    expect(v.history).toHaveLength(7);
    expect(v.tieRule).toMatch(/tie/);
  });

  it('V^π at the tracked state never decreases (L6-PI4)', () => {
    const v = policyIterationView(mdp(), allLeft(), gamma, 'terminal', [st(10)], 'decimal');
    const ys = v.chart.series[0].points.map((p) => p[1]);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1e-12);
  });
});

// §10.7 --------------------------------------------------------------------------------

describe('§10.7 Value iteration and Q-values', () => {
  it('value iteration reaches the same π* as policy iteration (acceptance)', () => {
    const v = valueIterationView(mdp(), gamma, 'terminal', 1e-10);
    expect(routeOf(v.policy)).toEqual(NOTES_PI_STAR);
    expect(v.agrees).toBe(true);
    expect(v.comparison.map((c) => c.method)).toEqual(['Policy iteration', 'Value iteration']);
    expect(v.chart.frame.y.log).toBe(true);
  });

  it('Q at state 10 is largest at ↑ and equals V*(10) (acceptance)', () => {
    const qv = qValuesView(mdp(), gamma, 'terminal', 'decimal');
    expect(qv.best[st(10)]).toBe('up');
    const o = optimalView(mdp(), gamma, 'terminal', 'decimal');
    expect(num(qv.q[st(10)][0])).toBeCloseTo(num((o.V as Rational[])[st(10)]), 12);
    expect(qv.labels[st(10)]).toHaveLength(4);
  });

  it('Q-learning: seeded, distance to Q* charted (L6-Q5)', () => {
    const a = qLearningView(mdp(), gamma, 'terminal', { episodes: 100, alpha: 0.5, epsilon: 0.2, seed: 1 });
    expect(a.chart.points).toHaveLength(100);
    expect(qLearningView(mdp(), gamma, 'terminal', { episodes: 100, alpha: 0.5, epsilon: 0.2, seed: 1 }).q).toEqual(a.q);
  });
});

describe('statistics primer', () => {
  const preset = (id: string) => {
    const p = statsPresetById(id)!;
    const t = parseStatsTable(p.rows);
    return statisticsView(t.x1, t.x2, p.columns, 'fraction');
  };

  it('reproduces Lesson 7’s covariance matrix S = [[20, 25], [25, 40]] from the uncentered ages and heights', () => {
    const v = preset('ageHeight');
    expect(v.means.map(String)).toEqual(['40', '170']);
    expect(v.variances.map(String)).toEqual(['20', '40']);
    expect(v.covariance.toString()).toBe('25');
    expect(v.sums.d1).toBe('0');
    expect(v.sums.d2).toBe('0');
    expect(v.stds[0]).toBeCloseTo(Math.sqrt(20), 12);
  });

  it('gives a negative covariance for the TV data and exactly 0 for x₂ = x₁²', () => {
    expect(preset('negative').covariance.toString()).toBe('-45/4');
    const parabola = preset('parabola');
    expect(parabola.covariance.isZero()).toBe(true);
    expect(parabola.rows.map((r) => r.sign)).toEqual([-1, 1, 0, -1, 1]);
    expect(parabola.verdict).toMatch(/not the same as no relationship/);
  });

  it('every preset builds, with one step per quantity ending at S', () => {
    for (const p of STATS_PRESETS) {
      const v = preset(p.id);
      expect(v.rows).toHaveLength(p.rows.length);
      expect(v.steps.at(-1)!.tex).toContain('S =');
    }
  });

  it('flags cells that do not parse and reads them as 0', () => {
    const t = parseStatsTable([
      ['1', 'x'],
      ['3', '4'],
    ]);
    expect(t.invalid).toEqual([[0, 1]]);
    expect(t.x2.map(String)).toEqual(['0', '4']);
  });

  it('needs at least 2 observations, and shortens long sums', () => {
    expect(() => statisticsView([q(1)], [q(2)], ['x₁', 'x₂'], 'fraction')).toThrow(/at least 2/);
    const xs = Array.from({ length: 20 }, (_, i) => q(i));
    expect(statisticsView(xs, xs, ['x₁', 'x₂'], 'fraction').steps[0].tex).toContain('\\cdots');
  });
});
