/**
 * View-models for the Lesson 7 views: the SVD as rank-1 layers and the best
 * rank-k approximation, image compression, PCA (centering, components,
 * dimension reduction, covariance, variance explained, standardizing), the
 * regression line against the PCA line, and face recognition. Small examples
 * are exact where the notes' numbers are (F-M49, F-M51); SVDs of data and
 * images are floating point and say so (F-D10). Kept pure so they can be unit
 * tested.
 */
import type { ChartFrame } from '../../components/canvas/charts';
import { anyMatrixTex } from '../../components/display/AnyMatrixTex';
import type { Bar } from '../../components/display/BarChart';
import { matrixToTex } from '../../components/display/MatrixTex';
import { eigenvalues } from '../../core/eigen';
import { eigenfaces, flattenImages, nearestFaces, projectFace, reconstructFace, unflatten, type FaceSet } from '../../core/faces';
import { EXACT, type AnyMatrix, type FloatMatrix, type FloatVector, type Precision } from '../../core/float';
import { resizeTo } from '../../core/image';
import { leastSquares } from '../../core/leastSquares';
import { cutoffRank, exactLayers, storageCost, surd, surdParts, truncationError, type ExactLayers, type StorageCost } from '../../core/lowRank';
import { matrix, matrixEquals, toFloatMatrix, transpose, type Matrix, type Vector } from '../../core/matrix';
import { pca, type ComponentSign, type PcaResult } from '../../core/pca';
import { matMul } from '../../core/products';
import { mulberry32 } from '../../core/random';
import { Rational } from '../../core/rational';
import { scaleInteger } from '../../core/scaling';
import { center, columnMeans, correlationMatrix, covarianceMatrix } from '../../core/statistics';
import { svd as smallSvd } from '../../core/svd';
import type { ThinSvd } from '../../core/svdLarge';
import { AGE_HEIGHT_ROWS } from '../../presets/lesson7';
import { eigenColor } from '../../theme/colors';

// Helpers -------------------------------------------------------------------------

const short = (x: number, digits = 4) => String(Number(x.toPrecision(digits)) + 0);
const dec = (x: number, places = 4) => (Math.abs(x) < 0.5 * 10 ** -places ? '0' : x.toFixed(places));
const fmtInt = (x: number) => x.toLocaleString('en-US');
const pct = (x: number, places = 3) => `${(x * 100).toFixed(places)}%`;
const GREY = '#a1a1aa';
const LINE_COLORS = { regression: '#0072B2', pca: '#E69F00', reverse: '#009E73' };
const floatTex = (M: number[][], places = 4, colors?: Record<string, string>) =>
  matrixToTex(M.map((r) => r.map((x) => dec(x, places))), false, colors ? { entryColors: colors } : {});
const colTex = (v: Vector) => matrixToTex(v.map((x) => [x.toTex()]), false, {});
const asNumbers = (X: Matrix) => X.map((r) => r.map((x) => x.toNumber()));
const frob = (M: number[][]) => Math.sqrt(M.flat().reduce((a, x) => a + x * x, 0));
const sub = (k: number) => (k < 10 ? `${k}` : `{${k}}`);

/** PCA with the "flip v₁" demo applied (v₁, u₁ and z₁ change sign). */
function pcaWithFlip(X: Matrix, options: { standardize?: boolean; sign: ComponentSign; flipV1: boolean }): PcaResult {
  const p = pca(X, { standardize: options.standardize, sign: options.sign });
  if (!options.flipV1) return p;
  const flip = (M: FloatMatrix) => M.map((row) => row.map((x, j) => (j === 0 ? -x : x)));
  return { ...p, V: flip(p.V), U: flip(p.U), scores: flip(p.scores) };
}

const bigGcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : bigGcd(b, a % b));

const isNotesData = (X: Matrix) => X.length === AGE_HEIGHT_ROWS.length && matrixEquals(X, matrix(AGE_HEIGHT_ROWS.map((r) => r.slice(0, 2))));

/** Least squares in floats (for the component models): θ and the predictions. */
function fitFloat(columns: number[][], y: number[]): { theta: number[]; predictions: number[] } {
  const n = y.length;
  const D = Array.from({ length: n }, (_, i) => [1, ...columns.map((c) => c[i])]);
  const p = D[0].length;
  const M = Array.from({ length: p }, (_, a) => [...Array.from({ length: p }, (_, b) => D.reduce((s, r) => s + r[a] * r[b], 0)), D.reduce((s, r, i) => s + r[a] * y[i], 0)]);
  for (let c = 0; c < p; c++) {
    let piv = c;
    for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= p; k++) M[r][k] -= f * M[c][k];
    }
  }
  const theta = M.map((r, i) => r[p] / r[i]);
  return { theta, predictions: D.map((r) => r.reduce((s, x, k) => s + x * theta[k], 0)) };
}
import type { FaceQuery } from '../../store/useLesson7Store';
import type { NumberDisplay } from '../../store/useDataStore';

/** "XV = UΣ" style check. */
export interface Check {
  name: string;
  holds: boolean;
  tex: string;
  residual?: number;
}

/** A step of any Lesson 7 stepper. */
export interface Lesson7Step {
  description: string;
  tex: string;
}

/** A point on a 2D scatter, in data coordinates. */
export type Point = [number, number];

// §11.1 SVD and the best rank-k approximation ----------------------------------------

export interface SvdFactor {
  /** "U", "\\Sigma", "V^T", "U_r", … */
  name: string;
  /** "m \\times m" with the numbers: "2 \\times 2". */
  shape: string;
  tex: string;
}

export interface SvdLayer {
  index: number;
  /** σᵢuᵢvᵢᵀ: exact when F-M49 applies, floats otherwise. */
  matrix: AnyMatrix;
  entries: number[][];
  /** "\\sqrt{3}\\,u_1v_1^T = \\frac{1}{2}\\begin{bmatrix}…\\end{bmatrix}" */
  tex: string;
  sigmaTex: string;
  size: number;
}

export interface SvdView {
  precision: Precision;
  m: number;
  n: number;
  rank: number;
  /** L7-S1: full A = UΣVᵀ with the unused parts greyed, and reduced A = U_rΣ_rV_rᵀ. */
  full: SvdFactor[];
  reduced: SvdFactor[];
  /** Columns of U (beyond r) and rows of Vᵀ (beyond r) that multiply zeros, for greying. */
  unused: { uColumns: number[]; vRows: number[] };
  /** L7-S2: the layers, largest first. */
  layers: SvdLayer[];
  exact: ExactLayers | null;
  /** L7-S3: Aₖ, the leftover A − Aₖ, its size, and the exact error statement. */
  k: number;
  approx: number[][];
  leftover: number[][];
  errorSquared: number;
  errorTex: string;
  maxAbs: number;
}

