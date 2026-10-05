import { notImplemented } from './notImplemented';

/** F-M39: a complex number in floating point, for eigenvalues only (no complex eigenvectors). */
export interface Complex {
  re: number;
  im: number;
}

export const complex = (re: number, im = 0): Complex => ({ re, im });

/** |z| */
export function cAbs(z: Complex): number {
  return notImplemented('cAbs');
}

/** The argument of z in radians, in (−π, π]. */
export function cArg(z: Complex): number {
  return notImplemented('cArg');
}

/** Plain text with a chosen number of significant digits: "−0.5 + 0.866i", "2", "−i". Imaginary parts below 1e-12 are dropped. */
export function formatComplex(z: Complex, significant = 4): string {
  return notImplemented('formatComplex');
}

/** TeX form of formatComplex: "-0.5 + 0.866i". */
export function complexTex(z: Complex, significant = 4): string {
  return notImplemented('complexTex');
}
