/**
 * View-models for the Lesson 4 views: Householder reflectors, QR, least
 * squares via QR, conditioning, and Gram–Schmidt. Results are exact when every
 * norm is rational (F-M25) and floating point otherwise; every model reports
 * which (F-D10). Kept pure so they can be unit tested.
 */
import type { ChartFrame } from '../../components/canvas/charts';
import { toVec3, type Vec3 } from '../../components/canvas/types';
import { anyMatrixEntries, anyVectorEntries, formatFloat } from '../../components/display/AnyMatrixTex';
import { matrixToTex } from '../../components/display/MatrixTex';
import { exactLeastSquaresFromFloats, relativeError } from '../../core/accuracy';
import { norm } from '../../core/exactNorm';
import {
  asFloat,
  asFloatVector,
  fDot,
  fFrobenius,
  fIdentity,
  fMatMul,
  fMatVec,
  fNorm,
  fTranspose,
  isExact,
  MACHINE_EPSILON,
  type AnyMatrix,
  type AnyVector,
  type Precision,
} from '../../core/float';
import { gramSchmidt, type GsResult, type GsVariant } from '../../core/gramSchmidt';
import { householder, householderFloat, type HouseholderSign, type Reflector } from '../../core/householder';
import { leastSquares } from '../../core/leastSquares';
import { getColumn, identity, matrix, matrixEquals, shape, toFloatMatrix, toFloatVector, transpose, vector, vectorEquals, type Matrix, type Vector } from '../../core/matrix';
import { dot, matMul, matVec } from '../../core/products';
import { leastSquaresNormalFloat, leastSquaresQrFloat, qrHouseholder, type QrResult } from '../../core/qr';
import { Rational } from '../../core/rational';
import { cond } from '../../core/svd';
import { backSub, type SubstitutionResult } from '../../core/substitution';
import { nullSpaceBasis } from '../../core/subspaces';
import type { Cell } from '../../core/trace';
import { LOG_DELTA_RANGE, nearCollinearHouses } from '../../presets/lesson4';

// Helpers -------------------------------------------------------------------------

const texOf = (M: AnyMatrix) => matrixToTex(anyMatrixEntries(M, 6), false, {});
const tupleOf = (v: AnyVector) => `(${anyVectorEntries(v, 6).join(', ')})`;
const sameExact = (a: Vector, b: Vector) => a.length === b.length && a.every((x, i) => x.equals(b[i]));

/** Exact equality when both sides are exact; otherwise the Frobenius size of the difference against a tolerance. */
function compare(name: string, tex: string, left: AnyMatrix, right: AnyMatrix): Check {
  if (isExact(left) && isExact(right)) return { name, holds: matrixEquals(left, right), tex };
  const L = asFloat(left);
  const R = asFloat(right);
  const residual = fFrobenius(L.map((r, i) => r.map((x, j) => x - R[i][j])));
  return { name, holds: residual <= 1e-10 * Math.max(1, fFrobenius(R)), tex, residual };
}

const transposeAny = (M: AnyMatrix): AnyMatrix => (isExact(M) ? transpose(M) : fTranspose(M));
const mulAny = (A: AnyMatrix, B: AnyMatrix): AnyMatrix => (isExact(A) && isExact(B) ? matMul(A, B) : fMatMul(asFloat(A), asFloat(B)));
const identityLike = (M: AnyMatrix, n: number): AnyMatrix => (isExact(M) ? identity(n) : fIdentity(n));
const columnOf = (M: AnyMatrix, j: number): AnyVector => (isExact(M) ? getColumn(M, j) : M.map((r) => r[j]));

/** The reflector sending x to w: exact when ‖x‖ = ‖w‖ exactly; in floats when they agree only to rounding (a dragged w). */
function reflectorFor(x: Vector, w: Vector): Reflector | string {
  if (dot(x, x).equals(dot(w, w))) return householder(x, w);
  const nx = Math.sqrt(dot(x, x).toNumber());
  const nw = Math.sqrt(dot(w, w).toNumber());
  if (Math.abs(nx - nw) <= 1e-9 * Math.max(1, nx)) {
    return householderFloat(toFloatVector(x), toFloatVector(w), 'w was dragged or snapped, so its entries are rounded');
  }
  return `‖x‖ ≈ ${formatFloat(nx, 4)} but ‖w‖ ≈ ${formatFloat(nw, 4)}: a reflection keeps lengths, so no H can move x to w.`;
}

