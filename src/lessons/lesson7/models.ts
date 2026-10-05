/**
 * View-models for the Lesson 7 views: the SVD as rank-1 layers and the best
 * rank-k approximation, image compression, PCA (centering, components,
 * dimension reduction, covariance, variance explained, standardizing), the
 * regression line against the PCA line, and face recognition. Small examples
 * are exact where the notes' numbers are (F-M49, F-M51); SVDs of data and
 * images are floating point and say so (F-D10). Kept pure so they can be unit
 * tested.
 */
import type { ChartFrame } from '../../components/canvas/charts';
import type { Bar } from '../../components/display/BarChart';
import type { FaceSet } from '../../core/faces';
import type { AnyMatrix, FloatMatrix, FloatVector, Precision } from '../../core/float';
import type { ExactLayers, StorageCost } from '../../core/lowRank';
import type { Matrix, Vector } from '../../core/matrix';
import { notImplemented } from '../../core/notImplemented';
import type { ComponentSign, PcaResult } from '../../core/pca';
import type { ThinSvd } from '../../core/svdLarge';
import type { FaceQuery } from '../../store/useLesson7Store';
import type { NumberDisplay } from '../../store/useDataStore';

/** "XV = UΣ" style check. */
export interface Check {
  name: string;
  holds: boolean;
  tex: string;
  residual?: number;
}

/** A step of any Lesson 7 stepper. */
export interface Lesson7Step {
  description: string;
  tex: string;
}

/** A point on a 2D scatter, in data coordinates. */
export type Point = [number, number];

// §11.1 SVD and the best rank-k approximation ----------------------------------------

export interface SvdFactor {
  /** "U", "\\Sigma", "V^T", "U_r", … */
  name: string;
  /** "m \\times m" with the numbers: "2 \\times 2". */
  shape: string;
  tex: string;
}

export interface SvdLayer {
  index: number;
  /** σᵢuᵢvᵢᵀ: exact when F-M49 applies, floats otherwise. */
  matrix: AnyMatrix;
  entries: number[][];
  /** "\\sqrt{3}\\,u_1v_1^T = \\frac{1}{2}\\begin{bmatrix}…\\end{bmatrix}" */
  tex: string;
  sigmaTex: string;
  size: number;
}

export interface SvdView {
  precision: Precision;
  m: number;
  n: number;
  rank: number;
  /** L7-S1: full A = UΣVᵀ with the unused parts greyed, and reduced A = U_rΣ_rV_rᵀ. */
  full: SvdFactor[];
  reduced: SvdFactor[];
  /** Columns of U (beyond r) and rows of Vᵀ (beyond r) that multiply zeros, for greying. */
  unused: { uColumns: number[]; vRows: number[] };
  /** L7-S2: the layers, largest first. */
  layers: SvdLayer[];
  exact: ExactLayers | null;
  /** L7-S3: Aₖ, the leftover A − Aₖ, its size, and the exact error statement. */
  k: number;
  approx: number[][];
  leftover: number[][];
  errorSquared: number;
  errorTex: string;
  maxAbs: number;
}

/** §11.1 (L7-S1–L7-S3). Matrices up to 4 × 4. */
export function svdView(A: Matrix, k: number, display: NumberDisplay): SvdView {
  return notImplemented('svdView');
}

export interface SvdGeometry {
  dim: 2 | 3;
  /** L7-S4: each vᵢ (on the unit circle or sphere) and its image σᵢuᵢ (an axis of the ellipse). */
  axes: { v: [number, number, number]; image: [number, number, number]; sigma: number; label: string }[];
  /** A, for drawing the image of the circle (points Ax for x on the unit circle). */
  A: FloatMatrix;
}

/** L7-S4: for 2 × 2 and 3 × 3 matrices only. Throws for other shapes. */
export function svdGeometry(A: Matrix): SvdGeometry {
  return notImplemented('svdGeometry');
}

// §11.2 Image compression -----------------------------------------------------------

export interface CompressionView {
  k: number;
  /** L7-I3 */
  storage: StorageCost;
  storageText: string;
  /** L7-I4: share of ‖A‖² kept. */
  energyKept: number;
  /** ‖A − Aₖ‖ relative to ‖A‖. */
  relativeError: number;
  /** L7-I4: σᵢ on a log axis with the cutoff line c·σ₁. */
  chart: { frame: ChartFrame; points: [number, number][]; cutoff: [number, number][]; kMarker: [number, number][] };
  /** L7-I6: the trade-off without a recommendation. */
  tradeOff: string;
}

/** §11.2. k comes from the slider, or from the cutoff rule when `kMode` is "cutoff". */
export function compressionView(svd: ThinSvd, rows: number, cols: number, k: number, kMode: 'slider' | 'cutoff', cutoff: number): CompressionView {
  return notImplemented('compressionView');
}

