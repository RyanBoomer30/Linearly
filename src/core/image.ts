import type { FloatMatrix } from './float';
import { notImplemented } from './notImplemented';

/*
 * F-M53: image utilities. An image is a grayscale FloatMatrix with one row per
 * pixel row, values 0 (black) … 255 (white). Decoding uses the browser's
 * Canvas API; uploads never leave the browser.
 */

/** Luma 0.299R + 0.587G + 0.114B from RGBA bytes (alpha ignored). */
export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): FloatMatrix {
  return notImplemented('toGrayscale');
}

/** Scale down (area averaging) so the long side is at most `maxSide`; smaller images are returned unchanged. */
export function resizeToFit(M: FloatMatrix, maxSide: number): FloatMatrix {
  return notImplemented('resizeToFit');
}

/** Resize to exactly rows × cols (bilinear), for face sets of a common size. */
export function resizeTo(M: FloatMatrix, rows: number, cols: number): FloatMatrix {
  return notImplemented('resizeTo');
}

/** Gray values rounded and clipped to 0 … 255, as RGBA bytes for a canvas. */
export function toPixels(M: FloatMatrix): Uint8ClampedArray {
  return notImplemented('toPixels');
}

/**
 * For signed matrices (layers, eigenfaces, A − Aₖ): map −max|x| … +max|x| to
 * 0 … 255 so 0 is mid-gray, as RGBA bytes.
 */
export function toSignedPixels(M: FloatMatrix): Uint8ClampedArray {
  return notImplemented('toSignedPixels');
}

/** Decode an uploaded file or a URL into a grayscale matrix scaled to at most `maxSide` (L7-I1). */
export async function decodeImage(source: Blob | string, maxSide = 1024): Promise<FloatMatrix> {
  return notImplemented('decodeImage');
}

/**
 * A synthetic grayscale test picture (gradients, circles and stripes of
 * several sizes) whose singular values fall off gradually, so compression has
 * something to show without any external file.
 */
export function testPattern(rows: number, cols: number): FloatMatrix {
  return notImplemented('testPattern');
}