/** The §8.1 scene for any reflector (also the QR stepper's, L4-QR3). */
function sceneOf(r: Reflector, y: AnyVector): ReflectorScene {
  const x = asFloatVector(r.x);
  const v = asFloatVector(r.v);
  const H = asFloat(r.H);
  const vv = fDot(v, v);
  const Px = vv === 0 ? v.map(() => 0) : v.map((vi) => (fDot(x, v) / vv) * vi);
  const yf = asFloatVector(y);
  return {
    dim: x.length as 2 | 3,
    precision: r.precision,
    x: toVec3(x),
    w: toVec3(asFloatVector(r.w)),
    v: toVec3(v),
    Px: toVec3(Px),
    Hx: toVec3(fMatVec(H, x)),
    mirrorNormal: vv === 0 ? [1, 0, 0] : toVec3(v),
    y: toVec3(yf),
    Hy: toVec3(fMatVec(H, yf)),
  };
}

/** The notes' §4.1 example, whose final matrix is P rather than H (L4-H7). */
const NOTES_X = vector([2, 2, 1]);
const NOTES_W = vector([3, 0, 0]);

/** "A = QR" style check. */
export interface Check {
  name: string;
  holds: boolean;
  tex: string;
  /** In floating point: the size of the difference (e.g. ‖QᵀQ − I‖). */
  residual?: number;
  /** Why it holds, in the notes' words (§4.2). */
  reason?: string;
}

// §8.1 Householder reflector ------------------------------------------------------

export interface ReflectorScene {
  dim: 2 | 3;
  precision: Precision;
  x: Vec3;
  w: Vec3;
  /** v = x − w (blue in the notes' figure). */
  v: Vec3;
  /** Px, the projection of x onto the span of v (red in the notes' figure). */
  Px: Vec3;
  /** Hx = x − 2Px = w (L4-H3). */
  Hx: Vec3;
  /** The mirror U, perpendicular to v. */
  mirrorNormal: Vec3;
  /** L4-H5: a second vector and its reflection. */
  y: Vec3;
  Hy: Vec3;
}

export interface ReflectorView {
  /** null when ‖x‖ ≠ ‖w‖ (L4-H6). */
  scene: ReflectorScene | null;
  reflector: Reflector | null;
  /** L4-H4: v, ‖v‖², P = vvᵀ/‖v‖², H = I − 2P with the current numbers. */
  formula: { label: string; tex: string }[];
  /** L4-H3: v = 2Px and Hx = w, as TeX. */
  identities: string[];
  /** L4-H6: why no reflection moves x to w. */
  lengthMismatch: string | null;
  /** L4-H7: the notes' §4.1 matrix is P, not H. Shown for the notes' x and w; null otherwise. */
  notesCorrection: string | null;
}

/** L4-H1–H7. x, w, y in ℝ² or ℝ³. */
export function reflectorView(x: Vector, w: Vector, y: Vector): ReflectorView {
  const dim = x.length;
  if (dim !== 2 && dim !== 3) throw new RangeError(`The reflector is drawn in ℝ² or ℝ³; x has ${dim} entries`);
  const r = reflectorFor(x, w);
  if (typeof r === 'string') return { scene: null, reflector: null, formula: [], identities: [], lengthMismatch: r, notesCorrection: null };
  const vv = r.precision.kind === 'exact' ? dot(r.v as Vector, r.v as Vector).toTex() : formatFloat(fDot(r.v as number[], r.v as number[]));
  const scene = sceneOf(r, y);
  return {
    scene,
    reflector: r,
    formula: [
      { label: 'v = x − w', tex: `v = x - w = ${tupleOf(r.x)} - ${tupleOf(r.w)} = ${tupleOf(r.v)}` },
      { label: '‖v‖²', tex: `\\|v\\|^2 = ${vv}` },
      { label: 'P = vvᵀ/‖v‖²', tex: `P = \\hat v\\hat v^T = \\frac{vv^T}{\\|v\\|^2} = ${texOf(r.P)}` },
      { label: 'H = I − 2P', tex: `H = I - 2P = ${texOf(r.H)}` },
    ],
    identities: [`v = 2Px = 2\\cdot${tupleOf(scene.Px.slice(0, dim))}`, `Hx = x - 2Px = ${tupleOf(scene.Hx.slice(0, dim))} = w`],
    lengthMismatch: null,
    notesCorrection:
      sameExact(x, NOTES_X) && sameExact(w, NOTES_W)
        ? "The notes' §4.1 example ends with (1/6)[[1,−2,−1],[−2,4,2],[−1,2,1]], but that matrix is P = vvᵀ/‖v‖², not H. H = I − 2P = (1/3)[[2,2,1],[2,−1,−2],[1,−2,2]], the same Ĥ₂ the notes use in §4.3."
        : null,
  };
}

