import type { Vec3 } from '../types';

const H = Math.sqrt(3);
/** Side length 4 in scene units, centered on the origin. */
const VERTICES: Record<2 | 3 | 4, Vec3[]> = {
  2: [
    [-2, 0, 0],
    [2, 0, 0],
  ],
  3: [
    [-2, -H * (2 / 3), 0],
    [2, -H * (2 / 3), 0],
    [0, H * (4 / 3), 0],
  ],
  // Alternate corners of a cube: a regular tetrahedron with edge 4.
  4: [
    [Math.SQRT2, Math.SQRT2, Math.SQRT2],
    [Math.SQRT2, -Math.SQRT2, -Math.SQRT2],
    [-Math.SQRT2, Math.SQRT2, -Math.SQRT2],
    [-Math.SQRT2, -Math.SQRT2, Math.SQRT2],
  ],
};

/**
 * F-C11: the probability vectors with n entries form a simplex — a segment
 * (n = 2), an equilateral triangle (n = 3, drawn in 2D) or a regular
 * tetrahedron (n = 4, drawn in 3D). Vertex i is the pure state e_i.
 */
export function simplexVertices(n: 2 | 3 | 4): Vec3[] {
  const v = VERTICES[n];
  if (!v) throw new RangeError(`The simplex is drawn for 2–4 states, not ${n}`);
  return v.map((p) => [...p] as Vec3);
}

/** A probability vector → scene point: Σ pᵢ · vertexᵢ (barycentric coordinates). */
export function barycentricToWorld(p: readonly number[]): Vec3 {
  const verts = simplexVertices(p.length as 2 | 3 | 4);
  const out: Vec3 = [0, 0, 0];
  verts.forEach((v, i) => {
    for (let k = 0; k < 3; k++) out[k] += p[i] * v[k];
  });
  // + 0 turns −0 into 0.
  return out.map((x) => x + 0) as Vec3;
}

/** Solve a small linear system by elimination; null when singular. */
function solve(G: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = G.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Nearest point of the face spanned by `ids` (weights over those vertices), or null when it falls outside. */
function nearestOnFace(point: Vec3, verts: Vec3[], ids: number[]): number[] | null {
  if (ids.length === 1) return [1];
  const v0 = verts[ids[0]];
  const E = ids.slice(1).map((i) => sub(verts[i], v0));
  const t = solve(
    E.map((a) => E.map((b) => dot(a, b))),
    E.map((a) => dot(a, sub(point, v0))),
  );
  if (!t) return null;
  const w = [1 - t.reduce((s, x) => s + x, 0), ...t];
  return w.every((x) => x >= -1e-12) ? w.map((x) => Math.max(0, x)) : null;
}

/**
 * Scene point → probability vector, for the draggable point: the nearest
 * point of the simplex, so the point stays inside and the entries are ≥ 0 and
 * sum to 1.
 */
export function worldToBarycentric(point: Vec3, n: 2 | 3 | 4): number[] {
  const verts = simplexVertices(n);
  // Every face (nonempty subset of vertices); the nearest point lies on one of them.
  let best: { d: number; p: number[] } | null = null;
  for (let mask = 1; mask < 1 << n; mask++) {
    const ids = Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i));
    const w = nearestOnFace(point, verts, ids);
    if (!w) continue;
    const p = new Array<number>(n).fill(0);
    ids.forEach((i, k) => (p[i] = w[k]));
    const sum = p.reduce((s, x) => s + x, 0);
    const q = p.map((x) => x / sum);
    const d = Math.hypot(...sub(point, barycentricToWorld(q)));
    if (!best || d < best.d - 1e-12) best = { d, p: q };
  }
  return best!.p;
}
