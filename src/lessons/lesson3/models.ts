/**
 * View-models for the Lesson 3 views: turn exact results from the core
 * (product traces, LU, substitution, permutations, operation counts) into what
 * the views draw (TeX, highlights, heatmap values, chart points). Kept pure so
 * they can be unit tested.
 */
import type { ChartFrame, ScatterPoint } from '../../components/canvas/charts';
import { matrixToTex } from '../../components/display/MatrixTex';
import { countOperations } from '../../core/counter';
import { crFactorization } from '../../core/factorization';
import { solveFloat } from '../../core/floatLu';
import { ldu, lu, peel, type LduResult, type LuResult, type Pivoting } from '../../core/lu';
import { getColumn, getRow, identity, matrix, matrixEquals, shape, transpose, vector, vectorEquals, zeros, type Matrix, type Vector } from '../../core/matrix';
import { frobeniusNorm, normSquared } from '../../core/norms';
import { costFormulas, costOfRightHandSides, measuredCosts } from '../../core/opCount';
import { factorial, allPermutations, composePermutations, permutationFromSwaps, permuteRows, type Swap } from '../../core/permutation';
import { multiplyTrace, outerLayers, shapeMismatch, type ProductMode } from '../../core/productTrace';
import { matMul, matVec, outer } from '../../core/products';
import type { Rational } from '../../core/rational';
import { backSub, forwardSub, type SubstitutionResult } from '../../core/substitution';
import type { Cell } from '../../core/trace';
import { HOUSING_YEARS, TINY_PIVOT } from '../../presets/lesson3';
import type { LayerSource } from '../../store/useLesson3Store';
import { COST_COLORS } from '../../theme/colors';

// Formatting helpers ---------------------------------------------------------

const texM = (M: Matrix) => matrixToTex(M.map((r) => r.map((x) => x.toTex())), false, {});
const colTex = (v: Vector) => `\\begin{bmatrix}${v.map((x) => x.toTex()).join(' \\\\ ')}\\end{bmatrix}`;
const rowTex = (v: Vector) => `\\begin{bmatrix}${v.map((x) => x.toTex()).join(' & ')}\\end{bmatrix}`;
const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
const add = (A: Matrix, B: Matrix) => A.map((r, i) => r.map((x, j) => x.add(B[i][j])));
const subtract = (A: Matrix, B: Matrix) => A.map((r, i) => r.map((x, j) => x.sub(B[i][j])));
const maxAbsOf = (...Ms: Matrix[]) => Math.max(0, ...Ms.flatMap((M) => M.flatMap((r) => r.map((x) => Math.abs(x.toNumber())))));
const isIdentity = (P: Matrix) => P.every((r, i) => r.every((x, j) => (i === j ? x.toNumber() === 1 : x.isZero())));

/** "LU = A" check: the left side's name, its value, and what it should equal. */
function check(name: string, value: Matrix, target: Matrix, targetName: string): Check {
  const equal = matrixEquals(value, target);
  return { equal, tex: `${name} = ${texM(value)} ${equal ? '=' : '\\neq'} ${targetName}` };
}

/** LU with no pivoting that hit a zero pivot cannot be used for layers, LDU or solving. */
function requireComplete(r: LuResult): void {
  if (r.status.kind === 'stopped') throw new Error(`${r.status.reason} Choose a pivoting setting, or use the PA = LU view.`);
}

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
  const shapeInfo = productShape(B, C);
  if (shapeInfo.mismatch) throw new RangeError(shapeInfo.mismatch);
  const { result, trace } = multiplyTrace(B, C, mode);
  const other = multiplyTrace(B, C, mode === 'rowsByColumns' ? 'columnsByRows' : 'rowsByColumns').result;
  const steps = trace.steps.map((st) => ({
    description: st.description,
    tex: st.tex,
    partial: st.matrix,
    entry: st.op?.kind === 'entry' ? { row: st.op.i, col: st.op.j } : null,
    k: st.op?.kind === 'outer' ? st.op.k : null,
    layer: st.op?.kind === 'outer' ? st.op.layer : null,
  }));
  const equal = matrixEquals(result, other);
  return {
    shape: shapeInfo,
    mode,
    steps,
    result,
    check: { equal, tex: `\\text{rows} \\times \\text{columns} ${equal ? '=' : '\\neq'} \\text{columns} \\times \\text{rows} = ${texM(result)}` },
    vectorCase:
      shapeInfo.n === 1
        ? {
            rowPicture: 'Rows × columns: each entry is a row of B dotted with x, the row picture.',
            columnPicture: 'Columns × rows: Bx = x₁b₁ + x₂b₂ + ⋯, a combination of the columns of B, the column picture.',
          }
        : null,
  };
}

