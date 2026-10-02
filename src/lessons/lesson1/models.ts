/**
 * View-models for the Lesson 1 views: turn exact core results into what the
 * renderer draws (floats, colors, labels). Kept pure so they can be unit tested.
 */
import { toVec3, type Vec3 } from '../../components/canvas/types';
import type { BigPictureLabels, SubspaceId } from '../../components/diagram/types';
import { matrixToTex } from '../../components/display/MatrixTex';
import { columnRecipe, crFactorization, type CRFactorization } from '../../core/factorization';
import {
  getColumn,
  matrixEquals,
  shape,
  splitAugmented,
  toFloatVector,
  transpose,
  vectorEquals,
  zeroVector,
  type Matrix,
  type Vector,
} from '../../core/matrix';
import { addVectors, dot, matMul, matVec, normFloat, outer, scaleVector, subVectors } from '../../core/products';
import { decomposeColumnLeftNull, decomposeRowNull, rowSpaceSolution } from '../../core/projection';
import { describeDependency, diagnoseDependencies, leastSquares } from '../../core/leastSquares';
import { notesRoundingNote } from '../../presets/notesFigures';
import { Rational } from '../../core/rational';
import { pivotColumns, rank, rrefAugmented, type AugmentedRrefResult } from '../../core/rref';
import { evaluateSolution, solve, type SolutionSet } from '../../core/solve';
import { columnSpaceBasis, fourSubspaces, inColumnSpace, type FourSubspaces } from '../../core/subspaces';
import { columnColor, rowColor } from '../../theme/colors';

// Formatting helpers ---------------------------------------------------------

const f3 = (v: Vector): Vec3 => toVec3(toFloatVector(v));
const texColor = (color: string, tex: string) => `\\textcolor{${color}}{${tex}}`;
/** Column vector as TeX. */
const colTex = (v: Vector) => `\\begin{bmatrix}${v.map((x) => x.toTex()).join(' \\\\ ')}\\end{bmatrix}`;
/** Plain-text tuple with a typographic minus: (−7/54, 1/27). */
const tuple = (v: Vector) => `(${v.map((x) => x.toString().replace('-', '−')).join(', ')})`;
/** TeX tuple: (1,2,3). */
const tupleTex = (v: Vector) => `(${v.map((x) => x.toTex()).join(',')})`;
const supDigits = (k: number) => String(k).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
const realSpace = (k: number) => `ℝ${supDigits(k)}`;
const subDigits = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
/** 2.25 rather than 9/4 when the decimal is exact, as the notes write it (L2-N2). */
function decimalTex(r: Rational): string {
  const text = String(r.toNumber());
  const back = Rational.parse(text);
  return back && back.equals(r) ? text : r.toTex();
}

/** Coefficient in front of a term, given whether it is the first term. */
function termTex(c: Rational, body: string, first: boolean): string {
  const neg = c.isNegative();
  const mag = c.abs();
  const coef = mag.equals(Rational.ONE) ? '' : mag.toTex();
  const sign = first ? (neg ? '-' : '') : neg ? ' - ' : ' + ';
  return `${sign}${coef}${body}`;
}

/** "2x_1 - x_2 = 1" */
function equationTex(row: Vector, rhs: Rational): string {
  let lhs = '';
  row.forEach((c, j) => {
    if (c.isZero()) return;
    lhs += termTex(c, `x_${j + 1}`, lhs === '');
  });
  return `${lhs || '0'} = ${rhs.toTex()}`;
}

function requireDim(k: number, what: string): 2 | 3 {
  if (k !== 2 && k !== 3) throw new RangeError(`${what} can only be drawn in ℝ² or ℝ³ (this one is ${realSpace(k)})`);
  return k;
}

const orZeros = (b: Vector | null | undefined, m: number) => b ?? zeroVector(m);

// §5.1 Row picture ---------------------------------------------------------

export type SolutionMarker =
  | { kind: 'point'; at: Vec3 }
  | { kind: 'line'; point: Vec3; dir: Vec3 }
  | { kind: 'plane'; point: Vec3; spanning: [Vec3, Vec3] }
  | { kind: 'none'; message: string };

export interface RowPictureScene {
  dim: 2 | 3;
  /** 2×2: one line per equation a·x + b·y = c (L1-R1). */
  lines: { a: number; b: number; c: number; color: string; tex: string }[];
  /** 3×3: one plane per equation n·x = offset (L1-R2). */
  planes: { normal: Vec3; offset: number; color: string; tex: string }[];
  solution: SolutionMarker; // L1-R3
  /**
   * Rows-by-columns view of Ax (§1.1): each entry is a row of A dotted with x,
   * e.g. "\\begin{bmatrix}(1,1)\\cdot(x_1,x_2)\\\\(2,-1)\\cdot(x_1,x_2)\\end{bmatrix}", and the
   * equations it produces, colored per row.
   */
  dotProductTex: string;
  equationsTex: string[];
}