/** §11.1 (L7-S1–L7-S3). Matrices up to 4 × 4. */
export function svdView(A: Matrix, k: number, display: NumberDisplay): SvdView {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  if (m < 1 || n < 1 || m > 4 || n > 4) throw new RangeError('The SVD view takes matrices up to 4 × 4');
  let exact: ExactLayers | null = null;
  try {
    exact = exactLayers(A);
  } catch {
    exact = null;
  }
  const s = smallSvd(toFloatMatrix(A));
  const r = exact ? exact.layers.length : s.rank;
  // Exact vectors as the notes write them: uᵢ = cᵢwᵢ with wᵢ an integer vector whose largest entry is
  // positive and cᵢ > 0 (the sign goes onto vᵢ), e.g. u₂ = (1/√2)(1, −1) and v₂ = (1/√2)(−1, 0, 1).
  const shown = exact
    ? exact.v.map((v0, i) => {
        const Av0 = A.map((row) => row.reduce((acc, a, j) => acc.add(a.mul(v0[j])), Rational.ZERO));
        const w = scaleInteger(Av0);
        const lead = Av0.findIndex((x) => !x.isZero());
        const negative = Av0[lead].div(w[lead]).isNegative();
        const v = negative ? v0.map((x) => x.neg()) : v0;
        const ratio = Av0[lead].div(w[lead]).abs();
        const vv = v.reduce((acc, x) => acc.add(x.mul(x)), Rational.ZERO);
        return { v, w, uCoefficient: surd(ratio.mul(ratio).div(exact!.sigma[i].square.mul(vv))).tex, vCoefficient: surd(Rational.ONE.div(vv)).tex };
      })
    : null;
  // Align the float singular vectors' signs with the exact ones, so both pictures agree.
  const U = s.U.map((row) => [...row]);
  const V = s.V.map((row) => [...row]);
  shown?.forEach(({ v }, j) => {
    const dot = v.reduce((acc, x, i) => acc + x.toNumber() * V[i][j], 0);
    if (dot < 0) {
      V.forEach((row) => (row[j] = -row[j]));
      U.forEach((row) => (row[j] = -row[j]));
    }
  });
  const sigma = exact ? exact.sigma.map((x) => x.value) : s.sigma.slice(0, r);
  const sigmaTex = exact ? exact.sigma.map((x) => x.tex) : sigma.map((x) => short(x));

  // L7-S1: full and reduced factors with their shapes; unused columns of U and rows of Vᵀ greyed.
  const uColumns = Array.from({ length: m - r }, (_, k) => r + k);
  const vRows = Array.from({ length: n - r }, (_, k) => r + k);
  const greyCells = (rows: number, cols: number, isGrey: (i: number, j: number) => boolean) => {
    const out: Record<string, string> = {};
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) if (isGrey(i, j)) out[`${i},${j}`] = GREY;
    return out;
  };
  const Sigma = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => (i === j && i < r ? sigma[i] : 0)));
  const SigmaTexEntries = Sigma.map((row, i) => row.map((x, j) => (i === j && i < r ? sigmaTex[i] : '0')));
  const Vt = V[0].map((_, j) => V.map((row) => row[j]));
  const full: SvdFactor[] = [
    { name: 'U', shape: `${m} \\times ${m}`, tex: floatTex(U, 4, greyCells(m, m, (_, j) => j >= r)) },
    { name: '\\Sigma', shape: `${m} \\times ${n}`, tex: matrixToTex(SigmaTexEntries, false, { entryColors: greyCells(m, n, (i, j) => i >= r || j >= r) }) },
    { name: 'V^T', shape: `${n} \\times ${n}`, tex: floatTex(Vt, 4, greyCells(n, n, (i) => i >= r)) },
  ];
  // Reduced factors: surd form when exact (uᵢ = Avᵢ/(σᵢ‖vᵢ‖), vᵢ/‖vᵢ‖), decimals otherwise.
  let reducedU = floatTex(U.map((row) => row.slice(0, r)));
  let reducedVt = floatTex(Vt.slice(0, r));
  if (shown && r > 0) {
    reducedU = `\\left[\\, ${shown.map((c) => `${c.uCoefficient}${colTex(c.w)}`).join(' \\quad ')} \\,\\right]`;
    reducedVt = `\\begin{array}{l} ${shown.map((c) => `${c.vCoefficient}${matrixToTex([c.v.map((x) => x.toTex())], false, {})}`).join(' \\\\[4pt] ')} \\end{array}`;
  }
  const reduced: SvdFactor[] = [
    { name: 'U_r', shape: `${m} \\times ${r}`, tex: reducedU },
    { name: '\\Sigma_r', shape: `${r} \\times ${r}`, tex: matrixToTex(sigmaTex.map((x, i) => sigmaTex.map((_, j) => (i === j ? x : '0'))), false, {}) },
    { name: 'V_r^T', shape: `${r} \\times ${n}`, tex: reducedVt },
  ];

  // L7-S2: layers, largest first.
  const layerMatrices: AnyMatrix[] = exact ? exact.layers : sigma.map((sv, l) => U.map((row) => V.map((vrow) => row[l] * sv * vrow[l])));
  const layers: SvdLayer[] = layerMatrices.map((M, l) => {
    const entries = (M as (Rational | number)[][]).map((row) => row.map((x) => (typeof x === 'number' ? x : x.toNumber())));
    return { index: l, matrix: M, entries, sigmaTex: sigmaTex[l], tex: `${sigmaTex[l]}\\,u_${sub(l + 1)}v_${sub(l + 1)}^T = ${anyMatrixTex(M, 4)}`, size: sigma[l] };
  });

  // L7-S3: Aₖ and the leftover, exactly when the layers are exact.
  const kk = Math.max(0, Math.min(k, r));
  let approx: number[][];
  let leftover: number[][];
  if (exact) {
    const Ak = exact.layers.slice(0, kk).reduce<Matrix>((acc, L) => acc.map((row, i) => row.map((x, j) => x.add(L[i][j]))), A.map((row) => row.map(() => Rational.ZERO)));
    approx = asNumbers(Ak);
    leftover = asNumbers(A.map((row, i) => row.map((x, j) => x.sub(Ak[i][j]))));
  } else {
    approx = A.map((row, i) => row.map((_, j) => layers.slice(0, kk).reduce((acc, L) => acc + L.entries[i][j], 0)));
    leftover = A.map((row, i) => row.map((x, j) => x.toNumber() - approx[i][j]));
  }
  const tail = exact ? exact.sigma.slice(kk).reduce((acc, x) => acc.add(x.square), Rational.ZERO) : null;
  const errorSquared = tail ? tail.toNumber() : sigma.slice(kk).reduce((acc, x) => acc + x * x, 0);
  const terms = Array.from({ length: r - kk }, (_, i) => `\\sigma_${sub(kk + i + 1)}^2`);
  const errorTex =
    kk >= r
      ? `A_${sub(kk)} = A, \\quad \\|A - A_${sub(kk)}\\|^2 = 0`
      : `\\|A - A_${sub(kk)}\\|^2 = ${terms.join(' + ')} = ${tail ? tail.toTex() : short(errorSquared)}`;
  const maxAbs = Math.max(1e-12, ...[...layers.flatMap((l) => l.entries), ...approx, ...leftover].flat().map(Math.abs));
  return {
    precision: exact ? EXACT : { kind: 'float', reason: 'the eigenvalues of AᵀA are not all rational' },
    m,
    n,
    rank: r,
    full,
    reduced,
    unused: { uColumns, vRows },
    layers,
    exact,
    k: kk,
    approx,
    leftover,
    errorSquared,
    errorTex,
    maxAbs,
  };
}

