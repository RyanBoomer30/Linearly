import { useMemo } from 'react';
import type { Matrix, Vector } from '../core/matrix';
import { Rational } from '../core/rational';
import { useStore } from './useStore';

export type Pending<T> = { ok: true; value: T } | { ok: false; error: string };

/** Run a computation, capturing "Not implemented" (or any) errors for display. */
export function attempt<T>(fn: () => T): Pending<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ParsedSystem {
  A: Matrix;
  b: Vector | null;
  /** [row, col] of every cell that failed to parse; col = n means the b column. */
  invalid: [number, number][];
}

/** Parse the editor strings into exact matrices (F-E2). */
export function parseSystem(aCells: string[][], bCells: string[] | null): ParsedSystem {
  const invalid: [number, number][] = [];
  const n = aCells[0]?.length ?? 0;
  // Invalid cells are flagged and read as 0 so the views keep drawing.
  const cell = (text: string, row: number, col: number) => {
    const r = Rational.parse(text);
    if (r) return r;
    invalid.push([row, col]);
    return Rational.ZERO;
  };
  const A = aCells.map((row, i) => row.map((text, j) => cell(text, i, j)));
  const b = bCells ? bCells.map((text, i) => cell(text, i, n)) : null;
  return { A, b, invalid };
}

export function useSystem(): Pending<ParsedSystem> {
  const aCells = useStore((s) => s.aCells);
  const bCells = useStore((s) => s.bCells);
  return useMemo(() => attempt(() => parseSystem(aCells, bCells)), [aCells, bCells]);
}
