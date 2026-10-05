/**
 * View-models for the Lesson 5 views: the chain and its graph, evolution,
 * estimating P from data, the eigendecomposition, components over time, Pᵗ as
 * rank-1 layers, and Perron–Frobenius. Exact when every eigenvalue is rational
 * (as in the notes) and floating point otherwise; every model that shows
 * eigen-results reports which (F-D10). Kept pure so they can be unit tested.
 */
import type { ChartFrame } from '../../components/canvas/charts';
import type { SimplexMarker, SimplexPath } from '../../components/canvas/charts/Simplex';
import type { ComplexCircle, ComplexPoint } from '../../components/canvas/charts/ComplexPlane';
import type { Vec3 } from '../../components/canvas/types';
import type { GraphEdge, GraphNode } from '../../components/diagram/StateGraph';
import type { Point2 } from '../../components/diagram/stateGraphGeometry';
import type { Bar } from '../../components/display/BarChart';
import type { MatrixHighlights } from '../../components/display/MatrixTex';
import type { Eigenvalue } from '../../core/eigen';
import type { AnyMatrix, AnyVector, Precision } from '../../core/float';
import type { Regularity, StochasticCheck, TransitionEstimate } from '../../core/markov';
import type { Matrix, Vector } from '../../core/matrix';
import { notImplemented } from '../../core/notImplemented';
import type { Rational } from '../../core/rational';
import type { VectorScaling } from '../../core/scaling';
import type { NumberDisplay } from '../../store/useDataStore';

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
  return notImplemented('chainView');
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
  return notImplemented('evolutionView');
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
  return notImplemented('surferView');
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
  return notImplemented('simplexView');
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
  return notImplemented('countingTrace');
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
  return notImplemented('estimateView');
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
  return notImplemented('practiceCheck');
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
  return notImplemented('estimationErrorView');
}

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
  return notImplemented('eigenView');
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
  return notImplemented('eigenScene');
}

/** L5-EG6: snap a dragged probe onto the nearest eigenvector line when it is close. */
export function snapToEigenLine(P: Matrix, probe: Vec3, tolerance = 0.2): Vec3 {
  return notImplemented('snapToEigenLine');
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
  return notImplemented('numpyView');
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
  return notImplemented('componentsView');
}

export interface ComponentsChart {
  frame: ChartFrame;
  /** L5-CO3: |c_i λ_iᵗ| · ‖v_i‖ against t, one series per component; straight lines on a log axis. */
  series: { label: string; color: string; points: [number, number][] }[];
}

/** L5-CO3 */
export function componentsChart(P: Matrix, x0: Vector, tMax: number, log: boolean): ComponentsChart {
  return notImplemented('componentsChart');
}

export interface ComponentsScene {
  /** L5-CO4: c₁λ₁ᵗv₁, c₂λ₂ᵗv₂, c₃λ₃ᵗv₃ tip to tail. */
  arrows: { from: Vec3; to: Vec3; color: string; label: string }[];
  /** x(t), the sum. */
  total: Vec3;
}

/** L5-CO4: 3 states only. */
export function componentsScene(P: Matrix, x0: Vector, t: number): ComponentsScene {
  return notImplemented('componentsScene');
}

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
  return notImplemented('powerLayersView');
}

export interface PowerLayersStep extends Lesson5Step {
  /** VΛᵗ in the first step; then the running sum of layers (L3-MM3 columns × rows). */
  matrix: AnyMatrix;
  /** The layer added in this step, if any. */
  layer: number | null;
}

/** L5-RK6: first VΛᵗ, then VΛᵗ times V⁻¹ columns × rows, one layer per step. */
export function powerLayersTrace(P: Matrix, t: number): PowerLayersStep[] {
  return notImplemented('powerLayersTrace');
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
  return notImplemented('perronView');
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
  return notImplemented('convergenceChart');
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
  return notImplemented('longRunView');
}
