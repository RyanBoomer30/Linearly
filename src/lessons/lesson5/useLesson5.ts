import { useMemo } from 'react';
import { useLesson5System, type Lesson5System } from '../../store/useLesson5System';
import { attempt, type Pending } from '../../store/useSystem';

/**
 * Parse the Lesson 5 chain, then run a view-model. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useLesson5<T>(fn: (system: Lesson5System) => T, deps: unknown[] = []): Pending<T> {
  const system = useLesson5System();
  return useMemo(() => {
    if (!system.ok) return system;
    return attempt(() => fn(system.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, ...deps]);
}
