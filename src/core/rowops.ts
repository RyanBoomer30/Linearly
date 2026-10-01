import type { Matrix } from './matrix';
import type { Rational } from './rational';
import type { RowOp } from './trace';

/** Return a new matrix with the row operation applied. Does not mutate M. */
export function applyRowOp(M: Matrix, op: RowOp): Matrix {
  const out = M.map((r) => [...r]);
  switch (op.kind) {
    case 'swap':
      [out[op.i], out[op.j]] = [out[op.j], out[op.i]];
      break;
    case 'scale':
      out[op.i] = out[op.i].map((x) => x.mul(op.factor));
      break;
    case 'addMultiple':
      out[op.target] = out[op.target].map((x, k) => x.add(op.factor.mul(M[op.source][k])));
      break;
  }
  return out;
}

/** Rows (0-based) that the operation can modify. */
export function rowsChangedBy(op: RowOp): number[] {
  switch (op.kind) {
    case 'swap':
      return [op.i, op.j].sort((a, b) => a - b);
    case 'scale':
      return [op.i];
    case 'addMultiple':
      return [op.target];
  }
}

/** Coefficient in front of a row: '' for 1, '-' for −1, '2', '\tfrac{1}{2}'. */
function coefTex(c: Rational): string {
  if (c.isInteger()) {
    if (c.num === 1n) return '';
    if (c.num === -1n) return '-';
    return c.num.toString();
  }
  const sign = c.isNegative() ? '-' : '';
  const a = c.abs();
  return `${sign}\\tfrac{${a.num}}{${a.den}}`;
}

/**
 * Words and notation for a row op, 1-based for display (F-S2).
 * addMultiple(target=1, source=0, factor=-2) →
 *   { text: 'Subtract 2 × row 1 from row 2', tex: 'r_2 - 2r_1' }
 */
export function describeRowOp(op: RowOp): { text: string; tex: string } {
  switch (op.kind) {
    case 'swap':
      return {
        text: `Swap row ${op.i + 1} and row ${op.j + 1}`,
        tex: `r_${op.i + 1} \\leftrightarrow r_${op.j + 1}`,
      };
    case 'scale':
      return {
        text: `Multiply row ${op.i + 1} by ${op.factor.toString()}`,
        tex: `${coefTex(op.factor)} r_${op.i + 1}`,
      };
    case 'addMultiple': {
      const t = op.target + 1;
      const s = op.source + 1;
      const mag = op.factor.abs();
      const times = mag.num === 1n && mag.den === 1n ? '' : `${mag.toString()} × `;
      const sub = op.factor.isNegative();
      return {
        text: sub ? `Subtract ${times}row ${s} from row ${t}` : `Add ${times}row ${s} to row ${t}`,
        tex: `r_${t} ${sub ? '-' : '+'} ${coefTex(mag)}r_${s}`,
      };
    }
  }
}
