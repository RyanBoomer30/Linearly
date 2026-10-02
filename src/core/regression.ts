import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';

/**
 * Regression core (Phase 2): datasets, models, and the design matrix. Fitting
 * itself is plain least squares on Xθ = Y (leastSquares.ts). Everything here
 * is exact: decimals from the data table arrive as Rationals (F-M11,
 * Rational.parse turns 2.25 into 9/4), and floats only appear in sampling.ts
 * for drawing (F-M15).
 */

/** A data-table column header, e.g. { name: 'Living area', unit: '1000 sq ft' } (F-T1). */
export interface VariableInfo {
  name: string;
  unit: string;
}

/** One dataset: n data points with d features and one target (§3.2). */
export interface Dataset {
  features: VariableInfo[];
  target: VariableInfo;
  /** n × d feature values; row i is x⁽ⁱ⁾. */
  inputs: Matrix;
  /** n target values; entry i is y⁽ⁱ⁾. */
  y: Vector;
  /** "House 1", "House 2", … — also the axis names in the ℝⁿ picture (L2-P1). */
  rowLabels: string[];
}

/**
 * One column of the design matrix (F-M12): the constant 1, or a monomial
 * x₁^p₁ ⋯ x_d^p_d with one power per feature. Raw features, powers xᵏ and
 * cross terms such as x₁x₂ or x₁²x₂ are all monomials.
 */
export type ModelTerm = { kind: 'intercept' } | { kind: 'monomial'; powers: number[] };

/** Which terms make up the columns of X, in order. */
export interface ModelSpec {
  terms: ModelTerm[];
}

/** The model picker's choices (L2-D3); the design matrix builder edits `custom` (L2-M1). */
export type ModelChoice =
  /** h(x) = θx */
  | { kind: 'origin' }
  /** h(x) = θ₀ + θ₁x */
  | { kind: 'line' }
  /** h(x) = θ₀ + θ₁x + ⋯ + θ_d x^d */
  | { kind: 'polynomial'; degree: number }
  /** h(x) = θ₀ + θ₁x₁ + ⋯ + θ_d x_d */
  | { kind: 'linear' }
  | { kind: 'custom'; terms: ModelTerm[] };

/** Expand a picker choice into its terms for a dataset with `featureCount` features. */
export function modelSpecFor(choice: ModelChoice, featureCount: number): ModelSpec {
  return notImplemented('modelSpecFor');
}

/** Column label for a term: "1", "x", "x²", "x₁x₂" (plain) and "1", "x", "x^2", "x_1x_2" (TeX). */
export function termLabel(term: ModelTerm, featureCount: number): { text: string; tex: string } {
  return notImplemented('termLabel');
}

/** The model as a formula, e.g. "h(x) = \\theta_0 + \\theta_1 x" (L2-D3). */
export function modelFormulaTex(spec: ModelSpec, featureCount: number): string {
  return notImplemented('modelFormulaTex');
}

export interface DesignMatrix {
  /** n × k: row i is the terms evaluated at x⁽ⁱ⁾. */
  X: Matrix;
  /** Y = the target column. */
  Y: Vector;
  terms: ModelTerm[];
  /** Per column of X: "1", "x", "x²" (L2-M1). */
  labels: string[];
  labelsTex: string[];
}

/** F-M12: build X (and Y) from the dataset and the model's terms. */
export function designMatrix(dataset: Dataset, spec: ModelSpec): DesignMatrix {
  return notImplemented('designMatrix');
}

/** One term evaluated at one data point, exactly. */
export function evaluateTerm(term: ModelTerm, x: Vector): Rational {
  return notImplemented('evaluateTerm');
}

/** h(x) = Σ θⱼ · termⱼ(x), exactly (L2-D5: h(2) = 215/38). */
export function evaluateModel(spec: ModelSpec, theta: Vector, x: Vector): Rational {
  return notImplemented('evaluateModel');
}
