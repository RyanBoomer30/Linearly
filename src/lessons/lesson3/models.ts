/**
 * View-models for the Lesson 3 views: turn exact results from the core
 * (product traces, LU, substitution, permutations, operation counts) into what
 * the views draw (TeX, highlights, heatmap values, chart points). Kept pure so
 * they can be unit tested.
 */
import type { ChartFrame, ScatterPoint } from '../../components/canvas/charts';
import type { LduResult, LuResult, Pivoting } from '../../core/lu';
import type { Matrix, Vector } from '../../core/matrix';
import { notImplemented } from '../../core/notImplemented';
import type { Swap } from '../../core/permutation';
import type { ProductMode } from '../../core/productTrace';
import type { Rational } from '../../core/rational';
import type { SubstitutionResult } from '../../core/substitution';
import type { Cell } from '../../core/trace';
import type { LayerSource } from '../../store/useLesson3Store';

/** "LU = A" style check shown under a result. */
export interface Check {
  equal: boolean;
  tex: string;
}

// §7.1 Two ways to multiply ----------------------------------------------------

export interface ProductShape {
  m: number;
  p: number;
  n: number;
  /** "(3 \\times 2)(2 \\times 3) = 3 \\times 3" */
  tex: string;
  /** L3-MM1: null when the inner sizes match. */
  mismatch: string | null;
}

export interface TwoWaysStep {
  description: string;
  tex: string;
  /** The product so far: computed entries (rows × columns) or the running sum (columns × rows). */
  partial: Matrix;
  /** Rows × columns (L3-MM2): row i of B, column j of C, entry (i, j). */
  entry: Cell | null;
  /** Columns × rows (L3-MM3): column k of B, row k of C, and their outer product. */
  k: number | null;
  layer: Matrix | null;
}

export interface TwoWaysView {
  shape: ProductShape;
  mode: ProductMode;
  steps: TwoWaysStep[];
  result: Matrix;
  /** L3-MM4: both modes end at the same matrix. */
  check: Check;
  /** L3-MM5: C has one column, so the product is Ax with A = B and x = C. */
  vectorCase: { rowPicture: string; columnPicture: string } | null;
}

/** Throws a RangeError with the L3-MM1 message when the inner sizes differ. */
export function twoWaysView(B: Matrix, C: Matrix, mode: ProductMode): TwoWaysView {
  return notImplemented('twoWaysView');
}

export function productShape(B: Matrix, C: Matrix): ProductShape {
  return notImplemented('productShape');
}

/** L3-MM4: the step in the other mode at the same point of progress, so switching keeps the position. */
export function matchingStep(B: Matrix, C: Matrix, from: ProductMode, index: number): number {
  return notImplemented('matchingStep');
}

// §7.2 Rank-1 layers -----------------------------------------------------------

export interface Layer {
  /** 0-based position in the factorization (before any sorting). */
  index: number;
  matrix: Matrix;
  /** 1, or 0 when a factor is zero (L3-R2). */
  rank: 0 | 1;
  /** ‖b_k c_k*‖² = ‖b_k‖²‖c_k‖², exact (F-M23). */
  normSquared: Rational;
  /** ‖b_k c_k*‖ as a decimal. */
  size: number;
  /** "b_1 c_1^*" with the vectors written out. */
  tex: string;
}

export interface LayersView {
  source: LayerSource;
  /** In display order: factorization order, or largest first when sorted. */
  layers: Layer[];
  total: Matrix;
  /** L3-R3: how many layers are kept (from the front of `layers`). */
  keep: number;
  partial: Matrix;
  leftover: Matrix;
  leftoverSize: number;
  /** Shared heatmap scale: the largest |entry| over every layer, the total and the leftover. */
  maxAbs: number;
  /** L3-R5 */
  caption: string;
}

/**
 * The product (B, C) or a factorization of A (CR from Lesson 1, LU from
 * §7.3) as a stack of rank-1 layers. Throws when LU stops at a zero pivot.
 */
