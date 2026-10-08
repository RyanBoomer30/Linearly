/**
 * View-models for the Lesson 6 views: the gridworld MDP, learning the model,
 * the Bellman equation for a policy, where the robot ends up, the optimality
 * equation, policy iteration, and value iteration with Q-values. Exact when γ
 * and the probabilities are rational and the grid has at most 12 states (the
 * notes' grid has 11); floating point otherwise, and every model that shows
 * values reports which (F-D10). The statistics primer (sample mean, variance
 * and covariance, ahead of Lesson 7's covariance matrix) is always exact.
 * Kept pure so they can be unit tested.
 */
import type { ChartFrame } from '../../components/canvas/charts';
import type { Bar } from '../../components/display/BarChart';
import type { GridCellView } from '../../components/diagram/GridWorld';
import { matrixToTex } from '../../components/display/MatrixTex';
import { actionValues, evaluatePolicy, expectedNextValues, policyIteration, valueIteration, type PolicyEvaluation } from '../../core/bellman';
import type { AnyVector, Precision } from '../../core/float';
import { ACTION_ARROWS, ACTIONS, policyMatrix, policyTransition, uniformPolicy, type Action, type GridCell, type Mdp, type Policy, type TerminalMode } from '../../core/mdp';
import { mulberry32, sampleIndex } from '../../core/random';
import { Rational } from '../../core/rational';
import { collectExperience, episodeSeed, estimateModel, followActions, qLearning, rollout, rollouts, type ModelEstimate, type Transition } from '../../core/reinforcement';
import { solve } from '../../core/solve';
import { sampleCovariance, sampleVariance } from '../../core/statistics';
import type { NumberDisplay } from '../../store/useDataStore';
import { COLUMN_COLORS } from '../../theme/colors';

// Helpers -------------------------------------------------------------------------

const asNum = (x: Rational | number) => (typeof x === 'number' ? x : x.toNumber());
const short = (x: number, digits = 4) => String(Number(x.toPrecision(digits)) + 0);
/** Fractions with denominators up to this are written as fractions; longer ones as decimals. */
const READABLE_DEN = 10000n;
/** Grid cells are small: only short fractions fit. */
const CELL_DEN = 100n;

/** Plain text for a value in the chosen display, with a typographic minus. */
function fmt(x: Rational | number, display: NumberDisplay, maxDen = READABLE_DEN): string {
  let text: string;
  if (typeof x === 'number') text = short(x);
  else if (x.isInteger()) text = x.toString();
  else if (display === 'fraction' && x.den <= maxDen) text = x.toString();
  else text = short(x.toNumber());
  return text.replace('-', '−');
}

/** TeX for a value in the chosen display. */
function tex(x: Rational | number, display: NumberDisplay): string {
  if (typeof x === 'number') return short(x);
  if (x.isInteger() || (display === 'fraction' && x.den <= READABLE_DEN)) return x.toTex();
  return short(x.toNumber());
}

const ARROW_TEX: Record<Action, string> = { up: '\\uparrow', right: '\\rightarrow', down: '\\downarrow', left: '\\leftarrow' };
const label = (mdp: Mdp, s: number) => mdp.states[s].label;
const isTerminal = (mdp: Mdp, s: number) => mdp.terminals.includes(s);
/** "+1", "−1": a reward as the notes write it on the grid. */
const rewardText = (r: Rational, display: NumberDisplay) => (r.isNegative() ? fmt(r, display, CELL_DEN) : `+${fmt(r, display, CELL_DEN)}`);
const SERIES_COLORS = COLUMN_COLORS;

/** The most common reward among non-terminal states (0, or the living reward), which the grid leaves unlabeled. */
function backgroundReward(mdp: Mdp): Rational {
  const counts = new Map<string, { r: Rational; k: number }>();
  mdp.R.forEach((r, s) => {
    if (isTerminal(mdp, s)) return;
    const e = counts.get(r.toString()) ?? { r, k: 0 };
    e.k++;
    counts.set(r.toString(), e);
  });
  return [...counts.values()].sort((a, b) => b.k - a.k)[0]?.r ?? Rational.ZERO;
}

/** Index of the largest entry, the first of any ties (the ↑ → ↓ ← order). */
function argmax(values: number[]): number {
  return values.reduce((best, v, k) => (v > values[best] + 1e-12 * Math.max(1, Math.abs(v)) ? k : best), 0);
}

/** Log-axis range around positive values: whole decades. */
function decades(values: number[], floor = 1e-17): { min: number; max: number } {
  const positive = values.filter((v) => v > 0);
  const lo = Math.max(floor, positive.length ? Math.min(...positive) : floor);
  const hi = positive.length ? Math.max(...positive) : 1;
  const min = 10 ** Math.floor(Math.log10(lo));
  const max = 10 ** Math.ceil(Math.log10(hi));
  return { min, max: max > min ? max : min * 10 };
}

const mulberryFor = mulberry32;
const sampleRow = sampleIndex;
const STEP: Record<Action, [number, number]> = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };

/** R(s₀) + γR(s₁) + ⋯ + γᵗR(sₜ), written out in full for t ≤ 2. */
function returnTerms(t: number): string {
  const term = (k: number) => (k === 0 ? 'R(s_0)' : k === 1 ? '\\gamma R(s_1)' : `\\gamma^{${k}} R(s_{${k}})`);
  return t <= 2 ? Array.from({ length: t + 1 }, (_, k) => term(k)).join(' + ') : `${term(0)} + ${term(1)} + \\cdots + ${term(t)}`;
}

/** Where action a would take the robot from s without slipping (it stays put at a wall or the edge). */
function intendedNext(mdp: Mdp, s: number, a: Action): number {
  const [dr, dc] = STEP[a];
  const { row, col } = mdp.states[s];
  const t = mdp.states.findIndex((st) => st.row === row + dr && st.col === col + dc);
  return t >= 0 ? t : s;
}

const differentStates = (mdp: Mdp, a: Policy, b: Policy) => mdp.states.map((_, s) => s).filter((s) => !isTerminal(mdp, s) && a[s] !== b[s]);

/** A step of any Lesson 6 stepper or derivation. */
export interface Lesson6Step {
  description: string;
  tex: string;
}

/** What to draw on the grid besides the MDP itself. */
export interface GridLayers {
  policy?: Policy;
  /** Values on the fixed −1 … +1 scale, one per state. */
  values?: AnyVector;
  /** Q(s, a) per state, ACTIONS order. */
  q?: (Rational | number)[][];
  /** A probability per state (L6-G4, L6-W1). */
  overlay?: number[];
  /** Text for the overlay; the probability in the chosen display when omitted (e.g. estimation errors, L6-L3). */
  overlayLabels?: string[];
  /** States whose arrow changed (L6-PI2, L6-O5). */
  changed?: number[];
  /** Where the robot is drawn; the start state when omitted. */
  robotAt?: number | null;
}

