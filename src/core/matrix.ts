import { Rational, q } from './rational';

/** Row-major matrix over Rational (F-M2). */
export type Matrix = Rational[][];
export type Vector = Rational[];

export type Scalarish = number | string | Rational;

const toRational = (x: Scalarish): Rational => (x instanceof Rational ? x : q(x));

/** Build a matrix from numbers / fraction strings, e.g. matrix([[1, '1/2'], [0, 3]]). */
export function matrix(rows: Scalarish[][]): Matrix {
  const cols = rows[0]?.length ?? 0;
  if (rows.some((r) => r.length !== cols)) throw new RangeError('matrix: rows have different lengths');
  return rows.map((r) => r.map(toRational));
}

export function vector(entries: Scalarish[]): Vector {
  return entries.map(toRational);
}

export function shape(A: Matrix): { rows: number; cols: number } {
  return { rows: A.length, cols: A[0]?.length ?? 0 };
}

export function zeros(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => Array<Rational>(cols).fill(Rational.ZERO));
}

export function zeroVector(n: number): Vector {
  return Array<Rational>(n).fill(Rational.ZERO);
}

export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Rational.ONE : Rational.ZERO)));
}

export function cloneMatrix(A: Matrix): Matrix {
  return A.map((r) => [...r]);
}

export function getRow(A: Matrix, i: number): Vector {
  return [...A[i]];
}

export function getColumn(A: Matrix, j: number): Vector {
  return A.map((r) => r[j]);
}

/** Build a matrix whose columns are the given vectors. */
export function fromColumns(cols: Vector[]): Matrix {
  const m = cols[0]?.length ?? 0;
  return Array.from({ length: m }, (_, i) => cols.map((c) => c[i]));
}

export function transpose(A: Matrix): Matrix {
  const { rows, cols } = shape(A);
  return Array.from({ length: cols }, (_, j) => Array.from({ length: rows }, (_, i) => A[i][j]));
}

/** [A | b] as a single m × (n+1) matrix. */
export function augment(A: Matrix, b: Vector): Matrix {
  if (A.length !== b.length) throw new RangeError('augment: b must have one entry per row of A');
  return A.map((r, i) => [...r, b[i]]);
}

/** Split an augmented matrix back into [A, b]. */
export function splitAugmented(Ab: Matrix): [Matrix, Vector] {
  return [Ab.map((r) => r.slice(0, -1)), Ab.map((r) => r[r.length - 1])];
}

export function matrixEquals(A: Matrix, B: Matrix): boolean {
  return A.length === B.length && A.every((r, i) => vectorEquals(r, B[i]));
}

export function vectorEquals(u: Vector, v: Vector): boolean {
  return u.length === v.length && u.every((x, i) => x.equals(v[i]));
}

export function isZeroVector(v: Vector): boolean {
  return v.every((x) => x.isZero());
}

/** Floating point copy for rendering. */
export function toFloatMatrix(A: Matrix): number[][] {
  return A.map(toFloatVector);
}

export function toFloatVector(v: Vector): number[] {
  return v.map((x) => x.toNumber());
}

/** Exact string form for tests and debugging, e.g. [['1', '-1/2']]. */
export function matrixToStrings(A: Matrix): string[][] {
  return A.map(vectorToStrings);
}

export function vectorToStrings(v: Vector): string[] {
  return v.map((x) => x.toString());
}