export function rowPictureScene(A: Matrix, b: Vector | null): RowPictureScene {
  const { rows: m, cols: n } = shape(A);
  const dim = requireDim(n, 'The row picture');
  const rhs = orZeros(b, m);
  const rowsF = A.map((r) => toFloatVector(r));
  const lines =
    dim === 2
      ? rowsF.map(([a, bb], i) => ({ a, b: bb, c: rhs[i].toNumber(), color: rowColor(i), tex: equationTex(A[i], rhs[i]) }))
      : [];
  const planes =
    dim === 3
      ? rowsF.map((r, i) => ({ normal: toVec3(r), offset: rhs[i].toNumber(), color: rowColor(i), tex: equationTex(A[i], rhs[i]) }))
      : [];

  const sol = solve(A, rhs);
  let solution: SolutionMarker;
  if (sol.kind === 'none') {
    solution = { kind: 'none', message: `No solution: elimination gives 0 = 1 in row ${sol.inconsistentRow + 1}, so the ${dim === 2 ? 'lines' : 'planes'} have no common point.` };
  } else if (sol.kind === 'unique') {
    solution = { kind: 'point', at: f3(sol.x) };
  } else if (sol.nullBasis.length === 1) {
    solution = { kind: 'line', point: f3(sol.particular), dir: f3(sol.nullBasis[0]) };
  } else if (sol.nullBasis.length === 2 && dim === 3) {
    solution = { kind: 'plane', point: f3(sol.particular), spanning: [f3(sol.nullBasis[0]), f3(sol.nullBasis[1])] };
  } else {
    solution = { kind: 'none', message: `Every point of ${realSpace(n)} is a solution.` };
  }

  const xs = Array.from({ length: n }, (_, j) => `x_${j + 1}`).join(',');
  const dotProductTex = `A x = \\begin{bmatrix}${A.map((r, i) => texColor(rowColor(i), `${tupleTex(r)}\\cdot(${xs})`)).join(' \\\\ ')}\\end{bmatrix}`;
  const equationsTex = A.map((r, i) => texColor(rowColor(i), equationTex(r, rhs[i])));
  return { dim, lines, planes, solution, dotProductTex, equationsTex };
}

// §5.2 Column picture ------------------------------------------------------

export interface ColumnPictureScene {
  dim: 2 | 3;
  /** Each column of A from the origin (L1-C1). */
  columns: { to: Vec3; color: string }[];
  /** xᵢ·aᵢ drawn tip to tail (L1-C2). */
  tipToTail: { from: Vec3; to: Vec3; color: string }[];
  Ax: Vec3;
  b: Vec3;
  /** ‖Ax − b‖ (L1-C3). */
  distance: number;
  hit: boolean;
  /** Dashed guides completing the parallelogram, as in the notes' figure (§1.1). */
  guides: { from: Vec3; to: Vec3; color: string }[];
  /** Columns-by-rows expansion: Ax = x₁·a₁ + x₂·a₂ + … with symbolic xᵢ (§1.1). */
  expansionTex: string;
  /** e.g. "2\\begin{bmatrix}1\\\\2\\end{bmatrix} + … = …" (L1-C5). */
  combinationTex: string;
}

export function columnPictureScene(A: Matrix, b: Vector | null, x: Rational[]): ColumnPictureScene {
  const { rows: m, cols: n } = shape(A);
  const dim = requireDim(m, 'The column picture');
  if (x.length !== n) throw new RangeError('columnPictureScene: one weight per column');
  const target = orZeros(b, m);
  const cols = Array.from({ length: n }, (_, j) => getColumn(A, j));
  const scaled = cols.map((c, j) => scaleVector(x[j], c));

  const tipToTail: ColumnPictureScene['tipToTail'] = [];
  let tip = zeroVector(m);
  scaled.forEach((s, j) => {
    const next = addVectors(tip, s);
    tipToTail.push({ from: f3(tip), to: f3(next), color: columnColor(j) });
    tip = next;
  });
  const Ax = tip;

  // Complete the parallelogram: the later scaled columns drawn from the origin.
  const guides: ColumnPictureScene['guides'] = [];
  if (n === 2) {
    guides.push({ from: [0, 0, 0], to: f3(scaled[1]), color: columnColor(1) });
    guides.push({ from: f3(scaled[1]), to: f3(Ax), color: columnColor(0) });
  } else {
    scaled.slice(1).forEach((s, k) => guides.push({ from: [0, 0, 0], to: f3(s), color: columnColor(k + 1) }));
  }

  const expansionTex =
    'A x = ' + cols.map((c, j) => `${j ? ' + ' : ''}x_${j + 1}${texColor(columnColor(j), colTex(c))}`).join('');
  const combinationTex =
    cols.map((c, j) => termTex(x[j], texColor(columnColor(j), colTex(c)), j === 0).replace(/^(-?)$/, '$10')).join('') +
    ` = ${colTex(Ax)}`;

  return {
    dim,
    columns: cols.map((c, j) => ({ to: f3(c), color: columnColor(j) })),
    tipToTail,
    Ax: f3(Ax),
    b: f3(target),
    distance: normFloat(subVectors(Ax, target)),
    hit: vectorEquals(Ax, target),
    guides,
    expansionTex,
    combinationTex,
  };
}

/** L1-C4: exact slider targets for "Solve", or null when no solution exists. */
export function solveTarget(A: Matrix, b: Vector | null): Rational[] | null {
  const sol = solve(A, orZeros(b, shape(A).rows));
  if (sol.kind === 'none') return null;
  return sol.kind === 'unique' ? sol.x : sol.particular;
}

