import type { FloatMatrix, FloatVector } from './float';

/** A thin SVD A = U diag(σ) Vᵀ: U is m × r, V is n × r, σ decreasing, r = min(m, n). */
export interface ThinSvd {
  U: FloatMatrix;
  sigma: FloatVector;
  V: FloatMatrix;
}

export interface Bidiagonal {
  /** U₀ (m × n) and V₀ (n × n) with A = U₀ B V₀ᵀ. */
  U: FloatMatrix;
  V: FloatMatrix;
  /** Main diagonal d₁ … dₙ and superdiagonal e₁ … eₙ₋₁ of B. */
  diagonal: FloatVector;
  superdiagonal: FloatVector;
}

/** F-M48 step 1: Householder bidiagonalization (reusing the Lesson 4 reflectors), m ≥ n. */
export function bidiagonalize(A: FloatMatrix): Bidiagonal {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  if (m < n) throw new RangeError('bidiagonalize needs m ≥ n; transpose a wide matrix first');
  const B = A.map((r) => [...r]);
  const U = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => (i === j ? 1 : 0)));
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  /** v = x + sign(x₀)‖x‖e₁ (the stable sign), or null when x is already zero. */
  const reflector = (x: number[]) => {
    const len = Math.hypot(...x);
    if (len === 0) return null;
    const v = [...x];
    v[0] += x[0] >= 0 ? len : -len;
    const vv = v.reduce((a, t) => a + t * t, 0);
    return vv === 0 ? null : { v, vv };
  };
  for (let k = 0; k < n; k++) {
    // Left: zero B[k+1:, k].
    const left = reflector(B.slice(k).map((r) => r[k]));
    if (left) {
      for (let j = 0; j < n; j++) {
        const s = (2 * left.v.reduce((a, vi, i) => a + vi * B[k + i][j], 0)) / left.vv;
        for (let i = 0; i < left.v.length; i++) B[k + i][j] -= s * left.v[i];
      }
      for (let i = 0; i < m; i++) {
        const s = (2 * left.v.reduce((a, vj, j) => a + U[i][k + j] * vj, 0)) / left.vv;
        for (let j = 0; j < left.v.length; j++) U[i][k + j] -= s * left.v[j];
      }
    }
    // Right: zero B[k, k+2:].
    if (k < n - 2) {
      const right = reflector(B[k].slice(k + 1));
      if (right) {
        for (let i = 0; i < m; i++) {
          const s = (2 * right.v.reduce((a, vj, j) => a + B[i][k + 1 + j] * vj, 0)) / right.vv;
          for (let j = 0; j < right.v.length; j++) B[i][k + 1 + j] -= s * right.v[j];
        }
        for (let i = 0; i < n; i++) {
          const s = (2 * right.v.reduce((a, vj, j) => a + V[i][k + 1 + j] * vj, 0)) / right.vv;
          for (let j = 0; j < right.v.length; j++) V[i][k + 1 + j] -= s * right.v[j];
        }
      }
    }
  }
  return {
    U: U.map((r) => r.slice(0, n)),
    V,
    diagonal: B.slice(0, n).map((r, k) => r[k]),
    superdiagonal: B.slice(0, n - 1).map((r, k) => r[k + 1]),
  };
}

const sign = (a: number, b: number) => (b >= 0 ? Math.abs(a) : -Math.abs(a));
const EPS = 2.220446049250313e-16;

/**
 * Golub–Reinsch: Householder bidiagonalization accumulated into U (m × n,
 * overwriting a copy of A) and V (n × n), then implicit-shift QR sweeps on the
 * bidiagonal until every superdiagonal entry is negligible. Row-major
 * Float64Arrays for speed. m ≥ n.
 */
