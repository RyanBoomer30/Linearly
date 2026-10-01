import { notImplemented } from './notImplemented';
import type { Rational } from './rational';

/** Row-major matrix over Rational (F-M2). */
export type Matrix = Rational[][];
export type Vector = Rational[];

export type Scalarish = number | string | Rational;

/** Build a matrix from numbers / fraction strings, e.g. matrix([[1, '1/2'], [0, 3]]). */
export function matrix(rows: Scalarish[][]): Matrix {
  return notImplemented('matrix');
}

export function vector(entries: Scalarish[]): Vector {
  return notImplemented('vector');
}

export function shape(A: Matrix): { rows: number; cols: number } {
  return notImplemented('shape');
}

export function zeros(rows: number, cols: number): Matrix {
  return notImplemented('zeros');
}

export function identity(n: number): Matrix {
  return notImplemented('identity');
}

export function cloneMatrix(A: Matrix): Matrix {
  return notImplemented('cloneMatrix');
}

export function getRow(A: Matrix, i: number): Vector {
  return notImplemented('getRow');
}

export function getColumn(A: Matrix, j: number): Vector {
  return notImplemented('getColumn');
}

/** Build a matrix whose columns are the given vectors. */
export function fromColumns(cols: Vector[]): Matrix {
  return notImplemented('fromColumns');
}

export function transpose(A: Matrix): Matrix {
  return notImplemented('transpose');
}

/** [A | b] as a single m × (n+1) matrix. */
export function augment(A: Matrix, b: Vector): Matrix {
  return notImplemented('augment');
}

/** Split an augmented matrix back into [A, b]. */
export function splitAugmented(Ab: Matrix): [Matrix, Vector] {
  return notImplemented('splitAugmented');
}

export function matrixEquals(A: Matrix, B: Matrix): boolean {
  return notImplemented('matrixEquals');
}

export function vectorEquals(u: Vector, v: Vector): boolean {
  return notImplemented('vectorEquals');
}

export function isZeroVector(v: Vector): boolean {
  return notImplemented('isZeroVector');
}

/** Floating point copy for rendering. */
export function toFloatMatrix(A: Matrix): number[][] {
  return notImplemented('toFloatMatrix');
}

export function toFloatVector(v: Vector): number[] {
  return notImplemented('toFloatVector');
}

/** Exact string form for tests and debugging, e.g. [['1', '-1/2']]. */
export function matrixToStrings(A: Matrix): string[][] {
  return notImplemented('matrixToStrings');
}

export function vectorToStrings(v: Vector): string[] {
  return notImplemented('vectorToStrings');
}