/** F-D12: the grid as cells for <GridWorld>, numbers in the chosen display. Throws for an MDP without a grid. */
export function gridCells(mdp: Mdp, layers: GridLayers, display: NumberDisplay): GridCellView[][] {
  if (!mdp.grid) throw new RangeError('This MDP has no grid to draw');
  const { rows, cols } = mdp.grid;
  const robotAt = layers.robotAt === undefined ? mdp.start : layers.robotAt;
  const background = backgroundReward(mdp);
  const at = new Map(mdp.states.map((st, s) => [`${st.row},${st.col}`, s]));
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col): GridCellView => {
      const s = at.get(`${row},${col}`);
      if (s === undefined) return { row, col, kind: 'wall' };
      const R = mdp.R[s];
      const terminal = isTerminal(mdp, s);
      const showReward = !R.isZero() && (terminal || !R.equals(background));
      const value = layers.values ? asNum(layers.values[s]) : null;
      const q = layers.q && !terminal ? layers.q[s].map(asNum) : null;
      const p = layers.overlay?.[s];
      const overlayLabel = layers.overlayLabels?.[s];
      return {
        row,
        col,
        kind: 'state',
        label: mdp.states[s].label,
        reward: showReward ? rewardText(R, display) : undefined,
        terminal,
        robot: s === robotAt,
        arrow: layers.policy?.[s] ?? null,
        arrowChanged: layers.changed?.includes(s) ?? false,
        value,
        valueLabel: layers.values ? fmt(layers.values[s], display, CELL_DEN) : undefined,
        q: q ? { values: q, labels: layers.q![s].map((x) => fmt(x, 'decimal').replace(/^(−?)0\./, '$1.')), best: argmax(q) } : null,
        overlay: p === undefined || (p === 0 && overlayLabel === undefined) ? null : { p, label: overlayLabel ?? short(p, 3) },
      };
    }),
  );
}

/** A state's grid cell. */
export function cellOf(mdp: Mdp, s: number): GridCell {
  const st = mdp.states[s];
  return [st.row, st.col];
}

// §10.1 Gridworld and MDP -----------------------------------------------------------

export interface MdpSummary {
  /** L6-G2: S = {1, …, 11}, A = {←, →, ↑, ↓}, R(s) and how Pₛₐ is built. */
  statesTex: string;
  actionsTex: string;
  rewardTex: string;
  transitionText: string;
  /** "the robot moves as intended with probability 4/5 and slips to each side with 1/10" */
  slipText: string;
}

/** L6-G2, L6-G3 */
export function mdpSummary(mdp: Mdp, slip: Rational, display: NumberDisplay): MdpSummary {
  const background = backgroundReward(mdp);
  const special = mdp.R.map((r, s) => ({ r, s })).filter(({ r, s }) => !r.equals(background) || (isTerminal(mdp, s) && !r.isZero()));
  const rewardTex = [...special.map(({ r, s }) => `R(${label(mdp, s)}) = ${tex(r, display)}`), `R(s) = ${tex(background, display)} \\text{ otherwise}`].join(',\\ ');
  return {
    statesTex: `S = \\{1, 2, \\ldots, ${mdp.n}\\}`,
    actionsTex: 'A = \\{\\leftarrow, \\rightarrow, \\uparrow, \\downarrow\\}',
    rewardTex,
    transitionText: 'Pₛₐ(s′) is the probability that action a in state s leads to s′. Moving into a wall or off the grid leaves the robot where it is.',
    slipText: `The robot moves as intended with probability ${fmt(Rational.ONE.sub(slip.mul(Rational.of(2))), display)} and slips to each side with probability ${fmt(slip, display)}.`,
  };
}

export interface TransitionInspector {
  /** L6-G4: Pₛₐ(s′) per state, for the overlay. */
  overlay: number[];
  /** Nonzero entries in the notes' notation: "P_{10,\\uparrow}(6) = \\frac{4}{5}". */
  entries: { state: number; tex: string }[];
}

/** L6-G4 */
export function transitionInspector(mdp: Mdp, s: number, a: Action, display: NumberDisplay): TransitionInspector {
  const row = mdp.P[a][s];
  return {
    overlay: row.map((p) => p.toNumber()),
    entries: row.flatMap((p, t) => (p.isZero() ? [] : [{ state: t, tex: `P_{${label(mdp, s)},${ARROW_TEX[a]}}(${label(mdp, t)}) = ${tex(p, display)}` }])),
  };
}

export interface ActionMatrix {
  action: Action;
  /** L6-G5: P_a with rows = current state, columns = next state, for a heatmap. */
  entries: number[][];
  /** The selected state's row, outlined. */
  highlightRow: number | null;
}

/** L6-G5 */
export function actionMatrices(mdp: Mdp, selected: number | null): ActionMatrix[] {
  return ACTIONS.map((action) => ({ action, entries: mdp.P[action].map((r) => r.map((x) => x.toNumber())), highlightRow: selected }));
}

export interface SamplePathsView {
  /** L6-G6: one path per seeded run of the fixed plan. */
  paths: { states: number[]; endedAt: number | null }[];
  /** Runs ending at each terminal, by state. */
  endCounts: Record<number, number>;
  caption: string;
}

/** L6-G6: the plan (e.g. ↑ ↑ →) from a start state, run `runs` times from a seed. */
export function samplePaths(mdp: Mdp, start: number, plan: readonly Action[], runs: number, seed: number): SamplePathsView {
  const endCounts: Record<number, number> = Object.fromEntries(mdp.terminals.map((t) => [t, 0]));
  const paths = Array.from({ length: runs }, (_, k) => {
    const states = followActions(mdp, start, plan, episodeSeed(seed, k));
    const last = states[states.length - 1];
    const endedAt = isTerminal(mdp, last) ? last : null;
    if (endedAt !== null) endCounts[endedAt]++;
    return { states, endedAt };
  });
  const neither = paths.filter((p) => p.endedAt === null).length;
  const ends = mdp.terminals.map((t) => `${rewardText(mdp.R[t], 'decimal')} in ${endCounts[t]}`).join(', ');
  return {
    paths,
    endCounts,
    caption: `${runs} runs of ${plan.map((a) => ACTION_ARROWS[a]).join(' ')} from state ${label(mdp, start)} (seed ${seed}): ended at ${ends}, and somewhere else in ${neither}.`,
  };
}

/** What the simulated robot does: the notes' fixed plan (↑ ↑ →) or the painted policy. */
export type SimulationSource = { kind: 'plan'; actions: readonly Action[] } | { kind: 'policy'; policy: Policy };

export interface SimulationFrame extends Lesson6Step {
  t: number;
  /** Where the robot is at time t. */
  state: number;
  /** The action that brought it here; null at t = 0. */
  action: Action | null;
  /** Where the intended move would have taken it (null at t = 0). */
  aimed: number | null;
  /** The robot ended somewhere other than `aimed`. */
  slipped: boolean;
  /** R(sₜ) */
  reward: number;
  /** R(s₀) + γR(s₁) + ⋯ + γᵗR(sₜ) */
  returnSoFar: number;
}

