import { transpose, zeros, type Matrix, type Vector } from './matrix';
import { mulberry32 } from './random';
import { Rational } from './rational';

/*
 * F-M40, F-M41: Markov decision processes on a grid. States are 0-based here
 * and numbered 1, 2, … on screen, row by row, skipping walls (as in the notes:
 * 1–4 on top, 5–7 in the middle around the wall, 8–11 at the bottom).
 */

/** The four actions, in the tie-breaking order of F-M43: ↑ → ↓ ←. */
export type Action = 'up' | 'right' | 'down' | 'left';
export const ACTIONS: readonly Action[] = ['up', 'right', 'down', 'left'];
export const ACTION_ARROWS: Record<Action, string> = { up: '↑', right: '→', down: '↓', left: '←' };

/** Row and column change of each move. */
const STEP: Record<Action, [number, number]> = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
/** The two directions a move can slip to: perpendicular to it. */
const SIDES: Record<Action, [Action, Action]> = { up: ['left', 'right'], down: ['left', 'right'], left: ['up', 'down'], right: ['up', 'down'] };
const HALF = Rational.of(1, 2);
const key = ([r, c]: GridCell) => `${r},${c}`;

/** [row, col], 0-based. */
export type GridCell = [number, number];

/** L6-G7: what happens at +1 / −1. The notes don't say. */
export type TerminalMode =
  /** The episode ends there, so V(s) = R(s) (default). */
  | 'terminal'
  /** The robot stays and keeps collecting the reward. */
  | 'absorbing';

/** A gridworld as the student edits it (L6-G1), up to 5 × 5. */
export interface GridSpec {
  rows: number;
  cols: number;
  walls: GridCell[];
  /** Nonzero rewards; every other state gets `livingReward` (0 unless set, L6-O5). */
  rewards: { cell: GridCell; reward: Rational }[];
  terminals: GridCell[];
  start: GridCell;
  /** L6-G3: probability q of slipping to each side; the intended move has 1 − 2q. */
  slip: Rational;
  livingReward?: Rational;
}

export interface MdpState {
  row: number;
  col: number;
  /** 1-based number shown on the grid. */
  label: number;
}

export interface Mdp {
  n: number;
  /** Present for grid MDPs. */
  grid: { rows: number; cols: number } | null;
  states: MdpState[];
  /** F-M41 convention: P[a][s][s′] = Pₛₐ(s′), rows are the current state. */
  P: Record<Action, Matrix>;
  R: Vector;
  terminals: number[];
  start: number;
}

/** π: S → A, one action per state (terminal entries are ignored). */
export type Policy = Action[];

/**
 * F-M40: the MDP of a gridworld. Moving into a wall or off the grid leaves
 * the robot where it is; the intended direction has probability 1 − 2q and
 * each perpendicular direction q. Throws on an invalid grid (no states, a
 * start on a wall, q > 1/2).
 */
export function buildGridMdp(spec: GridSpec): Mdp {
  const { rows, cols, slip } = spec;
  if (rows < 1 || cols < 1 || rows > 5 || cols > 5) throw new RangeError(`Grids are 1–5 cells in each direction; this one is ${rows} × ${cols}`);
  if (slip.isNegative() || slip.cmp(HALF) > 0) throw new RangeError(`The slip probability q must be between 0 and 1/2 (the intended move gets 1 − 2q); q = ${slip.toString()}`);
  const walls = new Set(spec.walls.map(key));
  const states: MdpState[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!walls.has(key([r, c]))) states.push({ row: r, col: c, label: states.length + 1 });
  if (states.length === 0) throw new RangeError('Every cell is a wall, so there are no states');
  const index = new Map(states.map((st, i) => [key([st.row, st.col]), i]));
  const start = index.get(key(spec.start));
  if (start === undefined) throw new RangeError('The start must be a state, not a wall or a cell off the grid');

  // Moving into a wall or off the grid leaves the robot where it is.
  const move = (s: number, a: Action) => {
    const [dr, dc] = STEP[a];
    return index.get(key([states[s].row + dr, states[s].col + dc])) ?? s;
  };
  const n = states.length;
  const intended = Rational.ONE.sub(slip.mul(Rational.of(2)));
  const P = Object.fromEntries(
    ACTIONS.map((a) => {
      const M = zeros(n, n);
      const [left, right] = SIDES[a];
      for (let s = 0; s < n; s++) {
        for (const [dir, p] of [[a, intended], [left, slip], [right, slip]] as [Action, Rational][]) {
          const t = move(s, dir);
          M[s][t] = M[s][t].add(p);
        }
      }
      return [a, M];
    }),
  ) as Record<Action, Matrix>;

  const terminals = [...new Set(spec.terminals.map((c) => index.get(key(c))).filter((i): i is number => i !== undefined))].sort((x, y) => x - y);
  // Terminal states without their own reward get 0, not the living reward.
  const living = spec.livingReward ?? Rational.ZERO;
  const R = states.map((_, s) => (terminals.includes(s) ? Rational.ZERO : living));
  for (const { cell, reward } of spec.rewards) {
    const s = index.get(key(cell));
    if (s !== undefined) R[s] = reward;
  }
  return { n, grid: { rows, cols }, states, P, R, terminals, start };
}

/** The state at a cell, or null for a wall or a cell off the grid. */
export function stateAt(mdp: Mdp, cell: GridCell): number | null {
  const s = mdp.states.findIndex((st) => st.row === cell[0] && st.col === cell[1]);
  return s >= 0 ? s : null;
}

/** F-M40: every Pₛₐ is a probability distribution (entries in [0, 1], summing to 1). */
export function validateMdp(mdp: Mdp): { valid: boolean; problems: string[] } {
  const problems: string[] = [];
  for (const a of ACTIONS) {
    mdp.P[a].forEach((row, s) => {
      const sum = row.reduce((acc, x) => acc.add(x), Rational.ZERO);
      if (row.some((x) => x.isNegative() || x.cmp(Rational.ONE) > 0)) problems.push(`P for ${ACTION_ARROWS[a]} in state ${s + 1} has entries outside [0, 1]`);
      if (!sum.equals(Rational.ONE)) problems.push(`P for ${ACTION_ARROWS[a]} in state ${s + 1} sums to ${sum.toString()}, not 1`);
    });
  }
  return { valid: problems.length === 0, problems };
}

/** The same action in every state (L6-B1 "fill"). */
export function uniformPolicy(mdp: Mdp, action: Action): Policy {
  return new Array<Action>(mdp.n).fill(action);
}

/** L6-PI3: a policy drawn uniformly at random from a seed (the notes start from a random policy). */
export function randomPolicy(mdp: Mdp, seed: number): Policy {
  const rng = mulberry32(seed);
  return mdp.states.map(() => ACTIONS[Math.floor(rng() * ACTIONS.length)]);
}

/**
 * F-M41: P_π, row s = Pₛ,π₍ₛ₎ (rows are the current state). A terminal
 * state's row is a self-loop, so the robot stays once it arrives.
 */
export function policyMatrix(mdp: Mdp, policy: Policy): Matrix {
  return mdp.states.map((_, s) =>
    mdp.terminals.includes(s) ? mdp.states.map((__, t) => (t === s ? Rational.ONE : Rational.ZERO)) : [...mdp.P[policy[s]][s]],
  );
}

/** F-M41: T_π = P_πᵀ, the Lesson 5 convention (columns are "from"), so the Markov utilities apply. */
export function policyTransition(mdp: Mdp, policy: Policy): Matrix {
  return transpose(policyMatrix(mdp, policy));
}
