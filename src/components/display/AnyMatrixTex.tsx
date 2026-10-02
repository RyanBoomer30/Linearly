import type { AnyMatrix, AnyVector } from '../../core/float';
import { isExact, isExactVector } from '../../core/float';
import { MatrixTex, type MatrixHighlights } from './MatrixTex';

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

/** MatrixTex for exact or floating-point matrices. */
export function AnyMatrixTex({ M, highlights, significant }: { M: AnyMatrix; highlights?: MatrixHighlights; significant?: number }) {
  return <MatrixTex entries={anyMatrixEntries(M, significant)} highlights={highlights} />;
}