// §5.3 Side-by-side + free variable -----------------------------------------

export interface FreeParameterState {
  /** x(t) = particular + t·null vector. */
  x: Vector;
  /** Point on the solution line in the row picture (L1-S3). */
  rowPoint: Vec3;
  /** Matching combination for the column picture. */
  columnScene: ColumnPictureScene;
}

export function freeParameterState(A: Matrix, b: Vector | null, t: Rational): FreeParameterState {
  const sol = solve(A, orZeros(b, shape(A).rows));
  if (sol.kind === 'none') throw new RangeError('No solution, so there is no solution set to move along.');
  const x =
    sol.kind === 'unique'
      ? sol.x
      : evaluateSolution(sol.particular, sol.nullBasis, sol.nullBasis.map((_, i) => (i === 0 ? t : Rational.ZERO)));
  return { x, rowPoint: f3(x), columnScene: columnPictureScene(A, b, x) };
}

// §5.4 Elimination ----------------------------------------------------------

export interface EliminationView {
  rref: AugmentedRrefResult;
  freeCols: number[];
  solution: SolutionSet;
  /** "x = (2,1,0) + t(−1,−1,1)" as TeX (L1-G4). */
  parametricTex: string | null;
}

export function eliminationView(A: Matrix, b: Vector | null): EliminationView {
  const { rows: m, cols: n } = shape(A);
  const rhs = orZeros(b, m);
  const rref = rrefAugmented(A, rhs);
  const pivots = new Set(rref.pivotCols);
  const freeCols = Array.from({ length: n }, (_, j) => j).filter((j) => !pivots.has(j));
  const solution = solve(A, rhs);
  let parametricTex: string | null = null;
  if (solution.kind === 'unique') parametricTex = `x = ${colTex(solution.x)}`;
  if (solution.kind === 'parametric') {
    const params = solution.freeVars.length === 1 ? ['t'] : solution.freeVars.map((_, i) => `t_${i + 1}`);
    parametricTex =
      `x = ${colTex(solution.particular)}` + solution.nullBasis.map((v, i) => ` + ${params[i]}${colTex(v)}`).join('');
  }
  return { rref, freeCols, solution, parametricTex };
}

/** Row-picture planes for a given trace step (L1-G5). */
export function rowPictureAtStep(view: EliminationView, stepIndex: number): RowPictureScene {
  const steps = view.rref.trace.steps;
  const step = steps[Math.max(0, Math.min(steps.length - 1, stepIndex))];
  const [Ak, bk] = splitAugmented(step.matrix);
  return rowPictureScene(Ak, bk);
}

// §5.5 Column space ---------------------------------------------------------

export interface ColumnSpaceScene {
  rank: number;
  /** 'all' = fills ℝ³ (L1-CS1). */
  shape: 'point' | 'line' | 'plane' | 'all';
  basis: { to: Vec3; color: string; column: number }[];
  b: Vec3;
  inSpace: boolean;
  distance: number;
  /** Second explanation: y·b for each left null vector y. */
  leftNullChecks: { y: Vec3; dot: string }[];
}

export function columnSpaceScene(A: Matrix, b: Vector | null): ColumnSpaceScene {
  const m = shape(A).rows;
  requireDim(m, 'The column space');
  const target = orZeros(b, m);
  const f = fourSubspaces(A);
  const shapeOf = (r: number): ColumnSpaceScene['shape'] => (r === 0 ? 'point' : r === m ? 'all' : r === 1 ? 'line' : 'plane');
  const pivots = pivotColumns(A);
  const { e } = decomposeColumnLeftNull(A, target);
  return {
    rank: f.rank,
    shape: shapeOf(f.rank),
    basis: f.column.map((c, k) => ({ to: f3(c), color: columnColor(pivots[k]), column: pivots[k] })),
    b: f3(target),
    inSpace: inColumnSpace(A, target),
    distance: normFloat(e),
    leftNullChecks: f.leftNull.map((y) => ({ y: f3(y), dot: dot(y, target).toString() })),
  };
}

// §5.6 Products + CR --------------------------------------------------------

export interface ProductsView {
  innerTex: string;
  outer: Matrix;
  outerRank: number;
  /** Shape bookkeeping, e.g. "(3×1)(1×3) = 3×3" and "(1×3)(3×1) = 1×1" (§1.3). */
  outerShapeTex: string;
  innerShapeTex: string;
  /**
   * uvᵀ as its own CR factorization: C = u spans C(uvᵀ), R = vᵀ spans the
   * row space — the rank-1 case CR generalizes (§1.3).
   */
  outerCR: CRFactorization;
  /** L1-P2: column j = v_j · u, row i = u_i · vᵀ. */
  columnMultiples: Rational[];
  rowMultiples: Rational[];
}

export function productsView(u: Vector, v: Vector): ProductsView {
  if (u.length !== v.length) throw new RangeError('uᵀv needs u and v to have the same length.');
  const P = outer(u, v);
  const n = u.length;
  return {
    innerTex: `u^{T}v = \\begin{bmatrix}${u.map((x) => x.toTex()).join(' & ')}\\end{bmatrix}${colTex(v)} = ${dot(u, v).toTex()}`,
    outer: P,
    outerRank: rank(P),
    outerShapeTex: `(${n}\\times 1)(1\\times ${n}) = ${n}\\times ${n}`,
    innerShapeTex: `(1\\times ${n})(${n}\\times 1) = 1\\times 1`,
    outerCR: crFactorization(P),
    columnMultiples: [...v],
    rowMultiples: [...u],
  };
}