export interface RobotSimulationView {
  /** One frame per time step, starting with the robot at the start state. */
  frames: SimulationFrame[];
  /** The terminal state reached, or null when the plan or the step limit ran out first. */
  endedAt: number | null;
  discountedReturn: number;
  caption: string;
}

/**
 * §6.1 figure as a simulation (L6-G6): the robot ⌘ moves from the start state,
 * slipping with probability q to each side, drawn from a seed. A plan stops
 * when its actions run out; a policy runs until a terminal state or `maxSteps`.
 */
export function robotSimulation(mdp: Mdp, source: SimulationSource, gamma: Rational, seed: number, maxSteps = 50): RobotSimulationView {
  const isPlan = source.kind === 'plan';
  const actions = isPlan ? source.actions : null;
  const policy = isPlan ? null : source.policy;
  const rng = mulberryFor(seed);
  const g = gamma.toNumber();
  const frames: SimulationFrame[] = [];
  let s = mdp.start;
  let returnSoFar = mdp.R[s].toNumber();
  frames.push({
    t: 0,
    state: s,
    action: null,
    aimed: null,
    slipped: false,
    reward: mdp.R[s].toNumber(),
    returnSoFar,
    description: `t = 0: the robot starts at state ${label(mdp, s)}.`,
    tex: `R(s_0) = ${short(returnSoFar)}`,
  });
  const limit = actions ? actions.length : maxSteps;
  for (let t = 1; t <= limit && !isTerminal(mdp, s); t++) {
    const a = actions ? actions[t - 1] : policy![s];
    const row = mdp.P[a][s].map((p) => p.toNumber());
    const aimed = intendedNext(mdp, s, a);
    const next = sampleRow(row, rng);
    const reward = mdp.R[next].toNumber();
    returnSoFar += g ** t * reward;
    const slipped = next !== aimed;
    const where = next === s ? `stays at state ${label(mdp, s)}` : `moves to state ${label(mdp, next)}`;
    frames.push({
      t,
      state: next,
      action: a,
      aimed,
      slipped,
      reward,
      returnSoFar,
      description: `t = ${t}: tries ${ACTION_ARROWS[a]} from state ${label(mdp, s)}${slipped ? ` but slips and ${where}` : ` and ${where}`}${isTerminal(mdp, next) ? ` — reward ${rewardText(mdp.R[next], 'decimal')}, the episode ends` : ''}.`,
      tex: `${returnTerms(t)} = ${short(returnSoFar)}`,
    });
    s = next;
  }
  const endedAt = isTerminal(mdp, s) ? s : null;
  const outcome = endedAt === null ? 'did not reach +1 or −1' : `ended at ${rewardText(mdp.R[endedAt], 'decimal')}`;
  return {
    frames,
    endedAt,
    discountedReturn: returnSoFar,
    caption: `The robot ${outcome} after ${frames.length - 1} step${frames.length === 2 ? '' : 's'}; discounted return ${short(returnSoFar)} (seed ${seed}).`,
  };
}

/** L6-G7: what the terminal setting means, since the notes don't say. */
export const TERMINAL_MODE_NOTE: Record<TerminalMode, string> = {
  terminal: 'Terminal: the episode ends at +1 or −1, so V(s) = R(s) there. This is the default.',
  absorbing: 'Absorbing: the robot stays at +1 or −1 forever and collects the reward at every step, so V(s) = R(s)/(1 − γ) there.',
};

// §10.2 Learning the model ----------------------------------------------------------

export interface LearningView {
  /** L6-L1: the first recorded steps, for the table. */
  sample: Transition[];
  total: number;
  estimate: ModelEstimate;
  /** L6-L2: the notes' formula. */
  formulaTex: string;
  /** L6-L3: per state, the largest |P̂ₛₐ(s′) − Pₛₐ(s′)| over tried actions; null when no action was tried. */
  stateErrors: (number | null)[];
  /** State–action pairs never tried (L5-ES6), as "state 4, ↑". */
  unknown: string[];
  /** P̂ for the selected state and action, in the notes' notation. */
  selected: { tex: string; tried: number } | null;
}

/** L6-L1–L6-L3: experience from random actions (or `explore`), estimated with the Lesson 5 estimator. */
export function learningView(
  mdp: Mdp,
  explore: Policy | null,
  steps: number,
  seed: number,
  selected: { s: number; a: Action } | null,
  display: NumberDisplay,
): LearningView {
  const experience = collectExperience(mdp, explore, steps, seed);
  const estimate = estimateModel(mdp.n, experience);
  const errorOf = (s: number, k: number) => {
    const row = estimate.P[ACTIONS[k]][s];
    return row ? Math.max(...row.map((p, t) => Math.abs(p.toNumber() - mdp.P[ACTIONS[k]][s][t].toNumber()))) : null;
  };
  const stateErrors = mdp.states.map((_, s) => {
    if (isTerminal(mdp, s)) return null;
    const errors = ACTIONS.map((_, k) => errorOf(s, k)).filter((e): e is number => e !== null);
    return errors.length ? Math.max(...errors) : null;
  });
  const unknown = mdp.states.flatMap((_, s) =>
    isTerminal(mdp, s) ? [] : ACTIONS.flatMap((a, k) => (estimate.tried[s][k] === 0 ? [`state ${label(mdp, s)}, ${ACTION_ARROWS[a]}`] : [])),
  );
  let chosen: LearningView['selected'] = null;
  if (selected) {
    const k = ACTIONS.indexOf(selected.a);
    const row = estimate.P[selected.a][selected.s];
    const name = `\\hat P_{${label(mdp, selected.s)},${ARROW_TEX[selected.a]}}`;
    chosen = {
      tried: estimate.tried[selected.s][k],
      tex: row
        ? row.flatMap((p, t) => (p.isZero() ? [] : [`${name}(${label(mdp, t)}) = ${tex(p, display)}`])).join(',\\quad ')
        : `${name} \\text{ is unknown: action never tried here}`,
    };
  }
  return {
    sample: experience.slice(0, 20),
    total: experience.length,
    estimate,
    formulaTex:
      "\\hat P_{sa}(s') = \\frac{\\#\\text{ times we took action } a \\text{ in state } s \\text{ and got to state } s'}{\\#\\text{ times we took action } a \\text{ in state } s}",
    stateErrors,
    unknown,
    selected: chosen,
  };
}

export interface LearningChart {
  /**
   * L6-L3: estimation error against steps collected, log–log. The error of each
   * tried (s, a) is its largest |P̂ₛₐ(s′) − Pₛₐ(s′)|, averaged with weights equal to
   * the times a was tried in s (the plain maximum is dominated by pairs tried once).
   */
  frame: ChartFrame;
  points: [number, number][];
  reference: { slope: number; through: [number, number]; label: string };
}

