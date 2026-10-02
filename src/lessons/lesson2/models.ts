/**
 * View-models for the Lesson 2 views: turn exact regression results into what
 * the renderer draws (floats, colors, labels, TeX). Kept pure so they can be
 * unit tested. Every view works from one LessonData: the shared dataset and
 * model (§7), the design matrix built from them, and the exact fit.
 *
 * The matrix side of least squares (projection onto C(X), the normal
 * equation, PRD §5.10–5.11) is drawn by Lesson 1's projection and normal
 * equation views, with X and Y sent over as A and b.
 */
import type { ChartFrame, ScatterPoint } from '../../components/canvas/charts';
import type { Vec3 } from '../../components/canvas/types';
import { leastSquares, type LeastSquaresResult } from '../../core/leastSquares';
import { augment, toFloatMatrix, toFloatVector, type Matrix, type Vector } from '../../core/matrix';
import { rowSpaceSolution } from '../../core/projection';
import { Rational } from '../../core/rational';
import {
  designMatrix,
  evaluateModel,
  modelFormulaTex,
  modelSpecFor,
  parameterTex,
  termLabel,
  type Dataset,
  type DesignMatrix,
  type ModelChoice,
  type ModelSpec,
  type ModelTerm,
} from '../../core/regression';
import { rrefAugmented, type AugmentedRrefResult } from '../../core/rref';
import { evaluateModelFloat, lossFloat, lossGrid, sampleCurve, sampleSurface, type FloatGrid } from '../../core/sampling';
import { solve } from '../../core/solve';
import { notesRoundingNote } from '../../presets/notesFigures';
import { dataRowColor } from '../../theme/colors';
import type { RowPictureScene } from '../lesson1/models';

// Formatting helpers ---------------------------------------------------------

/** A float for display: at most 4 decimals, typographic minus. */
const num = (v: number, digits = 4) => String(+v.toFixed(digits)).replace('-', '−');
/** TeX for a float: at most 4 decimals. */
const numTex = (v: number, digits = 4) => String(+v.toFixed(digits));
/** Exact value as written in the notes: 2.25 when the decimal is exact, otherwise a fraction. */
function exactTex(r: Rational): string {
  const text = String(r.toNumber());
  const back = Rational.parse(text);
  return back && back.equals(r) ? text : r.toTex();
}
const exactText = (r: Rational) => exactTex(r).replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2').replace('-', '−');

/** "+ 1.58x", "− 0.45x^2", or the first term without a leading plus. */
function signedTerm(coef: number, body: string, first: boolean): string {
  const neg = coef < 0;
  const mag = numTex(Math.abs(coef));
  const sign = first ? (neg ? '-' : '') : neg ? ' - ' : ' + ';
  return `${sign}${mag}${body}`;
}