export interface CRView {
  cr: CRFactorization;
  /** "A = CR" as color-coded TeX (L1-P3). */
  tex: string;
  /** For the selected column: "(1,3,1) = 1·(1,2,3) + 1·(0,1,−2)" (L1-P4). */
  recipeTex: string | null;
  /** Same column as a matrix–vector product: a_j = C · (column j of R), i.e. A[c₁…] = [Ac₁…] (§1.3). */
  columnProductTex: string | null;
  /** Row space of A = row space of R; row rank = column rank = #cols C = #rows R (L1-P5). */
  rankArgumentTex: string;
}

export function crView(A: Matrix, selectedColumn: number | null): CRView {
  const cr = crFactorization(A);
  const toTexEntries = (M: Matrix) => M.map((r) => r.map((x) => x.toTex()));
  const pivotColor = (k: number) => columnColor(cr.pivotCols[k]);
  const aColors = A[0].map((_, j) => {
    const k = cr.pivotCols.indexOf(j);
    return k >= 0 ? pivotColor(k) : undefined;
  });
  const hl = (j: number) => (selectedColumn === j ? '#fef08a' : undefined);
  const Atex = matrixToTex(toTexEntries(A), false, {
    columnColors: aColors,
    entryBackgrounds: selectedColumn === null ? {} : Object.fromEntries(A.map((_, i) => [`${i},${selectedColumn}`, hl(selectedColumn)!])),
  });
  const Ctex = matrixToTex(toTexEntries(cr.C), false, { columnColors: cr.pivotCols.map((_, k) => pivotColor(k)) });
  const Rtex = matrixToTex(toTexEntries(cr.R), false, {
    rowBackgrounds: [],
    entryBackgrounds:
      selectedColumn === null ? {} : Object.fromEntries(cr.R.map((_, i) => [`${i},${selectedColumn}`, hl(selectedColumn)!])),
  });
  const tex = `\\underset{A}{${Atex}} = \\underset{C}{${Ctex}}\\,\\underset{R}{${Rtex}}`;

  let recipeTex: string | null = null;
  let columnProductTex: string | null = null;
  if (selectedColumn !== null && selectedColumn < shape(A).cols) {
    const coeffs = columnRecipe(cr, selectedColumn);
    const cCols = cr.pivotCols.map((j) => getColumn(A, j));
    const terms = coeffs.map((c, k) => termTex(c, texColor(pivotColor(k), colTex(cCols[k])), k === 0)).join('');
    recipeTex = `${colTex(getColumn(A, selectedColumn))} = ${terms || '0'}`;
    columnProductTex = `a_${selectedColumn + 1} = C ${colTex(getColumn(cr.R, selectedColumn))}`;
  }

  const r = cr.pivotCols.length;
  const rankArgumentTex = `\\#\\text{columns of } C = ${r} = \\#\\text{rows of } R \\;\\Rightarrow\\; \\text{column rank} = \\text{row rank} = ${r}`;
  return { cr, tex, recipeTex, columnProductTex, rankArgumentTex };
}

// §5.7 Four subspaces -------------------------------------------------------

export interface SubspacesView {
  spaces: FourSubspaces;
  /** Pairwise dot products for the orthogonality check (L1-F3, L1-F4). */
  rowNullDots: string[];
  colLeftNullDots: string[];
  rankNullityTex: string; // L1-F5
}

export function subspacesView(A: Matrix): SubspacesView {
  const spaces = fourSubspaces(A);
  const pairs = (xs: Vector[], ys: Vector[]) => xs.flatMap((x) => ys.map((y) => dot(x, y).toString()));
  return {
    spaces,
    rowNullDots: pairs(spaces.row, spaces.nullSpace),
    colLeftNullDots: pairs(spaces.column, spaces.leftNull),
    rankNullityTex: `\\operatorname{rank} + \\operatorname{nullity} = ${spaces.rank} + ${spaces.nullSpace.length} = ${spaces.n} = n`,
  };
}

// Big picture (Strang) ------------------------------------------------------

export interface BigPictureModel {
  m: number;
  n: number;
  rank: number;
  spaces: FourSubspaces;
  /** Left side: x = x_r + x_n, x_r ∈ C(Aᵀ), x_n ∈ N(A). */
  x: Vector;
  xr: Vector;
  xn: Vector;
  /** b = Ax = A x_r, and A x_n = 0. */
  b: Vector;
  /** Right side for a target that may miss C(A): t = p + e, Aᵀt = Aᵀp, Aᵀe = 0. */
  target: { t: Vector; p: Vector; e: Vector; Att: Vector } | null;
  /** Exact checks shown next to the diagram. */
  checks: {
    xrDotXn: Rational;
    Axn: Vector;
    Axr: Vector;
    pDotE: Rational | null;
    Ate: Vector | null;
  };
  /** Display strings for the diagram, e.g. { xr: 'xᵣ = (1, 0, 1)' }. */
  labels: BigPictureLabels;
  /** Floats for the companion canvases. */
  scene: {
    rowSpan: Vec3[];
    nullSpan: Vec3[];
    columnSpan: Vec3[];
    leftNullSpan: Vec3[];
    x: Vec3;
    xr: Vec3;
    xn: Vec3;
    b: Vec3;
    t: Vec3 | null;
    p: Vec3 | null;
    e: Vec3 | null;
  };
}