/** L6-L3 */
export function learningChart(mdp: Mdp, explore: Policy | null, seed: number): LearningChart {
  const lengths = [100, 300, 1000, 3000, 10000, 30000];
  const floor = 1e-4;
  const points: [number, number][] = lengths.map((L) => {
    const estimate = estimateModel(mdp.n, collectExperience(mdp, explore, L, seed));
    let weighted = 0;
    let tries = 0;
    mdp.states.forEach((_, s) =>
      ACTIONS.forEach((a, k) => {
        const row = estimate.P[a][s];
        if (!row || isTerminal(mdp, s)) return;
        const err = Math.max(...row.map((p, t) => Math.abs(p.toNumber() - mdp.P[a][s][t].toNumber())));
        weighted += err * estimate.tried[s][k];
        tries += estimate.tried[s][k];
      }),
    );
    return [L, Math.max(floor, tries ? weighted / tries : 1)];
  });
  const { min, max } = decades([...points.map((p) => p[1]), 1], floor);
  return {
    frame: {
      x: { min: 100, max: 30000, title: 'steps collected', log: true },
      y: { min, max, title: 'average |P̂ − P|', log: true },
      size: 8,
      equalAspect: false,
    },
    points,
    reference: { slope: -0.5, through: points[0], label: '∝ 1/√steps' },
  };
}

export interface PlanWithEstimate {
  /** L6-L4: π* from the estimated model (unknown pairs treated as staying put, unknown rewards as 0). */
  estimated: Policy;
  /** π* from the true model. */
  truth: Policy;
  /** Non-terminal states where they differ. */
  differences: number[];
  caption: string;
}

/** L6-L4 */
export function planWithEstimate(mdp: Mdp, estimate: ModelEstimate, gamma: Rational, terminalMode: TerminalMode): PlanWithEstimate {
  // Unknown pairs are treated as staying put; unknown rewards as 0.
  const estimated: Mdp = {
    ...mdp,
    P: Object.fromEntries(
      ACTIONS.map((a) => [a, mdp.states.map((_, s) => estimate.P[a][s] ?? mdp.states.map((__, t) => (t === s ? Rational.ONE : Rational.ZERO)))]),
    ) as Mdp['P'],
    R: mdp.R.map((r, s) => estimate.R[s] ?? (isTerminal(mdp, s) ? r : Rational.ZERO)),
  };
  const start = uniformPolicy(mdp, 'up');
  const truth = policyIteration(mdp, start, gamma, terminalMode).policy;
  const fromEstimate = policyIteration(estimated, start, gamma, terminalMode).policy;
  const differences = differentStates(mdp, truth, fromEstimate);
  return {
    estimated: fromEstimate,
    truth,
    differences,
    caption:
      differences.length === 0
        ? 'Policy iteration on the estimated model finds the same optimal policy as on the true model.'
        : `Policy iteration on the estimated model differs from the true optimal policy at state${differences.length === 1 ? '' : 's'} ${differences.map((s) => label(mdp, s)).join(', ')}. Collect more experience and try again.`,
  };
}

// §10.3 Value of a policy -----------------------------------------------------------

export interface ReturnView {
  /** L6-B2: one seeded run, R(s₀) + γR(s₁) + ⋯ term by term. */
  path: number[];
  termsTex: string;
  sampleReturn: number;
  /** Monte Carlo average over `runs` episodes, and its running mean. */
  average: number;
  runningMean: [number, number][];
  /** V^π(start) for comparison, when the evaluation succeeded. */
  exact: number | null;
}

/** L6-B2 */
export function returnView(mdp: Mdp, policy: Policy, gamma: Rational, start: number, runs: number, seed: number, terminalMode: TerminalMode): ReturnView {
  const episode = rollout(mdp, policy, start, gamma, seed);
  const shown = episode.states.slice(0, 8);
  const terms = shown.map((s, k) => `${k === 0 ? '' : k === 1 ? '\\gamma ' : `\\gamma^{${k}} `}R(${label(mdp, s)})`);
  const more = episode.states.length > shown.length ? ' + \\cdots' : '';
  const summary = rollouts(mdp, policy, start, gamma, runs, seed);
  let exact: number | null = null;
  try {
    exact = asNum(evaluatePolicy(mdp, policy, gamma, terminalMode).V[start]);
  } catch {
    exact = null;
  }
  return {
    path: episode.states,
    termsTex: `${terms.join(' + ')}${more} = ${short(episode.discountedReturn)}`,
    sampleReturn: episode.discountedReturn,
    average: summary.meanReturn,
    runningMean: summary.runningMean.map((m, k) => [k + 1, m]),
    exact,
  };
}

/** L6-B3: from the definition of V^π to the Bellman equation, one line of the notes per step. */
export function bellmanDerivation(): Lesson6Step[] {
  return [
    { description: 'The definition: the expected total discounted reward along the path.', tex: 'V^\\pi(s_0) = E\\left[R(s_0) + \\gamma R(s_1) + \\gamma^2 R(s_2) + \\cdots\\right]' },
    { description: 'R(s₀) is known, so take it out and factor γ from the rest.', tex: 'V^\\pi(s_0) = R(s_0) + \\gamma\\, E\\left[R(s_1) + \\gamma R(s_2) + \\gamma^2 R(s_3) + \\cdots\\right]' },
    { description: 'The bracket is the value of the next state: the same sum, started one step later.', tex: 'E\\left[R(s_1) + \\gamma R(s_2) + \\gamma^2 R(s_3) + \\cdots\\right] = E\\left[V^\\pi(s_1)\\right]' },
    { description: "The next state is s′ with probability P_{s₀π(s₀)}(s′), so average over s′.", tex: "E\\left[V^\\pi(s_1)\\right] = \\sum_{s' \\in S} P_{s_0\\pi(s_0)}(s')\\, V^\\pi(s')" },
    { description: 'The Bellman equation for a fixed policy: one linear equation for each state.', tex: "V^\\pi(s_0) = R(s_0) + \\gamma \\sum_{s' \\in S} P_{s_0\\pi(s_0)}(s')\\, V^\\pi(s')" },
  ];
}

/** L6-B4: the Bellman equation of one state with the numbers filled in. */
export function bellmanEquation(mdp: Mdp, policy: Policy, gamma: Rational, s: number, display: NumberDisplay, terminalMode: TerminalMode): string {
  const l = label(mdp, s);
  if (terminalMode === 'terminal' && isTerminal(mdp, s)) return `V(${l}) = ${tex(mdp.R[s], display)}`;
  const row = policyMatrix(mdp, policy)[s];
  const terms = row.flatMap((p, t) => (p.isZero() ? [] : [`${p.equals(Rational.ONE) ? '' : tex(p, display)}V(${label(mdp, t)})`]));
  return `V(${l}) = ${tex(mdp.R[s], display)} + ${tex(gamma, display)}\\left(${terms.join(' + ')}\\right)`;
}

export interface BellmanSystemView {
  evaluation: PolicyEvaluation;
  precision: Precision;
  /** L6-B4: the full system as KaTeX for at most 4 states; null for larger grids. */
  systemTex: string | null;
  /** The heatmap form: I − γP_π beside R. */
  matrix: number[][];
  rhs: number[];
  /** L6-B5: the LU trace (Lesson 3), one step per elimination; empty in floating point. */
  luSteps: Lesson6Step[];
  /** L6-B5 (beyond the notes): why no row exchanges are needed. */
  pivotNote: string;
}

