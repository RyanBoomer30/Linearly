import { useMemo } from 'react';
import { useLesson6System, type Lesson6System } from '../../store/useLesson6System';
import { attempt, type Pending } from '../../store/useSystem';

/**
 * Parse the Lesson 6 MDP, then run a view-model. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useLesson6<T>(fn: (system: Lesson6System) => T, deps: unknown[] = []): Pending<T> {
  const system = useLesson6System();
  return useMemo(() => {
    if (!system.ok) return system;
    return attempt(() => fn(system.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, ...deps]);
}