/** θ*, or when XᵀX is singular the best θ in the row space (all best θ give the same fit). */
function bestTheta(data: LessonData): Vector {
  return data.fit.xHat ?? rowSpaceSolution(data.design.X, data.fit.p)!;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The shared rref names its input [A | b]; say what is actually being reduced. */
function withStartText(r: AugmentedRrefResult, text: string): AugmentedRrefResult {
  const [first, ...rest] = r.trace.steps;
  return { ...r, trace: { steps: [{ ...first, description: text }, ...rest] } };
}

/** "Through the origin", "Line", "Degree 2", … */
export function modelName(choice: ModelChoice): string {
  switch (choice.kind) {
    case 'origin':
      return 'Through the origin';
    case 'line':
      return 'Line';
    case 'polynomial':
      return `Degree ${choice.degree}`;
    case 'linear':
      return 'Linear in every feature';
    case 'custom':
      return 'Custom terms';
  }
}

/** The fitted model with numbers, e.g. "h(x) = 2.5 + 1.5789x". */
export function fittedFormulaTex(spec: ModelSpec, featureCount: number, theta: number[]): string {
  const body = spec.terms
    .map((t, j) => {
      const label = termLabel(t, featureCount).tex;
      return signedTerm(theta[j], label === '1' ? '' : label, j === 0);
    })
    .join('')
    .replace(/^$/, '0');
  // A bare coefficient for the constant term ("2.5"), not "2.5" followed by nothing.
  return `h(x) = ${body}`;
}

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
  return theta && theta.length === data.spec.terms.length ? theta : toFloatVector(bestTheta(data));
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
  const best = toFloatVector(bestTheta(data));
  const current = currentTheta(data, theta);
  const names = parameterTex(data.spec);
  const X = toFloatMatrix(data.design.X);
  const Y = toFloatVector(data.design.Y);
  const tolerance = 1e-9 * Math.max(1, Y.reduce((s, y) => s + y * y, 0));
  return {
    params: best.map((v, k) => {
      const reach = Math.max(2, Math.abs(v));
      return { tex: names[k], value: current[k], min: Math.floor(v - reach), max: Math.ceil(v + reach), step: 0.01 };
    }),
    atOptimum: theta === null || Math.abs(lossFloat(X, Y, current) - lossFloat(X, Y, best)) <= tolerance,
  };
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
  const { dataset, spec } = data;
  const d = dataset.features.length;
  if (d !== 1 && d !== 2) {
    throw new RangeError(`The data plot shows 1 or 2 features; this dataset has ${d}. X, the normal equation and θ* are below.`);
  }
  const inputs = toFloatMatrix(dataset.inputs);
  const ys = toFloatVector(dataset.y);
  const predictions = inputs.map((x) => evaluateModelFloat(spec, theta, x));

  // Start axes at 0 when the data is positive, as the notes' plots do.
  const range = (values: number[]): [number, number] => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.1, 0.5);
    return [lo >= 0 ? 0 : lo - pad, hi + pad];
  };
  const [x0, x1] = range(inputs.map((x) => x[0]));
  const axis = (v: { name: string; unit: string }, [min, max]: [number, number]) => ({ min, max, title: v.name, unit: v.unit || undefined });

  const points: ScatterPoint[] = inputs.map((x, i) => ({ at: [...x, ys[i]], color: dataRowColor(i), label: dataset.rowLabels[i] }));
  const residuals = inputs.map((x, i) => ({
    row: i,
    color: dataRowColor(i),
    from: [...x, ys[i]],
    to: [...x, predictions[i]],
    x: x[0],
    y: ys[i],
    prediction: predictions[i],
  }));

  if (d === 2) {
    const r1 = range(inputs.map((x) => x[1]));
    const surface = sampleSurface(spec, theta, [x0, x1], r1);
    const zRange = range([...ys, ...predictions, surface.min, surface.max]);
    return {
      dim: 3,
      frame: {
        x: axis(dataset.features[0], [x0, x1]),
        y: axis(dataset.features[1], r1),
        z: axis(dataset.target, zRange),
        size: 8,
        equalAspect: options.equalAspect ?? false,
      },
      points,
      curve: [],
      surface,
      residuals,
      overlays: [],
    };
  }

  const curve = sampleCurve(spec, theta, x0, x1);
  const overlays = (options.compareWith ?? []).flatMap((choice, k) => {
    try {
      const other = lessonData(dataset, choice);
      if (!other.fit.xHat) return [];
      const t = toFloatVector(other.fit.xHat);
      return [
        {
          label: modelName(choice),
          formulaTex: fittedFormulaTex(other.spec, 1, t),
          color: OVERLAY_COLORS[choice.kind] ?? OTHER_OVERLAY_COLORS[k % OTHER_OVERLAY_COLORS.length],
          curve: sampleCurve(other.spec, t, x0, x1),
        },
      ];
    } catch {
      return [];
    }
  });
  return {
    dim: 2,
    frame: {
      x: axis(dataset.features[0], [x0, x1]),
      y: axis(dataset.target, range([...ys, ...curve.map((p) => p[1])])),
      size: 8,
      equalAspect: options.equalAspect ?? false,
    },
    points,
    curve,
    surface: null,
    residuals,
    overlays,
  };
}