/** L6-B4, L6-B5 */
export function bellmanSystem(mdp: Mdp, policy: Policy, gamma: Rational, display: NumberDisplay, terminalMode: TerminalMode): BellmanSystemView {
  const evaluation = evaluatePolicy(mdp, policy, gamma, terminalMode);
  const matrix = evaluation.A.map((r) => r.map(asNum));
  const rhs = evaluation.b.map(asNum);
  let systemTex: string | null = null;
  if (mdp.n <= 4) {
    const entries = evaluation.A.map((r) => r.map((x) => tex(x, display)));
    const unknowns = `\\begin{bmatrix}${mdp.states.map((st) => `V(${st.label})`).join(' \\\\ ')}\\end{bmatrix}`;
    systemTex = `${matrixToTex(entries, false, {})}${unknowns} = ${matrixToTex(evaluation.b.map((x) => [tex(x, display)]), false, {})}`;
  }
  const luSteps: Lesson6Step[] = evaluation.lu
    ? [
        ...evaluation.lu.trace.steps.slice(1).map((st) => ({ description: st.description, tex: st.tex })),
        { description: 'Then solve Lc = R by forward substitution and UV = c by back substitution (Lesson 3).', tex: 'LU\\,V = R' },
      ]
    : [];
  return {
    evaluation,
    precision: evaluation.precision,
    systemTex,
    matrix,
    rhs,
    luSteps,
    pivotNote:
      'Beyond the notes: no row exchanges are needed. Each diagonal entry of I − γP_π is 1 − γ·(chance of staying put), and the other entries of its row add up in size to γ·(chance of moving), which is smaller since γ < 1. The matrix is strictly diagonally dominant, so every pivot stays positive.',
  };
}

/** L6-B7 */
export const CONVENTION_NOTE =
  "Here P_π has rows indexed by the current state: row s is P_{s,π(s)}. That is the transpose of Lesson 5's convention, where columns are \"from\"; T_π = P_πᵀ is the Lesson 5 transition matrix of the same process.";

// §10.4 Where the robot ends up -----------------------------------------------------

export interface DistributionView {
  /** L6-W1: x(t) = T_πᵗ x₀ from the start state, one probability per state. */
  x: number[];
  /** x(0) … x(t), for stepping. */
  history: number[][];
  t: number;
}

/** L6-W1: terminals are absorbing in this view. */
export function distributionView(mdp: Mdp, policy: Policy, t: number): DistributionView {
  const T = policyTransition(mdp, policy).map((r) => r.map((x) => x.toNumber()));
  let x: number[] = mdp.states.map((_, s) => (s === mdp.start ? 1 : 0));
  const history = [x];
  for (let k = 0; k < t; k++) {
    x = T.map((row) => row.reduce((acc, p, j) => acc + p * x[j], 0));
    history.push(x);
  }
  return { x, history, t };
}

export interface FinishView {
  /** L6-W2: long-run probabilities of finishing at each terminal from the start state (exact when possible). */
  exact: { state: number; probability: Rational | number; label: string }[];
  /** Share of seeded rollouts that ended at each terminal. */
  simulated: { state: number; share: number }[];
  bars: Bar[];
  /** L6-W3 */
  note: string;
}

/** L6-W2, L6-W3 */
export function finishView(mdp: Mdp, policy: Policy, gamma: Rational, start: number, runs: number, seed: number): FinishView {
  // h_T(s) = chance of finishing at terminal T from s: h_T(T) = 1, 0 at the other terminals,
  // and h_T(s) = Σ P_π(s, s′) h_T(s′) elsewhere. Exact when that system has one solution.
  const Ppi = policyMatrix(mdp, policy);
  const finish = (target: number): Rational | number => {
    const A = Ppi.map((row, s) =>
      isTerminal(mdp, s) ? row.map((_, t) => (t === s ? Rational.ONE : Rational.ZERO)) : row.map((p, t) => (t === s ? Rational.ONE : Rational.ZERO).sub(p)),
    );
    const b = mdp.states.map((_, s) => (s === target ? Rational.ONE : Rational.ZERO));
    const sol = mdp.n <= 12 ? solve(A, b) : null;
    if (sol?.kind === 'unique') return sol.x[start];
    // Some states never reach a terminal: follow the distribution until it settles.
    const T = policyTransition(mdp, policy).map((r) => r.map((x) => x.toNumber()));
    let x: number[] = mdp.states.map((_, s) => (s === start ? 1 : 0));
    for (let k = 0; k < 5000; k++) x = T.map((row) => row.reduce((acc, p, j) => acc + p * x[j], 0));
    return x[target];
  };
  const summary = rollouts(mdp, policy, start, gamma, runs, seed);
  const exact = mdp.terminals.map((t) => {
    const probability = finish(t);
    return { state: t, probability, label: `Finishing at ${rewardText(mdp.R[t], 'decimal')} (state ${label(mdp, t)}): ${fmt(probability, 'fraction')}` };
  });
  const simulated = mdp.terminals.map((t) => ({ state: t, share: (summary.endCounts[t] ?? 0) / Math.max(1, runs) }));
  return {
    exact,
    simulated,
    bars: exact.map((e) => ({
      label: `${rewardText(mdp.R[e.state], 'decimal')} (state ${label(mdp, e.state)})`,
      value: asNum(e.probability),
      color: mdp.R[e.state].isNegative() ? '#D55E00' : '#009E73',
      valueLabel: short(asNum(e.probability), 3),
    })),
    note: "This is Lesson 5's absorbing chain again: with more than one place to stop, where the robot finishes depends on where it starts. Move the start and compare.",
  };
}

// §10.5 Optimal value and best actions ----------------------------------------------

/** L6-O1: the Bellman optimality equation, one line of the notes per step. */
export function optimalityDerivation(): Lesson6Step[] {
  return [
    { description: 'The optimal value is the best value over all policies.', tex: 'V^*(s_0) = \\max_\\pi V^\\pi(s_0)' },
    { description: 'Write V^π with its Bellman equation.', tex: "V^*(s_0) = \\max_\\pi \\left[R(s_0) + \\gamma \\sum_{s' \\in S} P_{s_0\\pi(s_0)}(s')\\, V^\\pi(s')\\right]" },
    { description: 'R(s₀) and γ do not depend on π.', tex: "V^*(s_0) = R(s_0) + \\gamma \\left[\\max_\\pi \\sum_{s' \\in S} P_{s_0\\pi(s_0)}(s')\\, V^\\pi(s')\\right]" },
    { description: 'The maximum is reached by the optimal policy π*…', tex: "V^*(s_0) = R(s_0) + \\gamma \\sum_{s' \\in S} P_{s_0\\pi^*(s_0)}(s')\\, V^{\\pi^*}(s')" },
    { description: '…whose value is V*.', tex: "V^*(s_0) = R(s_0) + \\gamma \\sum_{s' \\in S} P_{s_0\\pi^*(s_0)}(s')\\, V^*(s')" },
    { description: 'So π* picks, in each state, the action with the best expected next value.', tex: "V^*(s_0) = R(s_0) + \\gamma \\max_{a \\in A} \\sum_{s' \\in S} P_{s_0 a}(s')\\, V^*(s')" },
  ];
}

