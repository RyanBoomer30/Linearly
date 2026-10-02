import { useMemo } from 'react';
import type { Matrix, Vector } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';
import { useLesson3Store } from './useLesson3Store';
import { attempt, type Pending } from './useSystem';

export interface Lesson3System {
  A: Matrix;
  rhs: Vector[];
  B: Matrix;
  C: Matrix;
  /** Invalid cells per grid, [row, col]; for rhs, [k, i]. */
  invalid: { A: [number, number][]; rhs: [number, number][]; B: [number, number][]; C: [number, number][] };
}

/** Parse every Lesson 3 grid into exact matrices (F-E2); bad cells are flagged and read as 0. */
export function parseLesson3(aCells: string[][], rhsCells: string[][], bCells: string[][], cCells: string[][]): Lesson3System {
  return notImplemented('parseLesson3');
}

export function useLesson3System(): Pending<Lesson3System> {
  const aCells = useLesson3Store((s) => s.aCells);
  const rhsCells = useLesson3Store((s) => s.rhsCells);
  const bCells = useLesson3Store((s) => s.bCells);
  const cCells = useLesson3Store((s) => s.cCells);
  return useMemo(() => attempt(() => parseLesson3(aCells, rhsCells, bCells, cCells)), [aCells, rhsCells, bCells, cCells]);
}
