import { describe, expect, it } from 'vitest';
import { AGE_HEIGHT, NOTES_V1, over, SVD_EXAMPLE, SVD_EXAMPLE_LAYERS_2, WEIGHTS } from '../../../core/__tests__/fixtures';
import { generateFaces } from '../../../core/faces';
import { matrix, matrixToStrings, vector, type Matrix } from '../../../core/matrix';
import type { ThinSvd } from '../../../core/svdLarge';
import {
  bestLineView,
  centeringSteps,
  compressionView,
  covarianceSteps,
  covarianceView,
  faceView,
  layerImage,
  pcaView,
  pythonExport,
  recognitionRate,
  reductionView,
  regressionComparison,
  scatterView,
  svdGeometry,
  svdView,
  unrollFrames,
  varianceView,
} from '../models';

const X = matrix(AGE_HEIGHT);
const y = vector(WEIGHTS);
const DEFAULT = { standardize: false, sign: 'largest-positive' as const, flipV1: false };

/** A diagonal "image" SVD with known singular values 100, 50, 10, 1, 0.5. */
const diagSvd = (sigma: number[]): ThinSvd => ({
  U: sigma.map((_, i) => sigma.map((__, j) => (i === j ? 1 : 0))),
  sigma,
  V: sigma.map((_, i) => sigma.map((__, j) => (i === j ? 1 : 0))),
});

// §11.1 --------------------------------------------------------------------------------

describe('§11.1 SVD and the best rank-k approximation', () => {
  it('σ = √3 and 1; the layers exactly; best rank-1 is the first layer with ‖A − A₁‖² = 1 (acceptance)', () => {
    const v = svdView(matrix(SVD_EXAMPLE), 1, 'fraction');
    expect(v.precision).toEqual({ kind: 'exact' });
    expect(v.rank).toBe(2);
    expect(v.layers.map((l) => l.sigmaTex)).toEqual(['\\sqrt{3}', '1']);
    expect(matrixToStrings(v.layers[0].matrix as Matrix)).toEqual(over(SVD_EXAMPLE_LAYERS_2[0], 2));
    expect(matrixToStrings(v.layers[1].matrix as Matrix)).toEqual(over(SVD_EXAMPLE_LAYERS_2[1], 2));
    expect(v.approx.flat()).toEqual([0.5, 1, 0.5, 0.5, 1, 0.5]);
    expect(v.errorSquared).toBeCloseTo(1, 12);
    expect(v.errorTex).toMatch(/\\sigma_2\^2/);
  });

  it('shapes labeled as in the notes, and the unused parts of the full SVD (L7-S1)', () => {
    const v = svdView(matrix(SVD_EXAMPLE), 2, 'fraction');
    expect(v.full.map((f) => f.shape)).toEqual(['2 \\times 2', '2 \\times 3', '3 \\times 3']);
    expect(v.reduced.map((f) => f.shape)).toEqual(['2 \\times 2', '2 \\times 2', '2 \\times 3']);
    expect(v.unused).toEqual({ uColumns: [], vRows: [2] });
    expect(v.leftover.flat().every((x) => Math.abs(x) < 1e-12)).toBe(true);
  });

  it('a rank-2 3 × 3 matrix has a zero singular value and an unused column of U', () => {
    const v = svdView(matrix([[1, 0, 1], [2, 1, 3], [3, -2, 1]]), 1, 'decimal');
    expect(v.rank).toBe(2);
    expect(v.unused.uColumns).toEqual([2]);
  });

  it('geometry: each vᵢ maps to σᵢuᵢ (L7-S4)', () => {
    const g = svdGeometry(matrix([[3, 0], [4, 5]]));
    expect(g.dim).toBe(2);
    // AᵀA = [[25, 20], [20, 25]]: σ² = 45 and 5.
    expect(g.axes.map((a) => a.sigma)).toEqual([expect.closeTo(Math.sqrt(45), 10), expect.closeTo(Math.sqrt(5), 10)]);
    for (const a of g.axes) {
      const Av = [3 * a.v[0], 4 * a.v[0] + 5 * a.v[1]];
      expect(Av[0]).toBeCloseTo(a.image[0], 10);
      expect(Av[1]).toBeCloseTo(a.image[1], 10);
    }
    expect(() => svdGeometry(matrix(SVD_EXAMPLE))).toThrow();
  });
});