/** The notes' §2.2 figure: red for h(x) = θx, orange for h(x) = θ₀ + θ₁x; other models cycle. */
const OVERLAY_COLORS: Partial<Record<ModelChoice['kind'], string>> = { origin: '#CC3311', line: '#EE7733' };
const OTHER_OVERLAY_COLORS = ['#009988', '#AA3377', '#33BBEE'];

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
   * L2-D7 for the notes' figures: "The notes round θ* to 3 (h(x) = 3x); the
   * exact value is 400/133 ≈ 3.008." null for data that is not from the notes.
   */
  roundingNote: string | null;
  /** L2-D4 */
  vocabulary: VocabTerm[];
}

export function dataModelView(data: LessonData): DataModelView {
  const { dataset, spec, design, fit } = data;
  const d = dataset.features.length;
  const withUnit = (v: { name: string; unit: string }) => (v.unit ? `${v.name} (${v.unit})` : v.name);
  const features = dataset.features.map(withUnit).join(', ');
  const k = spec.terms.length;
  const first = dataset.inputs[0];
  const vocabulary: VocabTerm[] = [
    {
      id: 'regression',
      term: 'regression',
      tex: 'y \\approx h(x)',
      meaning: `From paired data, find how ${dataset.target.name} (y) relates to ${dataset.features.map((f) => f.name).join(', ')} (x).`,
    },
    {
      id: 'machineLearning',
      term: 'machine learning',
      tex: '\\text{data} \\to h',
      meaning:
        '"The use of data and algorithms to imitate the way that humans learn, gradually improving its accuracy" (IBM). Here: learn the predictor h from the table.',
    },
    { id: 'feature', term: 'feature (input)', tex: d === 1 ? 'x' : `x_1, \\dots, x_${d}`, meaning: `${features}: the input column${d === 1 ? '' : 's'} of the table.` },
    { id: 'target', term: 'target (output)', tex: 'y', meaning: `${withUnit(dataset.target)}: the column marked target.` },
    {
      id: 'predictor',
      term: 'predictor',
      tex: 'h',
      meaning: `The fitted ${d === 1 ? 'curve' : 'surface'} on the plot: h(x) predicts ${dataset.target.name} for a new input.`,
    },
    {
      id: 'parameters',
      term: 'parameters',
      tex: '\\theta',
      meaning: `The ${k === 1 ? 'number' : `${k} numbers`} chosen to fit the data, one per column of X.`,
    },
    {
      id: 'dataPoint',
      term: 'data point',
      tex: '(x^{(i)}, y^{(i)})',
      meaning: first ? `One row of the table, e.g. ${dataset.rowLabels[0]} = (${[...first, dataset.y[0]].map(exactText).join(', ')}).` : 'One row of the table.',
    },
    {
      id: 'affine',
      term: 'affine function',
      tex: '\\theta_0 + \\theta_1 x',
      meaning: 'A line that need not pass through the origin (θ₀ can be nonzero). The notes still call h(x) = θ₀ + θ₁x a linear model.',
    },
  ];
  return {
    formulaTex: modelFormulaTex(spec, d),
    fittedTex: fit.xHat
      ? fittedFormulaTex(spec, d, toFloatVector(fit.xHat))
      : 'X^TX \\text{ is singular, so } \\theta^* \\text{ is not unique}',
    roundingNote: notesRoundingNote(design.X, design.Y, 'θ*'),
    vocabulary,
  };
}

export interface Prediction {
  x: Rational;
  /** h(x) with θ*, exact (L2-D5: h(2) = 215/38). */
  y: Rational;
  tex: string;
}

