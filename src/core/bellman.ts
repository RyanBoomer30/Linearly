import { EXACT, type AnyMatrix, type AnyVector, type Precision } from './float';
import { solveFloat } from './floatLu';
import { lu, type LuResult } from './lu';
import { toFloatMatrix, toFloatVector, type Matrix } from './matrix';
import { ACTIONS, policyMatrix, uniformPolicy, type Action, type Mdp, type Policy, type TerminalMode } from './mdp';
import { Rational } from './rational';
import { backSub, forwardSub } from './substitution';

/** Exact Bellman systems up to this many states (F-M42); floating point beyond. */
export const EXACT_STATE_LIMIT = 12;

/** Float copies of each Pₐ, for the iterations that run in floating point. */
const floatCache = new WeakMap<Mdp, Record<Action, number[][]>>();
export function floatModel(mdp: Mdp): Record<Action, number[][]> {
  let f = floatCache.get(mdp);
  if (!f) {
    f = Object.fromEntries(ACTIONS.map((a) => [a, toFloatMatrix(mdp.P[a])])) as Record<Action, number[][]>;
    floatCache.set(mdp, f);
  }
  return f;
}

/** Σ row[t]·V[t], exact when V is. */
function dotRow(row: Rational[], V: AnyVector): Rational | number {
  if (V.length > 0 && typeof V[0] === 'number') return row.reduce((acc, p, t) => acc + p.toNumber() * (V[t] as number), 0);
  return row.reduce((acc, p, t) => acc.add(p.mul(V[t] as Rational)), Rational.ZERO);
}

/** Floats closer than this (relative) count as a tie, so rounding does not flip an action. */
const TIE = 1e-9;
const asNum = (x: Rational | number) => (typeof x === 'number' ? x : x.toNumber());
function same(a: Rational | number, b: Rational | number): boolean {
  if (typeof a !== 'number' && typeof b !== 'number') return a.equals(b);
  return Math.abs(asNum(a) - asNum(b)) <= TIE * Math.max(1, Math.abs(asNum(a)), Math.abs(asNum(b)));
}
function greater(a: Rational | number, b: Rational | number): boolean {
  if (typeof a !== 'number' && typeof b !== 'number') return a.cmp(b) > 0;
  return !same(a, b) && asNum(a) > asNum(b);
}

export interface PolicyEvaluation {
  precision: Precision;
  /** V^π, one entry per state. */
  V: AnyVector;
  /**
   * The Bellman system (I − γP_π)V = R. In "terminal" mode a terminal state's
   * row is the equation V(s) = R(s).
   */
  A: AnyMatrix;
  b: AnyVector;
  /** The Lesson 3 LU of A (no pivoting needed: A is strictly diagonally dominant), when exact. */
  lu: LuResult | null;
}

/**
 * F-M42: solve (I − γP_π)V = R with the Lesson 3 LU, exactly when γ and the
 * probabilities are rational and n ≤ 12, in floating point otherwise.
 * Throws when γ ≥ 1 or γ < 0.
 */
export function evaluatePolicy(mdp: Mdp, policy: Policy, gamma: Rational, terminalMode: TerminalMode = 'terminal'): PolicyEvaluation {
  if (gamma.isNegative() || gamma.cmp(Rational.ONE) >= 0) throw new RangeError(`γ must be at least 0 and less than 1; γ = ${gamma.toString()}`);
  const { n } = mdp;
  const Ppi = policyMatrix(mdp, policy);
  const A: Matrix = Ppi.map((row, s) =>
    terminalMode === 'terminal' && mdp.terminals.includes(s)
      ? row.map((_, t) => (t === s ? Rational.ONE : Rational.ZERO))
      : row.map((p, t) => (t === s ? Rational.ONE : Rational.ZERO).sub(gamma.mul(p))),
  );
  const b = [...mdp.R];
  if (n <= EXACT_STATE_LIMIT) {
    // Strictly diagonally dominant (diagonal 1, the rest of each row adds to at most γ), so no row exchanges.
    const factored = lu(A, { pivoting: 'none' });
    const c = forwardSub(factored.L, b).solution!;
    const V = backSub(factored.U, c).solution;
    if (!V) throw new Error('The Bellman system is singular');
    return { precision: EXACT, V, A, b, lu: factored };
  }
  const Af = toFloatMatrix(A);
  const bf = toFloatVector(b);
  return {
    precision: { kind: 'float', reason: `${n} states is more than ${EXACT_STATE_LIMIT}, so the system is solved in floating point` },
    V: solveFloat(Af, bf, 'none'),
    A: Af,
    b: bf,
    lu: null,
  };
}

/** Σ Pₛₐ(s′)V(s′) for each action: the expected next value the notes maximize (L6-O2). */
export function expectedNextValues(mdp: Mdp, V: AnyVector, s: number): Record<Action, Rational | number> {
  return Object.fromEntries(ACTIONS.map((a) => [a, dotRow(mdp.P[a][s], V)])) as Record<Action, Rational | number>;
}