export function layersView(source: LayerSource, input: { A: Matrix; B: Matrix; C: Matrix }, keep: number, sortBySize: boolean): LayersView {
  return notImplemented('layersView');
}

// §7.3 LU decomposition ---------------------------------------------------------

export interface LuStepView {
  description: string;
  tex: string;
  /** The matrix being reduced, after this step. */
  current: Matrix;
  /** L so far (L3-LU2). */
  L: Matrix;
  /** Current matrix with multipliers stored below the diagonal (L3-LU4). */
  compact: Matrix;
  /** The multiplier found in this step: it flies to L[row][col] (L3-LU1, F-D9). */
  multiplier: { row: number; col: number; value: Rational } | null;
  /** A row exchange in this step (rows trade places, F-D9). */
  swap: Swap | null;
  changedRows: number[];
  pivot: Cell | null;
  /** L3-LU2: (L so far)(current) = PA at every step. */
  check: Check;
}

export interface LuView {
  result: LuResult;
  steps: LuStepView[];
  /** L3-LU5: LU = A (PA = LU with pivoting). */
  finalCheck: Check;
  /** "1s on the diagonal, 0s above, multipliers below." */
  recipe: string;
  /** L3-LU8: the notes' general formula writes column 2 of L as (1, 1, l₃₂); it is (0, 1, l₃₂). */
  notationNote: string;
  /** L3-LU6 / L3-LU7: why elimination stopped, or that U is singular. null when complete. */
  statusMessage: string | null;
  /** L3-LU6: offer to continue in the PA = LU view. */
  needsRowExchange: boolean;
}

export function luView(A: Matrix, pivoting: Pivoting): LuView {
  return notImplemented('luView');
}

export interface PeelingView {
  /** l_k u_k*, k = 1 … n. */
  layers: Matrix[];
  /** What is left after each layer; each has one more zero row and column at the top left. */
  remainders: Matrix[];
  maxAbs: number;
  /** "A − l_1u_1^*" … */
  captions: string[];
}

/** L3-LU3: A = l₁u₁* + l₂u₂* + ⋯ using the layer heatmaps. Throws when LU stops. */
export function peelingView(A: Matrix, pivoting: Pivoting): PeelingView {
  return notImplemented('peelingView');
}

// §7.4 Solving Ax = b with LU ------------------------------------------------------

export interface ChainLink {
  from: 'b' | 'Pb' | 'c';
  to: 'c' | 'x';
  /** "Lc = b" */
  tex: string;
  shape: 'lower' | 'upper';
}

export interface SolveView {
  P: Matrix;
  L: Matrix;
  U: Matrix;
  /** Pb (= b without row exchanges). */
  Pb: Vector;
  /** L3-S1 */
  forward: SubstitutionResult;
  /** L3-S2; null when LU itself stopped. */
  back: SubstitutionResult | null;
  /** L3-S3: b → c → x. */
  chain: ChainLink[];
  x: Vector | null;
  /** L3-S4 */
  check: Check | null;
  /** L3-S5 or an LU stop. */
  message: string | null;
}

export function solveView(A: Matrix, b: Vector, pivoting: Pivoting): SolveView {
  return notImplemented('solveView');
}

// §7.5 Many right-hand sides and the cost of solving -------------------------------------

export interface ManyRhsView {
  /** L3-K1: one row per right-hand side. */
  rows: { k: number; b: Vector; c: Vector | null; x: Vector | null }[];
  /** L3-K2: running totals after each right-hand side. */
  costs: { fromScratch: number[]; withLu: number[] };
  factorCost: number;
  solveCost: number;
  /** L3-K5 */
  rule: string;
}

export function manyRhsView(A: Matrix, rhs: Vector[], pivoting: Pivoting): ManyRhsView {
  return notImplemented('manyRhsView');
}

