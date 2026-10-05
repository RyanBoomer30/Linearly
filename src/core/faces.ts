import type { FloatMatrix, FloatVector } from './float';
import { notImplemented } from './notImplemented';

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
  return notImplemented('generateFaces');
}

/** F-M54, L7-F1: unroll each a × b image row by row into a row of length ab, stacked into N × ab. */
export function flattenImages(images: FloatMatrix[]): FloatMatrix {
  return notImplemented('flattenImages');
}

/** Back from a row of length rows·cols to an image. */
export function unflatten(row: FloatVector, rows: number, cols: number): FloatMatrix {
  return notImplemented('unflatten');
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
  return notImplemented('eigenfaces');
}

/** ỹ = (y − μ) V_pca. */
export function projectFace(face: FloatVector, faces: Eigenfaces): FloatVector {
  return notImplemented('projectFace');
}

/** μ + w V_pcaᵀ. */
export function reconstructFace(weights: FloatVector, faces: Eigenfaces): FloatVector {
  return notImplemented('reconstructFace');
}

/** The k rows of W closest to `query` (Euclidean), nearest first. */
export function nearestFaces(W: FloatMatrix, query: FloatVector, k: number): { index: number; distance: number }[] {
  return notImplemented('nearestFaces');
}