/** L4-H1: w = ‖x‖e₁ (exact when ‖x‖ is rational). */
export function wOnAxis(x: Vector): AnyVector {
  const length = norm(x);
  return length.kind === 'exact' ? x.map((_, i) => (i === 0 ? length.value : Rational.ZERO)) : x.map((_, i) => (i === 0 ? length.value : 0));
}

/** L4-H1: a dragged point, pulled onto the sphere (circle) of radius ‖x‖. */
export function lockToLength(point: number[], length: number): number[] {
  const len = fNorm(point);
  return len === 0 ? point.map((_, i) => (i === 0 ? length : 0)) : point.map((p) => (p * length) / len);
}

// §8.2 Reflector properties -------------------------------------------------------

export interface PropertiesView {
  precision: Precision;
  /**
   * L4-HP1: Hᵀ = H, H² = I, HᵀH = I, each with the notes' reason: I and
   * P = v̂v̂ᵀ are symmetric; the inverse of a reflection is itself;
   * H⁻¹ = H = Hᵀ, and a square Q is orthogonal exactly when QᵀQ = I.
   */
  checks: Check[];
  /** L4-HP2: reflecting twice returns y; lengths and the dot product of two vectors are kept. */
  demos: { label: string; holds: boolean; tex: string }[];
  /** L4-HP3: H₁H₂ from the QR example is orthogonal. */
  productCheck: Check;
  /** L4-HP4 (beyond the notes): vectors in U keep their place (eigenvalue 1), v flips (−1). */
  eigenPreview: { mirrorVectors: AnyVector[]; flipped: AnyVector; note: string };
}

export function propertiesView(x: Vector, w: Vector, y: Vector, qrA: Matrix): PropertiesView {
  const r = reflectorFor(x, w);
  if (typeof r === 'string') throw new Error(r);
  const H = r.H;
  const n = x.length;
  const I = identityLike(H, n);
  const Ht = transposeAny(H);
  const checks: Check[] = [
    {
      ...compare('symmetric', 'H^T = H', Ht, H),
      reason: 'H = I − 2P: I is symmetric, and P = v̂v̂ᵀ is symmetric because (v̂v̂ᵀ)ᵀ = (v̂ᵀ)ᵀv̂ᵀ = v̂v̂ᵀ.',
    },
    { ...compare('self-inverse', 'H^2 = I', mulAny(H, H), I), reason: 'H is self-inverse, H⁻¹ = H: the inverse of a reflection is itself.' },
    {
      ...compare('orthogonal', 'H^TH = I', mulAny(Ht, H), I),
      reason: 'H⁻¹ = H = Hᵀ, so HᵀH = I. A square matrix Q is orthogonal exactly when QᵀQ = I (MATH2331).',
    },
  ];
  // L4-HP2, with the x and y on screen.
  const Hf = asFloat(H);
  const xf = toFloatVector(x);
  const yf = toFloatVector(y);
  const Hy = fMatVec(Hf, yf);
  const HHy = fMatVec(Hf, Hy);
  const Hx = fMatVec(Hf, xf);
  const close = (a: number, b: number) => Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(b));
  const demos = [
    { label: 'Reflecting twice returns y', holds: HHy.every((v, i) => close(v, yf[i])), tex: `H(Hy) = ${tupleOf(HHy)} = y` },
    { label: 'Lengths are kept', holds: close(fNorm(Hy), fNorm(yf)), tex: `\\|Hy\\| = ${formatFloat(fNorm(Hy), 6)} = \\|y\\|` },
    { label: 'Dot products are kept', holds: close(fDot(Hx, Hy), fDot(xf, yf)), tex: `(Hx)\\cdot(Hy) = ${formatFloat(fDot(Hx, Hy), 6)} = x\\cdot y` },
  ];
  // L4-HP3: H₁H₂ from the §4.3 example.
  const qr = qrHouseholder(qrA, { sign: 'notes' });
  const product = qr.steps.length >= 2 ? mulAny(qr.steps[0].H, qr.steps[1].H) : qr.Q;
  const productCheck = compare('product', '(H_1H_2)^T(H_1H_2) = I', mulAny(transposeAny(product), product), identityLike(product, product.length));
  // L4-HP4: the mirror U is the nullspace of vᵀ.
  const v = x.map((xi, i) => xi.sub(w[i]));
  const mirrorVectors: AnyVector[] = v.every((e) => e.isZero()) ? identity(n) : nullSpaceBasis(matrix([v]));
  return {
    precision: r.precision,
    checks,
    demos,
    productCheck,
    eigenPreview: { mirrorVectors, flipped: v, note: 'Vectors in the mirror U stay put (Hu = u, eigenvalue 1), and v flips (Hv = −v, eigenvalue −1).' },
  };
}