/** L7-I5: one layer σᵢuᵢvᵢᵀ as an image matrix (signed). */
export function layerImage(svd: ThinSvd, i: number): FloatMatrix {
  return notImplemented('layerImage');
}

/** L7-I5: the leftover A − Aₖ (signed). */
export function leftoverImage(image: FloatMatrix, approx: FloatMatrix): FloatMatrix {
  return notImplemented('leftoverImage');
}

// §11.3 PCA: centering and components ------------------------------------------------

export interface ScatterView {
  /** One frame for every scatter in the PCA views, with equal aspect so angles are true. */
  frame: ChartFrame;
  points: Point[];
}

/** A shared frame around the points (and the origin), with equal aspect. */
export function scatterView(points: Point[], titles: [string, string]): ScatterView {
  return notImplemented('scatterView');
}

/** L7-P2: compute each mean, subtract it; one step per column, then the centered table. */
export function centeringSteps(X: Matrix, display: NumberDisplay): Lesson7Step[] {
  return notImplemented('centeringSteps');
}

export interface PcaView {
  pca: PcaResult;
  /** Centered points (before any standardizing), for the "after" scatter. */
  centered: Point[];
  /** L7-P3: U_r, Σ_r, V_rᵀ as TeX in the notes' layout. */
  factorsTex: { U: string; Sigma: string; Vt: string };
  /** σ₁u₁v₁ᵀ and σ₂u₂v₂ᵀ, which add up to X. */
  pieces: number[][][];
  /** L7-P4: v₁ as a line through the origin and v₂ perpendicular, for the scatter. */
  lines: { label: string; color: string; from: Point; to: Point }[];
  /** L7-P5: the notes' reasoning about the sign of v₁. */
  signNote: string;
  check: Check;
}

/** §11.3 (L7-P3–L7-P5). `flipV1` multiplies v₁ (and u₁, z₁) by −1. */
export function pcaView(X: Matrix, options: { standardize: boolean; sign: ComponentSign; flipV1: boolean }): PcaView {
  return notImplemented('pcaView');
}

// §11.4 Dimension reduction ---------------------------------------------------------

export interface ReductionView {
  /** L7-D1: z₁ = Xv₁ and z₂ = Xv₂ per row, with the formulas. */
  scores: Point[];
  formulas: [string, string];
  /** L7-D3: each point dropped onto the v₁ line: the rows of σ₁u₁v₁ᵀ = Xv₁v₁ᵀ. */
  projected: Point[];
  /** L7-D2: the rotation angle of v₁ from the x₁ axis (radians), for the animation. */
  angle: number;
  /** L7-D5: the notes' z₂ column used the wrong formula. */
  notesCorrection: string;
}

/** §11.4 (L7-D1–L7-D3, L7-D5) */
export function reductionView(X: Matrix, options: { standardize: boolean; sign: ComponentSign; flipV1: boolean }): ReductionView {
  return notImplemented('reductionView');
}

export interface RegressionRow {
  /** "y = θ₀ + θ₁x₁ + θ₂x₂" */
  model: string;
  theta: number[];
  thetaText: string;
  meanRss: number;
}

export interface RegressionComparison {
  /** L7-D4, in this order: x₁ and x₂, z₁ only, z₁ and z₂, x₁ only, x₂ only. */
  rows: RegressionRow[];
  /** The x-model and the (z₁, z₂)-model predict the same (to 10⁻¹⁰). */
  samePredictions: Check;
}

/** L7-D4: least squares (Lesson 2 core) on the original variables and on the components. */
export function regressionComparison(X: Matrix, y: Vector, options: { sign: ComponentSign; flipV1: boolean }): RegressionComparison {
  return notImplemented('regressionComparison');
}

// §11.5 Covariance matrix -----------------------------------------------------------

/** L7-C1: mean, variance (n − 1) and covariance with every sum written out. */
export function covarianceSteps(X: Matrix, display: NumberDisplay): Lesson7Step[] {
  return notImplemented('covarianceSteps');
}

export interface CovarianceView {
  /** L7-C2: each point's product (x₁ − x̄₁)(x₂ − x̄₂), and its sign. */
  products: { point: Point; product: number; label: string }[];
  /** L7-C3: XᵀX and S = XᵀX/(n − 1), exact. */
  XtX: Matrix;
  S: Matrix;
  /** The same entries written as sums. */
  sumsTex: string;
  /** L7-C4: eigenvalues and eigenvectors of S beside the SVD of X/√(n − 1). */
  eigen: { lambda: number; vector: [number, number]; lambdaTex: string }[];
  sigmaOverRoot: number[];
  check: Check;
  /** L7-C5: the covariance ellipse, axes along v₁, v₂ with lengths ∝ √λ. */
  ellipse: { center: Point; axes: { dir: Point; length: number }[] };
}

