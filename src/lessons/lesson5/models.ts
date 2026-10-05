/**
 * View-models for the Lesson 5 views: the chain and its graph, evolution,
 * estimating P from data, the eigendecomposition, components over time, Pᵗ as
 * rank-1 layers, and Perron–Frobenius. Exact when every eigenvalue is rational
 * (as in the notes) and floating point otherwise; every model that shows
 * eigen-results reports which (F-D10). Kept pure so they can be unit tested.
 */
import type { ChartFrame } from '../../components/canvas/charts';
import type { ComplexCircle, ComplexPoint } from '../../components/canvas/charts/ComplexPlane';
import type { SimplexMarker, SimplexPath } from '../../components/canvas/charts/Simplex';
import { toVec3, type Vec3 } from '../../components/canvas/types';
import type { GraphEdge, GraphNode } from '../../components/diagram/StateGraph';
import { defaultLayout, type Point2 } from '../../components/diagram/stateGraphGeometry';
import { anyMatrixTex, anyVectorEntries, commonDenominator } from '../../components/display/AnyMatrixTex';
import type { Bar } from '../../components/display/BarChart';
import { matrixToTex, type MatrixHighlights } from '../../components/display/MatrixTex';
import { formatRational, rationalTex } from '../../components/display/Num';
import { complex } from '../../core/complex';
import {
  characteristicPolynomial,
  diagonalize,
  eigenpairs,
  eigenvalueAbs,
  eigenvalueNumber,
  eigenvalues,
  eigenvalueTex,
  eigenvalueText,
  eigenvectors,
  polynomialTex,
  shiftedMatrix,
  type Diagonalization,
  type Eigenvalue,
} from '../../core/eigen';
import {
  asFloat,
  asFloatVector,
  EXACT,
  fFrobenius,
  fIdentity,
  fMatMul,
  fMatVec,
  isExact,
  isExactVector,
  type AnyMatrix,
  type AnyVector,
  type FloatMatrix,
  type Precision,
} from '../../core/float';
import {
  checkStochastic,
  estimateTransition,
  evolve,
  matrixPower,
  regularity,
  simulatePath,
  simulateSurfers,
  stationaryDistribution,
  type Regularity,
  type StochasticCheck,
  type TransitionEstimate,
} from '../../core/markov';
import { getColumn, getRow, identity, matrix, matrixEquals, toFloatMatrix, toFloatVector, type Matrix, type Vector } from '../../core/matrix';
import { matMul, matVec, outer } from '../../core/products';
import { Rational } from '../../core/rational';
import { integerFromFloat, scaleUnit, type VectorScaling } from '../../core/scaling';
import { lesson5PresetById } from '../../presets/lesson5';
import type { NumberDisplay } from '../../store/useDataStore';
import { eigenColor, stateColor } from '../../theme/colors';

/** "VΛV⁻¹ = P" style check. */
export interface Check {
  name: string;
  holds: boolean;
  tex: string;
  /** In floating point: the size of the difference. */
  residual?: number;
  reason?: string;
}

/** A step of any Lesson 5 stepper. */
export interface Lesson5Step {
  description: string;
  tex: string;
}

// Helpers -------------------------------------------------------------------------

const ONE = Rational.ONE;
const sumOf = (v: Vector) => v.reduce((s, x) => s.add(x), Rational.ZERO);
const isOne = (l: Eigenvalue) => l.kind === 'rational' && l.value.equals(ONE);
const powR = (r: Rational, t: number) => {
  let p = ONE;
  for (let i = 0; i < t; i++) p = p.mul(r);
  return p;
};
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k: number) => [...String(k)].map((d) => SUBSCRIPTS[Number(d)]).join('');
/** Where x₀ is drawn: its path, its point and the draggable handle. */
export const X0_COLOR = '#E69F00';
const X_EQ_COLOR = '#71717a';
const SELECTED_BG = '#FFF1B8';
/** Distances of exactly 0 cannot sit on a log axis; they are drawn at this floor. */
const LOG_FLOOR = 1e-17;

/**
 * Exact values with long denominators (e.g. 0.5³⁰) are unreadable as fractions;
 * show them as 4-digit decimals instead. TeX and plain-text forms.
 */
const READABLE_DEN = 10000n;
const short = (x: number) => String(Number(x.toPrecision(4)));
function compactTex(r: Rational, display: NumberDisplay): string {
  if (r.isInteger() || (display === 'fraction' && r.den <= READABLE_DEN)) return r.toTex();
  return display === 'decimal' && r.den <= READABLE_DEN ? rationalTex(r, 'decimal', 6) : short(r.toNumber());
}
function compactText(r: Rational, display: NumberDisplay): string {
  if (r.isInteger() || (display === 'fraction' && r.den <= READABLE_DEN)) return formatRational(r, 'fraction');
  return (display === 'decimal' && r.den <= READABLE_DEN ? formatRational(r, 'decimal', 6) : short(r.toNumber())).replace('-', '−');
}
const anyTex = (x: Rational | number, display: NumberDisplay = 'fraction') => (typeof x === 'number' ? short(x) : compactTex(x, display));
const columnTex = (entries: string[]) => matrixToTex(entries.map((e) => [e]), false, {});
const vectorColumnTex = (v: AnyVector, display: NumberDisplay = 'fraction') => columnTex((v as (Rational | number)[]).map((x) => anyTex(x, display)));
const tupleTex = (v: AnyVector) => `(${anyVectorEntries(v, 4).join(', ')})`;
const parenTex = (tex: string) => (/^[0-9.]+$/.test(tex) ? tex : `\\left(${tex}\\right)`);
/** An exact matrix as TeX, or as decimals when its common denominator is too long to read. */
const readableMatrixTex = (M: AnyMatrix) => (isExact(M) && commonDenominator(M) > READABLE_DEN ? anyMatrixTex(asFloat(M), 4) : anyMatrixTex(M, 4));

/** 2–4 states, square. */
function requireChain(P: Matrix): void {
  const n = P.length;
  if (n < 2 || n > 4 || P.some((r) => r.length !== n)) throw new RangeError(`A chain has 2–4 states and a square P; this P is ${n}×${P[0]?.length ?? 0}.`);
}

function columnMessages(check: StochasticCheck): (string | null)[] {
  return check.columns.map((c, j) =>
    c.outOfRange.length > 0 ? `Column ${j + 1} has entries outside [0, 1]` : !c.sumsToOne ? `Column ${j + 1} sums to ${c.sum.toString()}, not 1` : null,
  );
}

/** Views that move distributions need a valid transition matrix. */
function requireStochastic(P: Matrix): void {
  requireChain(P);
  const check = checkStochastic(P);
  if (!check.valid) {
    const problems = columnMessages(check).filter((m): m is string => m !== null);
    throw new Error(`P is not a transition matrix: ${problems.join('; ')}. Fix it in the chain editor.`);
  }
}

const mulAny = (A: AnyMatrix, B: AnyMatrix): AnyMatrix => (isExact(A) && isExact(B) ? matMul(A, B) : fMatMul(asFloat(A), asFloat(B)));

