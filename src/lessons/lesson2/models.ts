/**
 * View-models for the Lesson 2 views: turn exact regression results into what
 * the renderer draws (floats, colors, labels, TeX). Kept pure so they can be
 * unit tested. Every view works from one LessonData: the shared dataset and
 * model (§7), the design matrix built from them, and the exact fit.
 *
 * The matrix side of least squares (projection onto C(X), the normal
 * equation, §6.3–6.4 of the PRD) is drawn by Lesson 1's projection and normal
 * equation views, with X and Y sent over as A and b.
 */
import type { ChartFrame, ScatterPoint } from '../../components/canvas/charts';
import type { Vec3 } from '../../components/canvas/types';
import type { Matrix } from '../../core/matrix';
import { notImplemented } from '../../core/notImplemented';
import type { Rational } from '../../core/rational';
import { leastSquares, type LeastSquaresResult } from '../../core/leastSquares';
import {
  designMatrix,
  modelSpecFor,
  type Dataset,
  type DesignMatrix,
  type ModelChoice,
  type ModelSpec,
  type ModelTerm,
} from '../../core/regression';
import type { AugmentedRrefResult } from '../../core/rref';
import type { FloatGrid } from '../../core/sampling';
import type { RowPictureScene } from '../lesson1/models';

// Shared ---------------------------------------------------------------------

export interface LessonData {
  dataset: Dataset;
  choice: ModelChoice;
  spec: ModelSpec;
  design: DesignMatrix;
  /** Least squares on Xθ = Y: fit.xHat is θ*. */
  fit: LeastSquaresResult;
}

/** Dataset + model → X → fit. Rebuilt whenever the data or the model changes (§3.2). */
export function lessonData(dataset: Dataset, choice: ModelChoice): LessonData {
  const spec = modelSpecFor(choice, dataset.features.length);
  const design = designMatrix(dataset, spec);
  return { dataset, choice, spec, design, fit: leastSquares(design.X, design.Y) };
}

/** The θ to draw: the store's θ (slider or drag), or θ* as floats when it is null. */
export function currentTheta(data: LessonData, theta: number[] | null): number[] {
  return notImplemented('currentTheta');
}

