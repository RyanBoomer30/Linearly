import type { Matrix, Vector } from './matrix';
import { Rational } from './rational';

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const digits = (k: number, table: string) => String(k).replace(/\d/g, (d) => table[Number(d)]);

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
  const mono = (...powers: number[]): ModelTerm => ({ kind: 'monomial', powers });
  const unit = (k: number) => mono(...Array.from({ length: featureCount }, (_, i) => (i === k ? 1 : 0)));
  const oneFeature = (name: string) => {
    if (featureCount !== 1) {
      throw new RangeError(`The ${name} model needs exactly one feature (this dataset has ${featureCount}); use "several features" or custom terms.`);
    }
  };
  switch (choice.kind) {
    case 'origin':
      oneFeature('through-the-origin');
      return { terms: [mono(1)] };
    case 'line':
      oneFeature('line');
      return { terms: [{ kind: 'intercept' }, mono(1)] };
    case 'polynomial': {
      oneFeature('polynomial');
      const { degree } = choice;
      if (!Number.isInteger(degree) || degree < 0) throw new RangeError(`Polynomial degree must be a whole number ≥ 0 (got ${degree})`);
      return { terms: [{ kind: 'intercept' }, ...Array.from({ length: degree }, (_, k) => mono(k + 1))] };
    }
    case 'linear':
      return { terms: [{ kind: 'intercept' }, ...Array.from({ length: featureCount }, (_, k) => unit(k))] };
    case 'custom':
      if (choice.terms.length === 0) throw new RangeError('Choose at least one term for the model');
      return { terms: choice.terms };
  }
}

/** Column label for a term: "1", "x", "x²", "x₁x₂" (plain) and "1", "x", "x^2", "x_1x_2" (TeX). */
export function termLabel(term: ModelTerm, featureCount: number): { text: string; tex: string } {
  if (term.kind === 'intercept' || term.powers.every((p) => p === 0)) return { text: '1', tex: '1' };
  const parts = term.powers.flatMap((p, k) => {
    if (p === 0) return [];
    const text = (featureCount === 1 ? 'x' : `x${digits(k + 1, SUB)}`) + (p > 1 ? digits(p, SUP) : '');
    const tex = (featureCount === 1 ? 'x' : `x_${k + 1}`) + (p > 1 ? `^${p}` : '');
    return [{ text, tex }];
  });
  return { text: parts.map((p) => p.text).join(''), tex: parts.map((p) => p.tex).join('') };
}

/**
 * TeX names of the parameters, one per term: θ₀ for the constant and θ₁, θ₂, …
 * for the rest (notes §2.3). A single parameter is just θ (h(x) = θx).
 */
export function parameterTex(spec: ModelSpec): string[] {
  if (spec.terms.length === 1) return ['\\theta'];
  const start = spec.terms[0]?.kind === 'intercept' ? 0 : 1;
  return spec.terms.map((_, j) => `\\theta_${j + start}`);
}

/** The model as a formula, e.g. "h(x) = \\theta_0 + \\theta_1 x" (L2-D3). */
export function modelFormulaTex(spec: ModelSpec, featureCount: number): string {
  const names = parameterTex(spec);
  const body = spec.terms
    .map((t, j) => {
      const label = termLabel(t, featureCount).tex;
      return label === '1' ? names[j] : `${names[j]} ${label}`;
    })
    .join(' + ');
  return `h(x) = ${body}`;
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
  const d = dataset.features.length;
  const labels = spec.terms.map((t) => termLabel(t, d));
  return {
    X: dataset.inputs.map((x) => spec.terms.map((t) => evaluateTerm(t, x))),
    Y: [...dataset.y],
    terms: spec.terms,
    labels: labels.map((l) => l.text),
    labelsTex: labels.map((l) => l.tex),
  };
}

/** One term evaluated at one data point, exactly. */
export function evaluateTerm(term: ModelTerm, x: Vector): Rational {
  if (term.kind === 'intercept') return Rational.ONE;
  if (term.powers.length !== x.length) throw new RangeError('evaluateTerm: one power per feature');
  return term.powers.reduce((acc, p, k) => {
    let v = acc;
    for (let i = 0; i < p; i++) v = v.mul(x[k]);
    return v;
  }, Rational.ONE);
}

/** h(x) = Σ θⱼ · termⱼ(x), exactly (L2-D5: h(2) = 215/38). */
export function evaluateModel(spec: ModelSpec, theta: Vector, x: Vector): Rational {
  if (theta.length !== spec.terms.length) throw new RangeError('evaluateModel: one θ per term');
  return spec.terms.reduce((sum, t, j) => sum.add(theta[j].mul(evaluateTerm(t, x))), Rational.ZERO);
}
