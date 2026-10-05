import { describe, expect, it } from 'vitest';
import { eigenfaces, flattenImages, generateFaces, nearestFaces, projectFace, reconstructFace, unflatten } from '../faces';

const opts = { people: 6, variations: 5, size: 24, seed: 11 };

describe('face recognition helpers (F-M54, F-M55)', () => {
  it('a generated set: people × variations faces of the requested size, reproducible', () => {
    const set = generateFaces(opts);
    expect(set.images).toHaveLength(30);
    expect(set.images[0]).toHaveLength(24);
    expect(set.person.filter((p) => p === 2)).toHaveLength(5);
    expect(generateFaces(opts).images[7]).toEqual(set.images[7]);
  });

  it('flattening unrolls row by row; unflatten undoes it (L7-F1)', () => {
    const rows = flattenImages([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
    expect(rows).toEqual([[1, 2, 3, 4], [5, 6, 7, 8]]);
    expect(unflatten(rows[1], 2, 2)).toEqual([[5, 6], [7, 8]]);
  });

  it('eigenfaces: the mean face, orthonormal components, W = U V_pca', () => {
    const set = generateFaces(opts);
    const rows = flattenImages(set.images);
    const e = eigenfaces(rows, 8);
    expect(e.mean).toHaveLength(24 * 24);
    expect(e.mean[0]).toBeCloseTo(rows.reduce((s, r) => s + r[0], 0) / rows.length, 10);
    expect(e.components).toHaveLength(576);
    expect(e.components[0]).toHaveLength(8);
    const dot = (j: number, k: number) => e.components.reduce((s, r) => s + r[j] * r[k], 0);
    expect(dot(0, 0)).toBeCloseTo(1, 10);
    expect(dot(0, 1)).toBeCloseTo(0, 10);
    expect(e.weights).toHaveLength(30);
    projectFace(rows[3], e).forEach((w, j) => expect(w).toBeCloseTo(e.weights[3][j], 8));
  });

  it('reconstruction approaches the original as m grows', () => {
    const rows = flattenImages(generateFaces(opts).images);
    const err = (m: number) => {
      const e = eigenfaces(rows, m);
      const back = reconstructFace(projectFace(rows[4], e), e);
      return Math.hypot(...back.map((x, i) => x - rows[4][i]));
    };
    expect(err(15)).toBeLessThan(err(3));
    expect(err(29)).toBeLessThan(1e-6);
  });

  it('nearest neighbors by Euclidean distance, nearest first', () => {
    const W = [[0, 0], [3, 4], [1, 0]];
    expect(nearestFaces(W, [0.9, 0], 2)).toEqual([
      { index: 2, distance: expect.closeTo(0.1, 12) },
      { index: 0, distance: expect.closeTo(0.9, 12) },
    ]);
  });
});
