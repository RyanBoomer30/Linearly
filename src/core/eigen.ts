import { cAbs, complex, complexTex, type Complex } from './complex';
import { EXACT, type AnyMatrix, type AnyVector, type FloatMatrix, type Precision } from './float';
import { fromColumns, identity, toFloatMatrix, type Matrix, type Vector } from './matrix';
import { matMul } from './products';
import { Rational } from './rational';
import { rref } from './rref';
import { scaleInteger, scaleProbability, scaleUnit, type VectorScaling } from './scaling';
import { nullSpaceBasis } from './subspaces';
import { svd } from './svd';

/**
 * F-M34: an eigenvalue with its algebraic multiplicity. Rational roots are
 * exact; irrational real roots and complex roots are floating point.
 */
export type Eigenvalue =
  | { kind: 'rational'; value: Rational; multiplicity: number }
  | { kind: 'real'; value: number; multiplicity: number }
  | { kind: 'complex'; value: Complex; multiplicity: number };

// Polynomials are coefficient lists, highest power first. ------------------------

const trace = (M: Matrix) => M.reduce((s, r, i) => s.add(r[i]), Rational.ZERO);

/**
 * F-M33: coefficients of the characteristic polynomial det(λI − A), highest
 * power first and monic, so for n = 3: [1, c₂, c₁, c₀] means
 * λ³ + c₂λ² + c₁λ + c₀. (det(A − λI) is (−1)ⁿ times this.) n ≤ 4.
 */
export function characteristicPolynomial(A: Matrix): Rational[] {
  // Faddeev–LeVerrier: M_k = A M_{k−1} + c_{k−1} I, c_k = −tr(A M_k) / k. Exact, no determinants of λ-matrices.
  const n = A.length;
  if (A.some((r) => r.length !== n)) throw new RangeError('The characteristic polynomial needs a square matrix');
  const coeffs = [Rational.ONE];
  let M: Matrix = A.map((r) => r.map(() => Rational.ZERO));
  const I = identity(n);
  for (let k = 1; k <= n; k++) {
    const AM = matMul(A, M);
    M = AM.map((r, i) => r.map((x, j) => x.add(I[i][j].mul(coeffs[k - 1]))));
    coeffs.push(trace(matMul(A, M)).neg().div(Rational.of(k)));
  }
  return coeffs;
}

/** "\\lambda^3 - \\frac{17}{10}\\lambda^2 + \\frac{4}{5}\\lambda - \\frac{1}{10}" */
export function polynomialTex(coefficients: Rational[], variable = '\\lambda'): string {
  const d = coefficients.length - 1;
  const terms: string[] = [];
  coefficients.forEach((c, i) => {
    if (c.isZero()) return;
    const power = d - i;
    const x = power === 0 ? '' : power === 1 ? variable : `${variable}^${power}`;
    const abs = c.abs();
    const body = power > 0 && abs.equals(Rational.ONE) ? x : `${abs.toTex()}${x}`;
    if (terms.length === 0) terms.push(c.isNegative() ? `-${body}` : body);
    else terms.push(`${c.isNegative() ? '-' : '+'} ${body}`);
  });
  return terms.length === 0 ? '0' : terms.join(' ');
}

function evalPoly(coeffs: Rational[], x: Rational): Rational {
  return coeffs.reduce((acc, c) => acc.mul(x).add(c), Rational.ZERO);
}

/** Divide by (λ − r), r a root. */
function deflate(coeffs: Rational[], r: Rational): Rational[] {
  const out: Rational[] = [];
  let carry = Rational.ZERO;
  for (let i = 0; i < coeffs.length - 1; i++) {
    carry = carry.mul(r).add(coeffs[i]);
    out.push(carry);
  }
  return out;
}

