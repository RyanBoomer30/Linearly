import type { AnyMatrix, AnyVector } from '../../core/float';
import { isExact, isExactVector } from '../../core/float';
import type { Matrix } from '../../core/matrix';
import { Rational } from '../../core/rational';
import { matrixToTex, type MatrixHighlights } from './MatrixTex';
import { Tex } from './Tex';

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));

/**
 * The common denominator d of an exact matrix's entries, when pulling it out
 * helps: M = (1/d)·(whole numbers), as the notes write H = (1/3)[[2,2,1], …].
 * 1 when every entry is already whole.
 */
export function commonDenominator(M: Matrix): bigint {
  const d = M.flat().reduce((l, x) => (l * x.den) / gcd(l, x.den), 1n);
  return d;
}

/** TeX for any matrix; exact ones with fractions are written (1/d)[…] with whole entries. */
export function anyMatrixTex(M: AnyMatrix, significant = 6, highlights: MatrixHighlights = {}): string {
  if (isExact(M)) {
    const d = commonDenominator(M);
    if (d > 1n) {
      const scaled = M.map((r) => r.map((x) => x.mul(Rational.of(d)).toTex()));
      return `\\frac{1}{${d}}${matrixToTex(scaled, false, highlights)}`;
    }
  }
  return matrixToTex(anyMatrixEntries(M, significant), false, highlights);
}

/** F-D7: a float with a chosen number of significant digits; tiny noise below 1e-14 · scale shows as 0. */
export function formatFloat(x: number, significant = 6): string {
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  return String(Number(x.toPrecision(significant)));
}

export function anyMatrixEntries(M: AnyMatrix, significant = 6): string[][] {
  return isExact(M) ? M.map((r) => r.map((x) => x.toTex())) : M.map((r) => r.map((x) => formatFloat(x, significant)));
}

export function anyVectorEntries(v: AnyVector, significant = 6): string[] {
  return isExactVector(v) ? v.map((x) => x.toTex()) : v.map((x) => formatFloat(x, significant));
}

/** A matrix display for exact or floating-point matrices (F-D1, F-D7). */
export function AnyMatrixTex({ M, highlights, significant }: { M: AnyMatrix; highlights?: MatrixHighlights; significant?: number }) {
  return <Tex tex={anyMatrixTex(M, significant, highlights)} display />;
}