export interface GrowthSeries {
  label: string;
  color: string;
  points: [number, number][];
}

export interface GrowthChart {
  frame: ChartFrame;
  /** Closed forms up to n = 100. */
  curves: GrowthSeries[];
  /** Counted on random integer matrices, n ≤ 8. */
  measured: GrowthSeries[];
  logLog: boolean;
  /** L3-K3: slopes on the log–log plot, about 3 (factor) and 2 (each solve). */
  slopes: { factor: number; solve: number };
}

export function growthChart(logLog: boolean): GrowthChart {
  return notImplemented('growthChart');
}

export interface HousingYear {
  label: string;
  color: string;
  Atb: Vector;
  theta: Vector;
  /** The fitted line h(x) = θ₀ + θ₁x over the plot's x range. */
  curve: [number, number][];
}

export interface HousingYearsView {
  /** XᵀX = LU, factored once (L3-K4). */
  L: Matrix;
  U: Matrix;
  years: HousingYear[];
  /** The Lesson 2 data plot with every year's points and fitted line. */
  frame: ChartFrame;
  points: ScatterPoint[];
  /** XᵀX = LDLᵀ (L3-D4). */
  D: Matrix;
}

export function housingYearsView(): HousingYearsView {
  return notImplemented('housingYearsView');
}

// §7.6 LDU ---------------------------------------------------------------------

export interface LduView {
  ldu: LduResult;
  /** U before the pivots were pulled out. */
  luU: Matrix;
  pivots: Rational[];
  /** L3-D1 */
  check: Check;
  /** L3-D2 */
  unitDiagonalNote: string;
  /** L3-D3: why D is singular; null when every pivot is nonzero. */
  singular: string | null;
  /** L3-D4: symmetric A gives U = Lᵀ, so A = LDLᵀ. null when A is not symmetric. */
  symmetric: { uIsLTransposed: boolean; note: string } | null;
}

export function lduView(A: Matrix, pivoting: Pivoting): LduView {
  return notImplemented('lduView');
}

// §7.7 Row exchanges -------------------------------------------------------------

export interface PermutationBuilderView {
  P: Matrix;
  /** A sample matrix whose rows move (L3-PM1). */
  sample: Matrix;
  permuted: Matrix;
  /** Where each row of the sample ends up: rows[i] = new position of row i. */
  destinations: number[];
}

export function permutationBuilder(n: number, swaps: Swap[]): PermutationBuilderView {
  return notImplemented('permutationBuilder');
}

/** L3-PM2: every permutation matrix for n = 2 or 3, and n! for n = 1 … 4. */
export function permutationGallery(n: number): { matrices: Matrix[]; counts: { n: number; count: number }[] } {
  return notImplemented('permutationGallery');
}

export interface CompositionView {
  P1: Matrix;
  P2: Matrix;
  /** P = P₂P₁ (L3-PM3). */
  P: Matrix;
  orderNote: string;
  /** Applying P₁ then P₂ to a sample equals applying P. */
  check: Check;
}

export function compositionView(n: number, first: Swap, second: Swap): CompositionView {
  return notImplemented('compositionView');
}

export interface PaluView {
  lu: LuResult;
  /** "Swap rows 1 and 2 (P₁)" … */
  swapsText: string[];
  /** L3-PM5: PA = LU. */
  check: Check;
  solve: SolveView | null;
}

export function paluView(A: Matrix, b: Vector, pivoting: Pivoting): PaluView {
  return notImplemented('paluView');
}

export interface TinyPivotDemo {
  A: number[][];
  b: number[];
  withoutPivoting: number[];
  withPivoting: number[];
  /** The bridge to Lesson 4 (L3-PM6). */
  note: string;
}

/** L3-PM6: the 2 × 2 tiny-pivot system in 64-bit floats. */
export function tinyPivotDemo(): TinyPivotDemo {
  return notImplemented('tinyPivotDemo');
}