/** Everything the Big picture view draws for A, a chosen x, and an optional target b. */
export function bigPictureModel(A: Matrix, x: Vector, target: Vector | null): BigPictureModel {
  const { rows: m, cols: n } = shape(A);
  if (x.length !== n) throw new RangeError(`x needs ${n} entries, one per column of A`);
  const spaces = fourSubspaces(A);
  const { xr, xn } = decomposeRowNull(A, x);
  const b = matVec(A, x);

  let tgt: BigPictureModel['target'] = null;
  if (target) {
    if (target.length !== m) throw new RangeError(`b needs ${m} entries, one per row of A`);
    const { p, e } = decomposeColumnLeftNull(A, target);
    tgt = { t: target, p, e, Att: matVec(transpose(A), target) };
  }

  const labels: BigPictureLabels = {
    x: `x = ${tuple(x)}`,
    xr: `xᵣ = ${tuple(xr)}`,
    xn: `xₙ = ${tuple(xn)}`,
    b: `b = ${tuple(b)}`,
  };
  if (tgt) {
    labels.t = `b = ${tuple(tgt.t)}`;
    labels.p = `p = ${tuple(tgt.p)}`;
    labels.e = `e = ${tuple(tgt.e)}`;
    labels.Att = `Aᵀb = ${tuple(tgt.Att)}`;
  }

  return {
    m,
    n,
    rank: spaces.rank,
    spaces,
    x,
    xr,
    xn,
    b,
    target: tgt,
    checks: {
      xrDotXn: dot(xr, xn),
      Axn: matVec(A, xn),
      Axr: matVec(A, xr),
      pDotE: tgt ? dot(tgt.p, tgt.e) : null,
      Ate: tgt ? matVec(transpose(A), tgt.e) : null,
    },
    labels,
    scene: {
      rowSpan: spaces.row.map(f3),
      nullSpan: spaces.nullSpace.map(f3),
      columnSpan: spaces.column.map(f3),
      leftNullSpan: spaces.leftNull.map(f3),
      x: f3(x),
      xr: f3(xr),
      xn: f3(xn),
      b: f3(b),
      t: tgt && f3(tgt.t),
      p: tgt && f3(tgt.p),
      e: tgt && f3(tgt.e),
    },
  };
}

export interface SubspaceInfo {
  id: SubspaceId;
  /** "Row space C(Aᵀ)" */
  title: string;
  /** "ℝ³" */
  ambient: string;
  dim: number;
  /** "dim r = 2" */
  dimLabel: string;
  /** One sentence in the notes' language, e.g. "All combinations of the rows of A." */
  description: string;
  /** How it is tested, e.g. "x is in N(A) when Ax = 0". */
  membership: string;
  basisTex: string[];
  /** The subspace it is orthogonal to. */
  complement: SubspaceId;
}

export function subspaceInfo(model: BigPictureModel, id: SubspaceId): SubspaceInfo {
  const { m, n, rank: r, spaces } = model;
  const table: Record<SubspaceId, Omit<SubspaceInfo, 'id' | 'basisTex'> & { basis: Vector[] }> = {
    row: {
      title: 'Row space C(Aᵀ)',
      ambient: realSpace(n),
      dim: r,
      dimLabel: `dim r = ${r}`,
      description: 'All combinations of the rows of A. Row operations never change it.',
      membership: 'x is in C(Aᵀ) when x = Aᵀy for some y.',
      basis: spaces.row,
      complement: 'null',
    },
    null: {
      title: 'Nullspace N(A)',
      ambient: realSpace(n),
      dim: n - r,
      dimLabel: `dim n − r = ${n - r}`,
      description: 'All solutions of Ax = 0: vectors orthogonal to every row of A.',
      membership: 'x is in N(A) when Ax = 0.',
      basis: spaces.nullSpace,
      complement: 'row',
    },
    column: {
      title: 'Column space C(A)',
      ambient: realSpace(m),
      dim: r,
      dimLabel: `dim r = ${r}`,
      description: 'All combinations of the columns of A: every possible Ax.',
      membership: 'b is in C(A) when Ax = b has a solution.',
      basis: spaces.column,
      complement: 'leftNull',
    },
    leftNull: {
      title: 'Left nullspace N(Aᵀ)',
      ambient: realSpace(m),
      dim: m - r,
      dimLabel: `dim m − r = ${m - r}`,
      description: 'All solutions of Aᵀy = 0: vectors orthogonal to every column of A.',
      membership: 'y is in N(Aᵀ) when Aᵀy = 0. Then y · b = 0 for every b in C(A).',
      basis: spaces.leftNull,
      complement: 'column',
    },
  };
  const { basis, ...rest } = table[id];
  return { id, ...rest, basisTex: basis.map(colTex) };
}