const cAdd = (a: Complex, b: Complex) => complex(a.re + b.re, a.im + b.im);
const cSub = (a: Complex, b: Complex) => complex(a.re - b.re, a.im - b.im);
const cMul = (a: Complex, b: Complex) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cDiv = (a: Complex, b: Complex) => {
  const d = b.re * b.re + b.im * b.im;
  return complex((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};

/** All complex roots of a float polynomial by Durand–Kerner (Weierstrass) iteration. */
function polyRoots(coeffs: number[]): Complex[] {
  const d = coeffs.length - 1;
  if (d < 1) return [];
  const a = coeffs.map((c) => c / coeffs[0]);
  if (d === 1) return [complex(-a[1])];
  const radius = 1 + Math.max(...a.slice(1).map(Math.abs));
  const horner = (z: Complex) => a.reduce<Complex>((acc, c) => cAdd(cMul(acc, z), complex(c)), complex(0));
  const z = Array.from({ length: d }, (_, k) => {
    const angle = (2 * Math.PI * k) / d + 0.4;
    return complex(0.5 * radius * Math.cos(angle), 0.5 * radius * Math.sin(angle));
  });
  for (let iter = 0; iter < 2000; iter++) {
    let moved = 0;
    for (let i = 0; i < d; i++) {
      let denom = complex(1);
      for (let j = 0; j < d; j++) if (j !== i) denom = cMul(denom, cSub(z[i], z[j]));
      if (denom.re === 0 && denom.im === 0) denom = complex(1e-300);
      const delta = cDiv(horner(z[i]), denom);
      z[i] = cSub(z[i], delta);
      moved = Math.max(moved, cAbs(delta) / (1 + cAbs(z[i])));
    }
    if (moved < 1e-16) break;
  }
  return z;
}

/** Continued-fraction convergents p/q of x with q ≤ maxDen: the rational candidates near a float root. */
function convergents(x: number, maxDen: bigint): Rational[] {
  const sign = x < 0 ? -1n : 1n;
  let rest = Math.abs(x);
  let [h0, h1, k0, k1] = [0n, 1n, 1n, 0n];
  const out: Rational[] = [];
  for (let i = 0; i < 40 && Number.isFinite(rest); i++) {
    const a = BigInt(Math.floor(rest));
    [h0, h1] = [h1, a * h1 + h0];
    [k0, k1] = [k1, a * k1 + k0];
    if (k1 > maxDen || k1 > 10n ** 15n) break;
    out.push(Rational.of(sign * h1, k1));
    const frac = rest - Math.floor(rest);
    if (frac < 1e-15) break;
    rest = 1 / frac;
  }
  return out;
}

const lcmBig = (a: bigint, b: bigint) => {
  let [x, y] = [a, b];
  while (y) [x, y] = [y, x % y];
  return (a / x) * b;
};

/** Order: |λ| descending; ties: real before complex, positive before negative, positive imaginary part first. */
function compareEigenvalues(a: Eigenvalue, b: Eigenvalue): number {
  const da = eigenvalueAbs(a);
  const db = eigenvalueAbs(b);
  if (Math.abs(da - db) > 1e-12 * Math.max(1, da, db)) return db - da;
  const ca = a.kind === 'complex' ? 1 : 0;
  const cb = b.kind === 'complex' ? 1 : 0;
  if (ca !== cb) return ca - cb;
  if (a.kind === 'complex' && b.kind === 'complex') return b.value.im - a.value.im;
  return eigenvalueNumber(b) - eigenvalueNumber(a);
}

/**
 * F-M34: the distinct eigenvalues of A (n ≤ 4) with multiplicities, ordered by
 * |λ| descending (ties: real before complex, positive before negative, then
 * the complex one with positive imaginary part first). Rational roots by the
 * rational root test on the integer-scaled polynomial; the rest by
 * Durand–Kerner (or Aberth) iteration. Complex roots come in conjugate pairs.
 */
export function eigenvalues(A: Matrix): Eigenvalue[] {
  let poly = characteristicPolynomial(A);
  const exact: Rational[] = [];
  while (poly.length > 1 && poly[poly.length - 1].isZero()) {
    exact.push(Rational.ZERO);
    poly = poly.slice(0, -1);
  }
  // A rational root p/q of the integer-scaled polynomial has q dividing its leading
  // coefficient, the lcm of the denominators: try the continued-fraction
  // convergents of each nearly real float root up to that bound, and keep the
  // ones that are exact roots. Repeated roots come out of the float iteration
  // only to about √ε, so the "nearly real" test is loose; exactness is checked.
  search: while (poly.length > 1) {
    const maxDen = poly.reduce((l, c) => lcmBig(l, c.den), 1n);
    const approx = polyRoots(poly.map((c) => c.toNumber())).sort((p, q) => Math.abs(p.im) - Math.abs(q.im));
    for (const z of approx) {
      if (Math.abs(z.im) > 1e-4 * (1 + Math.abs(z.re))) continue;
      for (const r of convergents(z.re, maxDen)) {
        if (evalPoly(poly, r).isZero()) {
          exact.push(r);
          poly = deflate(poly, r);
          continue search;
        }
      }
    }
    break;
  }

  const result: Eigenvalue[] = [];
  for (const r of exact) {
    const same = result.find((e) => e.kind === 'rational' && e.value.equals(r));
    if (same) same.multiplicity++;
    else result.push({ kind: 'rational', value: r, multiplicity: 1 });
  }

  const rest = polyRoots(poly.map((c) => c.toNumber()));
  const numeric: Eigenvalue[] = [];
  for (const z of rest) {
    const real = Math.abs(z.im) <= 1e-9 * Math.max(1, cAbs(z));
    const value: Eigenvalue = real ? { kind: 'real', value: z.re, multiplicity: 1 } : { kind: 'complex', value: z, multiplicity: 1 };
    const same = numeric.find(
      (e) => e.kind === value.kind && cAbs(cSub(e.kind === 'complex' ? e.value : complex(e.value as number), real ? complex(z.re) : z)) < 1e-6 * Math.max(1, cAbs(z)),
    );
    if (same) same.multiplicity++;
    else numeric.push(value);
  }
  // Make conjugate pairs exact mirror images of each other.
  for (const e of numeric) {
    if (e.kind !== 'complex' || e.value.im <= 0) continue;
    const partner = numeric.find((f) => f.kind === 'complex' && f.value.im < 0 && cAbs(cSub(f.value, complex(e.value.re, -e.value.im))) < 1e-6 * Math.max(1, cAbs(e.value)));
    if (partner && partner.kind === 'complex') {
      const re = (e.value.re + partner.value.re) / 2;
      const im = (e.value.im - partner.value.im) / 2;
      e.value = complex(re, im);
      partner.value = complex(re, -im);
    }
  }
  return [...result, ...numeric].sort(compareEigenvalues);
}

/** λ as a float (the real part for a complex λ). */
export function eigenvalueNumber(lambda: Eigenvalue): number {
  return lambda.kind === 'rational' ? lambda.value.toNumber() : lambda.kind === 'real' ? lambda.value : lambda.value.re;
}

/** |λ| as a float. */
export function eigenvalueAbs(lambda: Eigenvalue): number {
  return lambda.kind === 'complex' ? cAbs(lambda.value) : Math.abs(eigenvalueNumber(lambda));
}

/** TeX for λ: "1", "\\frac{1}{2}", "0.6180", "-0.5 + 0.866i". */
export function eigenvalueTex(lambda: Eigenvalue, significant = 4): string {
  if (lambda.kind === 'rational') return lambda.value.toTex();
  if (lambda.kind === 'real') return String(Number(lambda.value.toPrecision(significant)));
  return complexTex(lambda.value, significant);
}

/** Plain text for λ, with a typographic minus: "−1/6", "1.618", "−0.5 + 0.866i". */
export function eigenvalueText(lambda: Eigenvalue, significant = 4): string {
  if (lambda.kind === 'rational') return lambda.value.toString().replace('-', '−');
  return eigenvalueTex(lambda, significant).replace(/-/g, '−');
}

export interface Eigenpair {
  eigenvalue: Eigenvalue;
  /**
   * F-M35: a basis of N(A − λI). Exact (the Lesson 1 null space) for a
   * rational λ; the smallest right singular vector(s) of A − λI for an
   * irrational real λ; empty for a complex λ (non-goal).
   */
  vectors: AnyVector[];
  precision: Precision;
}

/** A − λI, exact. */
export function shiftedMatrix(A: Matrix, lambda: Rational): Matrix {
  return A.map((r, i) => r.map((x, j) => (i === j ? x.sub(lambda) : x)));
}

/** F-M35: the eigenvectors for one eigenvalue, scaled as asked (F-M37). */
export function eigenvectors(A: Matrix, lambda: Eigenvalue, scaling: VectorScaling = 'integer'): Eigenpair {
  if (lambda.kind === 'complex') return { eigenvalue: lambda, vectors: [], precision: { kind: 'float', reason: 'complex eigenvalue' } };
  if (lambda.kind === 'rational') {
    const basis = nullSpaceBasis(shiftedMatrix(A, lambda.value));
    if (scaling === 'unit') {
      return { eigenvalue: lambda, vectors: basis.map((v) => scaleUnit(scaleInteger(v))), precision: { kind: 'float', reason: 'unit length needs square roots' } };
    }
    const isOne = lambda.value.equals(Rational.ONE);
    const vectors = basis.map((v) => {
      if (scaling === 'probability' && isOne && !v.reduce((s, x) => s.add(x), Rational.ZERO).isZero()) return scaleProbability(v);
      return scaleInteger(v);
    });
    return { eigenvalue: lambda, vectors, precision: EXACT };
  }
  // Irrational real λ: N(A − λI) is spanned by the right singular vectors with (numerically) zero singular values.
  const n = A.length;
  const F: FloatMatrix = toFloatMatrix(A).map((r, i) => r.map((x, j) => (i === j ? x - lambda.value : x)));
  const s = svd(F);
  const tol = 1e-8 * Math.max(1, s.sigma[0] ?? 0);
  const count = Math.max(1, s.sigma.filter((x) => x <= tol).length);
  const vectors = Array.from({ length: count }, (_, k) => {
    const v = s.V.map((r) => r[n - 1 - k]);
    let big = 0;
    v.forEach((x, i) => Math.abs(x) > Math.abs(v[big]) * (1 + 1e-12) && (big = i));
    return v[big] < 0 ? v.map((x) => -x) : v;
  });
  return {
    eigenvalue: lambda,
    vectors,
    precision: { kind: 'float', reason: `λ ≈ ${eigenvalueText(lambda)} is irrational` },
  };
}

/** Every eigenvalue with its eigenvectors, in eigenvalues() order. */
export function eigenpairs(A: Matrix, scaling: VectorScaling = 'integer'): Eigenpair[] {
  return eigenvalues(A).map((l) => eigenvectors(A, l, scaling));
}

export type Diagonalization =
  | {
      kind: 'diagonalizable';
      precision: Precision;
      /** One per column of V: each eigenvalue repeated by its multiplicity, in eigenvalues() order. */
      eigenvalues: Eigenvalue[];
      V: AnyMatrix;
      Lambda: AnyMatrix;
      Vinv: AnyMatrix;
    }
  /** An eigenvalue has fewer independent eigenvectors than its multiplicity, so V is not invertible (L5-EG5). */
  | { kind: 'defective'; eigenvalue: Eigenvalue; algebraic: number; geometric: number; reason: string }
  /** Complex eigenvalues: A is diagonalizable only over ℂ, which the tool does not show. */
  | { kind: 'complex'; eigenvalues: Eigenvalue[]; reason: string };

/** Exact inverse by elimination on [V | I]. */
export function exactInverse(V: Matrix): Matrix {
  const n = V.length;
  const I = identity(n);
  const R = rref(V.map((r, i) => [...r, ...I[i]])).matrix;
  if (R.some((r, i) => !r[i].equals(Rational.ONE))) throw new RangeError('The matrix is not invertible');
  return R.map((r) => r.slice(n));
}

/** Float inverse by Gauss–Jordan with partial pivoting. */
export function floatInverse(V: FloatMatrix): FloatMatrix {
  const n = V.length;
  const M = V.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (M[p][c] === 0) throw new RangeError('The matrix is not invertible');
    [M[c], M[p]] = [M[p], M[c]];
    const pivot = M[c][c];
    M[c] = M[c].map((x) => x / pivot);
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (f !== 0) M[r] = M[r].map((x, j) => x - f * M[c][j]);
    }
  }
  return M.map((r) => r.slice(n));
}