// §8.3 Householder QR ---------------------------------------------------------------

export interface QrStepView {
  description: string;
  tex: string;
  k: number;
  /** x = column k from row k down, w, v and Ĥₖ (L4-QR1). */
  x: AnyVector;
  w: AnyVector;
  v: AnyVector;
  Hhat: AnyMatrix;
  /** Hₖ = [[I, 0], [0, Ĥₖ]]. */
  H: AnyMatrix;
  current: AnyMatrix;
  Qsofar: AnyMatrix;
  zeroed: Cell[];
  /** L4-QR2: (Q so far)(current) = A. */
  check: Check;
  /** L4-QR3: the reflection drawn with the §8.1 scene when the active column has 2 or 3 entries. */
  scene: ReflectorScene | null;
}

export interface QrView {
  result: QrResult;
  /** §4.3: the shape QR will have, A = (× ⋯)(∗ ∗ / 0 ∗ / 0 0 …), shown before the first step. */
  shapeTex: string;
  steps: QrStepView[];
  /**
   * §4.3 step 5: (Hₙ ⋯ H₁)A = R, so A = (Hₙ ⋯ H₁)⁻¹R = H₁⁻¹ ⋯ Hₙ⁻¹R = H₁ ⋯ HₙR = QR,
   * because each H is its own inverse; Q is orthogonal as a product of orthogonal matrices.
   */
  qDerivation: { tex: string; reason: string }[];
  /** L4-QR7: A = QR and QᵀQ = I. */
  finalChecks: Check[];
  /** L4-QR6: R has a zero diagonal entry: the columns are dependent. null otherwise. */
  dependentNote: string | null;
  /** L4-QR5 (beyond the notes): why libraries pick w = −sign(x₁)‖x‖e₁. */
  signNote: string;
}

