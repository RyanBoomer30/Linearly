import type { FloatMatrix, FloatVector } from './float';
import { mulberry32 } from './random';
import { svdLarge } from './svdLarge';

/** F-M55: a generated face set; no real person is shown. */
export interface FaceSet {
  /** Each face is size × size gray values 0 … 255. */
  images: FloatMatrix[];
  /** 0-based person of each image, and which variation it is. */
  person: number[];
  variation: number[];
  size: number;
  people: number;
}

export interface FaceSetOptions {
  people: number;
  variations: number;
  size: number;
  seed: number;
}

/**
 * F-M55: simple grayscale faces for made-up people (face shape, eye spacing,
 * nose, mouth and hair vary by person), each with variations in lighting,
 * expression and small shifts, all from a seed.
 */
export function generateFaces(options: FaceSetOptions): FaceSet {
  const { people, variations, size, seed } = options;
  const rng = mulberry32(seed);
  const between = (lo: number, hi: number) => lo + (hi - lo) * rng();
  // Who someone is: proportions and tones that stay fixed across that person's photos.
  const persons = Array.from({ length: people }, () => ({
    faceW: between(0.27, 0.37),
    faceH: between(0.36, 0.46),
    skin: between(150, 215),
    hair: between(20, 110),
    hairline: between(0.16, 0.3),
    eyeY: between(0.38, 0.46),
    eyeGap: between(0.1, 0.17),
    eyeR: between(0.03, 0.055),
    brow: between(0.02, 0.05),
    noseLen: between(0.08, 0.16),
    mouthY: between(0.66, 0.76),
    mouthW: between(0.08, 0.16),
    beard: rng() < 0.3 ? between(0.4, 0.8) : 0,
  }));
  const images: FloatMatrix[] = [];
  const person: number[] = [];
  const variation: number[] = [];
  persons.forEach((p, who) => {
    for (let k = 0; k < variations; k++) {
      // How this photo differs: light from the side, a smile, a small shift, a little noise.
      const light = between(-0.25, 0.25);
      const brightness = between(-15, 15);
      const smile = between(-0.03, 0.05);
      const dx = between(-0.03, 0.03);
      const dy = between(-0.03, 0.03);
      const img = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
          const x = j / size - 0.5 - dx;
          const y = i / size - dy;
          let g = 235;
          const inFace = (x / p.faceW) ** 2 + ((y - 0.52) / p.faceH) ** 2 <= 1;
          if (inFace) {
            g = p.skin;
            if (y < p.hairline + 0.1 && (x / (p.faceW * 1.05)) ** 2 + ((y - 0.5) / (p.faceH * 1.08)) ** 2 <= 1) g = p.hair;
            for (const side of [-1, 1]) {
              const ex = x - side * p.eyeGap;
              if ((ex / p.eyeR) ** 2 + ((y - p.eyeY) / (p.eyeR * 0.7)) ** 2 <= 1) g = 35;
              if (Math.abs(ex) < p.eyeR * 1.4 && Math.abs(y - (p.eyeY - p.eyeR * 1.6)) < p.brow / 2) g = p.hair * 0.8;
            }
            if (Math.abs(x) < 0.012 && y > p.eyeY && y < p.eyeY + p.noseLen) g = p.skin - 45;
            const mouthCurve = p.mouthY + smile * (1 - (x / p.mouthW) ** 2);
            if (Math.abs(x) < p.mouthW && Math.abs(y - mouthCurve) < 0.014) g = 70;
            if (p.beard && y > p.mouthY + 0.03) g = g * (1 - p.beard) + p.hair * p.beard;
          } else if (y < p.hairline + 0.05 && (x / (p.faceW * 1.15)) ** 2 + ((y - 0.48) / (p.faceH * 1.12)) ** 2 <= 1) {
            g = p.hair;
          }
          g = g * (1 + light * x * 2) + brightness + (rng() - 0.5) * 8;
          return Math.min(255, Math.max(0, g));
        }),
      );
      images.push(img);
      person.push(who);
      variation.push(k);
    }
  });
  return { images, person, variation, size, people };
}

/** F-M54, L7-F1: unroll each a × b image row by row into a row of length ab, stacked into N × ab. */
export function flattenImages(images: FloatMatrix[]): FloatMatrix {
  return images.map((img) => img.flat());
}

/** Back from a row of length rows·cols to an image. */
export function unflatten(row: FloatVector, rows: number, cols: number): FloatMatrix {
  return Array.from({ length: rows }, (_, i) => Array.from(row.slice(i * cols, (i + 1) * cols)));
}

export interface Eigenfaces {
  /** μ, the mean face (length n). */
  mean: FloatVector;
  /** The first m components as the columns of n × m V_pca, from the thin SVD of the centered N × n matrix. */
  components: FloatMatrix;
  /** Singular values of the centered matrix (all of them, for the variance explained). */
  sigma: FloatVector;
  /** W = U V_pca: each face's coordinates (N × m). */
  weights: FloatMatrix;
}

/**
 * F-M54: eigenfaces from the thin SVD of the centered rows — never the n × n
 * covariance matrix. Throws when m exceeds the rank available.
 */
export function eigenfaces(rows: FloatMatrix, m: number): Eigenfaces {
  const N = rows.length;
  const n = rows[0]?.length ?? 0;
  if (N < 2) throw new RangeError('Eigenfaces need at least 2 faces');
  const mean = Array.from({ length: n }, (_, j) => rows.reduce((acc, r) => acc + r[j], 0) / N);
  const centered = rows.map((r) => r.map((x, j) => x - mean[j]));
  // The thin SVD of the N × n centered matrix — never the n × n covariance matrix.
  const svd = svdLarge(centered);
  const available = svd.sigma.filter((s) => s > 1e-9 * (svd.sigma[0] || 1)).length;
  if (m < 1 || m > available) throw new RangeError(`Only ${available} components are available from ${N} faces; m = ${m}`);
  const components = svd.V.map((row) => row.slice(0, m));
  const weights = centered.map((r) => Array.from({ length: m }, (_, j) => r.reduce((acc, x, k) => acc + x * components[k][j], 0)));
  return { mean, components, sigma: svd.sigma, weights };
}

/** ỹ = (y − μ) V_pca. */
export function projectFace(face: FloatVector, faces: Eigenfaces): FloatVector {
  const m = faces.components[0]?.length ?? 0;
  return Array.from({ length: m }, (_, j) => face.reduce((acc, x, k) => acc + (x - faces.mean[k]) * faces.components[k][j], 0));
}

/** μ + w V_pcaᵀ. */
export function reconstructFace(weights: FloatVector, faces: Eigenfaces): FloatVector {
  return faces.mean.map((mu, k) => mu + weights.reduce((acc, w, j) => acc + w * faces.components[k][j], 0));
}

/** The k rows of W closest to `query` (Euclidean), nearest first. */
export function nearestFaces(W: FloatMatrix, query: FloatVector, k: number): { index: number; distance: number }[] {
  return W.map((row, index) => ({ index, distance: Math.hypot(...row.map((w, j) => w - query[j])) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
}