// CR factorization explainer (§5.9) -------------------------------------------

export interface CRColumnVerdict {
  /** 0-based column of A. */
  column: number;
  /** True when the column adds a new direction and so joins C. */
  independent: boolean;
  /** Column j of R: the weights on C's columns that rebuild a_j. */
  recipe: Rational[];
  /** "a_3 = a_1 + a_2" (colored) or "a_1 = c_1". */
  tex: string;
  /** One sentence in the notes' language. */
  reason: string;
}

export interface CRExplainer {
  m: number;
  n: number;
  rank: number;
  cr: CRFactorization;
  /** Color-coded A = C R. */
  factorTex: string;
  /** "(3×3) = (3×2)(2×3)" */
  shapeTex: string;
  /** Step 2: each column of A, left to right. */
  columns: CRColumnVerdict[];
  /** Step 4: rref(A) with pivots marked and the zero rows greyed out. */
  rrefTex: string;
  zeroRows: number[];
  /** Step 5: row i of A = Σ C[i][k] · (row k of R). */
  rowRecipes: { row: number; tex: string }[];
  /** Step 7: c_k r_kᵀ for each k, and their sum. */
  rankOneTex: string[];
  rankOneSumTex: string;
  /** Step 8: numbers stored for A versus for C and R. */
  storage: { full: number; factored: number };
  /** C·R reproduces A exactly. */
  reproduces: boolean;
}

const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
const GREY = '#9ca3af';

export function crExplainer(A: Matrix): CRExplainer {
  const { rows: m, cols: n } = shape(A);
  const cr = crFactorization(A);
  const r = cr.pivotCols.length;
  const color = (k: number) => columnColor(cr.pivotCols[k]);
  const name = (k: number) => `a_${cr.pivotCols[k] + 1}`;

  const columns: CRColumnVerdict[] = Array.from({ length: n }, (_, j) => {
    const recipe = columnRecipe(cr, j);
    const k = cr.pivotCols.indexOf(j);
    if (k >= 0) {
      const earlier = cr.pivotCols.slice(0, k).map((p) => `a${sub(p + 1)}`);
      return {
        column: j,
        independent: true,
        recipe,
        tex: `${texColor(color(k), `a_${j + 1}`)} = ${texColor(color(k), `c_${k + 1}`)}`,
        reason:
          earlier.length === 0
            ? `a${sub(j + 1)} is the first nonzero column, so it is a new direction: it becomes c${sub(k + 1)}.`
            : `a${sub(j + 1)} is not a combination of ${earlier.join(' and ')}, so it adds a new direction: it becomes c${sub(k + 1)}.`,
      };
    }
    const terms = recipe
      .map((c, i) => (c.isZero() ? '' : termTex(c, texColor(color(i), name(i)), false)))
      .join('')
      .replace(/^ \+ /, '')
      .replace(/^ - /, '-');
    const isZeroCol = recipe.every((c) => c.isZero());
    return {
      column: j,
      independent: false,
      recipe,
      tex: `a_${j + 1} = ${isZeroCol ? '0' : terms}`,
      reason: isZeroCol
        ? `a${sub(j + 1)} is the zero column: it adds nothing, so it stays out of C.`
        : `a${sub(j + 1)} is a combination of columns already in C, so it adds no new direction and stays out of C.`,
    };
  });

  // Step 4: rref(A) with pivots marked and zero rows greyed.
  const R0 = rrefAugmented(A, zeroVector(m)).matrix.map((row) => row.slice(0, n));
  const zeroRows = R0.map((_, i) => i).filter((i) => i >= r);
  const pivotCells = Object.fromEntries(cr.pivotCols.map((c, i) => [`${i},${c}`, '#F0E442']));
  const rrefEntries = R0.map((row, i) =>
    row.map((x, j) => {
      if (zeroRows.includes(i)) return texColor(GREY, x.toTex());
      if (cr.pivotCols[i] === j) return texColor('#000000', x.toTex());
      return x.toTex();
    }),
  );
  const rrefTex = matrixToTex(rrefEntries, false, { entryBackgrounds: pivotCells });

  // Step 5: rows of A from rows of R.
  const rowRecipes = A.map((row, i) => {
    const terms = cr.C[i]
      .map((c, k) => (c.isZero() ? '' : termTex(c, texColor(color(k), tupleTex(cr.R[k])), false)))
      .join('')
      .replace(/^ \+ /, '')
      .replace(/^ - /, '-');
    return { row: i, tex: `${tupleTex(row)} = ${terms || '0'}` };
  });

  // Step 7: rank-one pieces.
  const pieces = cr.pivotCols.map((_, k) => outer(getColumn(cr.C, k), cr.R[k]));
  const toEntries = (M: Matrix) => M.map((row) => row.map((x) => x.toTex()));
  const rankOneTex = pieces.map(
    (P, k) =>
      `${texColor(color(k), `c_${k + 1}`)}\\,${texColor(color(k), `r_${k + 1}^{T}`)} = ${colTex(getColumn(cr.C, k))}${matrixToTex(
        [cr.R[k].map((x) => x.toTex())],
        false,
        {},
      )} = ${matrixToTex(toEntries(P), false, {})}`,
  );
  const rankOneSumTex =
    r === 0
      ? 'A = 0'
      : `A = ${pieces.map((P) => matrixToTex(toEntries(P), false, {})).join(' + ')} = ${matrixToTex(toEntries(A), false, {})}`;

  return {
    m,
    n,
    rank: r,
    cr,
    factorTex: crView(A, null).tex,
    shapeTex: `\\underset{${m}\\times ${n}}{A} = \\underset{${m}\\times ${r}}{C}\\;\\underset{${r}\\times ${n}}{R}`,
    columns,
    rrefTex,
    zeroRows,
    rowRecipes,
    rankOneTex,
    rankOneSumTex,
    storage: { full: m * n, factored: m * r + r * n },
    reproduces: r === 0 ? A.every((row) => row.every((x) => x.isZero())) : matrixEquals(matMul(cr.C, cr.R), A),
  };
}