/** Throws a RangeError when A has more columns than rows. */
export function qrView(A: Matrix, sign: HouseholderSign): QrView {
  const result = qrHouseholder(A, { sign });
  const { rows: m, cols: n } = shape(A);
  const k = result.steps.length;
  // A vector to reflect alongside x in the step's scene: the last axis of the active part.
  const yAxis = (len: number): Vector => Array.from({ length: len }, (_, i) => (i === len - 1 ? Rational.ONE : Rational.ZERO));
  const steps = result.steps.map((st) => {
    const len = st.reflector.x.length;
    return {
      description: st.description,
      tex: st.tex,
      k: st.k,
      x: st.reflector.x,
      w: st.reflector.w,
      v: st.reflector.v,
      Hhat: st.reflector.H,
      H: st.H,
      current: st.current,
      Qsofar: st.Qsofar,
      zeroed: st.zeroed,
      check: compare('Q so far', '(Q_{\\text{so far}})(\\text{current}) = A', mulAny(st.Qsofar, st.current), A),
      scene: len === 2 || len === 3 ? sceneOf(st.reflector, yAxis(len)) : null,
    };
  });
  const names = (power = '') => Array.from({ length: k }, (_, i) => `H_${i + 1}${power}`).join('');
  const reversed = Array.from({ length: k }, (_, i) => `H_${k - i}`).join('');
  const qDerivation =
    k === 0
      ? []
      : [
          { tex: `(${reversed})A = R`, reason: 'The reflectors clear the columns one at a time.' },
          { tex: `A = (${reversed})^{-1}R = ${names('^{-1}')}R`, reason: 'The inverse of a product reverses the order.' },
          { tex: `A = ${names()}R = QR`, reason: 'Each H is its own inverse: H⁻¹ = H.' },
          { tex: `Q = ${names()}`, reason: 'Q is orthogonal: the product of orthogonal matrices is orthogonal (MATH2331).' },
        ];
  const Qt = transposeAny(result.Q);
  const pattern = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => (i <= j ? '*' : '0')));
  const shapeTex = `${texOf(A)} = ${matrixToTex(Array.from({ length: m }, () => Array.from({ length: m }, () => '\\times')), false, {})}${matrixToTex(pattern, false, {})}`;
  return {
    result,
    shapeTex,
    steps,
    qDerivation,
    finalChecks: [compare('A = QR', 'A = QR', mulAny(result.Q, result.R), A), compare('QᵀQ = I', 'Q^TQ = I', mulAny(Qt, result.Q), identityLike(result.Q, m))],
    dependentNote: result.dependentColumns.length
      ? `R has a zero on its diagonal in column ${result.dependentColumns.map((c) => c + 1).join(', ')}: the columns of A are dependent, so R is not invertible and Rx* = Qᵀb has no unique solution.`
      : null,
    signNote:
      "Beyond the notes: libraries use w = −sign(x₁)‖x‖e₁. With the notes' +‖x‖, the first entry of v = x − w is x₁ − ‖x‖, a cancellation that loses digits when x already points almost along +e₁; with the − sign it is x₁ + sign(x₁)‖x‖, a sum.",
  };
}

// §8.4 Reduced QR -------------------------------------------------------------------

export interface ReducedQrView {
  precision: Precision;
  Q: AnyMatrix;
  R: AnyMatrix;
  Qhat: AnyMatrix;
  Rhat: AnyMatrix;
  /** L4-RQ1: the dropped columns of Q and rows of R, and why they can go. */
  dropped: { columns: number[]; rows: number[]; reason: string };
  /** L4-RQ2: A = Σ qₖrₖ*, one layer per column of Q (Lesson 3 heatmaps). */
  layers: { k: number; matrix: number[][]; zero: boolean }[];
  maxAbs: number;
  /** L4-RQ3: orthonormal bases from Q, with Aᵀq = 0 checked for the dropped columns. */
  bases: { columnSpace: AnyVector[]; leftNullSpace: AnyVector[]; checks: Check[] };
}

export function reducedQrView(A: Matrix, sign: HouseholderSign): ReducedQrView {
  const r = qrHouseholder(A, { sign });
  const { rows: m, cols: n } = shape(A);
  const dropped = Array.from({ length: m - n }, (_, i) => n + i);
  const Qf = asFloat(r.Q);
  const Rf = asFloat(r.R);
  const layers = Array.from({ length: m }, (_, k) => {
    const q = Qf.map((row) => row[k]);
    const rowR = Rf[k];
    return { k, matrix: q.map((qi) => rowR.map((rj) => qi * rj)), zero: rowR.every((x) => Math.abs(x) <= 1e-12) };
  });
  const At = transpose(A);
  const leftNull = dropped.map((j) => columnOf(r.Q, j));
  const checks = leftNull.map((q, i) => {
    const Atq: AnyMatrix = isExact(r.Q) ? matVec(At, q as Vector).map((x) => [x]) : fMatVec(toFloatMatrix(At), q as number[]).map((x) => [x]);
    const zero: AnyMatrix = isExact(r.Q) ? Atq.map(() => [Rational.ZERO]) : Atq.map(() => [0]);
    return compare(`Aᵀq${n + i + 1} = 0`, `A^Tq_${n + i + 1} = 0`, Atq, zero);
  });
  return {
    precision: r.precision,
    Q: r.Q,
    R: r.R,
    Qhat: r.Qhat,
    Rhat: r.Rhat,
    dropped: {
      columns: dropped,
      rows: dropped,
      reason: `Rows ${n + 1}–${m} of R are zero rows, so columns ${n + 1}–${m} of Q only ever multiply zero rows: they can be dropped.`,
    },
    layers,
    maxAbs: Math.max(0, ...layers.flatMap((l) => l.matrix.flat().map(Math.abs))),
    bases: { columnSpace: Array.from({ length: n }, (_, j) => columnOf(r.Q, j)), leftNullSpace: leftNull, checks },
  };
}

