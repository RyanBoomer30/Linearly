/** F-M39: a complex number in floating point, for eigenvalues only (no complex eigenvectors). */
export interface Complex {
  re: number;
  im: number;
}

export const complex = (re: number, im = 0): Complex => ({ re, im });

/** |z| */
export function cAbs(z: Complex): number {
  return Math.hypot(z.re, z.im);
}

/** The argument of z in radians, in (−π, π]. */
export function cArg(z: Complex): number {
  // atan2(−0, −1) is −π; keep the half-open interval.
  return z.im === 0 && z.re < 0 ? Math.PI : Math.atan2(z.im, z.re);
}

/** Parts below this are rounding noise, not a real imaginary part. */
const NOISE = 1e-12;

function parts(z: Complex, significant: number, minus: string): string {
  const num = (x: number) => String(Number(x.toPrecision(significant))).replace('-', minus);
  const im = Math.abs(z.im) < NOISE * Math.max(1, Math.abs(z.re)) ? 0 : z.im;
  const re = Math.abs(z.re) < NOISE * Math.max(1, Math.abs(z.im)) && im !== 0 ? 0 : z.re;
  if (im === 0) return num(re);
  const mag = Math.abs(im);
  const imText = Number(mag.toPrecision(significant)) === 1 ? 'i' : `${num(mag)}i`;
  if (re === 0) return im < 0 ? `${minus}${imText}` : imText;
  return `${num(re)} ${im < 0 ? minus : '+'} ${imText}`;
}

/** Plain text with a chosen number of significant digits: "−0.5 + 0.866i", "2", "−i". Imaginary parts below 1e-12 are dropped. */
export function formatComplex(z: Complex, significant = 4): string {
  return parts(z, significant, '−');
}

/** TeX form of formatComplex: "-0.5 + 0.866i". */
export function complexTex(z: Complex, significant = 4): string {
  return parts(z, significant, '-');
}
