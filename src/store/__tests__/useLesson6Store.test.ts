import { beforeEach, describe, expect, it } from 'vitest';
import { buildGridMdp, uniformPolicy } from '../../core/mdp';
import { gridSpec, NOTES_GRID, st } from '../../core/__tests__/fixtures';
import { useLesson6Store } from '../useLesson6Store';
import { parseLesson6 } from '../useLesson6System';

const s = () => useLesson6Store.getState();
const parsed = () => parseLesson6(s());

beforeEach(() => {
  useLesson6Store.setState(useLesson6Store.getInitialState(), true);
});

describe('Lesson 6 store (§11)', () => {
  it("opens on the notes' grid: 3 × 4, wall at (1, 1), robot at state 10, q = 1/10, γ = 9/10, terminal mode", () => {
    expect(s().presetId).toBe('notesGrid');
    expect([s().rows, s().cols]).toEqual([3, 4]);
    expect(s().walls).toEqual([[1, 1]]);
    expect(s().start).toEqual([2, 2]);
    expect([s().slip, s().gamma]).toEqual([10, 90]);
    expect(s().terminalMode).toBe('terminal');
    expect(s().qAnswerRevealed).toBe(false);
  });

  it('changing γ or q never resets the painted policy (§11)', () => {
    s().setPolicyCell([2, 2], 'left');
    s().setGamma(50);
    s().setSlip(0);
    expect(s().policyCells[2][2]).toBe('left');
  });

  it('perfect locomotion toggles q to 0 and back (L6-G3)', () => {
    s().setPerfect(true);
    expect(s().slip).toBe(0);
    s().setPerfect(false);
    expect(s().slip).toBe(10);
  });

  it('cycling an arrow goes ↑ → ↓ ← (L6-B1)', () => {
    s().fillPolicy('up');
    s().cyclePolicyCell([0, 0]);
    expect(s().policyCells[0][0]).toBe('right');
    s().cyclePolicyCell([0, 0]);
    s().cyclePolicyCell([0, 0]);
    s().cyclePolicyCell([0, 0]);
    expect(s().policyCells[0][0]).toBe('up');
  });

  it('a click does what the edit mode says', () => {
    s().setEditMode('policy');
    s().fillPolicy('up');
    s().clickCell([0, 0]);
    expect(s().policyCells[0][0]).toBe('right');
    s().setEditMode('inspect');
    s().clickCell([2, 2]);
    expect(s().selectedCell).toEqual([2, 2]);
    s().setEditMode('walls');
    s().clickCell([2, 0]);
    expect(s().walls).toContainEqual([2, 0]);
  });

  it('walls: not on the start or a terminal; toggling again removes it', () => {
    s().toggleWall([2, 2]);
    expect(s().walls).not.toContainEqual([2, 2]);
    expect(s().notice).toMatch(/start/i);
    s().toggleWall([1, 1]);
    expect(s().walls).toEqual([]);
  });

  it('terminals and start', () => {
    s().toggleTerminal([0, 0]);
    expect(s().terminals).toContainEqual([0, 0]);
    s().toggleTerminal([0, 0]);
    expect(s().terminals).not.toContainEqual([0, 0]);
    s().setStart([2, 0]);
    expect(s().start).toEqual([2, 0]);
    s().setStart([1, 1]);
    expect(s().start).toEqual([2, 0]);
  });

  it('resizing keeps 1–5 and drops what falls outside', () => {
    s().resizeGrid(2, 4);
    expect(s().rows).toBe(2);
    expect(s().policyCells).toHaveLength(2);
    expect(s().terminals).toEqual([
      [0, 3],
      [1, 3],
    ]);
    expect(s().start[0]).toBeLessThan(2);
    s().resizeGrid(6, 4);
    expect(s().rows).toBe(2);
  });

  it('a seeded random policy, and a new seed', () => {
    const before = s().seed;
    s().randomizePolicy();
    const painted = s().policyCells;
    useLesson6Store.setState({ policyCells: useLesson6Store.getInitialState().policyCells });
    s().randomizePolicy();
    expect(s().policyCells).toEqual(painted);
    s().newSeed();
    expect(s().seed).not.toBe(before);
  });

  it('applying a computed policy paints it by state', () => {
    const mdp = buildGridMdp(gridSpec(NOTES_GRID));
    s().applyPolicy(mdp, uniformPolicy(mdp, 'down'));
    expect(s().policyCells[2][2]).toBe('down');
    expect(parsed().policy[st(10)]).toBe('down');
  });

  it('presets load the grid and policy', () => {
    s().loadPreset('corridor');
    expect([s().rows, s().cols]).toEqual([1, 3]);
    expect(s().policyCells).toEqual([['right', 'right', 'right']]);
  });
});

describe('parseLesson6', () => {
  it('builds the MDP, γ and the policy in state order', () => {
    const p = parsed();
    expect(p.mdp.n).toBe(11);
    expect(p.gamma.toString()).toBe('9/10');
    expect(p.spec.slip.toString()).toBe('1/10');
    expect(p.policy).toHaveLength(11);
    expect(p.invalid).toEqual({ rewards: [], livingReward: false });
  });

  it('flags rewards that do not parse and reads them as 0', () => {
    s().setRewardCell([0, 3], 'abc');
    const p = parsed();
    expect(p.invalid.rewards).toEqual(['0,3']);
    expect(p.mdp.R[st(4)].toString()).toBe('0');
  });
});