export interface ActionCompass {
  /** L6-O2: Σ Pₛₐ(s′)V(s′) for each action, labeled. */
  values: Record<Action, { value: number; label: string }>;
  best: Action;
  tex: string;
}

/** L6-O2 */
export function actionCompass(mdp: Mdp, V: AnyVector, s: number, display: NumberDisplay): ActionCompass {
  const next = expectedNextValues(mdp, V, s);
  const values = Object.fromEntries(ACTIONS.map((a) => [a, { value: asNum(next[a]), label: fmt(next[a], display) }])) as ActionCompass['values'];
  const best = ACTIONS[argmax(ACTIONS.map((a) => values[a].value))];
  return {
    values,
    best,
    tex: `\\max_{a} \\sum_{s'} P_{${label(mdp, s)}a}(s')\\,V(s') = ${tex(next[best], display)} \\text{ at } a = ${ARROW_TEX[best]}`,
  };
}

export interface OptimalView {
  precision: Precision;
  /** L6-O3: π* by policy iteration, and V*. */
  policy: Policy;
  V: AnyVector;
  valueLabels: string[];
  /** L6-O5: states whose arrow differs from `previous`, when given. */
  changed: number[];
}

/** L6-O3, L6-O5 */
export function optimalView(mdp: Mdp, gamma: Rational, terminalMode: TerminalMode, display: NumberDisplay, previous?: Policy): OptimalView {
  const r = policyIteration(mdp, uniformPolicy(mdp, 'up'), gamma, terminalMode);
  return {
    precision: r.precision,
    policy: r.policy,
    V: r.V,
    valueLabels: r.V.map((v) => fmt(v, display, CELL_DEN)),
    changed: previous && previous.length === mdp.n ? differentStates(mdp, previous, r.policy) : [],
  };
}

/** L6-O4: the intended moves of a policy from a start, until a terminal or a repeat. */
export function intendedPath(mdp: Mdp, policy: Policy, start: number): number[] {
  const path = [start];
  let s = start;
  while (!isTerminal(mdp, s)) {
    const row = mdp.P[policy[s]][s];
    const next = row.reduce((best, p, t) => (p.cmp(row[best]) > 0 ? t : best), 0);
    if (path.includes(next)) break;
    path.push(next);
    s = next;
  }
  return path;
}

// §10.6 Policy iteration -----------------------------------------------------------

export interface PolicyIterationFrame extends Lesson6Step {
  kind: 'evaluate' | 'improve';
  policy: Policy;
  /** The latest values (from the most recent evaluation). */
  V: AnyVector;
  changed: number[];
}

export interface PolicyIterationView {
  precision: Precision;
  /** L6-PI1, L6-PI2: one frame per evaluation or improvement. */
  frames: PolicyIterationFrame[];
  /** L6-PI2: the policy after every improvement. */
  history: Policy[];
  /** L6-PI4: V^π at the tracked states across evaluations. */
  chart: { frame: ChartFrame; series: { label: string; color: string; points: [number, number][] }[] };
  /** L6-PI6 */
  evaluations: number;
  changes: number;
  /** L6-PI5 */
  tieRule: string;
  /** L6-PI4 (beyond the notes) */
  monotoneNote: string;
}

/** L6-PI1–L6-PI6. `tracked` are the states charted (e.g. the start state). */
export function policyIterationView(
  mdp: Mdp,
  start: Policy,
  gamma: Rational,
  terminalMode: TerminalMode,
  tracked: number[],
  display: NumberDisplay,
): PolicyIterationView {
  const r = policyIteration(mdp, start, gamma, terminalMode);
  const watch = tracked[0] ?? mdp.start;
  let latest: AnyVector = mdp.R;
  const frames: PolicyIterationFrame[] = r.steps.map((st) => {
    if (st.kind === 'evaluate') {
      latest = st.evaluation.V;
      return {
        kind: 'evaluate',
        policy: st.policy,
        V: latest,
        changed: [],
        description: `Evaluation ${st.iteration}: solve (I − γP_π)V = R for the current policy.`,
        tex: `V^{\\pi_{${st.iteration}}}(${label(mdp, watch)}) = ${tex(latest[watch], display)}`,
      };
    }
    return {
      kind: 'improve',
      policy: st.policy,
      V: latest,
      changed: st.changed,
      description:
        st.changed.length === 0
          ? 'Improvement: no state changes its action, so the policy is optimal.'
          : `Improvement ${st.iteration}: ${st.changed.length} state${st.changed.length === 1 ? '' : 's'} (${st.changed.map((s) => label(mdp, s)).join(', ')}) switch to a better action.`,
      tex: "\\pi'(s) = \\arg\\max_{a \\in A} \\sum_{s'} P_{sa}(s')\\, V^\\pi(s')",
    };
  });
  const evaluations = r.steps.flatMap((st) => (st.kind === 'evaluate' ? [st] : []));
  const series = tracked.map((s, k) => ({
    label: `V(${label(mdp, s)})`,
    color: SERIES_COLORS[k % SERIES_COLORS.length],
    points: evaluations.map((e, i): [number, number] => [i + 1, asNum(e.evaluation.V[s])]),
  }));
  const ys = series.flatMap((x) => x.points.map((p) => p[1]));
  const lo = Math.min(0, ...ys);
  const hi = Math.max(lo + 0.1, ...ys);
  return {
    precision: r.precision,
    frames,
    history: r.steps.flatMap((st) => (st.kind === 'improve' ? [st.policy] : [])),
    chart: {
      frame: { x: { min: 1, max: Math.max(2, r.evaluations), title: 'evaluation' }, y: { min: lo, max: hi, title: 'V^π' }, size: 8, equalAspect: false },
      series,
    },
    evaluations: r.evaluations,
    changes: r.changes,
    tieRule:
      'Tie rule: if the current action is among the best, keep it, so a tie never changes the policy; otherwise take the first best action in the order ↑ → ↓ ←. The policy only changes when it strictly improves, and there are finitely many policies, so the loop must stop.',
    monotoneNote: 'Beyond the notes: V^π never decreases from one policy to the next (the policy improvement theorem), so these curves only rise until they level off.',
  };
}

// §10.7 Value iteration, Q-values and Q-learning -------------------------------------

export interface ValueIterationView {
  /** L6-Q1: one frame per sweep. */
  frames: { k: number; V: number[]; delta: number; tex: string }[];
  /** The change between sweeps against k on a log axis, with the γᵏ reference. */
  chart: { frame: ChartFrame; points: [number, number][]; reference: [number, number][] };
  policy: Policy;
  /** L6-Q2: steps and work per step, against policy iteration. */
  comparison: { method: string; steps: number; work: string }[];
  /** Same π* as policy iteration (L6-Q1 acceptance). */
  agrees: boolean;
}

