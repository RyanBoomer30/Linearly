import { useMemo } from 'react';
import type { Matrix, Vector } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';
import { useLesson5Store } from './useLesson5Store';
import { attempt, type Pending } from './useSystem';

export interface Lesson5System {
  /** Exact, so decimals such as 0.7 become 7/10 (F-M11). */
  P: Matrix;
  x0: Vector;
  invalid: { P: [number, number][]; x0: number[] };
}

/** Parse the chain editors exactly (F-E2); bad cells are flagged and read as 0. */
export function parseLesson5(pCells: string[][], x0Cells: string[]): Lesson5System {
  return notImplemented('parseLesson5');
}

export function useLesson5System(): Pending<Lesson5System> {
  const pCells = useLesson5Store((s) => s.pCells);
  const x0Cells = useLesson5Store((s) => s.x0Cells);
  return useMemo(() => attempt(() => parseLesson5(pCells, x0Cells)), [pCells, x0Cells]);
}