export interface SvdGeometry {
  dim: 2 | 3;
  /** L7-S4: each vᵢ (on the unit circle or sphere) and its image σᵢuᵢ (an axis of the ellipse). */
  axes: { v: [number, number, number]; image: [number, number, number]; sigma: number; label: string }[];
  /** A, for drawing the image of the circle (points Ax for x on the unit circle). */
  A: FloatMatrix;
}

/** L7-S4: for 2 × 2 and 3 × 3 matrices only. Throws for other shapes. */
export function svdGeometry(A: Matrix): SvdGeometry {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  if (m !== n || (n !== 2 && n !== 3)) throw new RangeError('The circle-to-ellipse picture needs a 2 × 2 or 3 × 3 matrix');
  const F = toFloatMatrix(A);
  const s = smallSvd(F);
  const pad = (v: number[]): [number, number, number] => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
  return {
    dim: n as 2 | 3,
    axes: s.sigma.map((sigma, i) => {
      const v = s.V.map((row) => row[i]);
      return { v: pad(v), image: pad(F.map((row) => row.reduce((acc, a, j) => acc + a * v[j], 0))), sigma, label: `v${i + 1} ↦ σ${i + 1}u${i + 1}` };
    }),
    A: F,
  };
}

// §11.2 Image compression -----------------------------------------------------------

export interface CompressionView {
  k: number;
  /** L7-I3 */
  storage: StorageCost;
  storageText: string;
  /** L7-I4: share of ‖A‖² kept. */
  energyKept: number;
  /** ‖A − Aₖ‖ relative to ‖A‖. */
  relativeError: number;
  /** L7-I4: σᵢ on a log axis with the cutoff line c·σ₁. */
  chart: { frame: ChartFrame; points: [number, number][]; cutoff: [number, number][]; kMarker: [number, number][] };
  /** L7-I6: the trade-off without a recommendation. */
  tradeOff: string;
}

/** §11.2. k comes from the slider, or from the cutoff rule when `kMode` is "cutoff". */
export function compressionView(svd: ThinSvd, rows: number, cols: number, k: number, kMode: 'slider' | 'cutoff', cutoff: number): CompressionView {
  const r = svd.sigma.length;
  const kk = kMode === 'cutoff' ? Math.max(1, cutoffRank(svd.sigma, cutoff)) : Math.max(1, Math.min(k, Math.min(rows, cols)));
  const storage = storageCost(rows, cols, kk);
  const err = truncationError(svd.sigma, kk);
  const total = svd.sigma.reduce((a, s) => a + s * s, 0);
  const floor = Math.max(1e-300, (svd.sigma[0] ?? 1) * 1e-12);
  const points: [number, number][] = svd.sigma.map((s, i) => [i + 1, Math.max(floor, s)]);
  const lo = 10 ** Math.floor(Math.log10(Math.min(...points.map((p) => p[1]))));
  const hi = 10 ** Math.ceil(Math.log10(Math.max(...points.map((p) => p[1]), lo * 10)));
  const level = Math.max(lo, cutoff * (svd.sigma[0] ?? 1));
  const xMax = Math.max(2, r);
  return {
    k: kk,
    storage,
    storageText: `${kk} × (${rows} + ${cols}) = ${fmtInt(storage.sent)} numbers sent, against ${rows} × ${cols} = ${fmtInt(storage.original)} for the original: about ${(storage.ratio * 100).toFixed(1)}%. The ${kk} singular values add ${kk} more (${fmtInt(storage.withSigma)}).`,
    energyKept: err.energyKept,
    relativeError: total === 0 ? 0 : Math.sqrt(err.frobeniusSquared / total),
    chart: {
      frame: { x: { min: 1, max: xMax, title: 'i' }, y: { min: lo, max: hi > lo ? hi : lo * 10, title: 'σᵢ', log: true }, size: 8, equalAspect: false },
      points,
      cutoff: [[1, level], [xMax, level]],
      kMarker: [[Math.min(kk, xMax), lo], [Math.min(kk, xMax), hi > lo ? hi : lo * 10]],
    },
    tradeOff: 'A smaller k sends less (cheaper) but loses detail (blurrier); a larger k is sharper but costs more. The notes leave choosing a cutoff to the homework.',
  };
}

/** L7-I5: one layer σᵢuᵢvᵢᵀ as an image matrix (signed). */
export function layerImage(svd: ThinSvd, i: number): FloatMatrix {
  const s = svd.sigma[i] ?? 0;
  return svd.U.map((row) => svd.V.map((vrow) => row[i] * s * vrow[i]));
}

/** L7-I5: the leftover A − Aₖ (signed). */
export function leftoverImage(image: FloatMatrix, approx: FloatMatrix): FloatMatrix {
  return image.map((row, i) => row.map((x, j) => x - approx[i][j]));
}

// §11.3 PCA: centering and components ------------------------------------------------

export interface ScatterView {
  /** One frame for every scatter in the PCA views, with equal aspect so angles are true. */
  frame: ChartFrame;
  points: Point[];
}

