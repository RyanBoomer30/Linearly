import type { Matrix, Vector } from '../../../core/matrix';

/** Exact TeX entries for MatrixTex. */
export const texEntries = (M: Matrix) => M.map((r) => r.map((x) => x.toTex()));
/** A vector as a one-column matrix of TeX entries. */
export const texColumn = (v: Vector) => v.map((x) => [x.toTex()]);
export const floatEntries = (M: Matrix) => M.map((r) => r.map((x) => x.toNumber()));
export const subscript = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
