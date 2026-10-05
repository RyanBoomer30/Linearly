import { describe, expect, it } from 'vitest';
import { actionValues, evaluatePolicy, expectedNextValues, improvePolicy, policyIteration, valueIteration } from '../bellman';
import { buildGridMdp, uniformPolicy, type Policy } from '../mdp';
import { q, Rational } from '../rational';
import { CORRIDOR, gridSpec, NOTES_GRID, NOTES_PI_STAR, st } from './fixtures';


/** Built on first use, so a stub that throws fails each test instead of the file's setup. */
const once = <T,>(make: () => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};
const mdp = once(() => buildGridMdp(gridSpec(NOTES_GRID)));
const gamma = q(9, 10);
const values = (V: unknown) => (V as Rational[]).map(String);
const num = (x: Rational | number) => (typeof x === 'number' ? x : x.toNumber());
const nonTerminal = (policy: Policy) => Object.fromEntries(Object.keys(NOTES_PI_STAR).map((k) => [Number(k), policy[st(Number(k))]]));

describe('policy evaluation (F-M42, notes §6.2)', () => {
  it('all ←: V = 0 except V(4) = 1, V(7) = −1, V(11) = −9/91, exactly (acceptance)', () => {
    const e = evaluatePolicy(mdp(), uniformPolicy(mdp(), 'left'), gamma);
    expect(e.precision).toEqual({ kind: 'exact' });
    expect(values(e.V)).toEqual(['0', '0', '0', '1', '0', '0', '-1', '0', '0', '0', '-9/91']);
  });

  it('solved with the Lesson 3 LU, no row exchanges', () => {
    const e = evaluatePolicy(mdp(), uniformPolicy(mdp(), 'left'), gamma);
    expect(e.lu?.status).toEqual({ kind: 'complete' });
    expect(e.lu?.swaps).toEqual([]);
  });

  it('the system is I − γP_π with terminal rows V(s) = R(s)', () => {
    const e = evaluatePolicy(mdp(), uniformPolicy(mdp(), 'up'), gamma);
    const A = e.A as Rational[][];
    expect(A[st(10)][st(10)].toString()).toBe('1');
    expect(A[st(10)][st(6)].toString()).toBe('-18/25');
    expect(A[st(4)].map(String)).toEqual(['0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '0']);
    expect(values(e.b)).toEqual(mdp().R.map(String));
  });

  it('corridor, always →: V = (1296/1681, 36/41, 1) (acceptance)', () => {
    const c = buildGridMdp(gridSpec(CORRIDOR));
    expect(values(evaluatePolicy(c, uniformPolicy(c, 'right'), gamma).V)).toEqual(['1296/1681', '36/41', '1']);
  });

  it('absorbing terminals keep collecting: V(4) = 1/(1 − γ) = 10 (L6-G7)', () => {
    const e = evaluatePolicy(mdp(), uniformPolicy(mdp(), 'left'), gamma, 'absorbing');
    expect((e.V as Rational[])[st(4)].toString()).toBe('10');
  });

  it('more than 12 states switches to floating point, with the reason', () => {
    const big = buildGridMdp({ ...gridSpec(NOTES_GRID), rows: 4, cols: 4 });
    const e = evaluatePolicy(big, uniformPolicy(big, 'left'), gamma);
    expect(e.precision.kind).toBe('float');
    expect(e.lu).toBeNull();
  });

  it('γ must be in [0, 1)', () => {
    expect(() => evaluatePolicy(mdp(), uniformPolicy(mdp(), 'left'), q(1))).toThrow(/γ/);
  });
});

describe('action values and improvement (F-M43)', () => {
  const pi = once(() => policyIteration(mdp(), uniformPolicy(mdp(), 'left'), gamma));

  it('Q(10, ·) is largest at ↑ and equals V*(10) (L6-Q3 acceptance)', () => {
    const Q = actionValues(mdp(), pi().V, gamma)[st(10)].map(num);
    expect(Math.max(...Q)).toBe(Q[0]);
    expect(Q[0]).toBeCloseTo(num((pi().V as Rational[])[st(10)]), 12);
  });

  it('expected next values without the reward (L6-O2)', () => {
    const next = expectedNextValues(mdp(), pi().V, st(10));
    expect(num(next.up)).toBeGreaterThan(num(next.left));
  });

  it('ties keep the current action, so a converged policy does not change', () => {
    expect(improvePolicy(mdp(), pi().policy, pi().V).changed).toEqual([]);
  });

  it('from all ←, the first improvement changes some states', () => {
    const e = evaluatePolicy(mdp(), uniformPolicy(mdp(), 'left'), gamma);
    expect(improvePolicy(mdp(), uniformPolicy(mdp(), 'left'), e.V).changed.length).toBeGreaterThan(0);
  });
});

describe('policy iteration (F-M44, notes §6.3)', () => {
  it('from all ←: 7 evaluations, 6 changes, the notes\' route (acceptance)', () => {
    const r = policyIteration(mdp(), uniformPolicy(mdp(), 'left'), gamma);
    expect(r.evaluations).toBe(7);
    expect(r.changes).toBe(6);
    expect(nonTerminal(r.policy)).toEqual(NOTES_PI_STAR);
    const V = r.V as Rational[];
    expect(V[st(3)].toString()).toBe('6471/7633');
    expect(V[st(6)].toString()).toBe('4365/7633');
    expect(V[st(10)].toNumber()).toBeCloseTo(0.4755, 3);
    expect(r.steps.map((s) => s.kind).slice(0, 3)).toEqual(['evaluate', 'improve', 'evaluate']);
    expect(r.steps.at(-1)).toMatchObject({ kind: 'improve', changed: [] });
  });

  it('perfect locomotion: ↑ ↑ → from 10 and V*(10) = 729/1000', () => {
    const perfect = buildGridMdp(gridSpec(NOTES_GRID, 0));
    const r = policyIteration(perfect, uniformPolicy(perfect, 'left'), gamma);
    expect([r.policy[st(10)], r.policy[st(6)], r.policy[st(3)]]).toEqual(['up', 'up', 'right']);
    expect((r.V as Rational[])[st(10)].toString()).toBe('729/1000');
  });

  it('patient robot (γ = 99/100) takes the long way', () => {
    const r = policyIteration(mdp(), uniformPolicy(mdp(), 'left'), q(99, 100));
    expect([r.policy[st(10)], r.policy[st(6)], r.policy[st(11)]]).toEqual(['left', 'left', 'down']);
    expect((r.V as Rational[])[st(10)].toNumber()).toBeCloseTo(0.9027, 3);
  });

  it('short-sighted robot (γ = 1/2) moves away from −1 at 11', () => {
    const r = policyIteration(mdp(), uniformPolicy(mdp(), 'left'), q(1, 2));
    expect(r.policy[st(11)]).toBe('down');
    expect((r.V as Rational[])[st(10)].toString()).toBe('35640/680231');
  });
});

describe('value iteration (F-M44)', () => {
  it('reaches the same π* as policy iteration, and V within the tolerance', () => {
    const vi = valueIteration(mdp(), gamma, { tolerance: 1e-10 });
    expect(vi.converged).toBe(true);
    expect(nonTerminal(vi.policy)).toEqual(NOTES_PI_STAR);
    const exact = policyIteration(mdp(), uniformPolicy(mdp(), 'left'), gamma);
    vi.V.forEach((v, s) => expect(v).toBeCloseTo((exact.V as Rational[])[s].toNumber(), 8));
  });

  it('the change between sweeps shrinks (about like γᵏ)', () => {
    const vi = valueIteration(mdp(), gamma, { tolerance: 1e-8 });
    expect(vi.steps[0]).toMatchObject({ k: 0, delta: Infinity });
    const deltas = vi.steps.slice(1).map((s) => s.delta);
    expect(deltas.at(-1)!).toBeLessThan(deltas[0]);
    expect(deltas.at(-1)!).toBeLessThan(1e-8);
  });
});