export function productShape(B: Matrix, C: Matrix): ProductShape {
  const b = shape(B);
  const c = shape(C);
  const mismatch = shapeMismatch(B, C);
  const tail = mismatch ? '\\text{(sizes don\'t match)}' : `${b.rows} \\times ${c.cols}`;
  return { m: b.rows, p: b.cols, n: c.cols, tex: `(${b.rows} \\times ${b.cols})(${c.rows} \\times ${c.cols}) = ${tail}`, mismatch };
}

/** L3-MM4: the step in the other mode at the same point of progress, so switching keeps the position. */
export function matchingStep(B: Matrix, C: Matrix, from: ProductMode, index: number): number {
  const { m, p, n } = productShape(B, C);
  const entries = m * n;
  const [fromCount, toCount] = from === 'rowsByColumns' ? [entries, p] : [p, entries];
  if (fromCount === 0) return 0;
  return Math.round((index / fromCount) * toCount);
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
export function layersView(
  source: LayerSource,
  input: { A: Matrix; B: Matrix; C: Matrix; L?: Matrix; U?: Matrix },
  keep: number,
  sortBySize: boolean,
): LayersView {
  // Each layer is (column k of the left factor)(row k of the right factor).
  let left: Matrix;
  let right: Matrix;
  if (source === 'product') {
    outerLayers(input.B, input.C); // throws on a size mismatch
    [left, right] = [input.B, input.C];
  } else if (source === 'cr') {
    const cr = crFactorization(input.A);
    [left, right] = [cr.C, cr.R];
  } else if (source === 'factors') {
    // L and U entered directly: layer k is (column k of L)(row k of U), and the layers add up to A = LU.
    const L = input.L ?? [];
    const U = input.U ?? [];
    const n = L.length;
    if (n === 0 || U.length !== n || [...L, ...U].some((r) => r.length !== n)) throw new RangeError('L and U must be square and the same size');
    requireTriangular(L, 'L', true);
    requireTriangular(U, 'U', false);
    [left, right] = [L, U];
  } else {
    const r = lu(input.A, { pivoting: 'none' });
    requireComplete(r);
    [left, right] = [r.L, r.U];
  }
  const p = shape(right).rows;
  const layers: Layer[] = Array.from({ length: p }, (_, k) => {
    const b = getColumn(left, k);
    const c = getRow(right, k);
    const M = outer(b, c);
    const n2 = normSquared(b).mul(normSquared(c));
    return { index: k, matrix: M, rank: n2.isZero() ? 0 : 1, normSquared: n2, size: Math.sqrt(n2.toNumber()), tex: `${colTex(b)}${rowTex(c)}` };
  });
  if (sortBySize) layers.sort((a, b) => b.size - a.size);
  const empty = zeros(shape(left).rows, shape(right).cols);
  const total = layers.reduce((sum, l) => add(sum, l.matrix), empty);
  const kept = Math.max(0, Math.min(keep, layers.length));
  const partial = layers.slice(0, kept).reduce((sum, l) => add(sum, l.matrix), empty);
  const leftover = subtract(total, partial);
  return {
    source,
    layers,
    total,
    keep: kept,
    partial,
    leftover,
    leftoverSize: frobeniusNorm(leftover),
    maxAbs: maxAbsOf(total, leftover, ...layers.map((l) => l.matrix)),
    caption:
      'In CR and LU no layer is much larger than the rest, so dropping one is a poor approximation. Eigendecomposition and the SVD give layers where a few are large; that is where this pays off (Lesson 5 onward).',
  };
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
  const result = lu(A, { pivoting });
  const steps = result.trace.steps.map((st) => {
    const PA = matMul(st.P, A);
    const target = isIdentity(st.P) ? 'A' : 'PA';
    return {
      description: st.description,
      tex: st.tex,
      current: st.matrix,
      L: st.L,
      compact: st.compact,
      multiplier: st.op?.kind === 'eliminate' ? { row: st.op.target, col: st.op.source, value: st.op.multiplier } : null,
      swap: st.op?.kind === 'swap' ? ([st.op.i, st.op.j] as Swap) : null,
      changedRows: st.changedRows,
      pivot: st.pivot ?? null,
      check: check('L_{\\text{so far}} \\times (\\text{current})', matMul(st.L, st.matrix), PA, target),
    };
  });
  const PA = matMul(result.P, A);
  const status = result.status;
  return {
    result,
    steps,
    finalCheck: check('LU', matMul(result.L, result.U), PA, isIdentity(result.P) ? 'A' : 'PA'),
    recipe: 'L has 1s on the diagonal, 0s above it, and the multipliers below it; U is what elimination leaves.',
    notationNote:
      "The notes' general formula writes the second column of L as (1, 1, l₃₂); the worked example shows it is (0, 1, l₃₂): 0 above the diagonal, 1 on it.",
    statusMessage:
      status.kind === 'stopped'
        ? status.reason
        : status.kind === 'singular'
          ? `U has a 0 in pivot position ${status.column + 1}. A = LU still holds, but Ux = c has no unique solution: A is singular.`
          : null,
    needsRowExchange: status.kind === 'stopped',
  };
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
  const r = lu(A, { pivoting });
  requireComplete(r);
  const { layers, remainders } = peel(r.L, r.U);
  const start = isIdentity(r.P) ? 'A' : 'PA';
  return {
    layers,
    remainders,
    maxAbs: maxAbsOf(matMul(r.P, A), ...layers, ...remainders),
    captions: layers.map((_, k) => `${start}${Array.from({ length: k + 1 }, (_, j) => ` − l${sub(j + 1)}u${sub(j + 1)}*`).join('')}`),
  };
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
  /** The matrix being solved: A, or LU when the factors are entered directly (L3-S6). */
  A: Matrix;
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
  const r = lu(A, { pivoting });
  const swapped = !isIdentity(r.P);
  const Pb = matVec(r.P, b);
  const forward = forwardSub(r.L, Pb);
  const chain: ChainLink[] = [
    { from: swapped ? 'Pb' : 'b', to: 'c', tex: swapped ? 'Lc = Pb' : 'Lc = b', shape: 'lower' },
    { from: 'c', to: 'x', tex: 'Ux = c', shape: 'upper' },
  ];
  const base = { A, P: r.P, L: r.L, U: r.U, Pb, forward, chain };
  if (r.status.kind === 'stopped') return { ...base, back: null, x: null, check: null, message: r.status.reason };
  const back = forward.solution ? backSub(r.U, forward.solution) : null;
  const x = back?.solution ?? null;
  const Ax = x ? matVec(A, x) : null;
  return {
    ...base,
    back,
    x,
    check: x && Ax ? { equal: vectorEquals(Ax, b), tex: `Ax = ${colTex(Ax)} ${vectorEquals(Ax, b) ? '=' : '\\neq'} b` } : null,
    message: back?.stopped?.reason ?? forward.stopped?.reason ?? null,
  };
}

/** First nonzero entry on the wrong side of the diagonal, or null when M is triangular. */
function offTriangle(M: Matrix, lower: boolean): { i: number; j: number } | null {
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M.length; j++) {
      if ((lower ? j > i : j < i) && !M[i][j].isZero()) return { i, j };
    }
  }
  return null;
}