/** Step 3 canvas: C's columns, weighted by column j of R, landing exactly on a_j. */
export function crColumnScene(A: Matrix, j: number): ColumnPictureScene {
  const cr = crFactorization(A);
  const scene = columnPictureScene(cr.C, getColumn(A, j), columnRecipe(cr, j));
  // Color C's k-th column like the column of A it came from.
  const recolor = <T extends { color: string }>(items: T[]) =>
    items.map((it, k) => ({ ...it, color: columnColor(cr.pivotCols[k]) }));
  return { ...scene, columns: recolor(scene.columns), tipToTail: recolor(scene.tipToTail) };
}

// Projection onto C(A) (least squares, Lesson 2 notes §2.2) ---------------------

export interface ProjectionScene {
  dim: 2 | 3;
  /** C(A): a line or a plane through the origin (L2-P1). */
  span: { kind: 'line' | 'plane'; vectors: Vec3[] };
  /** The columns of A, in their column colors. */
  columns: { to: Vec3; label: string; color: string }[];
  b: Vec3;
  p: Vec3;
  /** e = b − p, drawn from p to b with a right-angle marker. */
  e: { from: Vec3; to: Vec3 };
  /** Ax at the slider x (L2-P2). */
  Ax: Vec3;
  /** ‖b − Ax‖ at the slider x. */
  distance: number;
  atOptimum: boolean;
}

