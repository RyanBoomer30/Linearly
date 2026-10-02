import { tick } from './counter';
import { augment, cloneMatrix, identity, shape, splitAugmented, zeros, type Matrix, type Vector } from './matrix';
import { matMul, outer } from './products';
import { Rational } from './rational';
import { describeRowOp } from './rowops';
import type { Cell, TraceStep } from './trace';
import type { Swap } from './permutation';

/** F-M17: when to exchange rows. */
export type Pivoting = 'none' | 'zero-only' | 'partial';

export type LuOp =
  | { kind: 'swap'; i: number; j: number }
  /** row[target] ← row[target] − multiplier · row[source]; the multiplier is L[target][source]. */
  | { kind: 'eliminate'; target: number; source: number; multiplier: Rational };

export interface LuStep extends TraceStep<LuOp> {
  /** L so far: 1s on the diagonal, multipliers found so far below it (L3-LU2). */
  L: Matrix;
  /** P so far: every swap made so far. */
  P: Matrix;
  /** Compact storage: the current matrix with multipliers in place of the zeros below the diagonal (L3-LU4). */
  compact: Matrix;
}

export type LuStatus =
  | { kind: 'complete' }
  /** A has no nonzero pivot in this column: LU exists but U is singular (L3-LU7). */
  | { kind: 'singular'; column: number }
  /** No pivoting and a zero pivot with a nonzero entry below: a row exchange is needed (L3-LU6). */
  | { kind: 'stopped'; column: number; reason: string };

export interface LuResult {
  P: Matrix;
  L: Matrix;
  U: Matrix;
  /** U with the multipliers stored below the diagonal. */
  compact: Matrix;
  swaps: Swap[];
  /** Every multiplier, in the order found. */
  multipliers: { row: number; col: number; value: Rational }[];
  /** Pivot positions in U. */
  pivots: Cell[];
  /** The first step (op null) is A itself. */
  trace: { steps: LuStep[] };
  status: LuStatus;
}

/** Row to pivot on in column c, from row c down. */
function choosePivot(U: Matrix, c: number, pivoting: Pivoting): number {
  const n = U.length;
  if (pivoting === 'none') return c;
  if (pivoting === 'zero-only') {
    for (let r = c; r < n; r++) if (!U[r][c].isZero()) return r;
    return c;
  }
  let best = c;
  for (let r = c + 1; r < n; r++) if (U[r][c].abs().cmp(U[best][c].abs()) > 0) best = r;
  return best;
}

/** Subtract l × row `source` from row `target` in place, counting only the real multiplications. */
function subtractRow(M: Matrix, target: number, source: number, l: Rational, fromCol: number): void {
  M[target] = M[target].map((x, j) => {
    if (j < fromCol) return x;
    if (j === fromCol) return Rational.ZERO; // the entry being eliminated
    if (M[source][j].isZero()) return x; // multiplying by a known 0 is free
    tick();
    return x.sub(l.mul(M[source][j]));
  });
}