/** Exact equality when both sides are exact; otherwise the Frobenius size of the difference against a tolerance. */
function compare(name: string, tex: string, left: AnyMatrix, right: AnyMatrix): Check {
  if (isExact(left) && isExact(right)) return { name, holds: matrixEquals(left, right), tex };
  const L = asFloat(left);
  const R = asFloat(right);
  const residual = fFrobenius(L.map((r, i) => r.map((x, j) => x - R[i][j])));
  return { name, holds: residual <= 1e-10 * Math.max(1, fFrobenius(R)), tex, residual };
}

function floatPower(F: FloatMatrix, t: number): FloatMatrix {
  let M = fIdentity(F.length);
  for (let i = 0; i < t; i++) M = fMatMul(M, F);
  return M;
}

type Diagonalized = Extract<Diagonalization, { kind: 'diagonalizable' }>;

/** The eigendecomposition, or an error carrying the reason it is unavailable (L5-EG5). */
function requireDiagonal(P: Matrix): Diagonalized {
  requireChain(P);
  const d = diagonalize(P);
  if (d.kind !== 'diagonalizable') throw new Error(d.reason);
  return d;
}

/** Per eigen-index: c, λ, v and λᵗ, exact when the decomposition is. */
interface Pieces {
  exact: boolean;
  c: (Rational | number)[];
  lambdas: (Rational | number)[];
  vectors: AnyVector[];
  power: (t: number) => (Rational | number)[];
}

function piecesOf(d: Diagonalized, x0: Vector): Pieces {
  if (d.precision.kind === 'exact') {
    const V = d.V as Matrix;
    const lambdas = d.eigenvalues.map((l) => (l.kind === 'rational' ? l.value : Rational.ZERO));
    return {
      exact: true,
      c: x0.length ? matVec(d.Vinv as Matrix, x0) : [],
      lambdas,
      vectors: V[0].map((_, i) => getColumn(V, i)),
      power: (t) => lambdas.map((l) => powR(l, t)),
    };
  }
  const V = asFloat(d.V);
  const lambdas = d.eigenvalues.map(eigenvalueNumber);
  return {
    exact: false,
    c: x0.length ? fMatVec(asFloat(d.Vinv), toFloatVector(x0)) : [],
    lambdas,
    vectors: V[0].map((_, i) => V.map((r) => r[i])),
    power: (t) => lambdas.map((l) => l ** t),
  };
}

const scaleAny = (s: Rational | number, v: AnyVector): AnyVector =>
  typeof s === 'number' ? asFloatVector(v).map((x) => s * x) : isExactVector(v) ? v.map((x) => s.mul(x)) : v.map((x) => s.toNumber() * x);
const mulScalar = (a: Rational | number, b: Rational | number): Rational | number =>
  typeof a === 'number' || typeof b === 'number' ? (typeof a === 'number' ? a : a.toNumber()) * (typeof b === 'number' ? b : b.toNumber()) : a.mul(b);
const addAny = (u: AnyVector, v: AnyVector): AnyVector =>
  isExactVector(u) && isExactVector(v) ? u.map((x, i) => x.add(v[i])) : asFloatVector(u).map((x, i) => x + asFloatVector(v)[i]);
const asColumn = (v: AnyVector): AnyMatrix => (isExactVector(v) ? v.map((x) => [x]) : v.map((x) => [x]));

/**
 * |λ₂|: the largest |λ| once one copy of λ₁ = 1 is set aside. It is 1 when
 * λ = 1 repeats or another eigenvalue sits on the unit circle.
 */
function secondEigenvalue(ls: Eigenvalue[]): { abs: number; lambda: Eigenvalue } | null {
  const expanded = ls.flatMap((l) => Array.from({ length: l.multiplicity }, () => l));
  const one = expanded.findIndex(isOne);
  const rest = expanded.filter((_, i) => i !== (one >= 0 ? one : 0));
  if (rest.length === 0) return null;
  const top = rest.reduce((a, b) => (eigenvalueAbs(b) > eigenvalueAbs(a) + 1e-12 ? b : a));
  return { abs: eigenvalueAbs(top), lambda: top };
}

/** Log-axis range around the values: whole decades. */
function decades(values: number[]): { min: number; max: number } {
  const positive = values.filter((v) => v > 0);
  const lo = positive.length ? Math.min(...positive) : LOG_FLOOR;
  const hi = positive.length ? Math.max(...positive) : 1;
  const min = 10 ** Math.floor(Math.log10(lo));
  const max = 10 ** Math.ceil(Math.log10(hi));
  return { min, max: max > min ? max : min * 10 };
}

// §9.1 Chain and transition matrix ------------------------------------------------

export interface ChainView {
  n: number;
  /** One node per state, in its state color; positions from the store or the preset layout (F-D11). */
  nodes: GraphNode[];
  /** One arrow per nonzero p_ji (self-loops included), labeled in the chosen number display. */
  edges: GraphEdge[];
  /** P as TeX entries for the display, in the chosen number display. */
  entries: string[][];
  /** L5-MC3: the selected state's column highlighted; columns "from", rows "to". */
  highlights: MatrixHighlights;
  /** "from 1" … "from n", "to 1" … "to n". */
  columnLabels: string[];
  rowLabels: string[];
  /** L5-MC4 */
  check: StochasticCheck;
  /** One message per column: null when fine, otherwise what is wrong ("column 2 sums to 9/10"). */
  columnMessages: (string | null)[];
}

/** §9.1: P with its graph, kept in sync (L5-MC1–MC4). */
export function chainView(
  P: Matrix,
  stateNames: string[],
  positions: Point2[] | null,
  selected: number | null,
  display: NumberDisplay,
): ChainView {
  requireChain(P);
  const n = P.length;
  const layout = positions && positions.length === n ? positions : defaultLayout(n);
  const nodes: GraphNode[] = layout.map((position, i) => ({ label: stateNames[i] ?? `State ${i + 1}`, color: stateColor(i), position }));
  const edges: GraphEdge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!P[j][i].isZero()) edges.push({ from: i, to: j, label: formatRational(P[j][i], display), highlighted: selected === i });
    }
  }
  const check = checkStochastic(P);
  return {
    n,
    nodes,
    edges,
    entries: P.map((r) => r.map((x) => rationalTex(x, display))),
    highlights: {
      columnColors: P[0].map((_, j) => stateColor(j)),
      entryBackgrounds: selected === null ? undefined : Object.fromEntries(P.map((_, i) => [`${i},${selected}`, SELECTED_BG])),
    },
    columnLabels: P.map((_, j) => `from ${j + 1}`),
    rowLabels: P.map((_, i) => `to ${i + 1}`),
    check,
    columnMessages: columnMessages(check),
  };
}

/** L5-MC5: the transposed convention of other books, said once. */
export const CONVENTION_CAPTION =
  'Many books use the transposed convention: rows sum to 1 and distributions are row vectors, so x(t + 1) = x(t)P. These notes use columns: p_ji is the probability of going from i to j, and x(t + 1) = Px(t).';

// §9.2 Evolution ------------------------------------------------------------------