export interface WeightControl {
  /** "x_1" */
  tex: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ProjectionView {
  /** null when m > 3: numbers and a note in place of the canvas (L2-P7). */
  scene: ProjectionScene | null;
  note: string | null;
  /** Sliders for x, with ranges that keep x̂ comfortably inside (L2-P2). */
  weights: WeightControl[];
  /** x̂, or null when AᵀA is singular. */
  xHat: Vector | null;
  p: Vector;
  e: Vector;
  /** L2-P3: each column of A dotted with e, all zero (e ∈ N(Aᵀ)). */
  orthogonality: { label: string; tex: string; value: Rational }[];
}

/**
 * b = p + e: the closest vector to b in C(A) and the error perpendicular to
 * it. `x` is the slider position (null = at x̂). Any m; draws when m ∈ {2, 3}.
 */
export function projectionView(A: Matrix, b: Vector | null, x: number[] | null): ProjectionView {
  const { rows: m, cols: n } = shape(A);
  const target = orZeros(b, m);
  const ls = leastSquares(A, target);
  // With dependent columns many x reach p; the sliders start at the one in the row space.
  const best = toFloatVector(ls.xHat ?? rowSpaceSolution(A, ls.p)!);
  const current = x && x.length === n ? x : best;

  const weights = best.map((v, k) => {
    const reach = Math.max(2, Math.abs(v));
    return { tex: `x_${k + 1}`, value: current[k], min: Math.floor(v - reach), max: Math.ceil(v + reach), step: 0.01 };
  });
  const orthogonality = Array.from({ length: n }, (_, j) => ({
    label: `a${j + 1}`,
    tex: `a_${j + 1} \\cdot e`,
    value: dot(getColumn(A, j), ls.e),
  }));
  const base = { weights, xHat: ls.xHat, p: ls.p, e: ls.e, orthogonality };

  if (m !== 2 && m !== 3) {
    return { ...base, scene: null, note: `b lives in ${realSpace(m)}, which can't be drawn; here are the numbers instead.` };
  }
  const Af = A.map((r) => toFloatVector(r));
  const bF = toFloatVector(target);
  const AxF = Af.map((r) => r.reduce((s, a, j) => s + a * current[j], 0));
  const distance = Math.hypot(...bF.map((v, i) => v - AxF[i]));
  const best_ = normFloat(ls.e);
  const basis = columnSpaceBasis(A).map(f3);
  return {
    ...base,
    note: null,
    scene: {
      dim: m,
      span: { kind: basis.length <= 1 ? 'line' : 'plane', vectors: basis },
      columns: Array.from({ length: n }, (_, j) => ({ to: f3(getColumn(A, j)), label: `a_${j + 1}`, color: columnColor(j) })),
      b: f3(target),
      p: f3(ls.p),
      e: { from: f3(ls.p), to: f3(target) },
      Ax: toVec3(AxF),
      distance,
      atOptimum: Math.abs(distance - best_) <= 1e-9 * Math.max(1, Math.hypot(...bF)),
    },
  };
}

// Normal equation (Lesson 2 notes §2.2–2.3) ----------------------------------------

export type DerivationHighlight = 'e' | 'orthogonal' | 'normal';

export interface DerivationStep {
  tex: string;
  reason: string;
  /** What to highlight in the projection picture (L2-N1). */
  highlight: DerivationHighlight;
}

export interface ProofStep {
  tex: string;
  reason: string;
}

export interface NormalEquationView {
  /** L2-N1: e ⟂ C(A) → Aᵀ(b − Ax̂) = 0 → AᵀAx̂ = Aᵀb. */
  derivation: DerivationStep[];
  AtA: Matrix;
  Atb: Vector;
  /** L2-N3: rref of [AᵀA | Aᵀb] with the elimination stepper. */
  trace: AugmentedRrefResult;
  xHat: Vector | null;
  /** L2-N4 */
  invertibility: {
    rank: number;
    columns: number;
    independent: boolean;
    /** "A^TA \text{ is invertible} \iff A \text{ has independent columns}" */
    theoremTex: string;
    explanation: string;
    /** "a₂ = a₁" (F-M14, via CR). */
    dependencies: string[];
  };
  /** L2-N5: both directions of the theorem, as expandable steps. */
  proof: { title: string; steps: ProofStep[] }[];
  /** L2-N6: for the house presets, where the Lesson 2 notes round x̂ (400/133 ≈ 3.008, notes: 3). */
  roundingNote: string | null;
}

export function normalEquationView(A: Matrix, b: Vector | null): NormalEquationView {
  const { rows: m, cols: n } = shape(A);
  const target = orZeros(b, m);
  const ls = leastSquares(A, target);
  const diagnosis = diagnoseDependencies(A);
  const labels = Array.from({ length: n }, (_, j) => `a${subDigits(j + 1)}`);
  return {
    derivation: [
      { tex: 'e = b - A\\hat{x} \\perp C(A)', reason: 'The closest point p = Ax̂ leaves an error e perpendicular to every column of A.', highlight: 'e' },
      { tex: 'A^T(b - A\\hat{x}) = 0', reason: 'Every column of A dotted with e is 0, so e is in N(Aᵀ).', highlight: 'orthogonal' },
      { tex: 'A^TA\\hat{x} = A^Tb', reason: 'Distribute Aᵀ and move Aᵀb to the right: the normal equation.', highlight: 'normal' },
    ],
    AtA: ls.AtA,
    Atb: ls.Atb,
    trace: { ...ls.normalTrace, trace: { steps: ls.normalTrace.trace.steps.map((st, k) => (k === 0 ? { ...st, description: 'Start with [AᵀA | Aᵀb]' } : st)) } },
    xHat: ls.xHat,
    invertibility: {
      rank: diagnosis.rank,
      columns: n,
      independent: diagnosis.independent,
      theoremTex: 'A^TA \\text{ is invertible} \\iff A \\text{ has independent columns}',
      explanation: diagnosis.independent
        ? 'The columns are independent, so AᵀA is invertible and x̂ is unique.'
        : 'The columns are dependent, so AᵀA is singular: every x with Ax = p is a best solution.',
      dependencies: diagnosis.dependencies.map((d) => describeDependency(d, labels)),
    },
    proof: [
      {
        title: '⟹ If AᵀA is invertible, A has independent columns',
        steps: [
          { tex: 'Ax = 0', reason: 'Suppose a combination of the columns is zero.' },
          { tex: '(A^TA)x = A^T(Ax) = 0', reason: 'Multiply both sides by Aᵀ.' },
          { tex: 'x = 0', reason: 'AᵀA is invertible, so x = 0: the columns of A are independent.' },
        ],
      },
      {
        title: '⟸ If A has independent columns, AᵀA is invertible',
        steps: [
          { tex: '(A^TA)x = 0', reason: 'Suppose AᵀA sends x to zero.' },
          { tex: 'x^T(A^TA)x = (Ax)^T(Ax) = \\|Ax\\|^2 = 0', reason: 'Multiply on the left by xᵀ.' },
          { tex: 'Ax = 0', reason: 'Only the zero vector has length 0.' },
          { tex: 'x = 0', reason: 'The columns of A are independent.' },
          { tex: 'A^TA \\text{ is invertible}', reason: 'AᵀA is square and only x = 0 solves (AᵀA)x = 0.' },
        ],
      },
    ],
    roundingNote: notesRoundingNote(A, target, 'x̂'),
  };
}

/** L2-N2: the dot product behind one entry, e.g. "(A^TA)_{12} = 1\cdot1 + 1\cdot2.25 + 1\cdot1.5 = 4.75". */
export function entryDotProduct(A: Matrix, b: Vector | null, which: 'AtA' | 'Atb', i: number, j: number): string {
  const target = orZeros(b, shape(A).rows);
  const left = getColumn(A, i);
  const right = which === 'AtA' ? getColumn(A, j) : target;
  const name = which === 'AtA' ? `(A^TA)_{${i + 1}${j + 1}}` : `(A^Tb)_{${i + 1}}`;
  const terms = left.map((a, k) => `${decimalTex(a)}\\cdot ${decimalTex(right[k])}`).join(' + ');
  return `${name} = ${terms} = ${decimalTex(dot(left, right))}`;
}