function golubReinsch(A: FloatMatrix, m: number, n: number, options: LargeSvdOptions): { w: Float64Array; u: Float64Array; v: Float64Array } {
  const a = new Float64Array(m * n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) a[i * n + j] = A[i][j];
  const v = new Float64Array(n * n);
  const w = new Float64Array(n);
  const rv1 = new Float64Array(n);
  const check = () => {
    if (options.isCancelled?.()) throw new Error('SVD aborted');
  };
  // Progress: about a third for the bidiagonalization and accumulation, the rest for the QR sweeps.
  const report = (f: number) => options.onProgress?.(Math.min(1, f));
  let g = 0;
  let scale = 0;
  let anorm = 0;
  let l = 0;

  for (let i = 0; i < n; i++) {
    if (i % 16 === 0) {
      check();
      report((0.2 * i) / n);
    }
    l = i + 1;
    rv1[i] = scale * g;
    g = 0;
    scale = 0;
    let s = 0;
    for (let k = i; k < m; k++) scale += Math.abs(a[k * n + i]);
    if (scale !== 0) {
      for (let k = i; k < m; k++) {
        a[k * n + i] /= scale;
        s += a[k * n + i] * a[k * n + i];
      }
      const f = a[i * n + i];
      g = -sign(Math.sqrt(s), f);
      const h = f * g - s;
      a[i * n + i] = f - g;
      for (let j = l; j < n; j++) {
        let ss = 0;
        for (let k = i; k < m; k++) ss += a[k * n + i] * a[k * n + j];
        const ff = ss / h;
        for (let k = i; k < m; k++) a[k * n + j] += ff * a[k * n + i];
      }
      for (let k = i; k < m; k++) a[k * n + i] *= scale;
    }
    w[i] = scale * g;
    g = 0;
    s = 0;
    scale = 0;
    if (i !== n - 1) {
      for (let k = l; k < n; k++) scale += Math.abs(a[i * n + k]);
      if (scale !== 0) {
        for (let k = l; k < n; k++) {
          a[i * n + k] /= scale;
          s += a[i * n + k] * a[i * n + k];
        }
        const f = a[i * n + l];
        g = -sign(Math.sqrt(s), f);
        const h = f * g - s;
        a[i * n + l] = f - g;
        for (let k = l; k < n; k++) rv1[k] = a[i * n + k] / h;
        for (let j = l; j < m; j++) {
          let ss = 0;
          for (let k = l; k < n; k++) ss += a[j * n + k] * a[i * n + k];
          for (let k = l; k < n; k++) a[j * n + k] += ss * rv1[k];
        }
        for (let k = l; k < n; k++) a[i * n + k] *= scale;
      }
    }
    anorm = Math.max(anorm, Math.abs(w[i]) + Math.abs(rv1[i]));
  }

  // Accumulate the right-hand transformations into V.
  for (let i = n - 1; i >= 0; i--) {
    if (i < n - 1) {
      if (g !== 0) {
        // Double division avoids a possible underflow.
        for (let j = l; j < n; j++) v[j * n + i] = a[i * n + j] / a[i * n + l] / g;
        for (let j = l; j < n; j++) {
          let s = 0;
          for (let k = l; k < n; k++) s += a[i * n + k] * v[k * n + j];
          for (let k = l; k < n; k++) v[k * n + j] += s * v[k * n + i];
        }
      }
      for (let j = l; j < n; j++) {
        v[i * n + j] = 0;
        v[j * n + i] = 0;
      }
    }
    v[i * n + i] = 1;
    g = rv1[i];
    l = i;
  }
  report(0.27);
  check();

  // Accumulate the left-hand transformations into U (overwriting a).
  for (let i = n - 1; i >= 0; i--) {
    l = i + 1;
    g = w[i];
    for (let j = l; j < n; j++) a[i * n + j] = 0;
    if (g !== 0) {
      g = 1 / g;
      for (let j = l; j < n; j++) {
        let s = 0;
        for (let k = l; k < m; k++) s += a[k * n + i] * a[k * n + j];
        const f = (s / a[i * n + i]) * g;
        for (let k = i; k < m; k++) a[k * n + j] += f * a[k * n + i];
      }
      for (let j = i; j < m; j++) a[j * n + i] *= g;
    } else {
      for (let j = i; j < m; j++) a[j * n + i] = 0;
    }
    a[i * n + i] += 1;
  }
  report(0.33);

  // Diagonalize the bidiagonal form: implicit-shift QR sweeps, from the bottom up.
  const tol = EPS * anorm;
  for (let k = n - 1; k >= 0; k--) {
    if (k % 8 === 0) {
      check();
      report(0.33 + (0.67 * (n - 1 - k)) / n);
    }
    for (let its = 1; its <= 75; its++) {
      let flag = true;
      let nm = 0;
      for (l = k; l >= 0; l--) {
        nm = l - 1;
        if (l === 0 || Math.abs(rv1[l]) <= tol) {
          flag = false;
          break;
        }
        if (Math.abs(w[nm]) <= tol) break;
      }
      if (flag) {
        // w[nm] is negligible: cancel rv1[l] by rotations.
        let c = 0;
        let s = 1;
        for (let i = l; i <= k; i++) {
          const f = s * rv1[i];
          rv1[i] = c * rv1[i];
          if (Math.abs(f) <= tol) break;
          g = w[i];
          let h = Math.hypot(f, g);
          w[i] = h;
          h = 1 / h;
          c = g * h;
          s = -f * h;
          for (let j = 0; j < m; j++) {
            const y = a[j * n + nm];
            const z = a[j * n + i];
            a[j * n + nm] = y * c + z * s;
            a[j * n + i] = z * c - y * s;
          }
        }
      }
      const z0 = w[k];
      if (l === k) {
        // Converged; make the singular value nonnegative.
        if (z0 < 0) {
          w[k] = -z0;
          for (let j = 0; j < n; j++) v[j * n + k] = -v[j * n + k];
        }
        break;
      }
      if (its === 75) throw new Error('The SVD did not converge');
      // Shift from the bottom 2 × 2 minor.
      let x = w[l];
      nm = k - 1;
      let y = w[nm];
      g = rv1[nm];
      let h = rv1[k];
      let f = ((y - z0) * (y + z0) + (g - h) * (g + h)) / (2 * h * y);
      g = Math.hypot(f, 1);
      f = ((x - z0) * (x + z0) + h * (y / (f + sign(g, f)) - h)) / x;
      let c = 1;
      let s = 1;
      for (let j = l; j <= nm; j++) {
        const i = j + 1;
        g = rv1[i];
        y = w[i];
        h = s * g;
        g = c * g;
        let z = Math.hypot(f, h);
        rv1[j] = z;
        c = f / z;
        s = h / z;
        f = x * c + g * s;
        g = g * c - x * s;
        h = y * s;
        y *= c;
        for (let jj = 0; jj < n; jj++) {
          const xv = v[jj * n + j];
          const zv = v[jj * n + i];
          v[jj * n + j] = xv * c + zv * s;
          v[jj * n + i] = zv * c - xv * s;
        }
        z = Math.hypot(f, h);
        w[j] = z;
        if (z !== 0) {
          z = 1 / z;
          c = f * z;
          s = h * z;
        }
        f = c * g + s * y;
        x = c * y - s * g;
        for (let jj = 0; jj < m; jj++) {
          const ya = a[jj * n + j];
          const za = a[jj * n + i];
          a[jj * n + j] = ya * c + za * s;
          a[jj * n + i] = za * c - ya * s;
        }
      }
      rv1[l] = 0;
      rv1[k] = f;
      w[k] = x;
    }
  }
  report(1);
  return { w, u: a, v };
}