/** §11.5 (L7-C2–L7-C5) */
export function covarianceView(X: Matrix, display: NumberDisplay): CovarianceView {
  return notImplemented('covarianceView');
}

// §11.6 Variance explained and standardizing -----------------------------------------

export interface VarianceView {
  pca: PcaResult;
  /** L7-V1: λᵢ/Σλ as bars, with a running total. */
  bars: Bar[];
  running: number[];
  /** L7-V2: the same percentages from σᵢ²/Σσ². */
  fromSingularValues: number[];
  check: Check;
  /** L7-V3: kept components (signal) and the rest (noise). */
  kept: number;
  keptText: string;
  /** L7-V4: S, or the correlation matrix when standardized. */
  matrixTex: string;
  matrixName: string;
}

/** §11.6 (L7-V1–L7-V4) */
export function varianceView(X: Matrix, options: { standardize: boolean; sign: ComponentSign; keep: number }): VarianceView {
  return notImplemented('varianceView');
}

/** L7-V5: numpy.linalg.svd on the centered data and sklearn's PCA, with comments on scaling and signs. */
export function pythonExport(X: Matrix, standardize: boolean): string {
  return notImplemented('pythonExport');
}

/** L7-V6 */
export const NOTES_CORRECTION_SQRT =
  'The notes compare √56.9258 with 16.87; the relation is √λ₁ = σ₁/√(n − 1), that is √56.9258 = 16.87/√5. As printed, the sentence has an extra √5 on the left.';

// §11.7 Best line: regression vs PCA -------------------------------------------------

export interface FittedLine {
  label: string;
  color: string;
  slope: number;
  intercept: number;
  /** "5/4", or "(2 + √29)/5 ≈ 1.477" for the PCA line when the data is the notes'. */
  slopeText: string;
  /** Endpoints across the frame. */
  segment: [Point, Point];
  /** Residual segments from each point to the line, measured the line's own way. */
  residuals: [Point, Point][];
  /** L7-L2: sum of squared distances measured vertically and perpendicularly. */
  verticalSse: number;
  perpendicularSse: number;
}

export interface BestLineView {
  /** L7-L1, L7-L4: regression of x₂ on x₁ (vertical), the PCA line (perpendicular), and optionally x₁ on x₂ (horizontal). */
  regression: FittedLine;
  pca: FittedLine;
  reverse: FittedLine | null;
  /** L7-L4 (beyond the notes): the PCA slope lies between the two regression slopes. */
  between: Check;
  /** L7-L5 */
  caption: string;
}

/** §11.7 */
export function bestLineView(X: Matrix, showReverse: boolean): BestLineView {
  return notImplemented('bestLineView');
}

// §11.8 Face recognition -----------------------------------------------------------

/** L7-F1: the frames of unrolling an a × b image into a row: after f frames, the first f rows are laid end to end. */
export function unrollFrames(image: FloatMatrix): { row: FloatVector; rowsDone: number }[] {
  return notImplemented('unrollFrames');
}

export interface FaceMatch {
  index: number;
  person: number;
  distance: number;
}

export interface FaceView {
  /** L7-F3 */
  mean: FloatMatrix;
  /** L7-F4: the first eigenfaces as images (signed). */
  eigenfaces: FloatMatrix[];
  /** L7-F5: variance explained by the first m components. */
  explained: number;
  m: number;
  /** A chosen face and its reconstruction μ + wV_pcaᵀ. */
  original: FloatMatrix;
  reconstruction: FloatMatrix;
  /** L7-F6: the query image, the closest database faces, and whether the best match is the right person. */
  query: FloatMatrix;
  queryPerson: number | null;
  matches: FaceMatch[];
  correct: boolean | null;
  /** L7-F7: (w₁, w₂) per face, by person, and the query's. */
  scatter: { person: number; point: Point }[];
  queryPoint: Point;
  frame: ChartFrame;
  /** Database size: faces held out as queries are not in it. */
  databaseSize: number;
}

/**
 * §11.8. The last variation of every person is held out of the database (for
 * "held-out" queries); the eigenfaces come from the rest.
 */
export function faceView(set: FaceSet, m: number, query: FaceQuery, faceIndex: number, upload: FloatMatrix | null): FaceView {
  return notImplemented('faceView');
}

export interface RecognitionRate {
  /** Share of held-out faces matched to the right person, for each m. */
  points: [number, number][];
  frame: ChartFrame;
}

/** L7-F5/F6 acceptance: recognition rate of the held-out faces against m. */
export function recognitionRate(set: FaceSet, ms: number[]): RecognitionRate {
  return notImplemented('recognitionRate');
}
