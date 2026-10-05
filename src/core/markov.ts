import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';

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
  return notImplemented('checkStochastic');
}

/** L5-MC4 "normalize this column": divide column j by its sum. Throws when the sum is 0. */
export function normalizeColumn(P: Matrix, j: number): Matrix {
  return notImplemented('normalizeColumn');
}

/** x(t + 1) = P x(t). */
export function stepDistribution(P: Matrix, x: Vector): Vector {
  return notImplemented('stepDistribution');
}

/** x(0) … x(t), exact. */
export function evolve(P: Matrix, x0: Vector, t: number): Vector[] {
  return notImplemented('evolve');
}

/** Pᵏ by repeated multiplication (k ≥ 0; P⁰ = I). */
export function matrixPower(P: Matrix, k: number): Matrix {
  return notImplemented('matrixPower');
}

/**
 * L5-ES1: a path of `length` states starting at `start`, each next state
 * drawn from the current state's column of P with a seeded generator.
 */
export function simulatePath(P: Matrix, start: number, length: number, seed: number): number[] {
  return notImplemented('simulatePath');
}

/**
 * L5-EV3: N independent surfers. Starting states are drawn from x₀ and each
 * surfer then moves `steps` times. counts[t][i] = surfers in state i at time t.
 */
export function simulateSurfers(P: Matrix, x0: Vector, surfers: number, steps: number, seed: number): number[][] {
  return notImplemented('simulateSurfers');
}

export interface TransitionCounts {
  /** counts[j][i] = N(i → j), laid out like P: rows "to", columns "from". */
  counts: number[][];
  /** leaving[i] = N(i → anything): visits to i that have a next state (L5-ES3). */
  leaving: number[];
}

/** L5-ES2 */
export function countTransitions(sequence: readonly number[], n: number): TransitionCounts {
  return notImplemented('countTransitions');
}

export interface TransitionEstimate extends TransitionCounts {
  /** p̂_ji = N(i → j) / N(i → anything); a column is null where state i is never left (L5-ES6). */
  estimate: (Rational | null)[][];
  undefinedColumns: number[];
}

/** L5-ES3: the maximum likelihood estimate of P (notes §5.2). */
export function estimateTransition(sequence: readonly number[], n: number): TransitionEstimate {
  return notImplemented('estimateTransition');
}

/**
 * L5-ES1: read a pasted sequence of 1-based states. Spaces and commas are
 * optional separators; without them each digit is one state. Returns 0-based
 * states and every token that is not a state 1 … n.
 */
export function parseSequence(text: string, n: number): { states: number[]; invalid: string[] } {
  return notImplemented('parseSequence');
}

export type Regularity =
  /** The smallest k with every entry of Pᵏ positive, and that Pᵏ. */
  | { regular: true; k: number; power: Matrix }
  /** No such k up to (n − 1)² + 1 (Wielandt's bound), so none exists. */
  | { regular: false; bound: number };

/** L5-PF2 */
export function regularity(P: Matrix): Regularity {
  return notImplemented('regularity');
}

export type Stationary =
  | { kind: 'unique'; x: Vector }
  /** N(P − I) has dimension > 1 (e.g. two absorbing states): one probability vector per basis vector. */
  | { kind: 'multiple'; basis: Vector[] };

/** L5-PF3: solve (P − I)x = 0 with entries summing to 1, exactly (Lesson 1 elimination). */
export function stationaryDistribution(P: Matrix): Stationary {
  return notImplemented('stationaryDistribution');
}
