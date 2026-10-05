import { describe, expect, it } from 'vitest';
import { cutoffRank, exactLayers, storageCost, svdLayers, truncate, truncationError, truncationUpdater } from '../lowRank';
import { matrix, matrixToStrings } from '../matrix';
import type { ThinSvd } from '../svdLarge';
import { over, SVD_EXAMPLE, SVD_EXAMPLE_LAYERS_2 } from './fixtures';

/** The notes' reduced SVD of [[0,1,1],[1,1,0]], in floats. */
const r2 = Math.SQRT1_2;
const r6 = 1 / Math.sqrt(6);
const NOTES_SVD: ThinSvd = {
  U: [
    [r2, r2],
    [r2, -r2],
  ],
  sigma: [Math.sqrt(3), 1],
  V: [
    [r6, -r2],
    [2 * r6, 0],
    [r6, r2],
  ],
};

describe('exact rank-1 layers (F-M49, notes §7.0)', () => {
  it('σ = √3 and 1; layers (1/2)[[1,2,1],[1,2,1]] and (1/2)[[−1,0,1],[1,0,−1]], exactly (acceptance)', () => {
    const e = exactLayers(matrix(SVD_EXAMPLE))!;
    expect(e.sigma.map((s) => s.square.toString())).toEqual(['3', '1']);
    expect(e.sigma.map((s) => s.tex)).toEqual(['\\sqrt{3}', '1']);
    expect(matrixToStrings(e.layers[0])).toEqual(over(SVD_EXAMPLE_LAYERS_2[0], 2));
    expect(matrixToStrings(e.layers[1])).toEqual(over(SVD_EXAMPLE_LAYERS_2[1], 2));
  });

  it('null when an eigenvalue of AᵀA is irrational', () => {
    expect(exactLayers(matrix([[1, 1], [1, 0]]))).toBeNull();
  });
});

describe('truncation (F-M50)', () => {
  it('the layers add up to A; the best rank-1 approximation is the first layer, ‖A − A₁‖² = 1 (acceptance)', () => {
    const layers = svdLayers(NOTES_SVD);
    expect(layers).toHaveLength(2);
    layers[0].flat().forEach((x, i) => expect(x).toBeCloseTo([0.5, 1, 0.5, 0.5, 1, 0.5][i], 12));
    truncate(NOTES_SVD, 2).flat().forEach((x, i) => expect(x).toBeCloseTo(SVD_EXAMPLE.flat()[i], 12));
    const err = truncationError(NOTES_SVD.sigma, 1);
    expect(err.frobeniusSquared).toBeCloseTo(1, 12);
    expect(err.spectral).toBeCloseTo(1, 12);
    expect(err.energyKept).toBeCloseTo(3 / 4, 12);
    expect(truncationError(NOTES_SVD.sigma, 2)).toMatchObject({ frobeniusSquared: 0, spectral: 0, energyKept: 1 });
  });

  it('the incremental updater agrees with truncate for any order of k', () => {
    const at = truncationUpdater(NOTES_SVD);
    for (const k of [2, 0, 1, 2, 1]) at(k).flat().forEach((x, i) => expect(x).toBeCloseTo(truncate(NOTES_SVD, k).flat()[i], 12));
  });

  it("the notes' cutoff rule σᵢ ≥ c·σ₁", () => {
    expect(cutoffRank([100, 50, 2, 1, 0.5], 0.01)).toBe(4);
    expect(cutoffRank([100, 50, 2, 1, 0.5], 0.5)).toBe(2);
    expect(cutoffRank([100], 1)).toBe(1);
  });

  it('storage: 860 × 1280 with k = 120 sends 256,800 numbers against 1,100,800, about 23.3% (acceptance)', () => {
    const c = storageCost(860, 1280, 120);
    expect(c).toMatchObject({ sent: 256800, original: 1100800, withSigma: 256920 });
    expect(c.ratio).toBeCloseTo(0.2333, 4);
  });
});