/** Throws when θ* does not exist (XᵀX singular) or the model has more than one feature. */
export function predict(data: LessonData, x: Rational): Prediction {
  if (data.dataset.features.length !== 1) throw new RangeError('Prediction from a single x needs a model of one feature');
  const theta = data.fit.xHat;
  if (!theta) throw new Error('XᵀX is singular, so θ* is not unique and h(x) is not determined');
  const y = evaluateModel(data.spec, theta, [x]);
  return { x, y, tex: `h(${exactTex(x)}) = ${y.toTex()}` };
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
  const { X, Y } = data.design;
  const names = parameterTex(data.spec);
  const equations = X.map((row, i) => {
    let lhs = '';
    row.forEach((c, j) => {
      if (c.isZero()) return;
      const neg = c.isNegative();
      const mag = c.abs().equals(Rational.ONE) ? '' : exactTex(c.abs());
      lhs += (lhs === '' ? (neg ? '-' : '') : neg ? ' - ' : ' + ') + mag + names[j];
    });
    return { row: i, color: dataRowColor(i), equationTex: `${lhs || '0'} = ${exactTex(Y[i])}` };
  });
  const rref = withStartText(rrefAugmented(X, Y), 'Start with [X | Y]');
  const k = X[0]?.length ?? 0;

  // Report the first row that reads 0 = c, as the notes do (0 = −3), before it is scaled to 0 = 1.
  let inconsistentMessage: string | null = null;
  if (rref.inconsistent) {
    for (const step of rref.trace.steps) {
      const i = step.matrix.findIndex((r) => r.slice(0, k).every((v) => v.isZero()) && !r[k].isZero());
      if (i >= 0) {
        inconsistentMessage = `Row ${i + 1} reads 0 = ${exactText(step.matrix[i][k])}: no θ satisfies every equation.`;
        break;
      }
    }
  }
  return {
    equations,
    XY: augment(X, Y),
    rref,
    inconsistentMessage,
    parameterSpace: parameterSpaceScene(data),
    fitsLesson1: X.length <= 4 && k <= 4,
  };
}

/** L2-I3: lines meeting pairwise but not at one point, with θ* as the best compromise. */
export function parameterSpaceScene(data: LessonData): ParameterSpaceScene {
  const { X, Y } = data.design;
  const k = data.spec.terms.length;
  const star = toFloatVector(bestTheta(data));
  const labels = data.dataset.rowLabels;

  if (k === 1) {
    // Equation i is X[i]·θ = Y[i]; a zero coefficient gives no value of θ.
    const values = X.flatMap((row, i) =>
      row[0].isZero()
        ? []
        : [{ exact: Y[i].div(row[0]), color: dataRowColor(i), label: labels[i] }].map((v) => ({ ...v, value: v.exact.toNumber() })),
    );
    const all = [...values.map((v) => v.value), star[0]];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = Math.max((hi - lo) * 0.15, 0.5);
    return { kind: 'numberLine', values, thetaStar: star[0], range: [lo - pad, hi + pad] };
  }

  if (k === 2) {
    const names = parameterTex(data.spec);
    const lines = X.map((row, i) => {
      const [a, b] = toFloatVector(row);
      const tex = `${exactTex(row[0])}${names[0]} + ${exactTex(row[1])}${names[1]} = ${exactTex(Y[i])}`;
      return { a, b, c: Y[i].toNumber(), color: dataRowColor(i), tex };
    });
    const sol = solve(X, Y);
    const solution: RowPictureScene['solution'] =
      sol.kind === 'unique'
        ? { kind: 'point', at: [...toFloatVector(sol.x), 0] as Vec3 }
        : { kind: 'none', message: 'The lines meet in pairs but not all at one point: no θ satisfies every equation.' };
    const intersections: Vec3[] = [];
    for (let i = 0; i < X.length; i++) {
      for (let j = i + 1; j < X.length; j++) {
        const pair = solve([X[i], X[j]], [Y[i], Y[j]]);
        if (pair.kind === 'unique') intersections.push([...toFloatVector(pair.x), 0] as Vec3);
      }
    }
    return {
      kind: 'lines',
      rowPicture: { dim: 2, lines, planes: [], solution, dotProductTex: '', equationsTex: lines.map((l) => l.tex) },
      intersections,
      thetaStar: [star[0], star[1], 0],
    };
  }

  return { kind: 'none', reason: `With ${k} parameters, θ lives in ℝ${k}; parameter space can be drawn for 1 or 2 parameters.` };
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
  const X = toFloatMatrix(data.design.X);
  const Y = toFloatVector(data.design.Y);
  const terms = X.map((row, i) => {
    const prediction = row.reduce((s, x, j) => s + x * theta[j], 0);
    const value = (Y[i] - prediction) ** 2;
    const tex = `(y^{(${i + 1})} - \\theta^T x^{(${i + 1})})^2 = (${numTex(Y[i])} - ${numTex(prediction)})^2 = ${numTex(value, 6)}`;
    return { row: i, color: dataRowColor(i), tex, value };
  });
  const loss = terms.reduce((s, t) => s + t.value, 0);
  return {
    terms,
    loss,
    meanRss: loss / Math.max(X.length, 1),
    residualRows: [
      {
        tex: 'Y - X\\theta = \\begin{bmatrix} y^{(1)} - (x^{(1)})^T\\theta \\\\ \\vdots \\\\ y^{(n)} - (x^{(n)})^T\\theta \\end{bmatrix}',
        reason: 'Row i of X is (x⁽ⁱ⁾)ᵀ, data point i run through the model\'s terms, so entry i of Xθ is (x⁽ⁱ⁾)ᵀθ.',
      },
      {
        tex: '= \\begin{bmatrix} y^{(1)} - \\theta^T x^{(1)} \\\\ \\vdots \\\\ y^{(n)} - \\theta^T x^{(n)} \\end{bmatrix}',
        reason: '(x⁽ⁱ⁾)ᵀθ = θᵀx⁽ⁱ⁾ because uᵀv = vᵀu.',
      },
      {
        tex: '\\|Y - X\\theta\\|^2 = \\sum_{i=1}^{n} (y^{(i)} - \\theta^T x^{(i)})^2',
        reason: 'The loss: add up the squared entries.',
      },
    ],
  };
}

