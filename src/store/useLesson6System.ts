import { useMemo } from 'react';
import { parseLesson6, type Lesson6System } from './parseLesson6';
import { useLesson6Store } from './useLesson6Store';
import { attempt, type Pending } from './useSystem';

export { parseLesson6, type Lesson6Inputs, type Lesson6System } from './parseLesson6';

export function useLesson6System(): Pending<Lesson6System> {
  const rows = useLesson6Store((s) => s.rows);
  const cols = useLesson6Store((s) => s.cols);
  const walls = useLesson6Store((s) => s.walls);
  const rewardCells = useLesson6Store((s) => s.rewardCells);
  const terminals = useLesson6Store((s) => s.terminals);
  const start = useLesson6Store((s) => s.start);
  const slip = useLesson6Store((s) => s.slip);
  const gamma = useLesson6Store((s) => s.gamma);
  const livingReward = useLesson6Store((s) => s.livingReward);
  const policyCells = useLesson6Store((s) => s.policyCells);
  return useMemo(
    () => attempt(() => parseLesson6({ rows, cols, walls, rewardCells, terminals, start, slip, gamma, livingReward, policyCells })),
    [rows, cols, walls, rewardCells, terminals, start, slip, gamma, livingReward, policyCells],
  );
}