/** A shared frame around the points (and the origin), with equal aspect. */
export function scatterView(points: Point[], titles: [string, string]): ScatterView {
  const xs = [0, ...points.map((p) => p[0])];
  const ys = [0, ...points.map((p) => p[1])];
  const span = Math.max(1, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = 0.15 * span;
  return {
    frame: {
      x: { min: Math.min(...xs) - pad, max: Math.max(...xs) + pad, title: titles[0] },
      y: { min: Math.min(...ys) - pad, max: Math.max(...ys) + pad, title: titles[1] },
      size: 8,
      equalAspect: true,
    },
    points,
  };
}

/** L7-P2: compute each mean, subtract it; one step per column, then the centered table. */
export function centeringSteps(X: Matrix, display: NumberDisplay): Lesson7Step[] {
  const n = X.length;
  const means = columnMeans(X);
  const term = (x: Rational) => (x.isNegative() ? `(${x.toTex()})` : x.toTex());
  const show = (x: Rational) => (display === 'decimal' && !x.isInteger() ? short(x.toNumber()) : x.toTex());
  const steps: Lesson7Step[] = means.map((mu, j) => {
    const sum = X.reduce((acc, row) => acc.add(row[j]), Rational.ZERO);
    return {
      description: `The mean of column ${j + 1}`,
      tex: `\\bar x_${j + 1} = \\frac{1}{${n}}\\left(${X.map((row) => term(row[j])).join(' + ')}\\right) = \\frac{${sum.toTex()}}{${n}} = ${show(mu)}`,
    };
  });
  steps.push({
    description: 'Subtract each mean from its column: the centered data',
    tex: `X - \\bar x = ${matrixToTex(center(X).map((row) => row.map(show)), false, {})}`,
  });
  return steps;
}

export interface PcaView {
  pca: PcaResult;
  /** Centered points (before any standardizing), for the "after" scatter. */
  centered: Point[];
  /** L7-P3: U_r, Σ_r, V_rᵀ as TeX in the notes' layout. */
  factorsTex: { U: string; Sigma: string; Vt: string };
  /** σ₁u₁v₁ᵀ and σ₂u₂v₂ᵀ, which add up to X. */
  pieces: number[][][];
  /** L7-P4: v₁ as a line through the origin and v₂ perpendicular, for the scatter. */
  lines: { label: string; color: string; from: Point; to: Point }[];
  /** L7-P5: the notes' reasoning about the sign of v₁. */
  signNote: string;
  check: Check;
}

/** §11.3 (L7-P3–L7-P5). `flipV1` multiplies v₁ (and u₁, z₁) by −1. */
export function pcaView(X: Matrix, options: { standardize: boolean; sign: ComponentSign; flipV1: boolean }): PcaView {
  const p = pcaWithFlip(X, options);
  const means = columnMeans(X).map((m) => m.toNumber());
  const centered: Point[] = X.map((row) => [row[0].toNumber() - means[0], row[1].toNumber() - means[1]]);
  const d = p.V.length;
  const pieces = Array.from({ length: d }, (_, l) => p.U.map((row) => p.V.map((vrow) => row[l] * p.sigma[l] * vrow[l])));
  const reach = 1.3 * Math.max(1, ...centered.map(([a, b]) => Math.hypot(a, b)));
  const scale = p.scales ?? [1, 1];
  // Lines in the centered data's units (a standardized component is stretched back by the scales).
  const along = (j: number): [Point, Point] => {
    const dir = [p.V[0][j] * scale[0], p.V[1][j] * scale[1]];
    const len = Math.hypot(dir[0], dir[1]) || 1;
    return [[(-reach * dir[0]) / len, (-reach * dir[1]) / len], [(reach * dir[0]) / len, (reach * dir[1]) / len]];
  };
  const [a1, b1] = along(0);
  const [a2, b2] = d > 1 ? along(1) : [[0, 0] as Point, [0, 0] as Point];
  const XV = p.X.map((row) => p.V[0].map((_, j) => row.reduce((acc, x, k) => acc + x * p.V[k][j], 0)));
  const residual = frob(XV.map((row, i) => row.map((x, j) => x - p.U[i][j] * p.sigma[j])));
  return {
    pca: p,
    centered,
    factorsTex: {
      U: floatTex(p.U),
      Sigma: floatTex(p.sigma.map((s, i) => p.sigma.map((_, j) => (i === j ? s : 0)))),
      Vt: floatTex(p.V[0].map((_, j) => p.V.map((row) => row[j]))),
    },
    pieces,
    lines: [
      { label: `v₁ = (${dec(p.V[0][0])}, ${dec(p.V[1][0])})`, color: '#0072B2', from: a1, to: b1 },
      ...(d > 1 ? [{ label: `v₂ = (${dec(p.V[0][1])}, ${dec(p.V[1][1])})`, color: '#D55E00', from: a2, to: b2 }] : []),
    ],
    signNote:
      'A calculator may return −v₁ (and −u₁) instead of v₁: both are singular vectors. The notes choose the positive v₁, so that z₁ = Xv₁ moves in the same direction as x₁ and x₂. Flipping v₁ flips z₁, and the sign of its regression coefficient.',
    check: { name: 'XV = UΣ', holds: residual <= 1e-10 * Math.max(1, frob(XV)), tex: 'XV = U\\Sigma', residual },
  };
}

// §11.4 Dimension reduction ---------------------------------------------------------

export interface ReductionView {
  /** L7-D1: z₁ = Xv₁ and z₂ = Xv₂ per row, with the formulas. */
  scores: Point[];
  formulas: [string, string];
  /** L7-D3: each point dropped onto the v₁ line: the rows of σ₁u₁v₁ᵀ = Xv₁v₁ᵀ. */
  projected: Point[];
  /** L7-D2: the rotation angle of v₁ from the x₁ axis (radians), for the animation. */
  angle: number;
  /** L7-D5: the notes' z₂ column used the wrong formula. */
  notesCorrection: string;
}

/** §11.4 (L7-D1–L7-D3, L7-D5) */
export function reductionView(X: Matrix, options: { standardize: boolean; sign: ComponentSign; flipV1: boolean }): ReductionView {
  const p = pcaWithFlip(X, options);
  const scores: Point[] = p.scores.map((row) => [row[0], row[1] ?? 0]);
  const v1 = [p.V[0][0], p.V[1][0]];
  const v2 = [p.V[0][1] ?? 0, p.V[1][1] ?? 0];
  const coef = (c: number, first: boolean) => (first ? dec(c) : c < 0 ? `- ${dec(-c)}` : `+ ${dec(c)}`);
  let notesCorrection = '';
  if (isNotesData(X) && !options.standardize) {
    const z2 = 3 * v2[0] + 7 * v2[1];
    notesCorrection = `Notes correction: in the notes' table the z₂ column was computed as 0.5606x₁ − 0.8281x₂, not the stated z₂ = 0.8281x₁ − 0.5606x₂. For the first person (3, 7) the stated formula gives ${dec(z2)}, not −4.1152. The table here uses the formula.`;
  }
  return {
    scores,
    formulas: [`z_1 = ${coef(v1[0], true)}x_1 ${coef(v1[1], false)}x_2`, `z_2 = ${coef(v2[0], true)}x_1 ${coef(v2[1], false)}x_2`],
    projected: p.scores.map((row) => [row[0] * v1[0], row[0] * v1[1]]),
    angle: Math.atan2(v1[1], v1[0]),
    notesCorrection,
  };
}

export interface RegressionRow {
  /** "y = θ₀ + θ₁x₁ + θ₂x₂" */
  model: string;
  theta: number[];
  thetaText: string;
  meanRss: number;
}

export interface RegressionComparison {
  /** L7-D4, in this order: x₁ and x₂, z₁ only, z₁ and z₂, x₁ only, x₂ only. */
  rows: RegressionRow[];
  /** The x-model and the (z₁, z₂)-model predict the same (to 10⁻¹⁰). */
  samePredictions: Check;
}

/** L7-D4: least squares (Lesson 2 core) on the original variables and on the components. */
export function regressionComparison(X: Matrix, y: Vector, options: { sign: ComponentSign; flipV1: boolean }): RegressionComparison {
  const p = pcaWithFlip(X, { sign: options.sign, flipV1: options.flipV1 });
  const yy = y.map((v) => v.toNumber());
  const n = X.length;
  const exactFit = (cols: number[], label: string): RegressionRow & { predictions: number[] } => {
    const D = X.map((row) => [Rational.ONE, ...cols.map((j) => row[j])]);
    const r = leastSquares(D, y);
    if (!r.xHat) throw new Error('The columns are dependent, so θ is not unique');
    const theta = r.xHat.map((t) => t.toNumber());
    return { model: label, theta, thetaText: `(${r.xHat.map((t) => (t.isInteger() || t.den <= 1000n ? t.toString() : short(t.toNumber()))).join(', ')})`, meanRss: r.meanRss.toNumber(), predictions: r.p.map((v) => v.toNumber()) };
  };
  const floatFit = (cols: number[][], label: string): RegressionRow & { predictions: number[] } => {
    const { theta, predictions } = fitFloat(cols, yy);
    const rss = predictions.reduce((acc, pr, i) => acc + (yy[i] - pr) ** 2, 0);
    return { model: label, theta, thetaText: `(${theta.map((t) => short(t, 5)).join(', ')})`, meanRss: rss / n, predictions };
  };
  const z1 = p.scores.map((r) => r[0]);
  const z2 = p.scores.map((r) => r[1]);
  const full = exactFit([0, 1], 'y = \\theta_0 + \\theta_1 x_1 + \\theta_2 x_2');
  const both = floatFit([z1, z2], 'y = \\theta_0 + \\theta_1 z_1 + \\theta_2 z_2');
  const rows = [
    full,
    floatFit([z1], 'y = \\theta_0 + \\theta_1 z_1'),
    both,
    exactFit([0], 'y = \\theta_0 + \\theta_1 x_1'),
    exactFit([1], 'y = \\theta_0 + \\theta_1 x_2'),
  ];
  const diff = Math.max(...full.predictions.map((pr, i) => Math.abs(pr - both.predictions[i])));
  return {
    rows: rows.map(({ predictions: _p, ...row }) => row),
    samePredictions: { name: 'same predictions', holds: diff <= 1e-10 * Math.max(1, ...yy.map(Math.abs)), tex: '\\hat y_{x_1, x_2} = \\hat y_{z_1, z_2}', residual: diff },
  };
}

// §11.5 Covariance matrix -----------------------------------------------------------

/** L7-C1: mean, variance (n − 1) and covariance with every sum written out. */
export function covarianceSteps(X: Matrix, display: NumberDisplay): Lesson7Step[] {
  const n = X.length;
  const means = columnMeans(X);
  const Xc = center(X);
  const show = (x: Rational) => (display === 'decimal' && !x.isInteger() ? short(x.toNumber()) : x.toTex());
  const term = (x: Rational) => (x.isNegative() ? `(${show(x)})` : show(x));
  const sumOf = (vals: Rational[]) => vals.reduce((a, v) => a.add(v), Rational.ZERO);
  const steps: Lesson7Step[] = means.map((mu, j) => ({
    description: `Sample mean of x${j + 1}`,
    tex: `\\bar x_${j + 1} = \\frac{1}{n}\\sum_i x_${j + 1}^{(i)} = \\frac{1}{${n}}\\left(${X.map((r) => term(r[j])).join(' + ')}\\right) = ${show(mu)}`,
  }));
  for (let j = 0; j < 2; j++) {
    const sq = Xc.map((r) => r[j].mul(r[j]));
    steps.push({
      description: `Sample variance of x${j + 1}, dividing by n − 1`,
      tex: `s_${j + 1}^2 = \\frac{1}{n-1}\\sum_i \\left(x_${j + 1}^{(i)} - \\bar x_${j + 1}\\right)^2 = \\frac{1}{${n - 1}}\\left(${Xc.map((r) => `${term(r[j])}^2`).join(' + ')}\\right) = \\frac{${show(sumOf(sq))}}{${n - 1}} = ${show(sumOf(sq).div(Rational.of(n - 1)))}`,
    });
  }
  const prods = Xc.map((r) => r[0].mul(r[1]));
  steps.push({
    description: 'Sample covariance of x₁ and x₂',
    tex: `\\operatorname{Cov}(x_1, x_2) = \\frac{1}{n-1}\\sum_i \\left(x_1^{(i)} - \\bar x_1\\right)\\left(x_2^{(i)} - \\bar x_2\\right) = \\frac{1}{${n - 1}}\\left(${Xc.map((r) => `${term(r[0])}${term(r[1])}`).join(' + ')}\\right) = \\frac{${show(sumOf(prods))}}{${n - 1}} = ${show(sumOf(prods).div(Rational.of(n - 1)))}`,
  });
  return steps;
}

export interface CovarianceView {
  /** L7-C2: each point's product (x₁ − x̄₁)(x₂ − x̄₂), and its sign. */
  products: { point: Point; product: number; label: string }[];
  /** L7-C3: XᵀX and S = XᵀX/(n − 1), exact. */
  XtX: Matrix;
  S: Matrix;
  /** The same entries written as sums. */
  sumsTex: string;
  /** L7-C4: eigenvalues and eigenvectors of S beside the SVD of X/√(n − 1). */
  eigen: { lambda: number; vector: [number, number]; lambdaTex: string }[];
  sigmaOverRoot: number[];
  check: Check;
  /** L7-C5: the covariance ellipse, axes along v₁, v₂ with lengths ∝ √λ. */
  ellipse: { center: Point; axes: { dir: Point; length: number }[] };
}

/** §11.5 (L7-C2–L7-C5) */
export function covarianceView(X: Matrix, display: NumberDisplay): CovarianceView {
  const n = X.length;
  const Xc = center(X);
  const XtX = matMul(transpose(Xc), Xc);
  const S = covarianceMatrix(X);
  const show = (x: Rational) => (display === 'decimal' && !x.isInteger() ? short(x.toNumber()) : x.toTex());
  const products = Xc.map((r, i) => {
    const product = r[0].mul(r[1]).toNumber();
    return { point: [r[0].toNumber(), r[1].toNumber()] as Point, product, label: `Person ${i + 1}: (${r[0].toString()})(${r[1].toString()}) = ${short(product)}` };
  });
  const p = pca(X);
  // Eigenvalues of S on their own (Lesson 5's eigen panel), to compare with σᵢ²/(n − 1).
  const lambdas = eigenvalues(S).flatMap((l) => Array.from({ length: l.multiplicity }, () => (l.kind === 'complex' ? l.value.re : typeof l.value === 'number' ? l.value : l.value.toNumber())));
  const [a, b, d] = [S[0][0], S[0][1], S[1][1]];
  const disc = a.sub(d).mul(a.sub(d)).add(Rational.of(4).mul(b).mul(b)).div(Rational.of(4));
  const half = a.add(d).div(Rational.of(2));
  const root = surd(disc).tex;
  const exactTex = (sign: '+' | '-') => (disc.isZero() ? half.toTex() : `${half.toTex()} ${sign} ${root}`);
  const sigmaOverRoot = p.sigma.map((s) => s / Math.sqrt(n - 1));
  const diff = Math.max(...lambdas.map((l, i) => Math.abs(l - sigmaOverRoot[i] ** 2)));
  return {
    products,
    XtX,
    S,
    sumsTex: `S = \\frac{1}{n-1}\\begin{bmatrix} \\sum \\left(x_1^{(i)}\\right)^2 & \\sum x_1^{(i)}x_2^{(i)} \\\\ \\sum x_1^{(i)}x_2^{(i)} & \\sum \\left(x_2^{(i)}\\right)^2 \\end{bmatrix} = \\frac{1}{${n - 1}}${matrixToTex(XtX.map((r) => r.map(show)), false, {})}`,
    eigen: lambdas.map((lambda, i) => ({
      lambda,
      vector: [p.V[0][i], p.V[1][i]] as [number, number],
      lambdaTex: `${exactTex(i === 0 ? '+' : '-')} \\approx ${short(lambda, 6)}`,
    })),
    sigmaOverRoot,
    check: { name: 'λ = σ²/(n − 1)', holds: diff <= 1e-9 * Math.max(1, ...lambdas), tex: '\\lambda_i = \\frac{\\sigma_i^2}{n-1}', residual: diff },
    ellipse: {
      center: [0, 0],
      axes: lambdas.map((l, i) => ({ dir: [p.V[0][i], p.V[1][i]] as Point, length: 2 * Math.sqrt(Math.max(0, l)) })),
    },
  };
}

// §11.6 Variance explained and standardizing -----------------------------------------

export interface VarianceView {
  pca: PcaResult;
  /** L7-V1: λᵢ/Σλ as bars, with a running total. */
  bars: Bar[];
  running: number[];
  /** L7-V2: the same percentages from σᵢ²/Σσ². */
  fromSingularValues: number[];
  check: Check;
  /** L7-V3: kept components (signal) and the rest (noise). */
  kept: number;
  keptText: string;
  /** L7-V4: S, or the correlation matrix when standardized. */
  matrixTex: string;
  matrixName: string;
}

/** §11.6 (L7-V1–L7-V4) */
export function varianceView(X: Matrix, options: { standardize: boolean; sign: ComponentSign; keep: number }): VarianceView {
  const p = pca(X, { standardize: options.standardize, sign: options.sign });
  const d = p.explained.length;
  const kept = Math.max(1, Math.min(options.keep, d));
  let total = 0;
  const running = p.explained.map((e) => (total += e));
  const squares = p.sigma.map((s) => s * s);
  const sumSq = squares.reduce((a, b) => a + b, 0);
  const fromSingularValues = squares.map((s) => s / sumSq);
  const diff = Math.max(...fromSingularValues.map((f, i) => Math.abs(f - p.explained[i])));
  const keptShare = running[kept - 1];
  return {
    pca: p,
    bars: p.explained.map((e, i) => ({ label: `v${i + 1}`, value: e, color: i < kept ? eigenColor(i) : GREY, valueLabel: pct(e) })),
    running,
    fromSingularValues,
    check: { name: 'same shares', holds: diff <= 1e-12, tex: '\\frac{\\lambda_i}{\\sum \\lambda} = \\frac{\\sigma_i^2}{\\sum \\sigma^2}', residual: diff },
    kept,
    keptText: `Keeping ${kept} of ${d} component${d === 1 ? '' : 's'} keeps ${pct(keptShare)} of the variance (signal); the rest, ${pct(1 - keptShare)}, is treated as noise.`,
    matrixTex: options.standardize ? `R = ${floatTex(correlationMatrix(X))}` : `S = ${matrixToTex(covarianceMatrix(X).map((r) => r.map((x) => x.toTex())), false, {})}`,
    matrixName: options.standardize ? 'Correlation matrix: S of the standardized data' : 'Covariance matrix S = XᵀX/(n − 1)',
  };
}

/** L7-V5: numpy.linalg.svd on the centered data and sklearn's PCA, with comments on scaling and signs. */
export function pythonExport(X: Matrix, standardize: boolean): string {
  const rows = X.map((r) => `[${r.map((x) => (x.isInteger() ? x.toString() : String(x.toNumber()))).join(', ')}]`);
  return [
    'import numpy as np',
    'from sklearn.decomposition import PCA',
    '',
    `X = np.array([${rows.join(',\n              ')}], dtype=float)`,
    'Xc = X - X.mean(axis=0)  # center each column',
    ...(standardize ? ['Xc = Xc / X.std(axis=0, ddof=1)  # standardize: divide by s (n - 1 in s)'] : []),
    '',
    '# SVD of the centered data: the rows of Vt are the components',
    'U, sigma, Vt = np.linalg.svd(Xc, full_matrices=False)',
    'n = X.shape[0]',
    'print(sigma**2 / (n - 1))           # eigenvalues of S = Xc.T @ Xc / (n - 1)',
    'print(sigma**2 / np.sum(sigma**2))  # variance explained',
    '',
    '# The same with scikit-learn (it centers for you)',
    `pca = PCA().fit(${standardize ? 'Xc' : 'X'})`,
    'print(pca.explained_variance_)        # the λ\'s: sklearn divides by n - 1 too',
    'print(pca.explained_variance_ratio_)',
    'print(pca.components_)                # rows are v1, v2, ...; signs may be flipped',
    '',
    '# Signs: any component can come back as -v. The notes pick the sign that',
    '# makes the largest entry positive, so z1 = Xc @ v1 moves with x1 and x2.',
  ].join('\n');
}

/** L7-V6 */
export const NOTES_CORRECTION_SQRT =
  'The notes compare √56.9258 with 16.87; the relation is √λ₁ = σ₁/√(n − 1), that is √56.9258 = 16.87/√5. As printed, the sentence has an extra √5 on the left.';

// §11.7 Best line: regression vs PCA -------------------------------------------------

export interface FittedLine {
  label: string;
  color: string;
  slope: number;
  intercept: number;
  /** "5/4", or "(2 + √29)/5 ≈ 1.477" for the PCA line when the data is the notes'. */
  slopeText: string;
  /** Endpoints across the frame. */
  segment: [Point, Point];
  /** Residual segments from each point to the line, measured the line's own way. */
  residuals: [Point, Point][];
  /** L7-L2: sum of squared distances measured vertically and perpendicularly. */
  verticalSse: number;
  perpendicularSse: number;
}

export interface BestLineView {
  /** L7-L1, L7-L4: regression of x₂ on x₁ (vertical), the PCA line (perpendicular), and optionally x₁ on x₂ (horizontal). */
  regression: FittedLine;
  pca: FittedLine;
  reverse: FittedLine | null;
  /** L7-L4 (beyond the notes): the PCA slope lies between the two regression slopes. */
  between: Check;
  /** L7-L5 */
  caption: string;
}

/** §11.7 */
export function bestLineView(X: Matrix, showReverse: boolean): BestLineView {
  const n = X.length;
  const means = columnMeans(X);
  const Xc = center(X);
  const Sxx = Xc.reduce((a, r) => a.add(r[0].mul(r[0])), Rational.ZERO);
  const Syy = Xc.reduce((a, r) => a.add(r[1].mul(r[1])), Rational.ZERO);
  const Sxy = Xc.reduce((a, r) => a.add(r[0].mul(r[1])), Rational.ZERO);
  if (Sxx.isZero() || n < 2) throw new RangeError('The points need some spread in x₁ for a regression line');
  const mx = means[0].toNumber();
  const my = means[1].toNumber();
  const pts: Point[] = X.map((r) => [r[0].toNumber(), r[1].toNumber()]);
  const xs = pts.map((p) => p[0]);
  const span = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const x0 = Math.min(...xs, 0) - 0.15 * span;
  const x1 = Math.max(...xs, 0) + 0.15 * span;

  // PCA slope (Syy − Sxx + √((Sxx − Syy)² + 4Sxy²)) / (2Sxy), written as (p + c√r)/s when possible.
  const disc = Sxx.sub(Syy).mul(Sxx.sub(Syy)).add(Rational.of(4).mul(Sxy).mul(Sxy));
  const pcaSlope = Sxy.isZero() ? (Syy.cmp(Sxx) > 0 ? Infinity : 0) : (Syy.sub(Sxx).toNumber() + Math.sqrt(disc.toNumber())) / (2 * Sxy.toNumber());
  let pcaText = short(pcaSlope);
  if (!Sxy.isZero()) {
    const { coefficient, radicand } = surdParts(disc);
    const pNum = Syy.sub(Sxx);
    const sDen = Rational.of(2).mul(Sxy);
    const lcm = [pNum, coefficient, sDen].reduce((l, x) => (l * x.den) / bigGcd(l, x.den), 1n);
    let P = (pNum.num * lcm) / pNum.den;
    let C = (coefficient.num * lcm) / coefficient.den;
    let D = (sDen.num * lcm) / sDen.den;
    const g = bigGcd(bigGcd(P, C), D);
    [P, C, D] = [P / g, C / g, D / g];
    if (D < 0n) [P, C, D] = [-P, -C, -D];
    if (radicand === 1n) pcaText = Rational.of(P + C, D).toString();
    else {
      const rootText = `${C === 1n ? '' : C}√${radicand}`;
      const top = P === 0n ? rootText : `${P} + ${rootText}`;
      pcaText = `${D === 1n ? top : `(${top})/${D}`} ≈ ${short(pcaSlope)}`;
    }
  }
  const fitted = (label: string, color: string, slope: number, slopeText: string, residual: (p: Point) => Point): FittedLine => {
    const intercept = my - slope * mx;
    const vertical = pts.reduce((a, [x, y]) => a + (y - (intercept + slope * x)) ** 2, 0);
    return {
      label,
      color,
      slope,
      intercept,
      slopeText,
      segment: [[x0, intercept + slope * x0], [x1, intercept + slope * x1]],
      residuals: pts.map((p) => [p, residual(p)]),
      verticalSse: vertical,
      perpendicularSse: vertical / (1 + slope * slope),
    };
  };
  const regSlope = Sxy.div(Sxx);
  const regression = fitted('Regression of x₂ on x₁', LINE_COLORS.regression, regSlope.toNumber(), regSlope.toString(), ([x]) => [x, my + regSlope.toNumber() * (x - mx)]);
  const pcaLine = fitted('PCA line along v₁', LINE_COLORS.pca, pcaSlope, pcaText, ([x, y]) => {
    // The foot of the perpendicular from the point to the line through the mean along (1, slope).
    const len = Math.hypot(1, pcaSlope);
    const [dx, dy] = [1 / len, pcaSlope / len];
    const t = (x - mx) * dx + (y - my) * dy;
    return [mx + t * dx, my + t * dy];
  });
  let reverse: FittedLine | null = null;
  if (showReverse && !Sxy.isZero()) {
    const revSlope = Syy.div(Sxy);
    reverse = fitted('Regression of x₁ on x₂', LINE_COLORS.reverse, revSlope.toNumber(), revSlope.toString(), ([, y]) => [mx + (y - my) / revSlope.toNumber(), y]);
  }
  const lo = Math.min(regression.slope, reverse?.slope ?? regression.slope);
  const hi = Math.max(regression.slope, reverse?.slope ?? regression.slope);
  return {
    regression,
    pca: pcaLine,
    reverse,
    between: {
      name: 'between',
      holds: !reverse || (pcaSlope >= lo - 1e-12 && pcaSlope <= hi + 1e-12),
      tex: '\\text{slope}_{x_2 \\sim x_1} \\le \\text{slope}_{\\mathrm{PCA}} \\le \\text{slope}_{x_1 \\sim x_2}',
    },
    caption:
      'In regression, the inputs and the output sit on different sides of the equation y = θ₀ + θ₁x, so only vertical errors count. In PCA, x₁ and x₂ are both columns of the same matrix X and are treated alike, so the distance to the line is measured perpendicularly.',
  };
}

// §11.8 Face recognition -----------------------------------------------------------

/** L7-F1: the frames of unrolling an a × b image into a row: after f frames, the first f rows are laid end to end. */
export function unrollFrames(image: FloatMatrix): { row: FloatVector; rowsDone: number }[] {
  return Array.from({ length: image.length + 1 }, (_, k) => ({ row: image.slice(0, k).flat(), rowsDone: k }));
}

export interface FaceMatch {
  index: number;
  person: number;
  distance: number;
}

export interface FaceView {
  /** L7-F3 */
  mean: FloatMatrix;
  /** L7-F4: the first eigenfaces as images (signed). */
  eigenfaces: FloatMatrix[];
  /** L7-F5: variance explained by the first m components. */
  explained: number;
  m: number;
  /** A chosen face and its reconstruction μ + wV_pcaᵀ. */
  original: FloatMatrix;
  reconstruction: FloatMatrix;
  /** L7-F6: the query image, the closest database faces, and whether the best match is the right person. */
  query: FloatMatrix;
  queryPerson: number | null;
  matches: FaceMatch[];
  correct: boolean | null;
  /** L7-F7: (w₁, w₂) per face, by person, and the query's. */
  scatter: { person: number; point: Point }[];
  queryPoint: Point;
  frame: ChartFrame;
  /** Database size: faces held out as queries are not in it. */
  databaseSize: number;
}

/**
 * §11.8. The last variation of every person is held out of the database (for
 * "held-out" queries); the eigenfaces come from the rest.
 */
export function faceView(set: FaceSet, m: number, q: FaceQuery, faceIndex: number, upload: FloatMatrix | null): FaceView {
  const last = Math.max(...set.variation);
  const db = set.images.map((_, i) => i).filter((i) => set.variation[i] !== last);
  const rows = flattenImages(db.map((i) => set.images[i]));
  const mm = Math.max(1, Math.min(m, rows.length - 1));
  const e = eigenfaces(rows, mm);
  const size = set.size;
  const totalVar = e.sigma.reduce((a, s) => a + s * s, 0);
  const explained = totalVar === 0 ? 1 : e.sigma.slice(0, mm).reduce((a, s) => a + s * s, 0) / totalVar;
  const fi = Math.max(0, Math.min(faceIndex, rows.length - 1));
  const original = rows[fi];
  const reconstruction = reconstructFace(projectFace(original, e), e);

  let query: FloatVector;
  let queryPerson: number | null = null;
  if (q.kind === 'heldOut') {
    const p = Math.max(0, Math.min(q.person, set.people - 1));
    const idx = set.images.findIndex((_, i) => set.person[i] === p && set.variation[i] === last);
    query = set.images[idx].flat();
    queryPerson = p;
  } else if (q.kind === 'noisy') {
    const k = Math.max(0, Math.min(q.index, rows.length - 1));
    const rng = mulberry32(k + 1);
    query = rows[k].map((x) => Math.min(255, Math.max(0, x + (rng() * 2 - 1) * q.noise)));
    queryPerson = set.person[db[k]];
  } else {
    if (!upload) throw new Error('Upload an image to use as the query');
    const sized = upload.length === size && upload[0]?.length === size ? upload : resizeTo(upload, size, size);
    query = sized.flat();
  }
  const w = projectFace(query, e);
  const matches = nearestFaces(e.weights, w, 5).map(({ index, distance }) => ({ index, person: set.person[db[index]], distance }));
  const scatterPoints = e.weights.map((r) => [r[0], r[1] ?? 0] as Point);
  const queryPoint: Point = [w[0], w[1] ?? 0];
  return {
    mean: unflatten(e.mean, size, size),
    eigenfaces: Array.from({ length: Math.min(8, mm) }, (_, j) => unflatten(e.components.map((r) => r[j]), size, size)),
    explained,
    m: mm,
    original: unflatten(original, size, size),
    reconstruction: unflatten(reconstruction, size, size),
    query: unflatten(query, size, size),
    queryPerson,
    matches,
    correct: queryPerson === null ? null : matches[0]?.person === queryPerson,
    scatter: scatterPoints.map((point, i) => ({ person: set.person[db[i]], point })),
    queryPoint,
    frame: scatterView([...scatterPoints, queryPoint], ['w₁', 'w₂']).frame,
    databaseSize: rows.length,
  };
}

export interface RecognitionRate {
  /** Share of held-out faces matched to the right person, for each m. */
  points: [number, number][];
  frame: ChartFrame;
}

/** L7-F5/F6 acceptance: recognition rate of the held-out faces against m. */
export function recognitionRate(set: FaceSet, ms: number[]): RecognitionRate {
  const last = Math.max(...set.variation);
  const db = set.images.map((_, i) => i).filter((i) => set.variation[i] !== last);
  const queries = set.images.map((_, i) => i).filter((i) => set.variation[i] === last);
  const rows = flattenImages(db.map((i) => set.images[i]));
  const cap = rows.length - 1;
  const used = [...new Set(ms.map((m) => Math.max(1, Math.min(m, cap))))].sort((a, b) => a - b);
  // One SVD for the largest m; smaller m use the leading columns.
  const e = eigenfaces(rows, used[used.length - 1]);
  const projected = queries.map((i) => projectFace(set.images[i].flat(), e));
  const points: [number, number][] = used.map((m) => {
    const W = e.weights.map((r) => r.slice(0, m));
    const right = queries.filter((qi, k) => {
      const [best] = nearestFaces(W, projected[k].slice(0, m), 1);
      return set.person[db[best.index]] === set.person[qi];
    }).length;
    return [m, right / queries.length];
  });
  return {
    points,
    frame: { x: { min: 0, max: Math.max(2, used[used.length - 1]), title: 'components m' }, y: { min: 0, max: 1, title: 'share matched' }, size: 8, equalAspect: false },
  };
}