/** L6-Q1, L6-Q2 */
export function valueIterationView(mdp: Mdp, gamma: Rational, terminalMode: TerminalMode, tolerance?: number): ValueIterationView {
  const vi = valueIteration(mdp, gamma, { tolerance, terminalMode });
  const watch = mdp.start;
  const frames = vi.steps.map(({ k, V, delta }) => ({
    k,
    V,
    delta,
    tex:
      k === 0
        ? 'V_0(s) = 0 \\text{ for every } s'
        : `V_{${k}}(${label(mdp, watch)}) = ${V[watch].toFixed(6)}, \\quad \\max_s |V_{${k}}(s) - V_{${k - 1}}(s)| = ${delta.toExponential(2)}`,
  }));
  const floor = 1e-17;
  const points: [number, number][] = vi.steps.slice(1).map((st) => [st.k, Math.max(floor, st.delta)]);
  const g = gamma.toNumber();
  const reference: [number, number][] = points.map(([k]) => [k, Math.max(floor, points[0][1] * g ** (k - 1))]);
  const { min, max } = decades([...points.map((p) => p[1]), ...reference.map((p) => p[1])]);
  const pi = policyIteration(mdp, uniformPolicy(mdp, 'up'), gamma, terminalMode);
  return {
    frames,
    chart: {
      frame: { x: { min: 1, max: Math.max(2, points.length), title: 'sweep k' }, y: { min, max, title: 'change between sweeps', log: true }, size: 8, equalAspect: false },
      points,
      reference,
    },
    policy: vi.policy,
    comparison: [
      { method: 'Policy iteration', steps: pi.evaluations, work: `one linear solve (${mdp.n} × ${mdp.n} system) per evaluation, then an improvement` },
      { method: 'Value iteration', steps: vi.steps.length - 1, work: 'one sweep: in every state, a max over 4 actions of a sum — no linear system' },
    ],
    agrees: differentStates(mdp, vi.policy, pi.policy).length === 0,
  };
}

export interface QValuesView {
  /** L6-Q3: Q(s, a) per state (ACTIONS order) for V*, with labels and the best action. */
  q: (Rational | number)[][];
  labels: string[][];
  best: Action[];
  precision: Precision;
}

/** L6-Q3 */
export function qValuesView(mdp: Mdp, gamma: Rational, terminalMode: TerminalMode, display: NumberDisplay): QValuesView {
  const r = policyIteration(mdp, uniformPolicy(mdp, 'up'), gamma, terminalMode);
  const q = actionValues(mdp, r.V, gamma);
  return {
    q,
    labels: q.map((row) => row.map((x) => fmt(x, display))),
    best: q.map((row) => ACTIONS[argmax(row.map(asNum))]),
    precision: r.precision,
  };
}

/** L6-Q4: the notes' closing question and its answer. */
export const Q_LEARNING_CARD = {
  question: 'Is reinforcement learning the same as Q-learning?',
  answer:
    'No. Reinforcement learning is the general idea of learning from rewards and experience, without explicit supervision. Q-learning is one RL algorithm: it learns Q(s, a) directly from experience without knowing Pₛₐ. Policy iteration, in contrast, needs Pₛₐ — given, or estimated from experience as in "Learning the model".',
};

export interface QLearningView {
  /** L6-Q5: learned Q per state, labeled, and its greedy policy. */
  q: number[][];
  labels: string[][];
  policy: Policy;
  /** max |Q − Q*| against episodes. */
  chart: { frame: ChartFrame; points: [number, number][] };
  caption: string;
}

/** L6-Q5 (optional) */
export function qLearningView(
  mdp: Mdp,
  gamma: Rational,
  terminalMode: TerminalMode,
  options: { episodes: number; alpha: number; epsilon: number; seed: number },
): QLearningView {
  const exact = policyIteration(mdp, uniformPolicy(mdp, 'up'), gamma, terminalMode);
  const reference = actionValues(mdp, exact.V, gamma).map((row) => row.map(asNum));
  const result = qLearning(mdp, gamma, { ...options, reference });
  const floor = 1e-6;
  const points: [number, number][] = result.distances.map((d, k) => [k + 1, Math.max(floor, d)]);
  const { min, max } = decades([...points.map((p) => p[1]), 1], floor);
  const policy = result.Q.map((row) => ACTIONS[argmax(row)]);
  const agree = differentStates(mdp, policy, exact.policy).length === 0;
  return {
    q: result.Q,
    labels: result.Q.map((row) => row.map((x) => fmt(x, 'decimal').replace(/^(−?)0\./, '$1.'))),
    policy,
    chart: {
      frame: { x: { min: 1, max: Math.max(2, options.episodes), title: 'episodes' }, y: { min, max, title: 'max |Q − Q*|', log: true }, size: 8, equalAspect: false },
      points,
    },
    caption: `${options.episodes} episodes, α = ${options.alpha}, ε = ${options.epsilon}, seed ${options.seed}. Q-learning never uses Pₛₐ: it learns from (s, a, s′, r) alone. Its greedy policy ${agree ? 'already matches' : 'does not yet match'} π*.`,
  };
}

// Statistics primer: sample mean, variance and covariance (ahead of Lesson 7) --------

export interface StatsTable {
  x1: Rational[];
  x2: Rational[];
  /** [row, col] of cells that did not parse (read as 0). */
  invalid: [number, number][];
}

/** Parse the primer's two-column table exactly (F-E2); bad cells are flagged and read as 0. */
export function parseStatsTable(cells: string[][]): StatsTable {
  const invalid: [number, number][] = [];
  const read = (text: string | undefined, i: number, j: number) => {
    const r = Rational.parse((text ?? '').trim());
    if (r) return r;
    invalid.push([i, j]);
    return Rational.ZERO;
  };
  const rows = cells.map((row, i) => [read(row[0], i, 0), read(row[1], i, 1)]);
  return { x1: rows.map((r) => r[0]), x2: rows.map((r) => r[1]), invalid };
}

/** −1, 0 or +1: which way a product (x₁ − x̄₁)(x₂ − x̄₂) pulls the covariance. */
export type ProductSign = -1 | 0 | 1;

export interface StatsRow {
  x1: string;
  x2: string;
  /** Deviations from the means. */
  d1: string;
  d2: string;
  sq1: string;
  sq2: string;
  product: string;
  sign: ProductSign;
}

export interface StatisticsView {
  n: number;
  means: [Rational, Rational];
  variances: [Rational, Rational];
  /** s = √s², floating point. */
  stds: [number, number];
  covariance: Rational;
  /** One row per observation, then the column sums. */
  rows: StatsRow[];
  sums: { x1: string; x2: string; d1: string; d2: string; sq1: string; sq2: string; product: string };
  steps: Lesson6Step[];
  /** The scatter: data points, the mean point, and a frame around them. */
  points: [number, number][];
  meanPoint: [number, number];
  frame: ChartFrame;
  /** The 2 × 2 covariance matrix S of Lesson 7, exact. */
  matrixTex: string;
  verdict: string;
}

