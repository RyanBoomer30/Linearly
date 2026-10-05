import { describe, expect, it } from 'vitest';
import {
  checkStochastic,
  countTransitions,
  estimateTransition,
  evolve,
  matrixPower,
  normalizeColumn,
  parseSequence,
  regularity,
  simulatePath,
  simulateSurfers,
  stationaryDistribution,
  stepDistribution,
} from '../markov';
import { identity, matrix, matrixToStrings, vector, vectorToStrings } from '../matrix';
import { expectRealThrow, ABSORBING, CYCLE, FLIP, MINI_WEB, MINI_WEB_X0, NOTES_P_HAT, NOTES_SEQUENCE } from './fixtures';

const P = matrix(MINI_WEB);
const x0 = vector(MINI_WEB_X0);

describe('transition matrix checks (L5-MC4)', () => {
  it('the mini web is column-stochastic', () => {
    const c = checkStochastic(P);
    expect(c.valid).toBe(true);
    expect(c.columns.map((col) => col.sum.toString())).toEqual(['1', '1', '1']);
  });

  it('a column that does not sum to 1 is flagged, and entries outside [0, 1]', () => {
    const c = checkStochastic(matrix([['0.5', '2'], ['0.3', '-1']]));
    expect(c.valid).toBe(false);
    expect(c.columns[0]).toMatchObject({ sumsToOne: false, outOfRange: [] });
    expect(c.columns[1].outOfRange).toEqual([0, 1]);
  });

  it('normalize a column', () => {
    const N = normalizeColumn(matrix([[1, 0], [3, 1]]), 0);
    expect(matrixToStrings(N)).toEqual([['1/4', '0'], ['3/4', '1']]);
    expectRealThrow(() => normalizeColumn(matrix([[0, 1], [0, 0]]), 0));
  });
});

describe('evolution (notes §5.1)', () => {
  it('x(1) = (0.7, 0.2, 0.1) and x(2) = (0.53, 0.24, 0.23), exactly', () => {
    expect(vectorToStrings(stepDistribution(P, x0))).toEqual(['7/10', '1/5', '1/10']);
    const xs = evolve(P, x0, 2);
    expect(xs).toHaveLength(3);
    expect(vectorToStrings(xs[2])).toEqual(['53/100', '6/25', '23/100']);
  });

  it('Pᵏ by repeated multiplication; P⁰ = I', () => {
    expect(matrixToStrings(matrixPower(P, 0))).toEqual(matrixToStrings(identity(3)));
    expect(matrixToStrings(matrixPower(P, 1))).toEqual(matrixToStrings(P));
    expect(matrixToStrings(matrixPower(matrix(FLIP), 2))).toEqual(matrixToStrings(identity(2)));
  });
});

describe('simulation (seeded)', () => {
  it('a path starts where asked, has the requested length, and repeats for the same seed', () => {
    const a = simulatePath(P, 0, 50, 123);
    expect(a).toHaveLength(50);
    expect(a[0]).toBe(0);
    expect(a.every((st) => st >= 0 && st < 3)).toBe(true);
    expect(simulatePath(P, 0, 50, 123)).toEqual(a);
  });

  it('a path never takes a zero-probability transition (flip alternates)', () => {
    expect(simulatePath(matrix(FLIP), 0, 6, 1)).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it('surfer counts: N per step, all in the start state at t = 0 from a pure state', () => {
    const counts = simulateSurfers(P, x0, 200, 5, 7);
    expect(counts).toHaveLength(6);
    expect(counts[0]).toEqual([200, 0, 0]);
    for (const c of counts) expect(c.reduce((s, k) => s + k, 0)).toBe(200);
  });

  it('long-run surfer shares approach x_eq = (0.35, 0.25, 0.40)', () => {
    const counts = simulateSurfers(P, x0, 5000, 30, 99);
    const last = counts[30].map((k) => k / 5000);
    [0.35, 0.25, 0.4].forEach((p, i) => expect(Math.abs(last[i] - p)).toBeLessThan(0.03));
  });
});

describe('estimating P from data (notes §5.2)', () => {
  const states = () => parseSequence(NOTES_SEQUENCE, 3).states;

  it('parses the notes\' sequence: 40 states, digits without separators', () => {
    const { states, invalid } = parseSequence(NOTES_SEQUENCE, 3);
    expect(invalid).toEqual([]);
    expect(states).toHaveLength(40);
    expect(states.slice(0, 5)).toEqual([2, 0, 0, 1, 0]);
    expect(parseSequence('1, 2, 3 1', 3).states).toEqual([0, 1, 2, 0]);
    expect(parseSequence('1 4 x', 3).invalid).toEqual(['4', 'x']);
  });

  it('state 1 is left 12 times, 2 of them to state 1; leaving counts 12, 15, 12', () => {
    const c = countTransitions(states(), 3);
    expect(c.leaving).toEqual([12, 15, 12]);
    expect(c.counts[0][0]).toBe(2);
    expect(c.counts).toEqual([
      [2, 5, 6],
      [6, 5, 4],
      [4, 5, 2],
    ]);
  });

  it('P̂ = [[1/6,1/3,1/2],[1/2,1/3,1/3],[1/3,1/3,1/6]] (rows "to", columns "from")', () => {
    const e = estimateTransition(states(), 3);
    expect(e.estimate.map((r) => r.map((x) => x!.toString()))).toEqual(NOTES_P_HAT);
    expect(e.undefinedColumns).toEqual([]);
  });

  it('the last state is not counted as a visit with a next state', () => {
    expect(countTransitions([0, 1], 2).leaving).toEqual([1, 0]);
  });

  it('a state never left leaves its column undefined, not zero (L5-ES6)', () => {
    const e = estimateTransition([0, 0, 1], 3);
    expect(e.undefinedColumns).toEqual([1, 2]);
    expect(e.estimate.map((r) => r[1])).toEqual([null, null, null]);
  });
});

describe('regularity (L5-PF2)', () => {
  it('the mini web is positive, so regular with k = 1', () => {
    const r = regularity(P);
    expect(r.regular && r.k).toBe(1);
  });

  it('flip and cycle are not regular; the bound is (n − 1)² + 1', () => {
    expect(regularity(matrix(FLIP))).toEqual({ regular: false, bound: 2 });
    expect(regularity(matrix(CYCLE))).toEqual({ regular: false, bound: 5 });
  });

  it('a chain needing k = 2: [[0, 1/2], [1, 1/2]]', () => {
    const r = regularity(matrix([[0, '1/2'], [1, '1/2']]));
    expect(r.regular && r.k).toBe(2);
  });
});

describe('stationary distribution (L5-PF3)', () => {
  it('mini web: x_eq = (7, 5, 8)/20', () => {
    const st = stationaryDistribution(P);
    expect(st.kind === 'unique' && vectorToStrings(st.x)).toEqual(['7/20', '1/4', '2/5']);
  });

  it('flip: x_eq = (1/2, 1/2) exists even though x(t) never converges', () => {
    const st = stationaryDistribution(matrix(FLIP));
    expect(st.kind === 'unique' && vectorToStrings(st.x)).toEqual(['1/2', '1/2']);
  });

  it('absorbing chain: two stationary distributions, one per absorbing state', () => {
    const st = stationaryDistribution(matrix(ABSORBING));
    expect(st.kind).toBe('multiple');
    if (st.kind === 'multiple') expect(st.basis.map(vectorToStrings)).toEqual([['1', '0', '0'], ['0', '1', '0']]);
  });
});
