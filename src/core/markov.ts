import { identity, type Matrix, type Vector } from './matrix';
import { matMul, matVec } from './products';
import { mulberry32, sampleIndex } from './random';
import { Rational } from './rational';
import { scaleProbability } from './scaling';
import { nullSpaceBasis } from './subspaces';

const columnOf = (P: Matrix, j: number) => P.map((r) => r[j]);
const floatColumns = (P: Matrix) => P[0].map((_, j) => P.map((r) => r[j].toNumber()));

/*
 * F-M38: Markov chain utilities. States are 0-based here and 1-based on
 * screen. The notes' convention throughout: p_ji is the probability of going
 * from state i to state j, so column i holds state i's outgoing probabilities
 * and x(t + 1) = P x(t).
 */

export interface ColumnCheck {
  sum: Rational;
  sumsToOne: boolean;
  /** Rows whose entry is below 0 or above 1. */
  outOfRange: number[];
}

export interface StochasticCheck {
  /** Square, every entry in [0, 1], every column summing to 1 (L5-MC4). */
  valid: boolean;
  columns: ColumnCheck[];
}

/** L5-MC4 */
export function checkStochastic(P: Matrix): StochasticCheck {
  const n = P.length;
  const square = P.every((r) => r.length === n);
  const columns = (P[0] ?? []).map((_, j) => {
    const col = columnOf(P, j);
    const sum = col.reduce((acc, x) => acc.add(x), Rational.ZERO);
    const outOfRange = col.flatMap((x, i) => (x.isNegative() || x.cmp(Rational.ONE) > 0 ? [i] : []));
    return { sum, sumsToOne: sum.equals(Rational.ONE), outOfRange };
  });
  return { valid: square && n > 0 && columns.every((c) => c.sumsToOne && c.outOfRange.length === 0), columns };
}

/** L5-MC4 "normalize this column": divide column j by its sum. Throws when the sum is 0. */
export function normalizeColumn(P: Matrix, j: number): Matrix {
  const sum = columnOf(P, j).reduce((acc, x) => acc.add(x), Rational.ZERO);
  if (sum.isZero()) throw new RangeError(`Column ${j + 1} sums to 0, so it cannot be normalized`);
  return P.map((r) => r.map((x, k) => (k === j ? x.div(sum) : x)));
}

/** x(t + 1) = P x(t). */
export function stepDistribution(P: Matrix, x: Vector): Vector {
  return matVec(P, x);
}

/** x(0) … x(t), exact. */
export function evolve(P: Matrix, x0: Vector, t: number): Vector[] {
  const xs = [x0];
  for (let k = 0; k < t; k++) xs.push(matVec(P, xs[k]));
  return xs;
}

/** Pᵏ by repeated multiplication (k ≥ 0; P⁰ = I). */
export function matrixPower(P: Matrix, k: number): Matrix {
  let M = identity(P.length);
  for (let i = 0; i < k; i++) M = matMul(M, P);
  return M;
}

/**
 * L5-ES1: a path of `length` states starting at `start`, each next state
 * drawn from the current state's column of P with a seeded generator.
 */
export function simulatePath(P: Matrix, start: number, length: number, seed: number): number[] {
  const cols = floatColumns(P);
  const rng = mulberry32(seed);
  const path = [start];
  for (let k = 1; k < length; k++) path.push(sampleIndex(cols[path[k - 1]], rng));
  return path.slice(0, Math.max(0, length));
}

/**
 * L5-EV3: N independent surfers. Starting states are drawn from x₀ and each
 * surfer then moves `steps` times. counts[t][i] = surfers in state i at time t.
 */
export function simulateSurfers(P: Matrix, x0: Vector, surfers: number, steps: number, seed: number): number[][] {
  const cols = floatColumns(P);
  const rng = mulberry32(seed);
  const n = P.length;
  const start = x0.map((x) => Math.max(0, x.toNumber()));
  let at = Array.from({ length: surfers }, () => sampleIndex(start, rng));
  const tally = (states: number[]) => {
    const c = new Array<number>(n).fill(0);
    for (const s of states) c[s]++;
    return c;
  };
  const counts = [tally(at)];
  for (let t = 0; t < steps; t++) {
    at = at.map((s) => sampleIndex(cols[s], rng));
    counts.push(tally(at));
  }
  return counts;
}