// §11.2 --------------------------------------------------------------------------------

describe('§11.2 Image compression', () => {
  it('storage readout for the notes\' 860 × 1280 picture at k = 120 (acceptance)', () => {
    const v = compressionView(diagSvd([100, 50, 10, 1, 0.5]), 860, 1280, 120, 'slider', 0.01);
    expect(v.storage.sent).toBe(256800);
    expect(v.storageText).toMatch(/256,800/);
    expect(v.storageText).toMatch(/1,100,800/);
    expect(v.storageText).toMatch(/23\.3%/);
  });

  it("k from the notes' cutoff rule; the share of ‖A‖² kept (L7-I2, L7-I4)", () => {
    const v = compressionView(diagSvd([100, 50, 10, 1, 0.5]), 5, 5, 1, 'cutoff', 0.01);
    expect(v.k).toBe(4);
    expect(v.energyKept).toBeCloseTo((10000 + 2500 + 100 + 1) / (10000 + 2500 + 100 + 1 + 0.25), 12);
    expect(v.chart.frame.y.log).toBe(true);
    expect(v.tradeOff).toMatch(/cheaper/);
  });

  it('k = rank reproduces the image; a single layer is rank 1 (L7-I5)', () => {
    const v = compressionView(diagSvd([100, 50, 10]), 3, 3, 3, 'slider', 0.01);
    expect(v.relativeError).toBeCloseTo(0, 12);
    expect(layerImage(diagSvd([100, 50, 10]), 1)).toEqual([[0, 0, 0], [0, 50, 0], [0, 0, 0]]);
  });
});

// §11.3 --------------------------------------------------------------------------------

describe('§11.3 PCA: centering and components', () => {
  it('centering: the means are 0 (acceptance)', () => {
    const steps = centeringSteps(X, 'fraction');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0].tex).toMatch(/= 0/);
  });

  it("σ ≈ 16.871, 3.921; v₁ ≈ (0.5606, 0.8281) after the sign setting (acceptance)", () => {
    const v = pcaView(X, DEFAULT);
    expect(v.pca.sigma[0]).toBeCloseTo(16.871, 3);
    expect(v.pca.sigma[1]).toBeCloseTo(3.921, 3);
    expect(v.pca.V[0][0]).toBeCloseTo(NOTES_V1[0], 4);
    expect(v.pca.V[1][0]).toBeCloseTo(NOTES_V1[1], 4);
    expect(v.check.holds).toBe(true);
    expect(v.signNote).toMatch(/z₁|z_1/);
  });

  it('the two rank-1 pieces add up to X (L7-P3)', () => {
    const v = pcaView(X, DEFAULT);
    v.pieces[0].forEach((row, i) => row.forEach((x, j) => expect(x + v.pieces[1][i][j]).toBeCloseTo(AGE_HEIGHT[i][j], 10)));
  });

  it('flipping v₁ flips z₁ (L7-P5)', () => {
    const a = pcaView(X, DEFAULT);
    const b = pcaView(X, { ...DEFAULT, flipV1: true });
    expect(b.pca.scores[0][0]).toBeCloseTo(-a.pca.scores[0][0], 12);
  });

  it('a shared equal-aspect frame around the points and the origin', () => {
    const f = scatterView([[3, 7], [-4, -6]], ['x₁', 'x₂']);
    expect(f.frame.equalAspect).toBe(true);
    expect(f.frame.x.min).toBeLessThanOrEqual(-4);
    expect(f.frame.y.max).toBeGreaterThanOrEqual(7);
  });
});

// §11.4 --------------------------------------------------------------------------------

