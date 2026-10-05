import { floatModel } from './bellman';
import { ACTIONS, type Action, type Mdp, type Policy } from './mdp';
import { mulberry32, sampleIndex } from './random';
import { Rational } from './rational';

/** Episode k's seed: distinct for every k, and the same every time for a given (seed, k). */
export const episodeSeed = (seed: number, k: number) => (seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;

/**
 * One recorded step (s, a, s′, r): r = R(s′), the reward observed on arriving
 * at s′, so the reward of a terminal state is seen even though no action is
 * taken there.
 */
export interface Transition {
  s: number;
  a: Action;
  next: number;
  r: number;
}

export interface Episode {
  /** s₀, s₁, …: the states visited, starting with the start state. */
  states: number[];
  steps: Transition[];
  /** R(s₀) + γR(s₁) + γ²R(s₂) + ⋯ over the episode. */
  discountedReturn: number;
  /** The terminal state reached, or null when the step limit came first. */
  endedAt: number | null;
}

/**
 * F-M45: one seeded episode under a policy. It ends on reaching a terminal
 * state (whose reward is collected) or after `maxSteps` moves.
 */
export function rollout(mdp: Mdp, policy: Policy, start: number, gamma: Rational, seed: number, maxSteps = 200): Episode {
  const rng = mulberry32(seed);
  const P = floatModel(mdp);
  const g = gamma.toNumber();
  const isTerminal = new Set(mdp.terminals);
  const states = [start];
  const steps: Transition[] = [];
  let s = start;
  let discountedReturn = mdp.R[start].toNumber();
  let discount = 1;
  for (let k = 0; k < maxSteps && !isTerminal.has(s); k++) {
    const a = policy[s];
    const next = sampleIndex(P[a][s], rng);
    const r = mdp.R[next].toNumber();
    discount *= g;
    discountedReturn += discount * r;
    steps.push({ s, a, next, r });
    states.push(next);
    s = next;
  }
  return { states, steps, discountedReturn, endedAt: isTerminal.has(s) ? s : null };
}

/** L6-G6: a fixed sequence of actions (e.g. ↑ ↑ →), with slips drawn from a seed; stops early at a terminal state. */
export function followActions(mdp: Mdp, start: number, actions: readonly Action[], seed: number): number[] {
  const rng = mulberry32(seed);
  const P = floatModel(mdp);
  const isTerminal = new Set(mdp.terminals);
  const states = [start];
  let s = start;
  for (const a of actions) {
    if (isTerminal.has(s)) break;
    s = sampleIndex(P[a][s], rng);
    states.push(s);
  }
  return states;
}

export interface RolloutSummary {
  episodes: number;
  /** Monte Carlo estimate of V^π(start) (L6-B2). */
  meanReturn: number;
  /** Running mean after each episode, for the convergence chart. */
  runningMean: number[];
  /** endCounts[s] = episodes that ended at terminal state s (L6-W2); the rest hit the step limit. */
  endCounts: Record<number, number>;
}

/** F-M45: many seeded episodes (episode k uses a seed derived from `seed` and k). */
export function rollouts(mdp: Mdp, policy: Policy, start: number, gamma: Rational, count: number, seed: number, maxSteps = 200): RolloutSummary {
  const runningMean: number[] = [];
  const endCounts: Record<number, number> = {};
  let total = 0;
  for (let k = 0; k < count; k++) {
    const e = rollout(mdp, policy, start, gamma, episodeSeed(seed, k), maxSteps);
    total += e.discountedReturn;
    runningMean.push(total / (k + 1));
    if (e.endedAt !== null) endCounts[e.endedAt] = (endCounts[e.endedAt] ?? 0) + 1;
  }
  return { episodes: count, meanReturn: count > 0 ? total / count : 0, runningMean, endCounts };
}

/**
 * L6-L1: experience from seeded episodes with an exploration policy (random
 * actions when null), starting at the MDP's start state, until `steps`
 * transitions are recorded.
 */
export function collectExperience(mdp: Mdp, explore: Policy | null, steps: number, seed: number): Transition[] {
  const rng = mulberry32(seed);
  const P = floatModel(mdp);
  const isTerminal = new Set(mdp.terminals);
  const out: Transition[] = [];
  let s = mdp.start;
  while (out.length < steps) {
    // Reaching a terminal ends the episode; the next one starts again at the start state.
    if (isTerminal.has(s)) {
      s = mdp.start;
      if (isTerminal.has(s)) break;
      continue;
    }
    const a = explore ? explore[s] : ACTIONS[Math.floor(rng() * ACTIONS.length)];
    const next = sampleIndex(P[a][s], rng);
    out.push({ s, a, next, r: mdp.R[next].toNumber() });
    s = next;
  }
  return out;
}

export interface ModelEstimate {
  /** P̂[a][s][s′]; a row is null when action a was never taken in s (L5-ES6). */
  P: Record<Action, (Rational[] | null)[]>;
  /** tried[s][k] = times ACTIONS[k] was taken in s. */
  tried: number[][];
  /** R̂(s): the average reward observed on arriving at s; null when s was never reached (often the start state). */
  R: (Rational | null)[];
}

/** F-M46: count (s, a, s′) per action with the Lesson 5 estimator, and average the rewards. */
export function estimateModel(n: number, experience: readonly Transition[]): ModelEstimate {
  const counts = Object.fromEntries(ACTIONS.map((a) => [a, Array.from({ length: n }, () => new Array<number>(n).fill(0))])) as Record<Action, number[][]>;
  const tried = Array.from({ length: n }, () => new Array<number>(ACTIONS.length).fill(0));
  const rewardSum = new Array<Rational>(n).fill(Rational.ZERO);
  const arrivals = new Array<number>(n).fill(0);
  for (const { s, a, next, r } of experience) {
    counts[a][s][next]++;
    tried[s][ACTIONS.indexOf(a)]++;
    rewardSum[next] = rewardSum[next].add(Rational.fromNumber(r));
    arrivals[next]++;
  }
  // The notes' formula, the same maximum likelihood estimate as Lesson 5: times a in s led to s′, over times a was taken in s.
  const P = Object.fromEntries(
    ACTIONS.map((a, k) => [a, counts[a].map((row, s) => (tried[s][k] === 0 ? null : row.map((c) => Rational.of(c, tried[s][k]))))]),
  ) as Record<Action, (Rational[] | null)[]>;
  const R = rewardSum.map((sum, s) => (arrivals[s] === 0 ? null : sum.div(Rational.of(arrivals[s]))));
  return { P, tried, R };
}

export interface QLearningResult {
  /** Q[s][k] for ACTIONS[k], floats. */
  Q: number[][];
  /** After each episode, max |Q − reference| when a reference Q* is given (L6-Q5). */
  distances: number[];
}

/** F-M47 (optional): tabular Q-learning with ε-greedy exploration from a seed. */
export function qLearning(
  mdp: Mdp,
  gamma: Rational,
  options: { episodes: number; alpha: number; epsilon: number; seed: number; reference?: number[][] },
): QLearningResult {
  const { episodes, alpha, epsilon, seed, reference } = options;
  const rng = mulberry32(seed);
  const P = floatModel(mdp);
  const g = gamma.toNumber();
  const R = mdp.R.map((r) => r.toNumber());
  const isTerminal = new Set(mdp.terminals);
  const Q = mdp.states.map(() => new Array<number>(ACTIONS.length).fill(0));
  const greedy = (s: number) => Q[s].reduce((best, q, k) => (q > Q[s][best] ? k : best), 0);
  const distances: number[] = [];
  for (let ep = 0; ep < episodes; ep++) {
    let s = mdp.start;
    for (let step = 0; step < 200 && !isTerminal.has(s); step++) {
      const k = rng() < epsilon ? Math.floor(rng() * ACTIONS.length) : greedy(s);
      const next = sampleIndex(P[ACTIONS[k]][s], rng);
      // A terminal's value is its reward (the episode ends there).
      const future = isTerminal.has(next) ? R[next] : Math.max(...Q[next]);
      Q[s][k] += alpha * (R[s] + g * future - Q[s][k]);
      s = next;
    }
    if (reference) {
      let d = 0;
      for (let st = 0; st < mdp.n; st++) {
        if (isTerminal.has(st)) continue;
        for (let k = 0; k < ACTIONS.length; k++) d = Math.max(d, Math.abs(Q[st][k] - reference[st][k]));
      }
      distances.push(d);
    }
  }
  // Terminal rows hold their reward, the value the updates use for them.
  for (const t of mdp.terminals) Q[t] = Q[t].map(() => R[t]);
  return { Q, distances };
}
