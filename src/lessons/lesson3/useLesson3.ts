import { useMemo } from 'react';
import { useLesson3System, type Lesson3System } from '../../store/useLesson3System';
import { attempt, type Pending } from '../../store/useSystem';

/**
 * Parse the Lesson 3 grids, then run a view-model. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useLesson3<T>(fn: (system: Lesson3System) => T, deps: unknown[] = []): Pending<T> {
  const system = useLesson3System();
  return useMemo(() => {
    if (!system.ok) return system;
    return attempt(() => fn(system.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, ...deps]);
}
