import { describe, expect, it } from 'vitest';
import { fromColumns, matrixToStrings, vector, vectorToStrings, type Scalarish } from '../matrix';
import { leastSquares } from '../leastSquares';
import {
  designMatrix,
  evaluateModel,
  evaluateTerm,
  modelFormulaTex,
  modelSpecFor,
  termLabel,
  type Dataset,
  type ModelChoice,
} from '../regression';
import { HOUSES, QUADRATIC, s, sv, TWO_FEATURES } from './fixtures';

/** A dataset from feature columns and a target column. */
function dataset(features: Scalarish[][], y: Scalarish[]): Dataset {
  return {
    features: features.map((_, j) => ({ name: `x${j + 1}`, unit: '' })),
    target: { name: 'y', unit: '' },
    inputs: fromColumns(features.map(vector)),
    y: vector(y),
    rowLabels: y.map((_, i) => `Point ${i + 1}`),
  };
}

const fit = (ds: Dataset, choice: ModelChoice) => {
  const design = designMatrix(ds, modelSpecFor(choice, ds.features.length));
  return { design, ls: leastSquares(design.X, design.Y) };
};

const houses = dataset([HOUSES.x], HOUSES.y);

describe('modelSpecFor (L2-D3)', () => {
  const intercept = { kind: 'intercept' as const };
  const mono = (...powers: number[]) => ({ kind: 'monomial' as const, powers });

  it('through the origin: h(x) = θx', () => {
    expect(modelSpecFor({ kind: 'origin' }, 1).terms).toEqual([mono(1)]);
  });

  it('line: h(x) = θ₀ + θ₁x', () => {
    expect(modelSpecFor({ kind: 'line' }, 1).terms).toEqual([intercept, mono(1)]);
  });

  it('polynomial of degree d: 1, x, …, x^d (degree 0 is the constant model)', () => {
    expect(modelSpecFor({ kind: 'polynomial', degree: 3 }, 1).terms).toEqual([intercept, mono(1), mono(2), mono(3)]);
    expect(modelSpecFor({ kind: 'polynomial', degree: 0 }, 1).terms).toEqual([intercept]);
  });

  it('several features: h(x) = θ₀ + θ₁x₁ + ⋯ + θ_d x_d (notes §2.3)', () => {
    expect(modelSpecFor({ kind: 'linear' }, 3).terms).toEqual([intercept, mono(1, 0, 0), mono(0, 1, 0), mono(0, 0, 1)]);
  });

  it('custom terms are used as given', () => {
    const terms = [intercept, mono(1, 1)];
    expect(modelSpecFor({ kind: 'custom', terms }, 2).terms).toEqual(terms);
  });

  it('one-feature models on two-feature data are rejected', () => {
    expect(() => modelSpecFor({ kind: 'polynomial', degree: 2 }, 2)).toThrow(RangeError);
  });
});

describe('termLabel and modelFormulaTex', () => {
  it('one feature: 1, x, x², x³', () => {
    expect([[0], [1], [2], [3]].map((p) => termLabel(p[0] === 0 ? { kind: 'intercept' } : { kind: 'monomial', powers: p }, 1).text)).toEqual([
      '1',
      'x',
      'x²',
      'x³',
    ]);
    expect(termLabel({ kind: 'monomial', powers: [2] }, 1).tex).toBe('x^2');
  });

  it('two features: subscripts, cross terms x₁x₂ and x₁²x₂ (notes §2.4)', () => {
    expect(termLabel({ kind: 'monomial', powers: [1, 0] }, 2).text).toBe('x₁');
    expect(termLabel({ kind: 'monomial', powers: [1, 1] }, 2)).toEqual({ text: 'x₁x₂', tex: 'x_1x_2' });
    expect(termLabel({ kind: 'monomial', powers: [2, 1] }, 2)).toEqual({ text: 'x₁²x₂', tex: 'x_1^2x_2' });
  });

  it('formula for the quadratic: h(x) = θ₀ + θ₁x + θ₂x²', () => {
    const tex = modelFormulaTex(modelSpecFor({ kind: 'polynomial', degree: 2 }, 1), 1).replace(/\s/g, '');
    expect(tex).toBe('h(x)=\\theta_0+\\theta_1x+\\theta_2x^2');
  });
});