export type LossLandscape =
  /** L2-L4: one parameter — the loss as a parabola in θ. */
  | { kind: 'parabola'; frame: ChartFrame; curve: [number, number][]; thetaStar: number }
  /** L2-L3: two parameters — heatmap with contours, and an optional 3D surface. */
  | { kind: 'heatmap'; frame: ChartFrame; grid: FloatGrid; thetaStar: [number, number]; surfaceFrame: ChartFrame }
  | { kind: 'none'; reason: string };

/** Depends only on the data and model, not θ, so it is not recomputed while dragging. */
export function lossLandscape(data: LessonData): LossLandscape {
  const k = data.spec.terms.length;
  const X = toFloatMatrix(data.design.X);
  const Y = toFloatVector(data.design.Y);
  const star = toFloatVector(bestTheta(data));
  const names = parameterTex(data.spec).map((t) => t.replace('\\theta', 'θ').replace('_0', '₀').replace('_1', '₁'));
  const around = (v: number): [number, number] => {
    const reach = Math.max(1.5, Math.abs(v) * 0.75);
    return [v - reach, v + reach];
  };

  if (k === 1) {
    const [lo, hi] = around(star[0]);
    const curve: [number, number][] = Array.from({ length: 201 }, (_, i) => {
      const t = lo + ((hi - lo) * i) / 200;
      return [t, lossFloat(X, Y, [t])];
    });
    const top = Math.max(...curve.map((p) => p[1]));
    return {
      kind: 'parabola',
      frame: { x: { min: lo, max: hi, title: names[0] }, y: { min: 0, max: top * 1.05, title: 'loss ‖Y − Xθ‖²' }, size: 8, equalAspect: false },
      curve,
      thetaStar: star[0],
    };
  }

  if (k === 2) {
    const r0 = around(star[0]);
    const r1 = around(star[1]);
    const grid = lossGrid(X, Y, r0, r1);
    return {
      kind: 'heatmap',
      frame: { x: { min: r0[0], max: r0[1], title: names[0] }, y: { min: r1[0], max: r1[1], title: names[1] }, size: 8, equalAspect: false },
      grid,
      thetaStar: [star[0], star[1]],
      surfaceFrame: {
        x: { min: r0[0], max: r0[1], title: names[0] },
        y: { min: r1[0], max: r1[1], title: names[1] },
        z: { min: 0, max: grid.max, title: 'loss' },
        size: 6,
        equalAspect: false,
      },
    };
  }

  return { kind: 'none', reason: `The loss is a function of ${k} parameters; it can be drawn for 1 or 2.` };
}

