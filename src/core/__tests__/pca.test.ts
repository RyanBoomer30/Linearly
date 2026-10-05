import { describe, expect, it } from 'vitest';
import { matrix } from '../matrix';
import { pca } from '../pca';
import { AGE_HEIGHT, NOTES_V1, NOTES_V2 } from './fixtures';

const X = matrix(AGE_HEIGHT);
const col = (M: number[][], j: number) => M.map((r) => r[j]);

describe('PCA (F-M52, notes §7.1–7.3)', () => {
  it('σ² = 150 ± 25√29 (σ ≈ 16.871, 3.921); the notes\' v₁ and v₂ after the sign setting (acceptance)', () => {
    const p = pca(X);
    expect(p.sigma[0]).toBeCloseTo(Math.sqrt(150 + 25 * Math.sqrt(29)), 10);
    expect(p.sigma[1]).toBeCloseTo(Math.sqrt(150 - 25 * Math.sqrt(29)), 10);
    expect(p.sigma[0]).toBeCloseTo(16.871, 3);
    col(p.V, 0).forEach((x, i) => expect(x).toBeCloseTo(NOTES_V1[i], 4));
    col(p.V, 1).forEach((x, i) => expect(x).toBeCloseTo(NOTES_V2[i], 4));
    expect(p.means).toEqual([0, 0]);
    expect(p.scales).toBeNull();
  });

  it('eigenvalues of S are 30 ± 5√29 = σ²/5; variance explained 1/2 + √29/12 ≈ 94.876%', () => {
    const p = pca(X);
    expect(p.eigenvalues[0]).toBeCloseTo(30 + 5 * Math.sqrt(29), 10);
    expect(p.eigenvalues[1]).toBeCloseTo(3.0742, 4);
    expect(p.explained[0]).toBeCloseTo(0.5 + Math.sqrt(29) / 12, 12);
    expect(p.explained[0] + p.explained[1]).toBeCloseTo(1, 12);
  });

  it('scores Z = XV: the first person (3, 7) has z₁ ≈ 7.478 and z₂ ≈ −1.440', () => {
    const p = pca(X);
    expect(p.scores[0][0]).toBeCloseTo(7.478, 3);
    expect(p.scores[0][1]).toBeCloseTo(-1.44, 3);
  });

  it('XV = UΣ, and the components are orthonormal', () => {
    const p = pca(X);
    p.scores.forEach((row, i) => row.forEach((z, j) => expect(z).toBeCloseTo(p.U[i][j] * p.sigma[j], 10)));
    const dot = col(p.V, 0).reduce((acc, x, i) => acc + x * col(p.V, 1)[i], 0);
    expect(dot).toBeCloseTo(0, 12);
  });

  it('standardized: components (1, 1)/√2 and (−1, 1)/√2 up to sign; explained 1/2 + 5√2/16 ≈ 94.194%', () => {
    const p = pca(X, { standardize: true });
    expect(p.scales![0]).toBeCloseTo(Math.sqrt(20), 12);
    expect(Math.abs(p.V[0][0])).toBeCloseTo(Math.SQRT1_2, 10);
    expect(p.V[0][0] * p.V[1][0]).toBeGreaterThan(0);
    expect(p.V[0][1] * p.V[1][1]).toBeLessThan(0);
    expect(p.explained[0]).toBeCloseTo(0.5 + (5 * Math.SQRT2) / 16, 12);
  });

  it('"as computed" may flip a component; the largest-positive setting makes its largest entry positive', () => {
    const p = pca(X, { sign: 'largest-positive' });
    for (let j = 0; j < 2; j++) {
      const v = col(p.V, j);
      const big = v.reduce((b, x, i) => (Math.abs(x) > Math.abs(v[b]) ? i : b), 0);
      expect(v[big]).toBeGreaterThan(0);
    }
    const raw = pca(X, { sign: 'as-computed' });
    expect(Math.abs(raw.V[0][0])).toBeCloseTo(NOTES_V1[0], 4);
  });

  it('works on uncentered data (centers first)', () => {
    const p = pca(AGE_HEIGHT.map(([a, b]) => [a + 30, b + 170]));
    expect(p.means).toEqual([30, 170]);
    expect(p.scores[0][0]).toBeCloseTo(7.478, 3);
  });
});