// §8.5 Least squares via QR ------------------------------------------------------------

export interface LeastSquaresQrView {
  precision: Precision;
  /** L4-LS1: from the normal equation to Rx* = Qᵀb, one line per step. */
  derivation: { tex: string; reason: string; uses: 'QtQ' | 'Rt' | null }[];
  /** Full Qᵀb. */
  Qtb: AnyVector;
  /** L4-LS3: the first n entries (coordinates of p) and the last m − n (of e); ‖e‖² is the sum of squares of the last. */
  split: { fit: AnyVector; residual: AnyVector; residualNormSquared: number; residualNormSquaredTex: string };
  /** L4-LS2: back substitution on R̂x* = (Qᵀb)₁…ₙ; exact steps when exact. null in floating point. */
  back: SubstitutionResult | null;
  xStar: AnyVector;
  /** L4-LS4: the exact normal equation gives the same x*. */
  normalEquation: { AtA: Matrix; Atb: Vector; x: Vector | null; same: boolean };
  /** L4-LS6 note (without the Python export): NumPy's signs differ but x* does not. */
  signNote: string;
}

export function leastSquaresQrView(A: Matrix, b: Vector, sign: HouseholderSign): LeastSquaresQrView {
  const r = qrHouseholder(A, { sign });
  const { cols: n } = shape(A);
  const exact = isExact(r.Q);
  const Qtb: AnyVector = exact ? matVec(transpose(r.Q as Matrix), b) : fMatVec(fTranspose(asFloat(r.Q)), toFloatVector(b));
  const fit = Qtb.slice(0, n) as AnyVector;
  const residual = Qtb.slice(n) as AnyVector;
  const residualSquares = asFloatVector(residual).map((x) => x * x);
  const residualNormSquared = residualSquares.reduce((s, x) => s + x, 0);
  const residualNormSquaredTex = exact
    ? `${(residual as Vector).map((x) => `${x.isNegative() ? `(${x.toTex()})` : x.toTex()}^2`).join(' + ')} = ${(residual as Vector).reduce((s, x) => s.add(x.mul(x)), Rational.ZERO).toTex()}`
    : formatFloat(residualNormSquared, 6);
  let back: SubstitutionResult | null = null;
  let xStar: AnyVector;
  if (exact) {
    back = backSub(r.Rhat as Matrix, fit as Vector);
    if (!back.solution) throw new Error(back.stopped?.reason ?? 'R is not invertible: the columns of A are dependent.');
    xStar = back.solution;
  } else {
    if (r.dependentColumns.length) throw new Error('R is not invertible: the columns of A are dependent.');
    xStar = leastSquaresQrFloat(toFloatMatrix(A), toFloatVector(b), sign);
  }
  const ls = leastSquares(A, b);
  const same =
    ls.xHat !== null && (exact ? vectorEquals(xStar as Vector, ls.xHat) : relativeError(xStar as number[], ls.xHat) <= 1e-10);
  return {
    precision: r.precision,
    derivation: [
      { tex: '(A^TA)x^* = A^Tb', reason: 'The normal equation.', uses: null },
      { tex: '((QR)^T(QR))x^* = (QR)^Tb', reason: 'Substitute A = QR.', uses: null },
      { tex: 'R^TQ^TQRx^* = R^TQ^Tb', reason: '(QR)ᵀ = RᵀQᵀ.', uses: null },
      { tex: 'R^TRx^* = R^TQ^Tb', reason: 'Because QᵀQ = I.', uses: 'QtQ' },
      {
        tex: '(R^T)^{-1}R^TRx^* = (R^T)^{-1}R^TQ^Tb',
        reason: 'Rᵀ is invertible: a square triangular matrix with nonzero diagonal entries, because the columns of A are independent.',
        uses: 'Rt',
      },
      { tex: 'Rx^* = Q^Tb', reason: 'The upshot: the normal equation (AᵀA)x* = Aᵀb is replaced by Rx* = Qᵀb.', uses: null },
    ],
    Qtb,
    split: { fit, residual, residualNormSquared, residualNormSquaredTex },
    back,
    xStar,
    normalEquation: { AtA: ls.AtA, Atb: ls.Atb, x: ls.xHat, same },
    signNote: "NumPy's np.linalg.qr uses the stable sign, so for the notes' A it returns R = [[−2, −3], [0, 3]]: Q and R change sign, but x* does not.",
  };
}