export interface EvolutionView {
  /** x(0) … x(t), exact. */
  xs: Vector[];
  /** x(t + 1) = P x(t) with the numbers of the last step (L5-EV2). */
  stepTex: string;
  /** L5-EV2: the last step as a Lesson 3 rows × columns trace, one step per entry. */
  rowsTrace: Lesson5Step[];
  /** L5-EV2: one row per t, entries in the chosen number display. */
  table: { t: number; entries: string[] }[];
  /** x(t) as bars, one per state, in its state color. */
  bars: Bar[];
  /** L5-EV5: x(t) = Pᵗx₀ with Pᵗ written out. */
  powerTex: string;
  /** Validation of x₀: entries ≥ 0 summing to 1; null when fine. */
  x0Problem: string | null;
}

/** §9.2 (L5-EV2, L5-EV5). Throws when P is not column-stochastic. */
export function evolutionView(P: Matrix, x0: Vector, t: number, stateNames: string[], display: NumberDisplay): EvolutionView {
  requireStochastic(P);
  if (x0.length !== P.length) throw new RangeError(`x₀ has ${x0.length} entries but the chain has ${P.length} states.`);
  const xs = evolve(P, x0, t);
  const vec = (v: Vector) => columnTex(v.map((x) => compactTex(x, display)));
  const Ptex = matrixToTex(P.map((r) => r.map((x) => compactTex(x, display))), false, {});
  const factor = (x: Rational) => (x.isNegative() ? `(${compactTex(x, display)})` : compactTex(x, display));
  const current = xs[t];
  let stepTex = `x(0) = x_0 = ${vec(x0)}`;
  let rowsTrace: Lesson5Step[] = [];
  if (t > 0) {
    const prev = xs[t - 1];
    stepTex = `x(${t}) = Px(${t - 1}) = ${Ptex}${vec(prev)} = ${vec(current)}`;
    rowsTrace = P.map((row, i) => ({
      description: `Entry ${i + 1} of x(${t}) = row ${i + 1} of P · x(${t - 1})`,
      tex: `${row.map((p, k) => `${factor(p)}\\cdot ${factor(prev[k])}`).join(' + ')} = ${compactTex(current[i], display)}`,
    }));
  }
  const Pt = matrixPower(P, t);
  const sum = sumOf(x0);
  const x0Problem = x0.some((x) => x.isNegative())
    ? 'x₀ has negative entries, so it is not a probability distribution.'
    : !sum.equals(ONE)
      ? `The entries of x₀ sum to ${sum.toString()}, not 1, so it is not a probability distribution.`
      : null;
  return {
    xs,
    stepTex,
    rowsTrace,
    table: xs.map((x, k) => ({ t: k, entries: x.map((v) => compactText(v, display)) })),
    bars: current.map((x, i) => ({ label: stateNames[i] ?? `State ${i + 1}`, value: x.toNumber(), color: stateColor(i), valueLabel: compactText(x, display) })),
    powerTex: `x(${t}) = P^{${t}}x_0 = ${readableMatrixTex(Pt)}${vec(x0)} = ${vec(current)}`,
    x0Problem,
  };
}

export interface SurferView {
  /** L5-EV3: surfers in each state at time t. */
  counts: number[];
  /** counts / N, overlaid on the exact bars. */
  shares: number[];
  seed: number;
  caption: string;
}

/** L5-EV3: N surfers from a seed, at time t. */
export function surferView(P: Matrix, x0: Vector, surfers: number, t: number, seed: number): SurferView {
  requireStochastic(P);
  const counts = simulateSurfers(P, x0, surfers, t, seed)[t];
  return {
    counts,
    shares: counts.map((c) => c / surfers),
    seed,
    caption: `${surfers} surfers at t = ${t}, seed ${seed}; bars are the exact x(t).`,
  };
}

export interface SimplexView {
  /** 2, 3 or 4 states; the simplex is a segment, triangle or tetrahedron. */
  n: 2 | 3 | 4;
  /** L5-EV4: the path of x(t) from x₀, plus paths from every pure state, all converging when P is regular. */
  paths: SimplexPath[];
  /** x(t) now, and x_eq when it is unique. */
  markers: SimplexMarker[];
  /** x₀ as floats, for the draggable point (L5-EV1). */
  x0: number[];
}

/** L5-EV1, L5-EV4 */
export function simplexView(P: Matrix, x0: Vector, t: number): SimplexView {
  requireStochastic(P);
  const n = P.length as 2 | 3 | 4;
  const F = toFloatMatrix(P);
  const pathFrom = (x: number[]) => {
    const points = [x];
    for (let k = 0; k < t; k++) points.push(fMatVec(F, points[k]));
    return points;
  };
  const x0f = toFloatVector(x0);
  const paths: SimplexPath[] = [
    { points: pathFrom(x0f), color: X0_COLOR, label: 'x₀' },
    ...P.map((_, i) => ({ points: pathFrom(P.map((__, k) => (k === i ? 1 : 0))), color: stateColor(i), label: `from state ${i + 1}` })),
  ];
  const markers: SimplexMarker[] = [{ p: paths[0].points[t], color: X0_COLOR, label: `x(${t})` }];
  const st = stationaryDistribution(P);
  if (st.kind === 'unique') markers.push({ p: toFloatVector(st.x), color: X_EQ_COLOR, label: 'x_eq' });
  return { n, paths, markers, x0: x0f };
}

// §9.3 Estimate P from data -------------------------------------------------------

export interface CountStep extends Lesson5Step {
  /** 0-based position of the pair (sequence[index], sequence[index + 1]); −1 before the first pair. */
  index: number;
  /** The transition counted in this step, 0-based. */
  from: number | null;
  to: number | null;
  /** The count table so far, laid out like P (rows "to", columns "from"). */
  counts: number[][];
}

/** L5-ES2: a stepper that walks the sequence pair by pair, filling N(i → j). */
export function countingTrace(sequence: readonly number[], n: number): CountStep[] {
  const counts = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const steps: CountStep[] = [{ index: -1, from: null, to: null, counts: counts.map((r) => [...r]), description: 'Start with an empty count table', tex: '' }];
  for (let k = 0; k + 1 < sequence.length; k++) {
    const from = sequence[k];
    const to = sequence[k + 1];
    counts[to][from]++;
    steps.push({
      index: k,
      from,
      to,
      counts: counts.map((r) => [...r]),
      description: `Pair ${k + 1}: ${from + 1} → ${to + 1}`,
      tex: `N(${from + 1} \\to ${to + 1}) = ${counts[to][from]}`,
    });
  }
  return steps;
}

export interface EstimateView {
  estimate: TransitionEstimate;
  /** L5-ES3: p̂_ji = N(i → j) / N(i → anything), with the notes' formula. */
  formulaTex: string;
  /** P̂ as TeX entries; undefined columns shown as "?" (L5-ES6). */
  entries: string[][];
  /** L5-ES3: the worked example for one entry, e.g. "p̂₁₁ = 2/12 = 1/6". */
  example: string | null;
  /** L5-ES4 */
  mleNote: string;
  /** L5-ES6: one message per state never left. */
  undefinedMessages: string[];
}

