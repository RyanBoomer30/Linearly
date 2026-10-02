import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';

/** F-M23: ‖M‖² = sum of squared entries, exact. */
export function frobeniusSquared(M: Matrix): Rational {
  return notImplemented('frobeniusSquared');
}

/** ‖M‖ as a decimal, for display only. */
export function frobeniusNorm(M: Matrix): number {
  return notImplemented('frobeniusNorm');
}

/** ‖v‖² = v·v, exact. For a rank-1 layer, ‖bc*‖² = ‖b‖²‖c‖². */
export function normSquared(v: Vector): Rational {
  return notImplemented('normSquared');
}