/** F-M43: Q(s, a) = R(s) + γ Σ Pₛₐ(s′)V(s′), rows are states, columns follow ACTIONS. */
export function actionValues(mdp: Mdp, V: AnyVector, gamma: Rational): (Rational | number)[][] {
  return mdp.states.map((_, s) => {
    const next = expectedNextValues(mdp, V, s);
    return ACTIONS.map((a) => {
      const x = next[a];
      return typeof x === 'number' ? mdp.R[s].toNumber() + gamma.toNumber() * x : mdp.R[s].add(gamma.mul(x));
    });
  });
}

/**
 * F-M43: π′(s) = argmax over a of Σ Pₛₐ(s′)V(s′). Keeps the current action on
 * a tie, so policy iteration always stops; otherwise the first best action in
 * the order ↑ → ↓ ←. Terminal states keep their entry. `changed` lists the
 * states whose action changed.
 */
export function improvePolicy(mdp: Mdp, policy: Policy, V: AnyVector): { policy: Policy; changed: number[] } {
  const changed: number[] = [];
  const next = policy.map((current, s) => {
    if (mdp.terminals.includes(s)) return current;
    const values = expectedNextValues(mdp, V, s);
    const best = ACTIONS.reduce((m, a) => (greater(values[a], m) ? values[a] : m), values[ACTIONS[0]]);
    // Keep the current action on a tie, so policy iteration always stops.
    if (same(values[current], best)) return current;
    changed.push(s);
    return ACTIONS.find((a) => same(values[a], best))!;
  });
  return { policy: next, changed };
}

export type PolicyIterationStep =
  | { kind: 'evaluate'; iteration: number; policy: Policy; evaluation: PolicyEvaluation }
  | { kind: 'improve'; iteration: number; policy: Policy; changed: number[] };

export interface PolicyIterationResult {
  policy: Policy;
  V: AnyVector;
  precision: Precision;
  /** F-M44: evaluate, improve, evaluate, …, ending with the improvement that changes nothing. */
  steps: PolicyIterationStep[];
  evaluations: number;
  /** Improvements that changed the policy. */
  changes: number;
}

/** F-M44: policy iteration from a starting policy (notes §6.3). */
export function policyIteration(
  mdp: Mdp,
  start: Policy,
  gamma: Rational,
  terminalMode: TerminalMode = 'terminal',
  maxIterations = 100,
): PolicyIterationResult {
  const steps: PolicyIterationStep[] = [];
  let policy = [...start];
  let changes = 0;
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const evaluation = evaluatePolicy(mdp, policy, gamma, terminalMode);
    steps.push({ kind: 'evaluate', iteration, policy, evaluation });
    const improved = improvePolicy(mdp, policy, evaluation.V);
    steps.push({ kind: 'improve', iteration, policy: improved.policy, changed: improved.changed });
    if (improved.changed.length === 0) {
      return { policy, V: evaluation.V, precision: evaluation.precision, steps, evaluations: iteration, changes };
    }
    policy = improved.policy;
    changes++;
  }
  throw new Error(`Policy iteration did not stop within ${maxIterations} iterations`);
}

export interface ValueIterationStep {
  /** Sweep k: V₍ₖ₎. */
  k: number;
  V: number[];
  /** max |V₍ₖ₎ − V₍ₖ₋₁₎|; Infinity for k = 0. */
  delta: number;
}

export interface ValueIterationResult {
  V: number[];
  policy: Policy;
  steps: ValueIterationStep[];
  converged: boolean;
}

/**
 * F-M44: V₍ₖ₊₁₎(s) = R(s) + γ max over a of Σ Pₛₐ(s′)V₍ₖ₎(s′) in floating
 * point from V₀ = 0, until the change between sweeps is below `tolerance`.
 * The policy is the greedy one for the final V (same tie rule as F-M43).
 */
export function valueIteration(
  mdp: Mdp,
  gamma: Rational,
  options?: { tolerance?: number; maxSweeps?: number; terminalMode?: TerminalMode },
): ValueIterationResult {
  const tolerance = options?.tolerance ?? 1e-10;
  const maxSweeps = options?.maxSweeps ?? 2000;
  const terminalMode = options?.terminalMode ?? 'terminal';
  const g = gamma.toNumber();
  const R = mdp.R.map((r) => r.toNumber());
  const P = floatModel(mdp);
  const isTerminal = new Set(mdp.terminals);
  let V = new Array<number>(mdp.n).fill(0);
  const steps: ValueIterationStep[] = [{ k: 0, V, delta: Infinity }];
  let converged = false;
  for (let k = 1; k <= maxSweeps; k++) {
    const next = V.map((_, s) => {
      if (isTerminal.has(s)) return terminalMode === 'terminal' ? R[s] : R[s] + g * V[s];
      return R[s] + g * Math.max(...ACTIONS.map((a) => P[a][s].reduce((acc, p, t) => acc + p * V[t], 0)));
    });
    const delta = Math.max(...next.map((v, s) => Math.abs(v - V[s])));
    V = next;
    steps.push({ k, V, delta });
    if (delta < tolerance) {
      converged = true;
      break;
    }
  }
  // Greedy policy for the final V, with the same tie rule (ties go to the first action in ↑ → ↓ ← order).
  const { policy } = improvePolicy(mdp, uniformPolicy(mdp, ACTIONS[0]), V);
  return { V, policy, steps, converged };
}