/**
 * F-M36: A = VΛV⁻¹, exact when every eigenvalue is rational. Eigenvectors are
 * scaled as asked (F-M37); "probability" applies to λ = 1 only, the others
 * stay "integer".
 */
export function diagonalize(A: Matrix, scaling: VectorScaling = 'integer'): Diagonalization {
  const ls = eigenvalues(A);
  const complexOnes = ls.filter((l) => l.kind === 'complex');
  if (complexOnes.length > 0) {
    return {
      kind: 'complex',
      eigenvalues: ls,
      reason: `The eigenvalues ${complexOnes.map((l) => eigenvalueText(l)).join(' and ')} are complex, so V and Λ would need complex numbers, which this tool does not show.`,
    };
  }
  const pairs = ls.map((l) => eigenvectors(A, l, scaling));
  for (const p of pairs) {
    const m = p.eigenvalue.multiplicity;
    const g = p.vectors.length;
    if (g < m) {
      return {
        kind: 'defective',
        eigenvalue: p.eigenvalue,
        algebraic: m,
        geometric: g,
        reason: `λ = ${eigenvalueText(p.eigenvalue)} has multiplicity ${m} but only ${g} independent eigenvector${g === 1 ? '' : 's'}, so V is not invertible and the matrix is not diagonalizable.`,
      };
    }
  }
  const columns = pairs.flatMap((p) => p.vectors);
  const perColumn = pairs.flatMap((p) => p.vectors.map(() => p.eigenvalue));
  const notExact = pairs.find((p) => p.precision.kind === 'float');
  if (!notExact) {
    const V = fromColumns(columns as Vector[]);
    const Lambda = perColumn.map((l, i) => perColumn.map((_, j) => (i === j && l.kind === 'rational' ? l.value : Rational.ZERO)));
    return { kind: 'diagonalizable', precision: EXACT, eigenvalues: perColumn, V, Lambda, Vinv: exactInverse(V) };
  }
  const V = columns[0].map((_, i) => columns.map((c) => (typeof c[i] === 'number' ? (c[i] as number) : (c[i] as Rational).toNumber())));
  const Lambda = perColumn.map((l, i) => perColumn.map((_, j) => (i === j ? eigenvalueNumber(l) : 0)));
  return { kind: 'diagonalizable', precision: notExact.precision, eigenvalues: perColumn, V, Lambda, Vinv: floatInverse(V) };
}