/** L4-LS5: the Lesson 2 houses fitted with QR (floating point) against the exact θ*. */
export interface HousesByQr {
  qr: number[];
  exact: Vector;
  digits: number;
  precision: Precision;
}

export function housesByQr(sign: HouseholderSign): HousesByQr {
  const X = matrix([
    [1, 1],
    [1, '2.25'],
    [1, '1.5'],
  ]);
  const y = vector([4, 6, 5]);
  const qr = qrHouseholder(X, { sign });
  const x = leastSquaresQrFloat(toFloatMatrix(X), toFloatVector(y), sign);
  const exact = leastSquares(X, y).xHat!;
  const error = relativeError(x, exact);
  return { qr: x, exact, digits: error === 0 ? 16 : Math.min(16, Math.floor(-Math.log10(error))), precision: qr.precision };
}

// §8.6 Conditioning ---------------------------------------------------------------------

export interface ConditioningView {
  condA: number;
  condAtA: number;
  /** L4-C2: cond(AᵀA) = cond(A)². */
  identity: Check;
  /** L4-C1 */
  explanation: string;
}

export function conditioningView(A: Matrix): ConditioningView {
  const F = toFloatMatrix(A);
  const condA = cond(F);
  const condAtA = cond(fMatMul(fTranspose(F), F));
  const holds = condA === Infinity ? condAtA === Infinity : Math.abs(condAtA - condA * condA) <= 1e-6 * condA * condA;
  return {
    condA,
    condAtA,
    identity: {
      name: 'cond(AᵀA) = cond(A)²',
      holds,
      tex: `\\text{cond}(A^TA) = ${formatFloat(condAtA, 4)} \\approx \\text{cond}(A)^2 = ${formatFloat(condA * condA, 4)}`,
    },
    explanation:
      'A small relative change in b can change x by up to cond(A) times as much. Solving through AᵀA multiplies by cond(AᵀA) = cond(A)² instead, so the normal equation can lose twice as many digits.',
  };
}

export interface NearCollinearView {
  delta: number;
  condX: number;
  /** Relative errors against the exact answer from the stored floats (F-M31). */
  normalError: number;
  qrError: number;
  /** L4-C5: about log₁₀ cond digits lost by QR, twice as many by the normal equation, out of about 16. */
  digitsLost: { qr: number; normal: number; available: number };
}

/** L4-C3 at δ = 10^logDelta. */
export function nearCollinearView(logDelta: number, sign: HouseholderSign): NearCollinearView {
  const delta = 10 ** logDelta;
  const { X, y } = nearCollinearHouses(delta);
  const condX = cond(X);
  const exact = exactLeastSquaresFromFloats(X, y);
  // A method that loses every digit (or divides by zero) counts as relative error 1.
  const capped = (e: number) => (Number.isFinite(e) ? Math.min(e, 1) : 1);
  return {
    delta,
    condX,
    normalError: capped(relativeError(leastSquaresNormalFloat(X, y), exact)),
    qrError: capped(relativeError(leastSquaresQrFloat(X, y, sign), exact)),
    digitsLost: { qr: Math.log10(condX), normal: 2 * Math.log10(condX), available: 16 },
  };
}

