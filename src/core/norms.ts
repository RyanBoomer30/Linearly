import type { Matrix, Vector } from './matrix';
import { dot } from './products';
import { Rational } from './rational';

/** F-M23: ‖M‖² = sum of squared entries, exact. */
export function frobeniusSquared(M: Matrix): Rational {
  return M.reduce((sum, row) => sum.add(dot(row, row)), Rational.ZERO);
}

/** ‖M‖ as a decimal, for display only. */
export function frobeniusNorm(M: Matrix): number {
  return Math.sqrt(frobeniusSquared(M).toNumber());
}

/** ‖v‖² = v·v, exact. For a rank-1 layer, ‖bc*‖² = ‖b‖²‖c‖². */
export function normSquared(v: Vector): Rational {
  return dot(v, v);
}
