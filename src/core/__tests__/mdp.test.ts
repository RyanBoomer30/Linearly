import { describe, expect, it } from 'vitest';
import { ACTIONS, buildGridMdp, policyMatrix, policyTransition, randomPolicy, stateAt, uniformPolicy, validateMdp } from '../mdp';
import { matrixToStrings, transpose } from '../matrix';
import { CORRIDOR, expectRealThrow, gridSpec, NOTES_GRID, st } from './fixtures';


/** Built on first use, so a stub that throws fails each test instead of the file's setup. */
const once = <T,>(make: () => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};
const mdp = once(() => buildGridMdp(gridSpec(NOTES_GRID)));

describe('grid MDP (F-M40, notes §6.1)', () => {
  it('11 states numbered row by row around the wall; start at 10; terminals 4 and 7', () => {
    expect(mdp().n).toBe(11);
    expect(mdp().states.map((s) => s.label)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(mdp().states[st(6)]).toMatchObject({ row: 1, col: 2 });
    expect(stateAt(mdp(), [1, 1])).toBeNull();
    expect(stateAt(mdp(), [2, 2])).toBe(st(10));
    expect(stateAt(mdp(), [5, 0])).toBeNull();
    expect(mdp().start).toBe(st(10));
    expect(mdp().terminals).toEqual([st(4), st(7)]);
  });

  it('rewards: R(4) = 1, R(7) = −1, 0 elsewhere', () => {
    expect(mdp().R.map(String)).toEqual(['0', '0', '0', '1', '0', '0', '-1', '0', '0', '0', '0']);
  });

  it('P₁₀,↑(6) = 4/5, P₁₀,↑(9) = P₁₀,↑(11) = 1/10, all others 0 (acceptance)', () => {
    const row = mdp().P.up[st(10)].map(String);
    expect(row).toEqual(['0', '0', '0', '0', '0', '4/5', '0', '0', '1/10', '0', '1/10']);
  });

  it('bumping into a wall or the edge means staying put', () => {
    // From 5, ↑ goes to 1 (0.8); slipping ← hits the edge (stay), slipping → hits the wall (stay).
    expect(mdp().P.up[st(5)].map(String)).toEqual(['4/5', '0', '0', '0', '1/5', '0', '0', '0', '0', '0', '0']);
    // From 1, ← hits the edge (0.8 stay) and slipping ↑ also stays; slipping ↓ goes to 5.
    expect(mdp().P.left[st(1)][st(1)].toString()).toBe('9/10');
    expect(mdp().P.left[st(1)][st(5)].toString()).toBe('1/10');
  });

  it('every Pₛₐ sums to 1', () => {
    expect(validateMdp(mdp())).toEqual({ valid: true, problems: [] });
    for (const a of ACTIONS) for (const row of mdp().P[a]) expect(row.reduce((s, x) => s.add(x)).toString()).toBe('1');
  });

  it('perfect locomotion (q = 0) is deterministic', () => {
    const perfect = buildGridMdp(gridSpec(NOTES_GRID, 0));
    expect(perfect.P.up[st(10)][st(6)].toString()).toBe('1');
  });

  it('a living reward applies to every non-terminal state (L6-O5)', () => {
    const living = buildGridMdp(gridSpec(NOTES_GRID, '1/10', '-1/25'));
    expect(living.R[st(1)].toString()).toBe('-1/25');
    expect(living.R[st(4)].toString()).toBe('1');
  });

  it('rejects a slip probability above 1/2 and a start on a wall', () => {
    expectRealThrow(() => buildGridMdp(gridSpec(NOTES_GRID, '3/5')));
    expectRealThrow(() => buildGridMdp({ ...gridSpec(NOTES_GRID), start: [1, 1] }));
  });

  it('the corridor has 3 states', () => {
    expect(buildGridMdp(gridSpec(CORRIDOR)).n).toBe(3);
  });
});

describe('policies and policy matrices (F-M41)', () => {
  it('uniform and seeded random policies', () => {
    expect(uniformPolicy(mdp(), 'left')).toEqual(new Array(11).fill('left'));
    const r = randomPolicy(mdp(), 7);
    expect(r).toHaveLength(11);
    expect(r.every((a) => ACTIONS.includes(a))).toBe(true);
    expect(randomPolicy(mdp(), 7)).toEqual(r);
  });

  it('P_π has rows indexed by the current state; terminal rows are self-loops', () => {
    const P = policyMatrix(mdp(), uniformPolicy(mdp(), 'up'));
    expect(matrixToStrings(P)[st(10)]).toEqual(matrixToStrings(mdp().P.up)[st(10)]);
    expect(P[st(4)][st(4)].toString()).toBe('1');
    expect(P[st(4)].filter((x) => !x.isZero())).toHaveLength(1);
  });

  it('T_π = P_πᵀ is column-stochastic (the Lesson 5 convention)', () => {
    const pi = uniformPolicy(mdp(), 'right');
    expect(matrixToStrings(policyTransition(mdp(), pi))).toEqual(matrixToStrings(transpose(policyMatrix(mdp(), pi))));
  });
});
