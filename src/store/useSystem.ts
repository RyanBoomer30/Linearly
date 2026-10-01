import { useMemo } from 'react';
import type { Matrix, Vector } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';
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
  return notImplemented('parseSystem');
}

export function useSystem(): Pending<ParsedSystem> {
  const aCells = useStore((s) => s.aCells);
  const bCells = useStore((s) => s.bCells);
  return useMemo(() => attempt(() => parseSystem(aCells, bCells)), [aCells, bCells]);
}