/** Long sums show their first three terms and the last. */
function sumTerms(terms: string[]): string {
  return terms.length <= 8 ? terms.join(' + ') : `${terms.slice(0, 3).join(' + ')} + \\cdots + ${terms[terms.length - 1]}`;
}

/** Statistics primer: every sum behind x̄, s² and Cov(x₁, x₂) written out, n − 1 in the denominators as in Lesson 7 (§7.2). */
export function statisticsView(x1: Rational[], x2: Rational[], columns: [string, string], display: NumberDisplay): StatisticsView {
  const n = x1.length;
  if (n < 2) throw new RangeError('A sample variance needs at least 2 observations (it divides by n − 1)');
  if (x2.length !== n) throw new RangeError('Both columns need the same number of values');
  const N = Rational.of(n);
  const N1 = Rational.of(n - 1);
  const sum = (v: Rational[]) => v.reduce((a, x) => a.add(x), Rational.ZERO);
  const means: [Rational, Rational] = [sum(x1).div(N), sum(x2).div(N)];
  const d1 = x1.map((x) => x.sub(means[0]));
  const d2 = x2.map((x) => x.sub(means[1]));
  const sq1 = d1.map((d) => d.mul(d));
  const sq2 = d2.map((d) => d.mul(d));
  const products = d1.map((d, i) => d.mul(d2[i]));
  const variances: [Rational, Rational] = [sampleVariance(x1), sampleVariance(x2)];
  const covariance = sampleCovariance(x1, x2);
  const stds: [number, number] = [Math.sqrt(variances[0].toNumber()), Math.sqrt(variances[1].toNumber())];

  const t = (x: Rational) => tex(x, display);
  const term = (x: Rational) => (x.isNegative() ? `(${t(x)})` : t(x));
  const f = (x: Rational) => fmt(x, display);
  const signOf = (x: Rational): ProductSign => (x.isZero() ? 0 : x.isNegative() ? -1 : 1);
  const vec = (v: Rational[]) => `\\left(${v.length <= 8 ? v.map(t).join(', ') : `${v.slice(0, 3).map(t).join(', ')}, \\ldots, ${t(v[v.length - 1])}`}\\right)`;

  const steps: Lesson6Step[] = [0, 1].map((j) => {
    const x = j === 0 ? x1 : x2;
    return {
      description: `Sample mean of x${j === 0 ? '₁' : '₂'} (${columns[j]}): add the values, divide by n = ${n}`,
      tex: `\\bar x_${j + 1} = \\frac{1}{n}\\sum_{i=1}^{n} x_${j + 1}^{(i)} = \\frac{1}{${n}}\\left(${sumTerms(x.map(term))}\\right) = \\frac{${t(sum(x))}}{${n}} = ${t(means[j])}`,
    };
  });
  steps.push({
    description: 'Subtract each mean: the deviations from the mean always add up to 0',
    tex: `\\begin{aligned} x_1 - \\bar x_1 &= ${vec(d1)} \\\\ x_2 - \\bar x_2 &= ${vec(d2)} \\end{aligned} \\qquad \\sum_i \\left(x_j^{(i)} - \\bar x_j\\right) = 0`,
  });
  [0, 1].forEach((j) => {
    const sq = j === 0 ? sq1 : sq2;
    const d = j === 0 ? d1 : d2;
    steps.push({
      description: `Sample variance of x${j === 0 ? '₁' : '₂'}: the average squared deviation, dividing by n − 1 = ${n - 1}`,
      tex: `s_${j + 1}^2 = \\frac{1}{n-1}\\sum_{i=1}^{n} \\left(x_${j + 1}^{(i)} - \\bar x_${j + 1}\\right)^2 = \\frac{1}{${n - 1}}\\left(${sumTerms(d.map((x) => `${term(x)}^2`))}\\right) = \\frac{${t(sum(sq))}}{${n - 1}} = ${t(variances[j])}`,
    });
  });
  steps.push({
    description: 'Standard deviation: the square root of the variance, back in the units of the data',
    tex: `s_1 = \\sqrt{${t(variances[0])}} \\approx ${short(stds[0])}, \\qquad s_2 = \\sqrt{${t(variances[1])}} \\approx ${short(stds[1])}`,
  });
  steps.push({
    description: 'Sample covariance: the average product of the two deviations, again dividing by n − 1',
    tex: `\\operatorname{Cov}(x_1, x_2) = \\frac{1}{n-1}\\sum_{i=1}^{n} \\left(x_1^{(i)} - \\bar x_1\\right)\\left(x_2^{(i)} - \\bar x_2\\right) = \\frac{1}{${n - 1}}\\left(${sumTerms(d1.map((x, i) => `${term(x)}${term(d2[i])}`))}\\right) = \\frac{${t(sum(products))}}{${n - 1}} = ${t(covariance)}`,
  });
  steps.push({
    description: 'A variance is the covariance of a variable with itself, so all four numbers fit in one symmetric matrix: Lesson 7’s covariance matrix S',
    tex: `\\operatorname{Cov}(x_j, x_j) = s_j^2, \\qquad S = \\begin{bmatrix} s_1^2 & \\operatorname{Cov}(x_1, x_2) \\\\ \\operatorname{Cov}(x_2, x_1) & s_2^2 \\end{bmatrix} = ${matrixToTex([[t(variances[0]), t(covariance)], [t(covariance), t(variances[1])]], false, {})}`,
  });

  const points = x1.map((x, i) => [x.toNumber(), x2[i].toNumber()] as [number, number]);
  const axis = (vals: number[], title: string) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = 0.15 * Math.max(hi - lo, 1);
    return { min: lo - pad, max: hi + pad, title };
  };
  const c = signOf(covariance);
  return {
    n,
    means,
    variances,
    stds,
    covariance,
    rows: x1.map((x, i) => ({
      x1: f(x),
      x2: f(x2[i]),
      d1: f(d1[i]),
      d2: f(d2[i]),
      sq1: f(sq1[i]),
      sq2: f(sq2[i]),
      product: f(products[i]),
      sign: signOf(products[i]),
    })),
    sums: { x1: f(sum(x1)), x2: f(sum(x2)), d1: f(sum(d1)), d2: f(sum(d2)), sq1: f(sum(sq1)), sq2: f(sum(sq2)), product: f(sum(products)) },
    steps,
    points,
    meanPoint: [means[0].toNumber(), means[1].toNumber()],
    frame: { x: axis(points.map((p) => p[0]), columns[0]), y: axis(points.map((p) => p[1]), columns[1]), size: 8, equalAspect: false },
    matrixTex: `S = ${matrixToTex([[t(variances[0]), t(covariance)], [t(covariance), t(variances[1])]], false, {})}`,
    verdict:
      c > 0
        ? `Cov(x₁, x₂) = ${f(covariance)} > 0: when x₁ is above its mean, x₂ tends to be above its mean too.`
        : c < 0
          ? `Cov(x₁, x₂) = ${f(covariance)} < 0: when x₁ is above its mean, x₂ tends to be below its mean.`
          : 'Cov(x₁, x₂) = 0: no straight-line trend. That is not the same as no relationship — x₂ may still depend on x₁.',
  };
}
