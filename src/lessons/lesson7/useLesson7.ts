import { useMemo } from 'react';
import { useLesson7System, type Lesson7System } from '../../store/useLesson7System';
import { attempt, type Pending } from '../../store/useSystem';

/**
 * Parse the Lesson 7 inputs, then run a view-model. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useLesson7<T>(fn: (system: Lesson7System) => T, deps: unknown[] = []): Pending<T> {
  const system = useLesson7System();
  return useMemo(() => {
    if (!system.ok) return system;
    return attempt(() => fn(system.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, ...deps]);
}