export interface SweepSeries {
  label: string;
  color: string;
  points: [number, number][];
}

export interface ConditioningChart {
  /** L4-C4: log–log, error against cond(X). */
  frame: ChartFrame;
  series: SweepSeries[];
  /** Reference lines ε·cond (slope 1) and ε·cond² (slope 2). */
  references: { slope: number; through: [number, number]; label: string; color: string }[];
}

/** L4-C4: 50 values of δ across the slider range (NF-9). */
export function conditioningSweep(sign: HouseholderSign): ConditioningChart {
  const [lo, hi] = LOG_DELTA_RANGE;
  const runs = Array.from({ length: 50 }, (_, i) => nearCollinearView(hi - ((hi - lo) * i) / 49, sign));
  // An error of exactly 0 cannot sit on a log axis; show it at the floor.
  const floor = 1e-17;
  const point = (c: number, e: number): [number, number] => [c, Math.max(e, floor)];
  const xMax = 10 ** Math.ceil(Math.log10(Math.max(...runs.map((r) => r.condX))));
  return {
    frame: {
      x: { min: 1, max: xMax, title: 'cond(X)', log: true },
      y: { min: floor, max: 1, title: 'relative error', log: true },
      size: 8,
      equalAspect: false,
    },
    series: [
      { label: 'Normal equation', color: '#D55E00', points: runs.map((r) => point(r.condX, r.normalError)) },
      { label: 'Householder QR', color: '#0072B2', points: runs.map((r) => point(r.condX, r.qrError)) },
    ],
    references: [
      { slope: 1, through: [1, MACHINE_EPSILON], label: 'ε·cond', color: '#71717a' },
      { slope: 2, through: [1, MACHINE_EPSILON], label: 'ε·cond²', color: '#a1a1aa' },
    ],
  };
}

// §8.7 Gram–Schmidt vs Householder ---------------------------------------------------------
// The notes mention Gram–Schmidt only in passing ("conceptually simpler but less stable
// numerically"); this view is the MATH2331 reminder.

export interface GramSchmidtView {
  result: GsResult;
  /** L4-GS1: drawn when the columns live in ℝ³. */
  scene: { columns: Vec3[]; q: Vec3[] } | null;
  /** L4-GS2: the one-line difference between the variants. */
  variantDifference: string;
  /** L4-GS4: on exact examples, classical, modified and Householder agree (up to signs). */
  agreement: { agree: boolean; note: string };
}

/** Throws when the columns are dependent. */
export function gramSchmidtView(A: Matrix, variant: GsVariant): GramSchmidtView {
  const result = gramSchmidt(A, variant);
  const { rows: m, cols: n } = shape(A);
  // Compare with Householder's reduced Q̂ up to the sign of each column (L4-GS4).
  const hh = qrHouseholder(A, { sign: 'notes' });
  const Qg = asFloat(result.Q);
  const Qh = asFloat(hh.Qhat);
  const Rh = asFloat(hh.Rhat);
  const agree = Array.from({ length: n }, (_, j) => {
    const s = Math.sign(Rh[j][j]) || 1;
    return Qg.every((row, i) => Math.abs(row[j] - s * Qh[i][j]) <= 1e-10);
  }).every(Boolean);
  return {
    result,
    scene:
      m === 3
        ? {
            columns: Array.from({ length: n }, (_, j) => toVec3(toFloatVector(getColumn(A, j)))),
            q: Array.from({ length: n }, (_, j) => toVec3(Qg.map((r) => r[j]))),
          }
        : null,
    variantDifference:
      'Classical: rᵢⱼ = qᵢ · aⱼ uses the original column. Modified: rᵢⱼ = qᵢ · vⱼ uses the vector left after the earlier projections were subtracted. With exact numbers they are the same.',
    agreement: agree
      ? { agree, note: 'Gram–Schmidt and Householder give the same Q̂ and R̂ here (up to signs): the difference only shows once rounding happens.' }
      : { agree, note: 'Gram–Schmidt and Householder give different Q̂ here, beyond signs.' },
  };
}