/** RangeError naming the first entry on the wrong side of the diagonal. */
function requireTriangular(M: Matrix, name: string, lower: boolean): void {
  const bad = offTriangle(M, lower);
  if (bad) {
    throw new RangeError(
      `${name} must be ${lower ? 'lower' : 'upper'} triangular: entry (${bad.i + 1}, ${bad.j + 1}) is ${M[bad.i][bad.j].toString()}, not 0.`,
    );
  }
}

/**
 * L3-S6: solve Ax = b from factors entered directly. L must be lower
 * triangular and U upper triangular (RangeError otherwise, naming the entry);
 * A is their product. A zero pivot stops the substitution with a reason.
 */
export function solveWithFactorsView(L: Matrix, U: Matrix, b: Vector): SolveView {
  const n = b.length;
  const square = (M: Matrix) => M.length === n && M.every((r) => r.length === n);
  if (!square(L) || !square(U)) throw new RangeError(`L and U must be ${n} × ${n} to match b`);
  requireTriangular(L, 'L', true);
  requireTriangular(U, 'U', false);
  const A = matMul(L, U);
  const forward = forwardSub(L, b);
  const back = forward.solution ? backSub(U, forward.solution) : null;
  const x = back?.solution ?? null;
  const Ax = x ? matVec(A, x) : null;
  return {
    A,
    P: identity(n),
    L,
    U,
    Pb: b,
    forward,
    back,
    chain: [
      { from: 'b', to: 'c', tex: 'Lc = b', shape: 'lower' },
      { from: 'c', to: 'x', tex: 'Ux = c', shape: 'upper' },
    ],
    x,
    check: x && Ax ? { equal: vectorEquals(Ax, b), tex: `LUx = ${colTex(Ax)} ${vectorEquals(Ax, b) ? '=' : '\\neq'} b` } : null,
    message: forward.stopped?.reason ?? back?.stopped?.reason ?? null,
  };
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
  const { result: r, count: factorCost } = countOperations(() => lu(A, { pivoting }));
  requireComplete(r);
  const solveOne = (b: Vector) => {
    const c = forwardSub(r.L, matVec(r.P, b)).solution;
    return { c, x: c ? backSub(r.U, c).solution : null };
  };
  const rows = rhs.map((b, k) => ({ k, b, ...solveOne(b) }));
  const n = shape(A).rows;
  return {
    rows,
    costs: costOfRightHandSides(A, rhs, pivoting),
    factorCost,
    solveCost: rhs.length > 0 ? countOperations(() => solveOne(rhs[0])).count : costFormulas(n).solvePair,
    rule: 'Counting multiplications and divisions only: additions and subtractions are free, and so is multiplying by a known 0 or by the 1s on the diagonal of L.',
  };
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
  const ns = Array.from({ length: 99 }, (_, i) => i + 2); // n = 2 … 100
  const point = (n: number, v: number): [number, number] => (logLog ? [Math.log10(n), Math.log10(v)] : [n, v]);
  const series = (key: 'factor' | 'solvePair' | 'fromScratch') => ns.map((n) => point(n, costFormulas(n)[key]));
  const measured = measuredCosts([2, 3, 4, 5, 6, 7, 8]);
  const curves: GrowthSeries[] = [
    { label: 'Factor A = LU once: (n − 1)n(n + 1)/3', color: COST_COLORS.factor, points: series('factor') },
    { label: 'Two triangular solves: n²', color: COST_COLORS.solve, points: series('solvePair') },
    { label: 'Eliminate [A | b] from scratch', color: COST_COLORS.fromScratch, points: series('fromScratch') },
  ];
  const top = Math.max(...curves.flatMap((c) => c.points.map((p) => p[1])));
  const slope = (key: 'factor' | 'solvePair') => Math.log(costFormulas(100)[key] / costFormulas(50)[key]) / Math.log(2);
  return {
    frame: logLog
      ? { x: { min: 0, max: 2, title: 'log₁₀ n' }, y: { min: 0, max: Math.ceil(top), title: 'log₁₀ operations' }, size: 8, equalAspect: false }
      : { x: { min: 0, max: 100, title: 'n' }, y: { min: 0, max: top, title: 'operations' }, size: 8, equalAspect: false },
    curves,
    measured: [
      { label: 'Factor (measured)', color: COST_COLORS.factor, points: measured.map((m) => point(m.n, m.factor)) },
      { label: 'Solves (measured)', color: COST_COLORS.solve, points: measured.map((m) => point(m.n, m.solvePair)) },
      { label: 'From scratch (measured)', color: COST_COLORS.fromScratch, points: measured.map((m) => point(m.n, m.fromScratch)) },
    ],
    logLog,
    slopes: { factor: slope('factor'), solve: slope('solvePair') },
  };
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
  const X = matrix(HOUSING_YEARS.x.map((x) => [1, x]));
  const Xt = transpose(X);
  const r = lu(matMul(Xt, X), { pivoting: 'none' });
  const colors = ['#0072B2', '#D55E00', '#009E73'];
  const xs = HOUSING_YEARS.x.map(Number);
  const years = HOUSING_YEARS.years.map((year, k) => {
    const Atb = matVec(Xt, vector(year.y));
    const theta = backSub(r.U, forwardSub(r.L, Atb).solution!).solution!;
    const [t0, t1] = theta.map((t) => t.toNumber());
    return { label: year.label, color: colors[k], Atb, theta, curve: [0, 2.75].map((x) => [x, t0 + t1 * x] as [number, number]) };
  });
  const points: ScatterPoint[] = HOUSING_YEARS.years.flatMap((year, k) => year.y.map((y, i) => ({ at: [xs[i], Number(y)], color: colors[k] })));
  return {
    L: r.L,
    U: r.U,
    years,
    frame: {
      x: { min: 0, max: 2.75, title: 'Living area', unit: '1000 sq ft' },
      y: { min: 0, max: 8, title: 'Price', unit: '$100,000' },
      size: 8,
      equalAspect: false,
    },
    points,
    D: ldu(r.L, r.U).D,
  };
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
  const r = lu(A, { pivoting });
  requireComplete(r);
  const d = ldu(r.L, r.U);
  const PA = matMul(r.P, A);
  const symmetric = isIdentity(r.P) && matrixEquals(A, transpose(A));
  const uIsLTransposed = matrixEquals(d.U, transpose(d.L));
  return {
    ldu: d,
    luU: r.U,
    pivots: r.U.map((row, i) => row[i]),
    check: check('LDU', matMul(matMul(d.L, d.D), d.U), PA, isIdentity(r.P) ? 'A' : 'PA'),
    unitDiagonalNote: 'Now both L and U have 1s on the diagonal; the pivots live in D.',
    singular: d.zeroPivots.length
      ? `D has a 0 in position ${d.zeroPivots.map((i) => i + 1).join(', ')}: D is singular, so A is singular too.`
      : null,
    symmetric: symmetric
      ? {
          uIsLTransposed,
          note: uIsLTransposed
            ? 'A is symmetric (as XᵀX always is), so the new U is exactly Lᵀ and A = LDLᵀ.'
            : 'A is symmetric, but a zero pivot keeps the new U from being Lᵀ.',
        }
      : null,
  };
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
  const P = permutationFromSwaps(n, swaps);
  // Recognizable rows: row i is (i1, i2, …), e.g. (21, 22, 23).
  const sample = matrix(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => 10 * (i + 1) + j + 1)));
  return {
    P,
    sample,
    permuted: permuteRows(P, sample),
    destinations: Array.from({ length: n }, (_, i) => P.findIndex((row) => !row[i].isZero())),
  };
}

