import { useMemo } from 'react';
import { parseLesson5, type Lesson5System } from './parseLesson5';
import { useLesson5Store } from './useLesson5Store';
import { attempt, type Pending } from './useSystem';

export { parseLesson5, type Lesson5System } from './parseLesson5';

export function useLesson5System(): Pending<Lesson5System> {
  const pCells = useLesson5Store((s) => s.pCells);
  const x0Cells = useLesson5Store((s) => s.x0Cells);
  return useMemo(() => attempt(() => parseLesson5(pCells, x0Cells)), [pCells, x0Cells]);
}