export interface ThetaControl {
  /** "\\theta_0" */
  tex: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ThetaControls {
  params: ThetaControl[];
  /** True when θ is at θ* (L2-P2 indicator). */
  atOptimum: boolean;
}

/** θ sliders with ranges that keep θ* comfortably inside (L2-P2, L2-L1). */
export function thetaControls(data: LessonData, theta: number[] | null): ThetaControls {
  return notImplemented('thetaControls');
}

// Data plot (shared by §6.1, §6.5, §6.6) ---------------------------------

export interface ResidualMark {
  row: number;
  color: string;
  /** Data coordinates of the point and of the model's prediction there. */
  from: number[];
  to: number[];
  x: number;
  y: number;
  prediction: number;
}

export interface DataPlotScene {
  /** 2: one feature, (x, y). 3: two features, (x₁, x₂, y). */
  dim: 2 | 3;
  frame: ChartFrame;
  /** L2-D2: colored per data row. */
  points: ScatterPoint[];
  /** dim 2: sampled h(x) (F-M15). */
  curve: [number, number][];
  /** dim 3: the fitted plane or surface (L2-M3). */
  surface: FloatGrid | null;
  /** Vertical residuals from each point to the model: the components of Y − Xθ (L2-P4, L2-L1). */
  residuals: ResidualMark[];
  /**
   * Other models' fitted curves drawn on the same plot, as in the notes' §2.2
   * figure: h(x) = θx (red) against h(x) = θ₀ + θ₁x (orange). Empty unless
   * `compareWith` is passed. dim 2 only.
   */
  overlays: { label: string; formulaTex: string; color: string; curve: [number, number][] }[];
}

export interface DataPlotOptions {
  /** Equal axis scales, so residual squares are honest (L2-L1). */
  equalAspect?: boolean;
  /** Models to fit and draw alongside the current one (notes §2.2 figure). */
  compareWith?: ModelChoice[];
}

/**
 * The data with the model drawn at θ. Throws a RangeError with a reason when
 * the data has more than 2 features (§7 size limits).
 */
export function dataPlotScene(data: LessonData, theta: number[], options: DataPlotOptions = {}): DataPlotScene {
  return notImplemented('dataPlotScene');
}

// §6.1 Data and model --------------------------------------------------------

/**
 * Notes §2.1–2.2 vocabulary. `regression` and `machineLearning` carry the
 * notes' definitions (machine learning: the IBM quote); `affine` explains why
 * h(x) = θ₀ + θ₁x is still called a linear model.
 */
export type VocabId =
  | 'regression'
  | 'machineLearning'
  | 'feature'
  | 'target'
  | 'predictor'
  | 'parameters'
  | 'dataPoint'
  | 'affine';

export interface VocabTerm {
  id: VocabId;
  /** "feature (input)" */
  term: string;
  /** "x" */
  tex: string;
  /** What it names on screen, e.g. "Living area (1000 sq ft): the first table column". */
  meaning: string;
}

export interface DataModelView {
  /** L2-D3: the chosen model, e.g. "h(x) = \\theta_0 + \\theta_1 x". */
  formulaTex: string;
  /** The model with θ* filled in. */
  fittedTex: string;
  /**
   * L2-N6 for the notes' figures: "The notes round θ* to 3 (h(x) = 3x); the
   * exact value is 400/133 ≈ 3.008." null for data that is not from the notes.
   */
  roundingNote: string | null;
  /** L2-D4 */
  vocabulary: VocabTerm[];
}

export function dataModelView(data: LessonData): DataModelView {
  return notImplemented('dataModelView');
}

export interface Prediction {
  x: Rational;
  /** h(x) with θ*, exact (L2-D5: h(2) = 215/38). */
  y: Rational;
  tex: string;
}

/** Throws when θ* does not exist (XᵀX singular) or the model has more than one feature. */
export function predict(data: LessonData, x: Rational): Prediction {
  return notImplemented('predict');
}

// §6.2 Fitting gives an inconsistent system ------------------------------------

export interface EquationRow {
  row: number;
  color: string;
  /** h(x⁽ⁱ⁾) = y⁽ⁱ⁾ with the numbers plugged in, e.g. "\\theta_0 + 2.25\\theta_1 = 6". */
  equationTex: string;
}

export type ParameterSpaceScene =
  /** Two parameters: each equation is a line in the (θ₀, θ₁) plane (Lesson 1 row picture). */
  | { kind: 'lines'; rowPicture: RowPictureScene; intersections: Vec3[]; thetaStar: Vec3 }
  /** One parameter: each equation gives its own θ on a number line. */
  | {
      kind: 'numberLine';
      values: { value: number; exact: Rational; color: string; label: string }[];
      thetaStar: number;
      range: [number, number];
    }
  | { kind: 'none'; reason: string };

export interface InconsistentSystemView {
  /** L2-I1: one equation per data point, in its row's color. */
  equations: EquationRow[];
  /** [X | Y], the input to the elimination stepper. */
  XY: Matrix;
  /** L2-I2: rref of [X | Y] via the Lesson 1 stepper. */
  rref: AugmentedRrefResult;
  /** "Row 2 reads 0 = −3: no θ satisfies every equation." null when consistent. */
  inconsistentMessage: string | null;
  parameterSpace: ParameterSpaceScene;
  /** X is at most 4×4, so it can be opened in Lesson 1 as A (projection, normal equation, big picture). */
  fitsLesson1: boolean;
}

export function inconsistentSystemView(data: LessonData): InconsistentSystemView {
  return notImplemented('inconsistentSystemView');
}

/** L2-I3: lines meeting pairwise but not at one point, with θ* as the best compromise. */
export function parameterSpaceScene(data: LessonData): ParameterSpaceScene {
  return notImplemented('parameterSpaceScene');
}

// §6.5 Loss explorer -------------------------------------------------------------

export interface LossTerm {
  row: number;
  color: string;
  /** (y⁽ⁱ⁾ − θᵀx⁽ⁱ⁾)² with numbers. */
  tex: string;
  value: number;
}

export interface LossView {
  /** L2-L2: one term per data row. */
  terms: LossTerm[];
  /** ‖Y − Xθ‖² at the current θ (floats while dragging, NF-7). */
  loss: number;
  meanRss: number;
  /**
   * Notes §2.3: Y − Xθ read by rows. Each entry is y⁽ⁱ⁾ − (x⁽ⁱ⁾)ᵀθ, which
   * equals y⁽ⁱ⁾ − θᵀx⁽ⁱ⁾ because uᵀv = vᵀu, where x⁽ⁱ⁾ is row i of X.
   */
  residualRows: { tex: string; reason: string }[];
}

export function lossView(data: LessonData, theta: number[]): LossView {
  return notImplemented('lossView');
}

export type LossLandscape =
  /** L2-L4: one parameter — the loss as a parabola in θ. */
  | { kind: 'parabola'; frame: ChartFrame; curve: [number, number][]; thetaStar: number }
  /** L2-L3: two parameters — heatmap with contours, and an optional 3D surface. */
  | { kind: 'heatmap'; frame: ChartFrame; grid: FloatGrid; thetaStar: [number, number]; surfaceFrame: ChartFrame }
  | { kind: 'none'; reason: string };

/** Depends only on the data and model, not θ, so it is not recomputed while dragging. */
export function lossLandscape(data: LessonData): LossLandscape {
  return notImplemented('lossLandscape');
}

/** L2-L1: two draggable handles on the line (data coordinates) for the current θ. */
export function lineHandles(data: LessonData, theta: number[]): [[number, number], [number, number]] {
  return notImplemented('lineHandles');
}

/** The line θ₀ + θ₁x through two handles. */
export function thetaFromHandles(handles: [[number, number], [number, number]]): number[] {
  return notImplemented('thetaFromHandles');
}

/** L2-L5: θ at each animation frame from the current θ to θ*. */
export function snapPath(from: number[], to: number[], frames: number): number[][] {
  return notImplemented('snapPath');
}

export interface ComparisonRow {
  /** "Line", "Degree 2", … */
  name: string;
  parameters: number;
  thetaTex: string;
  /** null when XᵀX is singular for this model. */
  meanRss: Rational | null;
  current: boolean;
}

/** L2-L6: the models worth comparing for this dataset (shared with §6.6). */
export function comparisonChoices(dataset: Dataset): ModelChoice[] {
  return notImplemented('comparisonChoices');
}

export function modelComparison(dataset: Dataset, choices: ModelChoice[], current: ModelChoice): ComparisonRow[] {
  return notImplemented('modelComparison');
}

// §6.6 Multi-variable and polynomial ------------------------------------------------

export interface TermOption {
  term: ModelTerm;
  label: string;
  tex: string;
  active: boolean;
}

export interface DesignMatrixBuilder {
  /** L2-M1: available terms (cross terms such as x₁x₂ and x₁²x₂ for two features). */
  options: TermOption[];
  /** X with its column labels above it, as in the notes. */
  XTex: string;
  /**
   * Notes §2.3: every parameter θᵢ goes with one column of X. θ₀ goes with the
   * constant column (feature null); the others with a feature or a term of one.
   */
  parameters: { tex: string; columnLabel: string; feature: string | null }[];
}

export function designMatrixBuilder(data: LessonData): DesignMatrixBuilder {
  return notImplemented('designMatrixBuilder');
}

/** Add or remove one term from the model, keeping the notes' column order (1, x, x², …). */
export function toggleTerm(spec: ModelSpec, term: ModelTerm): ModelTerm[] {
  return notImplemented('toggleTerm');
}

export interface PolynomialView {
  /** L2-M2: the slider runs from 0 to n − 1. */
  maxDegree: number;
  degree: number;
  meanRss: Rational | null;
  /** True at degree n − 1: the curve passes through every point. */
  exactFit: boolean;
}

/** Throws a RangeError when the dataset has more than one feature. */
export function polynomialView(data: LessonData): PolynomialView {
  return notImplemented('polynomialView');
}

// §6.7 Python ----------------------------------------------------------------

export interface PythonOptions {
  /** L2-X2 */
  matplotlib: boolean;
  /** L2-X3 */
  lstsq: boolean;
}

export interface PythonCode {
  /** L2-X1: the notes' LeastSquares function with X and Y filled in, expected output as a comment. */
  solve: string;
  matplotlib: string | null;
  lstsq: string | null;
}

export function pythonCode(data: LessonData, options: PythonOptions): PythonCode {
  return notImplemented('pythonCode');
}