/** §9.3 (L5-ES3, L5-ES4, L5-ES6) */
export function estimateView(sequence: readonly number[], n: number, display: NumberDisplay): EstimateView {
  const estimate = estimateTransition(sequence, n);
  const first = estimate.leaving.findIndex((l) => l > 0);
  let example: string | null = null;
  if (first >= 0) {
    const left = estimate.leaving[first];
    const stay = estimate.counts[first][first];
    const s = `${sub(first + 1)}${sub(first + 1)}`;
    const reduced = Rational.of(stay, left).toString();
    example = `State ${first + 1} is left ${left} times, ${stay} of them to state ${first + 1}, so p̂${s} = ${stay}/${left}${reduced === `${stay}/${left}` ? '' : ` = ${reduced}`}.`;
  }
  return {
    estimate,
    formulaTex: '\\hat p_{ji} = \\frac{\\#\\text{ times the chain goes to state } j \\text{ from state } i}{\\#\\text{ times the chain is in state } i \\text{ (with a next state)}} = \\frac{N(i \\to j)}{N(i \\to \\text{anything})}',
    entries: estimate.estimate.map((r) => r.map((x) => (x ? rationalTex(x, display) : '?'))),
    example,
    mleNote:
      'This is the maximum likelihood estimate (MLE): of all transition matrices, it is the one that makes the observed sequence most probable. The last state has no next state, so it is not counted as a visit.',
    undefinedMessages: estimate.undefinedColumns.map(
      (i) => `State ${i + 1} is never left in the sequence, so column ${i + 1} of P̂ is undefined (0/0), not zero.`,
    ),
  };
}

export type PracticeCell = 'correct' | 'wrong' | 'invalid' | 'empty';

export interface PracticeCheck {
  /** L5-ES7: entry by entry against P̂. */
  cells: PracticeCell[][];
  correct: number;
  total: number;
  allCorrect: boolean;
}

/** L5-ES7: the student's matrix checked against P̂ (equal as exact numbers, so 0.5 and 1/2 both count). */
export function practiceCheck(answerCells: string[][], estimate: TransitionEstimate): PracticeCheck {
  let correct = 0;
  const cells: PracticeCell[][] = estimate.estimate.map((row, i) =>
    row.map((expected, j) => {
      const text = (answerCells[i]?.[j] ?? '').trim();
      if (text === '') return 'empty';
      const value = Rational.parse(text);
      if (!value) return 'invalid';
      if (expected && value.equals(expected)) {
        correct++;
        return 'correct';
      }
      return 'wrong';
    }),
  );
  const total = estimate.estimate.length * estimate.estimate.length;
  return { cells, correct, total, allCorrect: correct === total };
}

export interface EstimationErrorView {
  /** L5-ES5: max |p̂_ji − p_ji| for the current simulated sequence. */
  maxError: number;
  /** The error against sequence length on log axes, for sequences simulated from the same seed. */
  frame: ChartFrame;
  points: [number, number][];
  /** The 1/√length reference. */
  reference: { slope: number; through: [number, number]; label: string };
}

/** L5-ES5: only for a simulated sequence, which has a true P to compare with. */
export function estimationErrorView(P: Matrix, estimate: TransitionEstimate, start: number, seed: number): EstimationErrorView {
  requireStochastic(P);
  const n = P.length;
  const maxError = (e: TransitionEstimate) =>
    e.estimate.reduce((m, row, j) => row.reduce((mm, x, i) => (x ? Math.max(mm, Math.abs(x.toNumber() - P[j][i].toNumber())) : mm), m), 0);
  const lengths = [10, 30, 100, 300, 1000, 3000, 10000];
  const floor = 1e-4;
  const points: [number, number][] = lengths.map((L) => [L, Math.max(floor, maxError(estimateTransition(simulatePath(P, start, L, seed), n)))]);
  const { min, max } = decades([...points.map((p) => p[1]), 1]);
  return {
    maxError: maxError(estimate),
    frame: {
      x: { min: 10, max: 10000, title: 'sequence length', log: true },
      y: { min, max, title: 'largest |p̂ − p|', log: true },
      size: 8,
      equalAspect: false,
    },
    points,
    reference: { slope: -0.5, through: points[0], label: '∝ 1/√length' },
  };
}