describe('evaluateTerm', () => {
  it('exact: x₁²x₂ at (3/2, 4) = 9', () => {
    expect(evaluateTerm({ kind: 'monomial', powers: [2, 1] }, vector(['1.5', 4])).toString()).toBe('9');
    expect(evaluateTerm({ kind: 'intercept' }, vector([7])).toString()).toBe('1');
  });
});

describe('designMatrix (F-M12)', () => {
  it('Y is the target column', () => {
    expect(vectorToStrings(designMatrix(houses, modelSpecFor({ kind: 'line' }, 1)).Y)).toEqual(sv([4, 6, 5]));
  });

  it('origin model: X is the single column x (notes §2.2)', () => {
    expect(matrixToStrings(designMatrix(houses, modelSpecFor({ kind: 'origin' }, 1)).X)).toEqual([['1'], ['9/4'], ['3/2']]);
  });

  it('2.25 is parsed exactly as 9/4 (F-M11)', () => {
    expect(vectorToStrings(houses.inputs.map((r) => r[0]))).toEqual(['1', '9/4', '3/2']);
  });

  it('line model: columns 1, x', () => {
    const { X, labels } = designMatrix(houses, modelSpecFor({ kind: 'line' }, 1));
    expect(labels).toEqual(['1', 'x']);
    expect(matrixToStrings(X)).toEqual(s([[1, 1], [1, '9/4'], [1, '3/2']]));
  });

  it('quadratic: columns 1, x, x²', () => {
    const { X, labels } = designMatrix(dataset([QUADRATIC.x], QUADRATIC.y), modelSpecFor({ kind: 'polynomial', degree: 2 }, 1));
    expect(labels).toEqual(['1', 'x', 'x²']);
    expect(matrixToStrings(X)).toEqual(s([[1, -1, 1], [1, 0, 0], [1, 1, 1], [1, 2, 4]]));
  });

  it('cross terms: x₁x₂ and x₁²x₂', () => {
    const ds = dataset([[1, 2], [3, 5]], [0, 0]);
    const spec = { terms: [{ kind: 'monomial' as const, powers: [1, 1] }, { kind: 'monomial' as const, powers: [2, 1] }] };
    const { X, labels } = designMatrix(ds, spec);
    expect(labels).toEqual(['x₁x₂', 'x₁²x₂']);
    expect(matrixToStrings(X)).toEqual(s([[3, 3], [10, 20]]));
  });
});

describe('prediction (L2-D5)', () => {
  it('line model: h(2) = 215/38', () => {
    const { design, ls } = fit(houses, { kind: 'line' });
    expect(evaluateModel({ terms: design.terms }, ls.xHat!, vector([2])).toString()).toBe('215/38');
  });
});

describe('fitting through the design matrix', () => {
  const quad = dataset([QUADRATIC.x], QUADRATIC.y);

  it('quadratic', () => {
    const { ls } = fit(quad, { kind: 'polynomial', degree: 2 });
    expect(matrixToStrings(ls.AtA)).toEqual(s([[4, 2, 6], [2, 6, 8], [6, 8, 18]]));
    expect(vectorToStrings(ls.Atb)).toEqual(sv([3, 3, 9]));
    expect(vectorToStrings(ls.xHat!)).toEqual(['-3/20', '-9/20', '3/4']);
    expect(vectorToStrings(ls.e)).toEqual(['-1/20', '3/20', '-3/20', '1/20']);
    expect(ls.meanRss.toString()).toBe('1/80');
  });

  it('degree 3 fits all 4 points exactly', () => {
    expect(fit(quad, { kind: 'polynomial', degree: 3 }).ls.meanRss.toString()).toBe('0');
  });

  it('two features', () => {
    const ds = dataset([TWO_FEATURES.area, TWO_FEATURES.bedrooms], TWO_FEATURES.price);
    const { ls } = fit(ds, { kind: 'linear' });
    expect(vectorToStrings(ls.xHat!)).toEqual(['13/5', '26/15', '-1/10']);
    expect(ls.meanRss.toString()).toBe('1/75');
  });
});
