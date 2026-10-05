import { describe, expect, it } from 'vitest';
import { matrix, matrixToStrings, vector, vectorToStrings } from '../matrix';
import { center, columnMeans, correlationMatrix, covarianceMatrix, sampleCovariance, sampleVariance, standardize } from '../statistics';
import { AGE_HEIGHT, expectRealThrow, s } from './fixtures';

const X = matrix(AGE_HEIGHT);

describe('statistics (F-M51, notes §7.2)', () => {
  it("the notes' data is already centered: means (0, 0)", () => {
    expect(vectorToStrings(columnMeans(X))).toEqual(['0', '0']);
    expect(matrixToStrings(center(X))).toEqual(s(AGE_HEIGHT));
  });

  it('centering a shifted copy gives the data back', () => {
    const shifted = matrix(AGE_HEIGHT.map(([a, b]) => [a + 30, b + 170]));
    expect(vectorToStrings(columnMeans(shifted))).toEqual(['30', '170']);
    expect(matrixToStrings(center(shifted))).toEqual(s(AGE_HEIGHT));
  });

  it('sample variance and covariance divide by n − 1: 20, 40 and 25', () => {
    expect(sampleVariance(X.map((r) => r[0])).toString()).toBe('20');
    expect(sampleVariance(X.map((r) => r[1])).toString()).toBe('40');
    expect(sampleCovariance(X.map((r) => r[0]), X.map((r) => r[1])).toString()).toBe('25');
    expectRealThrow(() => sampleVariance(vector([3])));
  });

  it('S = XᵀX/(n − 1) = [[20, 25], [25, 40]] (acceptance)', () => {
    expect(matrixToStrings(covarianceMatrix(X))).toEqual(s([[20, 25], [25, 40]]));
  });

  it('standardizing: s = √20, √40; the correlation matrix has 1s on the diagonal', () => {
    const z = standardize(X);
    expect(z.stds[0]).toBeCloseTo(Math.sqrt(20), 12);
    expect(z.stds[1]).toBeCloseTo(Math.sqrt(40), 12);
    expect(z.variances.map(String)).toEqual(['20', '40']);
    expect(z.Z[0][0]).toBeCloseTo(3 / Math.sqrt(20), 12);
    const R = correlationMatrix(X);
    expect(R[0][0]).toBeCloseTo(1, 12);
    expect(R[0][1]).toBeCloseTo(25 / Math.sqrt(800), 12);
    expectRealThrow(() => standardize(matrix([[1, 2], [1, 3]])));
  });
});