/** Real eigenvector lines in ℝ³, each with its eigenvalue (L5-EG6). */
function eigenLines(P: Matrix): { dir: Vec3; color: string; label: string; plain: string; lambda: Eigenvalue }[] {
  return eigenpairs(P).flatMap((p, i) =>
    p.vectors.map((v, k) => {
      const u = scaleUnit(v as Vector | number[]);
      const many = p.vectors.length > 1;
      return {
        dir: toVec3(u.map((x) => 3 * x)),
        color: eigenColor(i),
        label: many ? `v_{${i + 1},${k + 1}}` : `v_{${i + 1}}`,
        plain: many ? `v${sub(i + 1)},${sub(k + 1)}` : `v${sub(i + 1)}`,
        lambda: p.eigenvalue,
      };
    }),
  );
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

// §9.4 Eigendecomposition ---------------------------------------------------------

export interface EigenRow {
  eigenvalue: Eigenvalue;
  lambdaTex: string;
  multiplicity: number;
  /** L5-EG2: "N(P − λI)" with P − λI written out (exact λ only). */
  shiftedTex: string | null;
  /** P − λI, for the Lesson 1 elimination link (exact λ only). */
  shifted: Matrix | null;
  /** The eigenvectors as TeX tuples; empty for complex λ. */
  vectors: string[];
}

export type DecompositionPanel =
  | {
      kind: 'available';
      V: AnyMatrix;
      Lambda: AnyMatrix;
      Vinv: AnyMatrix;
      /** L5-EG4: P = VΛV⁻¹. */
      check: Check;
    }
  /** L5-EG5: why V is not invertible, or why the eigenvalues are complex. */
  | { kind: 'unavailable'; reason: string };

export interface EigenView {
  precision: Precision;
  /** F-M33 */
  polynomialTex: string;
  rows: EigenRow[];
  decomposition: DecompositionPanel;
  /** L5-EG4: Pᵏ = VΛᵏV⁻¹ checked against repeated multiplication; null when not diagonalizable. */
  power: { k: number; tex: string; check: Check } | null;
}

/** §9.4 (L5-EG1–EG5) */
export function eigenView(P: Matrix, scaling: Exclude<VectorScaling, 'unit'>, k: number): EigenView {
  requireChain(P);
  const ls = eigenvalues(P);
  const pairs = ls.map((l) => eigenvectors(P, l, scaling));
  const precision = pairs.find((p) => p.precision.kind === 'float')?.precision ?? EXACT;
  const rows: EigenRow[] = pairs.map((p) => {
    const l = p.eigenvalue;
    const shifted = l.kind === 'rational' ? shiftedMatrix(P, l.value) : null;
    return {
      eigenvalue: l,
      lambdaTex: eigenvalueTex(l),
      multiplicity: l.multiplicity,
      shiftedTex: shifted ? `N\\left(P - ${parenTex(eigenvalueTex(l))}I\\right) = N${anyMatrixTex(shifted)}` : null,
      shifted,
      vectors: p.vectors.map(tupleTex),
    };
  });
  const d = diagonalize(P, scaling);
  let decomposition: DecompositionPanel;
  let power: EigenView['power'] = null;
  if (d.kind === 'diagonalizable') {
    decomposition = {
      kind: 'available',
      V: d.V,
      Lambda: d.Lambda,
      Vinv: d.Vinv,
      check: compare('P = VΛV⁻¹', 'V\\Lambda V^{-1} = P', mulAny(mulAny(d.V, d.Lambda), d.Vinv), P),
    };
    const LambdaK: AnyMatrix = isExact(d.Lambda)
      ? d.Lambda.map((r, i) => r.map((x, j) => (i === j ? powR(x, k) : x)))
      : d.Lambda.map((r, i) => r.map((x, j) => (i === j ? x ** k : x)));
    const viaDecomposition = mulAny(mulAny(d.V, LambdaK), d.Vinv);
    power = {
      k,
      tex: `P^{${k}} = V\\Lambda^{${k}}V^{-1} = ${readableMatrixTex(viaDecomposition)}`,
      check: compare(`P^${k}`, `V\\Lambda^{${k}}V^{-1} = ${k === 0 ? 'I' : k === 1 ? 'P' : `\\underbrace{P\\cdots P}_{${k}}`}`, viaDecomposition, matrixPower(P, k)),
    };
  } else {
    decomposition = { kind: 'unavailable', reason: d.reason };
  }
  return { precision, polynomialTex: polynomialTex(characteristicPolynomial(P)), rows, decomposition, power };
}

export interface EigenScene {
  /** L5-EG6: each real eigenvector as a line through the origin. */
  lines: { dir: Vec3; color: string; label: string }[];
  probe: Vec3;
  image: Vec3;
  /** Whether the probe lies on an eigenvector line; then image = λ · probe. */
  onLine: { label: string; lambdaTex: string } | null;
  caption: string;
}

/** L5-EG6: for 3 states only (ℝ³). Throws for other sizes. */
export function eigenScene(P: Matrix, probe: Vec3): EigenScene {
  if (P.length !== 3) throw new RangeError('The ℝ³ picture needs 3 states.');
  const lines = eigenLines(P);
  const image = toVec3(fMatVec(toFloatMatrix(P), probe));
  const size = len3(probe);
  const on = size > 1e-9 ? lines.find((l) => len3(cross(probe, l.dir)) <= 1e-9 * size * len3(l.dir)) : undefined;
  return {
    lines: lines.map(({ dir, color, label }) => ({ dir, color, label })),
    probe,
    image,
    onLine: on ? { label: on.plain, lambdaTex: eigenvalueTex(on.lambda) } : null,
    caption: 'Pu points in a different direction from u, so u is not an eigenvector. Drag u onto a colored line.',
  };
}

/** L5-EG6: snap a dragged probe onto the nearest eigenvector line when it is close. */
export function snapToEigenLine(P: Matrix, probe: Vec3, tolerance = 0.2): Vec3 {
  if (P.length !== 3) return probe;
  const size = Math.max(1, len3(probe));
  for (const l of eigenLines(P)) {
    const d = len3(l.dir);
    const along = (probe[0] * l.dir[0] + probe[1] * l.dir[1] + probe[2] * l.dir[2]) / (d * d);
    const foot: Vec3 = [along * l.dir[0], along * l.dir[1], along * l.dir[2]];
    if (len3([probe[0] - foot[0], probe[1] - foot[1], probe[2] - foot[2]]) < tolerance * size) return foot;
  }
  return probe;
}

export interface NumpyView {
  /** L5-EG7: `np.linalg.eig` code for this P, extending L2-X1. */
  code: string;
  /** What NumPy prints: eigenvalues and unit-length eigenvectors (columns), in its own order and signs. */
  eigenvalues: string[];
  columns: number[][];
  /** "Rescale to the notes' form": integer vectors (F-M37); null where a column has no integer form. */
  rescaled: (Vector | null)[];
  note: string;
}

/** L5-EG7 */
export function numpyView(P: Matrix): NumpyView {
  requireChain(P);
  // A Python literal for an exact entry: 0.7 when it is a short decimal, 1/3 otherwise.
  const py = (r: Rational) => {
    const decimal = String(r.toNumber());
    const back = Rational.parse(decimal);
    return back && back.equals(r) ? decimal : `${r.num}/${r.den}`;
  };
  const rows = P.map((r) => `[${r.map(py).join(', ')}]`);
  const code = [
    'import numpy as np',
    '',
    `P = np.array([${rows.join(`,\n              `)}])`,
    '',
    'eigenvalues, V = np.linalg.eig(P)',
    'print(eigenvalues)  # may come in a different order',
    'print(V)            # column k: a length-1 eigenvector for eigenvalues[k]',
    '',
    "# Rescale column k to the notes' form: divide by its smallest nonzero entry",
    'k = 0',
    'v = V[:, k]',
    'print(v / np.min(np.abs(v[np.abs(v) > 1e-12])))',
  ].join('\n');
  const pairs = eigenpairs(P);
  const real = pairs.filter((p) => p.vectors.length > 0);
  const columns = real.flatMap((p) => p.vectors.map((v) => scaleUnit(v as Vector | number[])));
  return {
    code,
    eigenvalues: pairs.flatMap((p) => Array.from({ length: p.eigenvalue.multiplicity }, () => eigenvalueText(p.eigenvalue, 8))),
    columns,
    rescaled: columns.map((c) => integerFromFloat(c)),
    note: "NumPy scales each eigenvector to length 1, and may list them in a different order or with flipped signs. Any nonzero multiple of an eigenvector is still an eigenvector, so rescaling (divide by the smallest entry, clear denominators) recovers the notes' integer vectors.",
  };
}

// §9.5 Components over time -------------------------------------------------------

export interface Component {
  /** 0-based eigen-index i. */
  index: number;
  color: string;
  /** c_i, λ_i and v_i. */
  coefficient: Rational | number;
  lambdaTex: string;
  vector: AnyVector;
  /** c_i λ_iᵗ v_i at the current t (entries may be negative, L5-CO5). */
  atT: AnyVector;
  /** "\\frac{11}{15}(0.5^t)\\begin{bmatrix}1\\\\0\\\\-1\\end{bmatrix}" */
  tex: string;
}

export interface ComponentsView {
  precision: Precision;
  /** L5-CO1: c = V⁻¹x₀ and x₀ = Σ c_i v_i (the column picture). */
  c: AnyVector;
  combinationTex: string;
  /** L5-CO2: V⁻¹x₀ → Λᵗc → VΛᵗc. */
  steps: Lesson5Step[];
  components: Component[];
  /** Σ c_i λ_iᵗ v_i = x(t), checked against Pᵗx₀. */
  sum: AnyVector;
  check: Check;
  /** L5-CO5 */
  negativeNote: string;
}

/** §9.5. Throws (with L5-EG5's reason) when P is not diagonalizable. */
export function componentsView(P: Matrix, x0: Vector, t: number): ComponentsView {
  const d = requireDiagonal(P);
  const pc = piecesOf(d, x0);
  const lt = pc.power(t);
  const cl = pc.c.map((c, i) => mulScalar(c, lt[i]));
  const components: Component[] = pc.vectors.map((v, i) => ({
    index: i,
    color: eigenColor(i),
    coefficient: pc.c[i],
    lambdaTex: eigenvalueTex(d.eigenvalues[i]),
    vector: v,
    atT: scaleAny(cl[i], v),
    tex: `${parenTex(anyTex(pc.c[i]))}\\,${parenTex(eigenvalueTex(d.eigenvalues[i]))}^{${t}}${vectorColumnTex(v)} = ${vectorColumnTex(scaleAny(cl[i], v))}`,
  }));
  const sum = components.map((c) => c.atT).reduce(addAny);
  const xt: AnyVector = pc.exact ? evolve(P, x0, t)[t] : fMatVec(floatPower(toFloatMatrix(P), t), toFloatVector(x0));
  const terms = components.map((c, i) => `${parenTex(anyTex(pc.c[i]))}${vectorColumnTex(c.vector)}`);
  return {
    precision: d.precision,
    c: pc.c as AnyVector,
    combinationTex: `x_0 = ${components.map((_, i) => `c_${i + 1}v_${i + 1}`).join(' + ')} = ${terms.join(' + ')}`,
    steps: [
      { description: 'First, V⁻¹x₀ gives the cᵢ’s.', tex: `c = V^{-1}x_0 = ${vectorColumnTex(pc.c as AnyVector)}` },
      { description: 'Next, Λᵗc brings in the λᵢᵗ’s: now we have the cᵢλᵢᵗ’s.', tex: `\\Lambda^{${t}}c = ${vectorColumnTex(cl as AnyVector)}` },
      { description: 'Finally, V(Λᵗc) brings in the vᵢ’s and adds up the cᵢλᵢᵗvᵢ’s.', tex: `V\\Lambda^{${t}}c = ${vectorColumnTex(sum)} = x(${t})` },
    ],
    components,
    sum,
    check: compare('sum', `\\sum_i c_i\\lambda_i^{${t}}v_i = P^{${t}}x_0`, asColumn(sum), asColumn(xt)),
    negativeNote: 'Each component cᵢλᵢᵗvᵢ can have negative entries; only their sum x(t) is a probability vector.',
  };
}

export interface ComponentsChart {
  frame: ChartFrame;
  /** L5-CO3: |c_i λ_iᵗ| · ‖v_i‖ against t, one series per component; straight lines on a log axis. */
  series: { label: string; color: string; points: [number, number][] }[];
}

/** L5-CO3 */
export function componentsChart(P: Matrix, x0: Vector, tMax: number, log: boolean): ComponentsChart {
  const d = requireDiagonal(P);
  const pc = piecesOf(d, x0);
  const c = pc.c.map((x) => (typeof x === 'number' ? x : x.toNumber()));
  const l = pc.lambdas.map((x) => (typeof x === 'number' ? x : x.toNumber()));
  const norms = pc.vectors.map((v) => Math.hypot(...asFloatVector(v)));
  const series = pc.vectors.map((_, i) => {
    const points: [number, number][] = [];
    for (let t = 0; t <= tMax; t++) {
      const value = Math.abs(c[i] * l[i] ** t) * norms[i];
      if (!log || value > 0) points.push([t, value]);
    }
    return { label: `‖c${sub(i + 1)}λ${sub(i + 1)}ᵗv${sub(i + 1)}‖, λ = ${eigenvalueText(d.eigenvalues[i])}`, color: eigenColor(i), points };
  });
  const values = series.flatMap((s) => s.points.map((p) => p[1]));
  const y = log ? { ...decades(values), title: 'size of component', log: true } : { min: 0, max: Math.max(...values, 1e-9) * 1.1, title: 'size of component' };
  return { frame: { x: { min: 0, max: tMax, title: 't' }, y, size: 8, equalAspect: false }, series };
}

export interface ComponentsScene {
  /** L5-CO4: c₁λ₁ᵗv₁, c₂λ₂ᵗv₂, c₃λ₃ᵗv₃ tip to tail. */
  arrows: { from: Vec3; to: Vec3; color: string; label: string }[];
  /** x(t), the sum. */
  total: Vec3;
}

/** L5-CO4: 3 states only. */
export function componentsScene(P: Matrix, x0: Vector, t: number): ComponentsScene {
  if (P.length !== 3) throw new RangeError('The ℝ³ picture needs 3 states.');
  const d = requireDiagonal(P);
  const pc = piecesOf(d, x0);
  const lt = pc.power(t);
  let at: Vec3 = [0, 0, 0];
  const arrows = pc.vectors.map((v, i) => {
    const step = toVec3(asFloatVector(scaleAny(mulScalar(pc.c[i], lt[i]), v)));
    const to: Vec3 = [at[0] + step[0], at[1] + step[1], at[2] + step[2]];
    const arrow = { from: at, to, color: eigenColor(i), label: `c_{${i + 1}}\\lambda_{${i + 1}}^{${t}}v_{${i + 1}}` };
    at = to;
    return arrow;
  });
  return { arrows, total: at };
}

/** v_i w_iᵀ (w_iᵀ row i of V⁻¹), exact when the decomposition is: the t-independent part of each layer. */
function layerBases(d: Diagonalized): AnyMatrix[] {
  if (d.precision.kind === 'exact') {
    const V = d.V as Matrix;
    const W = d.Vinv as Matrix;
    return V[0].map((_, i) => outer(getColumn(V, i), getRow(W, i)));
  }
  const V = asFloat(d.V);
  const W = asFloat(d.Vinv);
  return V[0].map((_, i) => V.map((r) => W[i].map((w) => r[i] * w)));
}

const scaleMatrix = (s: Rational | number, M: AnyMatrix): AnyMatrix =>
  typeof s !== 'number' && isExact(M) ? M.map((r) => r.map((x) => s.mul(x))) : asFloat(M).map((r) => r.map((x) => (typeof s === 'number' ? s : s.toNumber()) * x));
const addMatrices = (A: AnyMatrix, B: AnyMatrix): AnyMatrix =>
  isExact(A) && isExact(B) ? A.map((r, i) => r.map((x, j) => x.add(B[i][j]))) : asFloat(A).map((r, i) => r.map((x, j) => x + asFloat(B)[i][j]));
const zerosLike = (M: AnyMatrix): AnyMatrix => (isExact(M) ? M.map((r) => r.map(() => Rational.ZERO)) : M.map((r) => r.map(() => 0)));

/** Notes §5.3 as printed (L5-RK5): 60 × the 0.5ᵗ and 0.2ᵗ layers. */
const NOTES_PRINTED_LAYERS = {
  half: [
    [44, -36, -16],
    [0, 0, 0],
    [44, -36, -16],
  ],
  fifth: [
    [-5, 15, -5],
    [-15, 45, -15],
    [20, -60, -20],
  ],
};
const MINI_WEB = matrix(lesson5PresetById('miniWeb')!.P);

// §9.6 Pᵗ as rank-1 layers --------------------------------------------------------

export interface PowerLayer {
  index: number;
  color: string;
  /** λ_iᵗ v_i w_iᵀ, w_iᵀ row i of V⁻¹. */
  matrix: AnyMatrix;
  /** Floats for the heatmap. */
  entries: number[][];
  /** "\\frac{0.5^t}{60}\\begin{bmatrix}…\\end{bmatrix}" */
  tex: string;
  /** L5-RK2: the λ = 1 layer, whose columns are all x_eq. */
  stationary: boolean;
  /** Frobenius size at the current t; fades as t grows (L5-RK1). */
  size: number;
}

export interface PowerLayersView {
  precision: Precision;
  layers: PowerLayer[];
  /** Pᵗ itself. */
  total: number[][];
  /** L5-RK3: keeping only the first `keep` layers (the λ = 1 layer first). */
  keep: number;
  partial: number[][];
  leftover: number[][];
  leftoverSize: number;
  /** Shared heatmap scale over every layer, the total and the leftover. */
  maxAbs: number;
  /** L5-RK4: at t = 0 the layers add up to I. */
  identityCheck: Check;
  /** L5-RK2 */
  stationaryCaption: string;
  /** L5-RK5: the notes' printed layers fail the t = 0 check; the computed ones pass. */
  notesCheck: string | null;
}

/** §9.6. Throws (with L5-EG5's reason) when P is not diagonalizable. */
export function powerLayersView(P: Matrix, t: number, keep: number): PowerLayersView {
  const d = requireDiagonal(P);
  const pc = piecesOf(d, [] as Vector);
  const lt = pc.power(t);
  const bases = layerBases(d);
  const layers: PowerLayer[] = bases.map((base, i) => {
    const m = scaleMatrix(lt[i], base);
    const entries = asFloat(m);
    const l = d.eigenvalues[i];
    return {
      index: i,
      color: eigenColor(i),
      matrix: m,
      entries,
      tex: isOne(l) ? anyMatrixTex(base, 4) : `${parenTex(eigenvalueTex(l))}^{${t}}\\cdot ${anyMatrixTex(base, 4)}`,
      stationary: isOne(l),
      size: fFrobenius(entries),
    };
  });
  const total = pc.exact ? toFloatMatrix(matrixPower(P, t)) : asFloat(layers.map((l) => l.matrix).reduce(addMatrices));
  const kept = Math.max(0, Math.min(keep, layers.length));
  const partial = layers.slice(0, kept).reduce((acc, l) => acc.map((r, i) => r.map((x, j) => x + l.entries[i][j])), total.map((r) => r.map(() => 0)));
  const leftover = total.map((r, i) => r.map((x, j) => x - partial[i][j]));
  const maxAbs = Math.max(1e-12, ...[...layers.map((l) => l.entries), total, leftover].flat(2).map(Math.abs));
  const n = P.length;
  const identityCheck = compare('t = 0', '\\sum_i v_i w_i^{\\mathsf T} = I', bases.reduce(addMatrices, zerosLike(bases[0])), pc.exact ? identity(n) : fIdentity(n));
  const ones = layers.filter((l) => l.stationary);
  const stationaryCaption =
    ones.length === 1
      ? `The λ = 1 layer never fades: every column is the stationary distribution x_eq = (${(isExact(ones[0].matrix) ? getColumn(ones[0].matrix, 0).map((x) => x.toString()) : ones[0].entries.map((r) => short(r[0]))).join(', ')}).`
      : ones.length > 1
        ? 'λ = 1 appears more than once, so several layers persist and the limit depends on where the chain starts.'
        : 'No layer has λ = 1, so P is not a transition matrix.';
  let notesCheck: string | null = null;
  if (pc.exact && matrixEquals(P, MINI_WEB)) {
    const printed = [bases[0], matrix(NOTES_PRINTED_LAYERS.half).map((r) => r.map((x) => x.div(Rational.of(60)))), matrix(NOTES_PRINTED_LAYERS.fifth).map((r) => r.map((x) => x.div(Rational.of(60))))];
    const sum = printed.reduce(addMatrices) as Matrix;
    notesCheck = `As printed, the notes' 0.5ᵗ layer has third row (44, −36, −16) and the 0.2ᵗ layer ends in −20. With those signs the layers add up at t = 0 to a matrix whose third row is (${sum[2].map((x) => x.toString()).join(', ')}), not (0, 0, 1). The layers above are recomputed from V and V⁻¹ and pass the check.`;
  }
  return { precision: d.precision, layers, total, keep: kept, partial, leftover, leftoverSize: fFrobenius(leftover), maxAbs, identityCheck, stationaryCaption, notesCheck };
}

export interface PowerLayersStep extends Lesson5Step {
  /** VΛᵗ in the first step; then the running sum of layers (L3-MM3 columns × rows). */
  matrix: AnyMatrix;
  /** The layer added in this step, if any. */
  layer: number | null;
}

/** L5-RK6: first VΛᵗ, then VΛᵗ times V⁻¹ columns × rows, one layer per step. */
export function powerLayersTrace(P: Matrix, t: number): PowerLayersStep[] {
  const d = requireDiagonal(P);
  const pc = piecesOf(d, [] as Vector);
  const lt = pc.power(t);
  const VL: AnyMatrix = pc.exact
    ? (d.V as Matrix).map((r) => r.map((x, i) => x.mul(lt[i] as Rational)))
    : asFloat(d.V).map((r) => r.map((x, i) => x * (lt[i] as number)));
  const steps: PowerLayersStep[] = [
    { description: 'First VΛᵗ: column i of V times λᵢᵗ.', tex: `V\\Lambda^{${t}}`, matrix: VL, layer: null },
  ];
  const W = d.Vinv;
  let running = zerosLike(VL);
  for (let k = 0; k < VL.length; k++) {
    const layer: AnyMatrix =
      isExact(VL) && isExact(W) ? outer(getColumn(VL, k), getRow(W, k)) : asFloat(VL).map((r) => asFloat(W)[k].map((w) => r[k] * w));
    running = addMatrices(running, layer);
    steps.push({
      description: `Add column ${k + 1} of VΛᵗ times row ${k + 1} of V⁻¹: the λ${sub(k + 1)} = ${eigenvalueText(d.eigenvalues[k])} layer.`,
      tex: `\\text{layer} = ${readableMatrixTex(layer)}`,
      matrix: running,
      layer: k,
    });
  }
  return steps;
}

// §9.7 Perron–Frobenius and the stationary distribution ---------------------------

export interface StationaryWays {
  /** L5-PF3: (P − I)x = 0 with entries summing to 1, by elimination (exact). */
  elimination: Vector | null;
  /** The λ = 1 eigenvector scaled to sum to 1. */
  eigenvector: AnyVector | null;
  /** A column of Pᵗ for large t, with that t. */
  power: { t: number; column: number[] };
  /** "Entries agree" or what differs (multiple stationary distributions, no convergence). */
  agreement: string;
}

export interface PerronView {
  /** L5-PF1: eigenvalues in the complex plane; λ₁ = 1 highlighted. */
  points: ComplexPoint[];
  /** L5-PF1: a circle at |λ₂|, labeled as the convergence rate. */
  circles: ComplexCircle[];
  lambda2Abs: number | null;
  /** L5-PF2 */
  regularity: Regularity;
  regularityText: string;
  /** Pᵏ as a heatmap for the regular k (or the last power tried). */
  powerHeatmap: { k: number; entries: number[][] } | null;
  stationary: StationaryWays;
  /** L5-PF4: x_eq as percentages, e.g. "35%". */
  percentages: string[];
  /** L5-PF7: the theorem stated precisely, with the notes' two slips corrected. */
  theorem: string;
  /** L5-PF8 */
  summary: string;
}

/** §9.7 (L5-PF1–PF4, PF7, PF8) */
export function perronView(P: Matrix): PerronView {
  requireStochastic(P);
  const ls = eigenvalues(P);
  const second = secondEigenvalue(ls);
  const points: ComplexPoint[] = ls.map((l) => ({
    z: l.kind === 'complex' ? l.value : complex(eigenvalueNumber(l)),
    color: isOne(l) ? eigenColor(0) : eigenColor(1),
    label: `λ = ${eigenvalueText(l)}${l.multiplicity > 1 ? ` (×${l.multiplicity})` : ''}`,
    highlighted: isOne(l),
  }));
  const lambda2Abs = second ? second.abs : null;
  const circles: ComplexCircle[] =
    lambda2Abs !== null && lambda2Abs > 0 && lambda2Abs < 1 - 1e-9 ? [{ radius: lambda2Abs, color: eigenColor(1), label: `|λ₂| ≈ ${short(lambda2Abs)}: convergence rate`, dashed: true }] : [];
  const reg = regularity(P);
  const regularityText = reg.regular
    ? reg.k === 1
      ? 'P is regular: every entry of P itself is positive (k = 1).'
      : `P is regular: P^${reg.k} is the first power with every entry positive.`
    : `P is not regular: some entry of Pᵏ is 0 for every k up to ${reg.bound} = (n − 1)² + 1, and therefore for every k.`;
  const heatPower = reg.regular ? { k: reg.k, M: reg.power } : { k: reg.bound, M: matrixPower(P, reg.bound) };
  const st = stationaryDistribution(P);
  const elimination = st.kind === 'unique' ? st.x : null;
  const oneEigen = ls.find(isOne);
  const eigenvector = oneEigen && oneEigen.multiplicity === 1 ? (eigenvectors(P, oneEigen, 'probability').vectors[0] ?? null) : null;
  const bigT = 60;
  const column = floatPower(toFloatMatrix(P), bigT).map((r) => r[0]);
  let agreement: string;
  if (!elimination) agreement = 'λ = 1 has more than one independent eigenvector, so there is no single x_eq: each column of Pᵗ is the limit from its own pure start.';
  else if (elimination.every((x, i) => Math.abs(x.toNumber() - column[i]) < 1e-6)) agreement = 'All three agree.';
  else agreement = 'Elimination and the eigenvector agree, but the columns of Pᵗ never settle down (|λ₂| = 1), so they are not x_eq.';
  return {
    points,
    circles,
    lambda2Abs,
    regularity: reg,
    regularityText,
    powerHeatmap: { k: heatPower.k, entries: toFloatMatrix(heatPower.M) },
    stationary: { elimination, eigenvector, power: { t: bigT, column }, agreement },
    percentages: elimination ? elimination.map((x) => `${+(x.toNumber() * 100).toFixed(1)}%`) : [],
    theorem:
      'Perron–Frobenius theorem (the notes misspell the name): for a regular transition matrix P, the largest eigenvalue is λ₁ = 1 with multiplicity 1, every other eigenvalue has |λ| < 1, and exactly one eigenvector for λ₁ has positive entries summing to 1 — the stationary distribution x_eq. Since aᵗ → 0 when |a| < 1 (the notes have |a| < 0), every other component dies out and x(t) → x_eq from any start.',
    summary:
      'The eigendecomposition of the transition matrix reveals the persistent component of the chain — an example of the course theme: matrix factorization uncovers information in a system or a data set.',
  };
}

export interface ConvergenceChart {
  /** L5-PF6: ‖x(t) − x_eq‖ against t on a log y axis. */
  frame: ChartFrame;
  points: [number, number][];
  /** The line with slope log₁₀|λ₂| per step, sampled for drawing; null when x_eq is not unique or |λ₂| = 0. */
  reference: { slope: number; points: [number, number][]; label: string } | null;
  /** When x(t) does not converge (|λ₂| = 1), why. */
  note: string | null;
}

/** L5-PF6 */
export function convergenceChart(P: Matrix, x0: Vector, tMax: number): ConvergenceChart {
  requireStochastic(P);
  const F = toFloatMatrix(P);
  const xs = [toFloatVector(x0)];
  for (let t = 0; t < tMax; t++) xs.push(fMatVec(F, xs[t]));
  const st = stationaryDistribution(P);
  const second = secondEigenvalue(eigenvalues(P));
  let note: string | null = null;
  let target: number[];
  if (st.kind === 'unique') target = toFloatVector(st.x);
  else {
    target = fMatVec(floatPower(F, 2000), toFloatVector(x0));
    note = 'λ = 1 is repeated, so there is more than one stationary distribution; the distances here are to the limit from this x₀.';
  }
  const points: [number, number][] = xs.map((x, t) => [t, Math.max(LOG_FLOOR, Math.hypot(...x.map((v, i) => v - target[i])))]);
  let reference: ConvergenceChart['reference'] = null;
  if (st.kind === 'unique' && second) {
    if (second.abs >= 1 - 1e-9) {
      note = `Another eigenvalue has |λ| = 1 (λ = ${eigenvalueText(second.lambda)}), so its component never decays: x(t) keeps moving and does not converge, even though x_eq exists.`;
    } else if (second.abs > 0) {
      const slope = Math.log10(second.abs);
      const mid = Math.round(tMax / 2);
      const through = points[mid];
      reference = {
        slope,
        points: points.map(([t]) => [t, through[1] * 10 ** (slope * (t - mid))]),
        label: `slope log₁₀|λ₂| ≈ ${slope.toFixed(3)} per step`,
      };
    }
  }
  const { min, max } = decades(points.map((p) => p[1]));
  return {
    frame: { x: { min: 0, max: tMax, title: 't' }, y: { min, max, title: '‖x(t) − x_eq‖', log: true }, size: 8, equalAspect: false },
    points,
    reference,
    note,
  };
}

export interface LongRunView {
  /** L5-PF4: share of surfers in each state after many steps, against x_eq. */
  simulated: number[];
  exact: number[] | null;
  bars: Bar[];
  caption: string;
}

/** L5-PF4: the surfer simulation's long-run counts against x_eq. */
export function longRunView(P: Matrix, x0: Vector, surfers: number, seed: number, stateNames: string[]): LongRunView {
  requireStochastic(P);
  const steps = 100;
  const counts = simulateSurfers(P, x0, surfers, steps, seed)[steps];
  const simulated = counts.map((c) => c / surfers);
  const st = stationaryDistribution(P);
  const exact = st.kind === 'unique' ? toFloatVector(st.x) : null;
  return {
    simulated,
    exact,
    bars: simulated.map((v, i) => ({ label: stateNames[i] ?? `State ${i + 1}`, value: v, color: stateColor(i), valueLabel: `${(v * 100).toFixed(1)}%` })),
    caption: `${surfers} surfers after ${steps} steps, seed ${seed}.`,
  };
}