/** L2-L1: two draggable handles on the line (data coordinates) for the current θ. */
export function lineHandles(data: LessonData, theta: number[]): [[number, number], [number, number]] {
  const line: ModelTerm[] = [{ kind: 'intercept' }, { kind: 'monomial', powers: [1] }];
  if (!sameJson(data.spec.terms, line)) throw new RangeError('Drag handles are available for the line model h(x) = θ₀ + θ₁x');
  const xs = data.dataset.inputs.map((r) => r[0].toNumber());
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const at = (x: number): [number, number] => [x, theta[0] + theta[1] * x];
  return [at(lo + (hi - lo) * 0.2), at(lo + (hi - lo) * 0.8 || lo + 1)];
}

/** The line θ₀ + θ₁x through two handles. */
export function thetaFromHandles(handles: [[number, number], [number, number]]): number[] {
  const [[x1, y1], [x2, y2]] = handles;
  if (Math.abs(x2 - x1) < 1e-9) throw new RangeError('The two handles need different x values');
  const slope = (y2 - y1) / (x2 - x1);
  return [y1 - slope * x1, slope];
}

/** L2-L5: θ at each animation frame from the current θ to θ*. */
export function snapPath(from: number[], to: number[], frames: number): number[][] {
  return Array.from({ length: frames }, (_, i) => {
    if (i === frames - 1) return [...to];
    const t = (i + 1) / frames;
    const ease = 1 - (1 - t) ** 3;
    return from.map((a, k) => a + (to[k] - a) * ease);
  });
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
  const n = dataset.inputs.length;
  if (dataset.features.length === 1) {
    // Up to 6 parameters (§1.2), and never more parameters than data points.
    const degrees = Array.from({ length: Math.max(0, Math.min(n - 1, 5) - 1) }, (_, i) => i + 2);
    return [{ kind: 'origin' }, { kind: 'line' }, ...degrees.map((degree): ModelChoice => ({ kind: 'polynomial', degree }))];
  }
  const choices: ModelChoice[] = [{ kind: 'linear' }];
  if (dataset.features.length === 2 && n >= 5) {
    choices.push({
      kind: 'custom',
      terms: [{ kind: 'intercept' }, { kind: 'monomial', powers: [1, 0] }, { kind: 'monomial', powers: [0, 1] }, { kind: 'monomial', powers: [1, 1] }],
    });
  }
  return choices;
}

