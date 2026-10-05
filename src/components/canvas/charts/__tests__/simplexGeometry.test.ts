import { describe, expect, it } from 'vitest';
import { barycentricToWorld, simplexVertices, worldToBarycentric } from '../simplexGeometry';

const dist = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));

describe('Simplex geometry (F-C11)', () => {
  it('a segment, an equilateral triangle in the plane, a regular tetrahedron', () => {
    expect(simplexVertices(2)).toHaveLength(2);
    const tri = simplexVertices(3);
    expect(tri.every((v) => v[2] === 0)).toBe(true);
    expect(dist(tri[0], tri[1])).toBeCloseTo(dist(tri[1], tri[2]), 12);
    expect(dist(tri[0], tri[1])).toBeCloseTo(dist(tri[0], tri[2]), 12);
    const tet = simplexVertices(4);
    const d = dist(tet[0], tet[1]);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(dist(tet[i], tet[j])).toBeCloseTo(d, 12);
  });

  it('pure states sit on the vertices; the uniform distribution at the centroid', () => {
    const tri = simplexVertices(3);
    expect(barycentricToWorld([0, 1, 0])).toEqual(tri[1]);
    const c = barycentricToWorld([1 / 3, 1 / 3, 1 / 3]);
    [0, 1, 2].forEach((k) => expect(c[k]).toBeCloseTo((tri[0][k] + tri[1][k] + tri[2][k]) / 3, 12));
  });

  it('round trip inside the simplex', () => {
    const p = [0.53, 0.24, 0.23];
    worldToBarycentric(barycentricToWorld(p), 3).forEach((x, i) => expect(x).toBeCloseTo(p[i], 12));
  });

  it('a point dragged outside is pulled back in: entries ≥ 0, summing to 1', () => {
    const tri = simplexVertices(3);
    const far: [number, number, number] = [tri[0][0] * 3 - tri[1][0], tri[0][1] * 3 - tri[1][1], 0];
    const p = worldToBarycentric(far, 3);
    expect(p.every((x) => x >= 0)).toBe(true);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});