describe('§11.4 Dimension reduction', () => {
  it('first person (3, 7): z₁ ≈ 7.478 and z₂ ≈ −1.440; the notes\' z₂ column is corrected (acceptance, L7-D5)', () => {
    const r = reductionView(X, DEFAULT);
    expect(r.scores[0][0]).toBeCloseTo(7.478, 3);
    expect(r.scores[0][1]).toBeCloseTo(-1.44, 3);
    expect(r.formulas[0]).toMatch(/0\.5606/);
    expect(r.notesCorrection).toMatch(/−4\.1152|-4\.1152/);
  });

  it('projected points lie on the v₁ line and equal the rows of σ₁u₁v₁ᵀ (L7-D3)', () => {
    const r = reductionView(X, DEFAULT);
    const p = pcaView(X, DEFAULT).pieces[0];
    r.projected.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(p[i][0], 10);
      expect(pt[1]).toBeCloseTo(p[i][1], 10);
    });
  });

  it('regressions: same predictions for x and (z₁, z₂); mean RSS 2.420, 3.014, 13.53, 9.742 (acceptance)', () => {
    const c = regressionComparison(X, y, DEFAULT);
    expect(c.samePredictions.holds).toBe(true);
    // Rows: x₁ and x₂, z₁ only, z₁ and z₂, x₁ only, x₂ only.
    const [full, z1, z12, x1, x2] = c.rows;
    expect(full.theta).toEqual([expect.closeTo(176 / 3, 10), expect.closeTo(248 / 175, 10), expect.closeTo(216 / 175, 10)]);
    expect(full.meanRss).toBeCloseTo(2.42, 3);
    expect(z12.meanRss).toBeCloseTo(full.meanRss, 10);
    expect(z1.meanRss).toBeCloseTo(3.014, 3);
    expect(x1.meanRss).toBeCloseTo(13.53, 2);
    expect(x2.meanRss).toBeCloseTo(9.742, 3);
    expect(z1.model).toMatch(/z/);
  });
});

// §11.5 --------------------------------------------------------------------------------

describe('§11.5 Covariance matrix', () => {
  it('XᵀX = [[100, 125], [125, 200]] and S = [[20, 25], [25, 40]]; eigenvalues 30 ± 5√29 = σ²/5 (acceptance)', () => {
    const c = covarianceView(X, 'fraction');
    expect(matrixToStrings(c.XtX)).toEqual([['100', '125'], ['125', '200']]);
    expect(matrixToStrings(c.S)).toEqual([['20', '25'], ['25', '40']]);
    expect(c.eigen[0].lambda).toBeCloseTo(56.9258, 4);
    expect(c.eigen[1].lambda).toBeCloseTo(3.0742, 4);
    expect(c.sigmaOverRoot[0] ** 2).toBeCloseTo(c.eigen[0].lambda, 10);
    expect(c.check.holds).toBe(true);
  });

  it('point products and their signs (L7-C2); the ellipse axes along v₁, v₂ (L7-C5)', () => {
    const c = covarianceView(X, 'fraction');
    expect(c.products[0].product).toBe(21);
    expect(c.products.filter((p) => p.product > 0).length).toBeGreaterThan(c.products.filter((p) => p.product < 0).length);
    expect(c.ellipse.axes[0].length / c.ellipse.axes[1].length).toBeCloseTo(Math.sqrt(56.9258 / 3.0742), 3);
  });

  it('the formulas with every sum written out (L7-C1)', () => {
    const steps = covarianceSteps(X, 'fraction');
    expect(steps.some((s) => /n - 1|n-1|5/.test(s.tex))).toBe(true);
    expect(steps.at(-1)!.tex).toMatch(/25/);
  });
});

// §11.6 --------------------------------------------------------------------------------

