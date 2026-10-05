import { describe, expect, it } from 'vitest';
import { policyIteration } from '../bellman';
import { buildGridMdp, uniformPolicy } from '../mdp';
import { q, Rational } from '../rational';
import { collectExperience, estimateModel, followActions, qLearning, rollout, rollouts } from '../reinforcement';
import { gridSpec, NOTES_GRID, st } from './fixtures';

const gamma = q(9, 10);

/** Built on first use, so a stub that throws fails each test instead of the file's setup. */
const once = <T,>(make: () => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};
const mdp = once(() => buildGridMdp(gridSpec(NOTES_GRID)));
const best = once(() => policyIteration(mdp(), uniformPolicy(mdp(), 'left'), gamma));

describe('rollouts (F-M45)', () => {
  it('perfect locomotion: ↑ ↑ → from 10 visits 6, 3, 4 (L6-G1 acceptance)', () => {
    const perfect = buildGridMdp(gridSpec(NOTES_GRID, 0));
    expect(followActions(perfect, st(10), ['up', 'up', 'right'], 1)).toEqual([st(10), st(6), st(3), st(4)]);
  });

  it('an episode under π* ends at a terminal; its return is γᵏ R(end); same seed, same episode', () => {
    const e = rollout(mdp(), best().policy, st(10), gamma, 5);
    expect([st(4), st(7)]).toContain(e.endedAt);
    const k = e.states.length - 1;
    expect(e.discountedReturn).toBeCloseTo(0.9 ** k * mdp().R[e.endedAt!].toNumber(), 12);
    expect(e.steps[0]).toMatchObject({ s: st(10), a: 'up' });
    expect(e.steps.at(-1)!.r).toBe(mdp().R[e.endedAt!].toNumber());
    expect(rollout(mdp(), best().policy, st(10), gamma, 5)).toEqual(e);
  });

  it('slipping sometimes ends at −1 (L6-G6)', () => {
    const ends = Array.from({ length: 300 }, (_, k) => followActions(mdp(), st(10), ['up', 'up', 'right'], k).at(-1));
    expect(ends).toContain(st(4));
    expect(ends.some((s) => s !== st(4))).toBe(true);
  });

  it('the Monte Carlo average approaches V*(10) (L6-B2)', () => {
    const r = rollouts(mdp(), best().policy, st(10), gamma, 2000, 11);
    expect(r.runningMean).toHaveLength(2000);
    expect(Math.abs(r.meanReturn - (best().V as Rational[])[st(10)].toNumber())).toBeLessThan(0.05);
    const ended = Object.values(r.endCounts).reduce((a, b) => a + b, 0);
    expect(ended).toBeLessThanOrEqual(2000);
    expect(ended).toBeGreaterThan(1990);
  });
});

describe('learning the model (F-M46, notes §6.1)', () => {
  it('the notes\' formula on a tiny record; untried pairs stay unknown', () => {
    const e = estimateModel(2, [
      // R(0) = 0 and R(1) = 1, observed on arrival.
      { s: 0, a: 'up', next: 1, r: 1 },
      { s: 0, a: 'up', next: 0, r: 0 },
      { s: 1, a: 'left', next: 1, r: 1 },
    ]);
    expect(e.P.up[0]!.map(String)).toEqual(['1/2', '1/2']);
    expect(e.P.down[0]).toBeNull();
    expect(e.tried[0]).toEqual([2, 0, 0, 0]);
    expect(e.R.map((r) => r?.toString() ?? null)).toEqual(['0', '1']);
  });

  it('experience is reproducible and has the requested length', () => {
    const a = collectExperience(mdp(), null, 500, 3);
    expect(a).toHaveLength(500);
    expect(collectExperience(mdp(), null, 500, 3)).toEqual(a);
  });

  it('with enough experience P̂₁₀,↑ approaches (6: 0.8, 9: 0.1, 11: 0.1) (acceptance)', () => {
    const e = estimateModel(mdp().n, collectExperience(mdp(), null, 40000, 9));
    const row = e.P.up[st(10)]!.map((x) => x.toNumber());
    expect(Math.abs(row[st(6)] - 0.8)).toBeLessThan(0.08);
    expect(Math.abs(row[st(9)] - 0.1)).toBeLessThan(0.08);
    expect(Math.abs(row[st(11)] - 0.1)).toBeLessThan(0.08);
    expect(e.R[st(4)]?.toString()).toBe('1');
  });
});

describe('Q-learning (F-M47, optional)', () => {
  it('seeded, one Q per state and action, and closer to Q* with more episodes', () => {
    const reference = mdp().states.map(() => [0, 0, 0, 0]);
    const r = qLearning(mdp(), gamma, { episodes: 50, alpha: 0.5, epsilon: 0.2, seed: 4, reference });
    expect(r.Q).toHaveLength(11);
    expect(r.Q[0]).toHaveLength(4);
    expect(r.distances).toHaveLength(50);
    expect(qLearning(mdp(), gamma, { episodes: 50, alpha: 0.5, epsilon: 0.2, seed: 4, reference }).Q).toEqual(r.Q);
  });
});