/** L3-PM2: every permutation matrix for n = 2 or 3, and n! for n = 1 … 4. */
export function permutationGallery(n: number): { matrices: Matrix[]; counts: { n: number; count: number }[] } {
  return { matrices: allPermutations(n), counts: [1, 2, 3, 4].map((k) => ({ n: k, count: factorial(k) })) };
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
  const P1 = permutationFromSwaps(n, [first]);
  const P2 = permutationFromSwaps(n, [second]);
  const P = composePermutations(P2, P1);
  const { sample } = permutationBuilder(n, []);
  const stepwise = permuteRows(P2, permuteRows(P1, sample));
  const equal = matrixEquals(stepwise, permuteRows(P, sample));
  return {
    P1,
    P2,
    P,
    orderNote: 'P₁ acts first, so it sits next to the matrix on the right: P = P₂P₁, with the later swap on the left.',
    check: { equal, tex: `P_2(P_1M) = ${texM(stepwise)} ${equal ? '=' : '\\neq'} (P_2P_1)M` },
  };
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
  const r = lu(A, { pivoting });
  const PA = matMul(r.P, A);
  const last = r.trace.steps[r.trace.steps.length - 1];
  return {
    lu: r,
    swapsText: r.swaps.map(([i, j], k) => `Swap rows ${i + 1} and ${j + 1} (P${sub(k + 1)})`),
    check:
      r.status.kind === 'stopped'
        ? check('L_{\\text{so far}} \\times (\\text{current})', matMul(last.L, last.matrix), PA, 'PA')
        : check('LU', matMul(r.L, r.U), PA, 'PA'),
    solve: r.status.kind === 'stopped' ? null : solveView(A, b, pivoting),
  };
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
  const { A, b } = TINY_PIVOT;
  return {
    A,
    b,
    withoutPivoting: solveFloat(A, b, 'none'),
    withPivoting: solveFloat(A, b, 'partial'),
    note: 'Computers round. Dividing by the tiny pivot 10⁻²⁰ makes a multiplier of 10²⁰, and rounding then wipes out x₁. Lesson 4 looks at which algorithms magnify rounding and which do not.',
  };
}