export interface TransitionCounts {
  /** counts[j][i] = N(i → j), laid out like P: rows "to", columns "from". */
  counts: number[][];
  /** leaving[i] = N(i → anything): visits to i that have a next state (L5-ES3). */
  leaving: number[];
}

/** L5-ES2 */
export function countTransitions(sequence: readonly number[], n: number): TransitionCounts {
  const counts = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const leaving = new Array<number>(n).fill(0);
  for (let k = 0; k + 1 < sequence.length; k++) {
    counts[sequence[k + 1]][sequence[k]]++;
    leaving[sequence[k]]++;
  }
  return { counts, leaving };
}

export interface TransitionEstimate extends TransitionCounts {
  /** p̂_ji = N(i → j) / N(i → anything); a column is null where state i is never left (L5-ES6). */
  estimate: (Rational | null)[][];
  undefinedColumns: number[];
}

/** L5-ES3: the maximum likelihood estimate of P (notes §5.2). */
export function estimateTransition(sequence: readonly number[], n: number): TransitionEstimate {
  const { counts, leaving } = countTransitions(sequence, n);
  const estimate = counts.map((row) => row.map((c, i) => (leaving[i] === 0 ? null : Rational.of(c, leaving[i]))));
  const undefinedColumns = leaving.flatMap((l, i) => (l === 0 ? [i] : []));
  return { counts, leaving, estimate, undefinedColumns };
}

/**
 * L5-ES1: read a pasted sequence of 1-based states. Spaces and commas are
 * optional separators; without them each digit is one state. Returns 0-based
 * states and every token that is not a state 1 … n.
 */
export function parseSequence(text: string, n: number): { states: number[]; invalid: string[] } {
  const states: number[] = [];
  const invalid: string[] = [];
  const add = (token: string) => {
    const k = Number(token);
    if (/^\d+$/.test(token) && k >= 1 && k <= n) states.push(k - 1);
    else invalid.push(token);
  };
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    // Without separators, each digit is one state (n ≤ 4, so states are single digits).
    if (/^\d+$/.test(token) && n <= 9) [...token].forEach(add);
    else add(token);
  }
  return { states, invalid };
}

export type Regularity =
  /** The smallest k with every entry of Pᵏ positive, and that Pᵏ. */
  | { regular: true; k: number; power: Matrix }
  /** No such k up to (n − 1)² + 1 (Wielandt's bound), so none exists. */
  | { regular: false; bound: number };

/** L5-PF2 */
export function regularity(P: Matrix): Regularity {
  const n = P.length;
  const bound = (n - 1) ** 2 + 1;
  let power = P;
  for (let k = 1; k <= bound; k++) {
    if (k > 1) power = matMul(power, P);
    if (power.every((r) => r.every((x) => !x.isZero() && !x.isNegative()))) return { regular: true, k, power };
  }
  return { regular: false, bound };
}

export type Stationary =
  | { kind: 'unique'; x: Vector }
  /** N(P − I) has dimension > 1 (e.g. two absorbing states): one probability vector per basis vector. */
  | { kind: 'multiple'; basis: Vector[] };

/** L5-PF3: solve (P − I)x = 0 with entries summing to 1, exactly (Lesson 1 elimination). */
export function stationaryDistribution(P: Matrix): Stationary {
  const basis = nullSpaceBasis(P.map((r, i) => r.map((x, j) => (i === j ? x.sub(Rational.ONE) : x))));
  if (basis.length === 0) throw new RangeError('P − I is invertible, so Px = x has only x = 0: P is not a transition matrix');
  const scaled = basis.map((v) => {
    try {
      return scaleProbability(v);
    } catch {
      return v;
    }
  });
  return scaled.length === 1 ? { kind: 'unique', x: scaled[0] } : { kind: 'multiple', basis: scaled };
}
