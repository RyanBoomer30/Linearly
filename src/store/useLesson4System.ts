import { useMemo } from 'react';
import type { Matrix, Vector } from '../core/matrix';
import { Rational } from '../core/rational';
import { useLesson4Store } from './useLesson4Store';
import { attempt, type Pending } from './useSystem';

export interface Lesson4System {
  A: Matrix;
  b: Vector;
  /** §8.1 vectors. */
  x: Vector;
  w: Vector;
  y: Vector;
  invalid: { A: [number, number][]; b: number[]; x: number[]; w: number[]; y: number[] };
}

/** Parse the Lesson 4 editors exactly (F-E2); bad cells are flagged and read as 0. */
export function parseLesson4(aCells: string[][], bCells: string[], xCells: string[], wCells: string[], yCells: string[]): Lesson4System {
  const cell = (text: string, flag: () => void) => {
    const r = Rational.parse(text);
    if (r) return r;
    flag();
    return Rational.ZERO;
  };
  const invalidA: [number, number][] = [];
  const A = aCells.map((row, i) => row.map((t, j) => cell(t, () => invalidA.push([i, j]))));
  const list = (cells: string[]) => {
    const invalid: number[] = [];
    return { values: cells.map((t, i) => cell(t, () => invalid.push(i))), invalid };
  };
  const b = list(bCells);
  const x = list(xCells);
  const w = list(wCells);
  const y = list(yCells);
  return { A, b: b.values, x: x.values, w: w.values, y: y.values, invalid: { A: invalidA, b: b.invalid, x: x.invalid, w: w.invalid, y: y.invalid } };
}

export function useLesson4System(): Pending<Lesson4System> {
  const { aCells, bCells, xCells, wCells, yCells } = useLesson4Store();
  return useMemo(() => attempt(() => parseLesson4(aCells, bCells, xCells, wCells, yCells)), [aCells, bCells, xCells, wCells, yCells]);
}