export function modelComparison(dataset: Dataset, choices: ModelChoice[], current: ModelChoice): ComparisonRow[] {
  return choices.flatMap((choice) => {
    let data: LessonData;
    try {
      data = lessonData(dataset, choice);
    } catch {
      return [];
    }
    const theta = data.fit.xHat;
    const custom = choice.kind === 'custom' ? ` (${data.design.labels.join(', ')})` : '';
    return [
      {
        name: modelName(choice) + custom,
        parameters: data.spec.terms.length,
        thetaTex: theta ? `(${theta.map((t) => numTex(t.toNumber())).join(', ')})` : '\\text{not unique}',
        meanRss: theta ? data.fit.meanRss : null,
        current: sameJson(choice, current),
      },
    ];
  });
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
  const { dataset, spec, design } = data;
  const d = dataset.features.length;
  const options = availableTerms(d).map((term) => {
    const { text, tex } = termLabel(term, d);
    return { term, label: text, tex, active: spec.terms.some((t) => sameJson(t, term)) };
  });

  // X with its column labels above it (notes §2.4), long tables cut to 8 rows.
  const shown = design.X.length > 8 ? [...design.X.slice(0, 7), null, design.X[design.X.length - 1]] : design.X;
  const header = design.labelsTex.map((l) => `\\textcolor{#0072B2}{${l}}`).join(' & ');
  const rows = shown.map((r) => (r ? r.map(exactTex).join(' & ') : design.labelsTex.map(() => '\\vdots').join(' & '))).join(' \\\\ ');
  const XTex = `X = \\begin{array}{${'c'.repeat(design.labelsTex.length)}} ${header} \\\\ \\hline ${rows} \\end{array}`;

  const names = parameterTex(spec);
  const parameters = spec.terms.map((t, j) => ({
    tex: names[j],
    columnLabel: design.labels[j],
    feature:
      t.kind === 'intercept' || t.powers.every((p) => p === 0)
        ? null
        : t.powers
            .flatMap((p, k) => (p === 0 ? [] : [dataset.features[k].name + (p > 1 ? String(p).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]) : '')]))
            .join(' × '),
  }));
  return { options, XTex, parameters };
}

/** Terms the builder offers: powers up to 5 for one feature; for two, every term up to degree 3 except the pure cubes. */
function availableTerms(d: number): ModelTerm[] {
  const mono = (...powers: number[]): ModelTerm => ({ kind: 'monomial', powers });
  if (d === 1) return [{ kind: 'intercept' }, ...[1, 2, 3, 4, 5].map((p) => mono(p))];
  if (d === 2) {
    return [{ kind: 'intercept' }, mono(1, 0), mono(0, 1), mono(2, 0), mono(1, 1), mono(0, 2), mono(2, 1), mono(1, 2)];
  }
  const unit = (k: number) => Array.from({ length: d }, (_, i) => (i === k ? 1 : 0));
  const pairs: ModelTerm[] = [];
  for (let a = 0; a < d; a++) for (let b = a + 1; b < d; b++) pairs.push(mono(...unit(a).map((v, i) => v + unit(b)[i])));
  return [{ kind: 'intercept' }, ...Array.from({ length: d }, (_, k) => mono(...unit(k))), ...pairs];
}

/** Notes' column order: the constant, then by total degree, then x₁ before x₂. */
function termOrder(a: ModelTerm, b: ModelTerm): number {
  if (a.kind === 'intercept' || b.kind === 'intercept') return a.kind === 'intercept' ? (b.kind === 'intercept' ? 0 : -1) : 1;
  const degree = (t: { powers: number[] }) => t.powers.reduce((s, p) => s + p, 0);
  if (degree(a) !== degree(b)) return degree(a) - degree(b);
  for (let k = 0; k < a.powers.length; k++) if (a.powers[k] !== b.powers[k]) return b.powers[k] - a.powers[k];
  return 0;
}

/** Add or remove one term from the model, keeping the notes' column order (1, x, x², …). */
export function toggleTerm(spec: ModelSpec, term: ModelTerm): ModelTerm[] {
  const present = spec.terms.some((t) => sameJson(t, term));
  if (present) {
    // Keep at least one column.
    return spec.terms.length === 1 ? spec.terms : spec.terms.filter((t) => !sameJson(t, term));
  }
  return [...spec.terms, term].sort(termOrder);
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
  if (data.dataset.features.length !== 1) throw new RangeError('Polynomial regression here uses one feature x');
  const n = data.dataset.inputs.length;
  const degree =
    data.choice.kind === 'polynomial'
      ? data.choice.degree
      : Math.max(0, ...data.spec.terms.map((t) => (t.kind === 'intercept' ? 0 : t.powers[0])));
  const maxDegree = Math.max(0, Math.min(n - 1, 5));
  const fitted = data.fit.xHat !== null;
  return {
    maxDegree,
    degree,
    meanRss: fitted ? data.fit.meanRss : null,
    exactFit: fitted && data.fit.rss.isZero(),
  };
}
