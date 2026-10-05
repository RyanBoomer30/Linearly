import { useMemo } from 'react';
import { parseLesson7, type Lesson7System } from './parseLesson7';
import { useLesson7Store } from './useLesson7Store';
import { attempt, type Pending } from './useSystem';

export { parseLesson7, type Lesson7System } from './parseLesson7';

export function useLesson7System(): Pending<Lesson7System> {
  const svdCells = useLesson7Store((s) => s.svdCells);
  const pcaCells = useLesson7Store((s) => s.pcaCells);
  const shift = useLesson7Store((s) => s.shift);
  return useMemo(() => attempt(() => parseLesson7(svdCells, pcaCells, shift)), [svdCells, pcaCells, shift]);
}
