/**
 * View-models for the Lesson 1 views: turn exact core results into what the
 * renderer draws (floats, colors, labels). Kept pure so they can be unit tested.
 */
import type { Vec3 } from '../../components/canvas/types';
import type { CRFactorization } from '../../core/factorization';
import type { Matrix, Vector } from '../../core/matrix';
import { notImplemented } from '../../core/notImplemented';
import type { Rational } from '../../core/rational';
import type { AugmentedRrefResult } from '../../core/rref';
import type { SolutionSet } from '../../core/solve';
import type { FourSubspaces } from '../../core/subspaces';

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

export function rowPictureScene(A: Matrix, b: Vector): RowPictureScene {
  return notImplemented('rowPictureScene');
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

export function columnPictureScene(A: Matrix, b: Vector, x: Rational[]): ColumnPictureScene {
  return notImplemented('columnPictureScene');
}

/** L1-C4: exact slider targets for "Solve", or null when no solution exists. */
export function solveTarget(A: Matrix, b: Vector): Rational[] | null {
  return notImplemented('solveTarget');
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

export function freeParameterState(A: Matrix, b: Vector, t: Rational): FreeParameterState {
  return notImplemented('freeParameterState');
}

// §5.4 Elimination ----------------------------------------------------------

export interface EliminationView {
  rref: AugmentedRrefResult;
  freeCols: number[];
  solution: SolutionSet;
  /** "x = (2,1,0) + t(−1,−1,1)" as TeX (L1-G4). */
  parametricTex: string | null;
}

export function eliminationView(A: Matrix, b: Vector): EliminationView {
  return notImplemented('eliminationView');
}

/** Row-picture planes for a given trace step (L1-G5). */
export function rowPictureAtStep(view: EliminationView, stepIndex: number): RowPictureScene {
  return notImplemented('rowPictureAtStep');
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

export function columnSpaceScene(A: Matrix, b: Vector): ColumnSpaceScene {
  return notImplemented('columnSpaceScene');
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
  return notImplemented('productsView');
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
  return notImplemented('crView');
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
  return notImplemented('subspacesView');
}