export interface LargeSvdOptions {
  /** Called with a fraction 0 … 1 as the work proceeds. */
  onProgress?: (fraction: number) => void;
  /** Checked between sweeps; when it reads true the computation stops with an "aborted" error. */
  isCancelled?: () => boolean;
}

/**
 * F-M48: the SVD of a matrix up to 1024 × 1024 — Householder
 * bidiagonalization, then implicit-shift Golub–Kahan QR on the bidiagonal.
 * Never forms AᵀA. Works for m < n by transposing.
 */
export function svdLarge(A: FloatMatrix, options?: LargeSvdOptions): ThinSvd {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return { U: [], sigma: [], V: [] };
  if (rows < cols) {
    const t = svdLarge(A[0].map((_, j) => A.map((r) => r[j])), options);
    return { U: t.V, sigma: t.sigma, V: t.U };
  }
  const { w, u, v } = golubReinsch(A, rows, cols, options ?? {});
  // Sort σ decreasing, permuting the columns of U and V with them.
  const order = Array.from({ length: cols }, (_, k) => k).sort((x, y) => w[y] - w[x]);
  return {
    U: Array.from({ length: rows }, (_, i) => order.map((k) => u[i * cols + k])),
    sigma: order.map((k) => w[k]),
    V: Array.from({ length: cols }, (_, i) => order.map((k) => v[i * cols + k])),
  };
}