describe('§11.6 Variance explained and standardizing', () => {
  it('≈ 94.876% and 5.124%, the same from σ² (acceptance)', () => {
    const v = varianceView(X, { standardize: false, sign: 'largest-positive', keep: 1 });
    expect(v.bars[0].value).toBeCloseTo(0.5 + Math.sqrt(29) / 12, 12);
    expect(v.bars[1].value).toBeCloseTo(0.5 - Math.sqrt(29) / 12, 12);
    expect(v.fromSingularValues[0]).toBeCloseTo(v.bars[0].value, 12);
    expect(v.check.holds).toBe(true);
    expect(v.running.at(-1)).toBeCloseTo(1, 12);
    expect(v.matrixName).toMatch(/covariance/i);
  });

  it('standardized: ≈ 94.194%; S becomes the correlation matrix (acceptance, L7-V4)', () => {
    const v = varianceView(X, { standardize: true, sign: 'largest-positive', keep: 1 });
    expect(v.bars[0].value).toBeCloseTo(0.5 + (5 * Math.SQRT2) / 16, 12);
    expect(v.matrixName).toMatch(/correlation/i);
  });

  it('Python export uses numpy.linalg.svd and sklearn PCA (L7-V5)', () => {
    const code = pythonExport(X, false);
    expect(code).toContain('np.linalg.svd');
    expect(code).toContain('PCA');
    expect(code).toContain('[3, 7]');
  });
});

// §11.7 --------------------------------------------------------------------------------

describe('§11.7 Best line: regression vs PCA', () => {
  it('slopes 5/4, (2 + √29)/5 ≈ 1.477 and 8/5; PCA between the two regressions (acceptance)', () => {
    const v = bestLineView(X, true);
    expect(v.regression.slope).toBeCloseTo(5 / 4, 12);
    expect(v.pca.slope).toBeCloseTo((2 + Math.sqrt(29)) / 5, 12);
    expect(v.reverse!.slope).toBeCloseTo(8 / 5, 12);
    expect(v.between.holds).toBe(true);
    expect(v.regression.slopeText).toBe('5/4');
  });

  it('each line wins at its own measure (L7-L2)', () => {
    const v = bestLineView(X, false);
    expect(v.regression.verticalSse).toBeLessThan(v.pca.verticalSse);
    expect(v.pca.perpendicularSse).toBeLessThan(v.regression.perpendicularSse);
    expect(v.reverse).toBeNull();
    expect(v.regression.residuals).toHaveLength(6);
    expect(v.caption).toMatch(/same matrix/);
  });
});

// §11.8 --------------------------------------------------------------------------------

describe('§11.8 Face recognition', () => {
  const set = () => generateFaces({ people: 8, variations: 6, size: 32, seed: 5 });

  it('unrolling an image row by row (L7-F1)', () => {
    const frames = unrollFrames([[1, 2], [3, 4], [5, 6]]);
    expect(frames).toHaveLength(4);
    expect(frames[0].row).toEqual([]);
    expect(frames[3].row).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('held-out variations are matched to the right person for most queries once m ≥ 10 (acceptance)', () => {
    const r = recognitionRate(set(), [2, 10, 20]);
    expect(r.points.find((p) => p[0] === 10)![1]).toBeGreaterThan(0.5);
    expect(r.points.find((p) => p[0] === 20)![1]).toBeGreaterThanOrEqual(r.points.find((p) => p[0] === 2)![1]);
  });

  it('the view: mean face, eigenfaces, reconstruction closer with more components, matches (L7-F3–F7)', () => {
    const err = (m: number) => {
      const v = faceView(set(), m, { kind: 'heldOut', person: 3 }, 0, null);
      return Math.hypot(...v.reconstruction.flat().map((x, i) => x - v.original.flat()[i]));
    };
    expect(err(20)).toBeLessThan(err(2));
    const v = faceView(set(), 10, { kind: 'heldOut', person: 3 }, 0, null);
    expect(v.mean).toHaveLength(32);
    expect(v.eigenfaces.length).toBeGreaterThan(0);
    expect(v.queryPerson).toBe(3);
    expect(v.matches[0].distance).toBeLessThanOrEqual(v.matches[1].distance);
    expect(v.scatter).toHaveLength(v.databaseSize);
    expect(v.databaseSize).toBe(8 * 5);
    expect(v.explained).toBeGreaterThan(0);
    expect(v.explained).toBeLessThanOrEqual(1);
  });
});