/** F-M17: PA = LU for square A. When stopped, P, L and U are as far as elimination got. */
export function lu(A: Matrix, options: { pivoting: Pivoting }): LuResult {
  const { rows: n, cols } = shape(A);
  if (n !== cols) throw new RangeError(`LU needs a square matrix; this one is ${n}×${cols}`);
  const U = cloneMatrix(A);
  const L = identity(n);
  const P = identity(n);
  const swaps: Swap[] = [];
  const multipliers: LuResult['multipliers'] = [];
  const pivots: Cell[] = [];
  let status: LuStatus = { kind: 'complete' };
  let done = 0; // columns whose multipliers are final

  const compactNow = () => U.map((r, i) => r.map((x, j) => (j < i && j < done ? L[i][j] : x)));
  const snapshot = (op: LuOp | null, description: string, tex: string, changedRows: number[], pivot?: Cell): LuStep => ({
    op,
    matrix: cloneMatrix(U),
    description,
    tex,
    changedRows,
    pivot,
    pivots: [...pivots],
    L: cloneMatrix(L),
    P: cloneMatrix(P),
    compact: compactNow(),
  });
  const steps: LuStep[] = [snapshot(null, 'Start with A', '', [])];

  for (let c = 0; c < n; c++) {
    const p = choosePivot(U, c, options.pivoting);
    if (U[p][c].isZero()) {
      const below = U.slice(c + 1).some((r) => !r[c].isZero());
      if (below) {
        status = {
          kind: 'stopped',
          column: c,
          reason: `The pivot in row ${c + 1} is 0, but a row below has a nonzero entry in column ${c + 1}: a row exchange is needed.`,
        };
        break;
      }
      // Nothing to eliminate in this column: U has a zero pivot here.
      if (status.kind === 'complete') status = { kind: 'singular', column: c };
      done = c + 1;
      continue;
    }
    const pivot = { row: c, col: c };
    if (p !== c) {
      [U[c], U[p]] = [U[p], U[c]];
      [P[c], P[p]] = [P[p], P[c]];
      // Multipliers already in L move with their rows (they are stored in place in compact form).
      for (let k = 0; k < c; k++) [L[c][k], L[p][k]] = [L[p][k], L[c][k]];
      swaps.push([c, p]);
      const { text, tex } = describeRowOp({ kind: 'swap', i: c, j: p });
      steps.push(snapshot({ kind: 'swap', i: c, j: p }, text, tex, [c, p], pivot));
    }
    pivots.push(pivot);
    for (let r = c + 1; r < n; r++) {
      if (U[r][c].isZero()) continue;
      tick(); // the multiplier is a division
      const l = U[r][c].div(U[c][c]);
      L[r][c] = l;
      multipliers.push({ row: r, col: c, value: l });
      subtractRow(U, r, c, l, c);
      const { text, tex } = describeRowOp({ kind: 'addMultiple', target: r, source: c, factor: l.neg() });
      steps.push(snapshot({ kind: 'eliminate', target: r, source: c, multiplier: l }, text, `${tex} \\quad l_{${r + 1}${c + 1}} = ${l.toTex()}`, [r], pivot));
    }
    done = c + 1;
  }
  // The last snapshot shows the final compact form, including the last column.
  steps[steps.length - 1].compact = compactNow();
  return { P, L, U, compact: compactNow(), swaps, multipliers, pivots, trace: { steps }, status };
}

/**
 * Eliminate [A | b] to [U | c] by hand (partial pivoting), without keeping L:
 * the "from scratch" strategy of L3-K2. Counts its operations.
 */
export function eliminateAugmented(A: Matrix, b: Vector, pivoting: Pivoting = 'partial'): { U: Matrix; c: Vector } {
  const M = augment(A, b);
  const n = A.length;
  for (let c = 0; c < n; c++) {
    const p = choosePivot(M, c, pivoting);
    if (M[p][c].isZero()) continue;
    if (p !== c) [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      if (M[r][c].isZero()) continue;
      tick();
      subtractRow(M, r, c, M[r][c].div(M[c][c]), c);
    }
  }
  const [U, c] = splitAugmented(M);
  return { U, c };
}

export interface LduResult {
  L: Matrix;
  D: Matrix;
  /** U divided row by row by its pivots: 1s on the diagonal. */
  U: Matrix;
  /** 0-based rows of U whose pivot is 0: D is singular there (L3-D3). */
  zeroPivots: number[];
}

/** F-M19: A = LDU from A = LU. Rows with a zero pivot are left as they are. */
export function ldu(L: Matrix, U: Matrix): LduResult {
  const n = U.length;
  const D = zeros(n, n);
  const zeroPivots: number[] = [];
  const newU = U.map((row, i) => {
    const d = row[i];
    D[i][i] = d;
    if (d.isZero()) {
      zeroPivots.push(i);
      return [...row];
    }
    return row.map((x) => x.div(d));
  });
  return { L: cloneMatrix(L), D, U: newU, zeroPivots };
}

/**
 * L3-LU3: A peeled into rank-1 pieces. Layer k is (column k of L)(row k of U);
 * remainders[k] = A − (layers 1 … k+1). With pivoting, A means PA.
 */
export function peel(L: Matrix, U: Matrix): { layers: Matrix[]; remainders: Matrix[] } {
  const n = U.length;
  const layers = Array.from({ length: n }, (_, k) => outer(L.map((r) => r[k]), U[k]));
  let rest = matMul(L, U);
  const remainders = layers.map((layer) => (rest = rest.map((r, i) => r.map((x, j) => x.sub(layer[i][j])))));
  return { layers, remainders };
}
