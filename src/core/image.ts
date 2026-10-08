import type { FloatMatrix } from './float';

/*
 * F-M53: image utilities. An image is a grayscale FloatMatrix with one row per
 * pixel row, values 0 (black) … 255 (white). Decoding uses the browser's
 * Canvas API; uploads never leave the browser.
 */

/** Luma 0.299R + 0.587G + 0.114B from RGBA bytes (alpha ignored). */
export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): FloatMatrix {
  return Array.from({ length: height }, (_, i) =>
    Array.from({ length: width }, (_, j) => {
      const p = 4 * (i * width + j);
      return 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    }),
  );
}

/** Scale down (area averaging) so the long side is at most `maxSide`; smaller images are returned unchanged. */
export function resizeToFit(M: FloatMatrix, maxSide: number): FloatMatrix {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const long = Math.max(rows, cols);
  if (long <= maxSide) return M;
  const scale = maxSide / long;
  const R = Math.max(1, Math.round(rows * scale));
  const C = Math.max(1, Math.round(cols * scale));
  // Area averaging: each target pixel is the mean of the source block it covers.
  return Array.from({ length: R }, (_, i) => {
    const r0 = Math.floor((i * rows) / R);
    const r1 = Math.max(r0 + 1, Math.floor(((i + 1) * rows) / R));
    return Array.from({ length: C }, (_, j) => {
      const c0 = Math.floor((j * cols) / C);
      const c1 = Math.max(c0 + 1, Math.floor(((j + 1) * cols) / C));
      let sum = 0;
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) sum += M[r][c];
      return sum / ((r1 - r0) * (c1 - c0));
    });
  });
}

/** Resize to exactly rows × cols (bilinear), for face sets of a common size. */
export function resizeTo(M: FloatMatrix, rows: number, cols: number): FloatMatrix {
  const R0 = M.length;
  const C0 = M[0]?.length ?? 0;
  const at = (r: number, c: number) => M[Math.min(R0 - 1, Math.max(0, r))][Math.min(C0 - 1, Math.max(0, c))];
  return Array.from({ length: rows }, (_, i) => {
    const y = rows === 1 ? 0 : (i * (R0 - 1)) / (rows - 1);
    const y0 = Math.floor(y);
    const fy = y - y0;
    return Array.from({ length: cols }, (_, j) => {
      const x = cols === 1 ? 0 : (j * (C0 - 1)) / (cols - 1);
      const x0 = Math.floor(x);
      const fx = x - x0;
      return (1 - fy) * ((1 - fx) * at(y0, x0) + fx * at(y0, x0 + 1)) + fy * ((1 - fx) * at(y0 + 1, x0) + fx * at(y0 + 1, x0 + 1));
    });
  });
}

/** Gray values rounded and clipped to 0 … 255, as RGBA bytes for a canvas. */
export function toPixels(M: FloatMatrix): Uint8ClampedArray {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const out = new Uint8ClampedArray(rows * cols * 4);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const g = Math.round(Math.min(255, Math.max(0, M[i][j])));
      const p = 4 * (i * cols + j);
      out[p] = out[p + 1] = out[p + 2] = g;
      out[p + 3] = 255;
    }
  return out;
}

/**
 * For signed matrices (layers, eigenfaces, A − Aₖ): map −max|x| … +max|x| to
 * 0 … 255 so 0 is mid-gray, as RGBA bytes.
 */
export function toSignedPixels(M: FloatMatrix): Uint8ClampedArray {
  let max = 0;
  for (const row of M) for (const x of row) max = Math.max(max, Math.abs(x));
  return toPixels(M.map((row) => row.map((x) => (max === 0 ? 127.5 : 127.5 + (127.5 * x) / max))));
}

/** Decode an uploaded file or a URL into a grayscale matrix scaled to at most `maxSide` (L7-I1). */
export async function decodeImage(source: Blob | string, maxSide = 1024): Promise<FloatMatrix> {
  const bitmap = typeof source === 'string' ? await createImageBitmap(await (await fetch(source)).blob()) : await createImageBitmap(source);
  // Let the browser scale (it filters well); then read the pixels and convert to gray.
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot read image pixels');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return toGrayscale(ctx.getImageData(0, 0, width, height).data, width, height);
}

/**
 * A synthetic grayscale test picture (gradients, circles and stripes of
 * several sizes) whose singular values fall off gradually, so compression has
 * something to show without any external file.
 */
export function testPattern(rows: number, cols: number): FloatMatrix {
  const cx = cols / 2;
  const cy = rows / 2;
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      const u = j / cols;
      const t = i / rows;
      // A sky-to-ground gradient, a big soft disc, a wave-shaped horizon, and stripes and checks of several sizes.
      let g = 70 + 110 * t;
      const disc = Math.hypot(j - cols * 0.72, i - rows * 0.3) / (rows * 0.16);
      if (disc < 1) g = 235 - 40 * disc * disc;
      const horizon = rows * (0.62 + 0.08 * Math.sin(u * 9) + 0.03 * Math.sin(u * 31));
      if (i > horizon) g = 40 + 50 * Math.sin(u * 60 + t * 8) ** 2;
      if (j < cols * 0.25 && i < rows * 0.5) g = (Math.floor(j / 6) + Math.floor(i / 6)) % 2 ? 210 : 60;
      if (Math.abs(i - cy) < rows * 0.04 && j > cx * 0.3 && j < cx * 1.1) g = 250 * (0.5 + 0.5 * Math.sin(j / 2));
      return Math.min(255, Math.max(0, g));
    }),
  );
}
