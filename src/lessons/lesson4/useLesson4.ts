import { useMemo } from 'react';
import { useLesson4System, type Lesson4System } from '../../store/useLesson4System';
import { attempt, type Pending } from '../../store/useSystem';

/**
 * Parse the Lesson 4 editors, then run a view-model. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useLesson4<T>(fn: (system: Lesson4System) => T, deps: unknown[] = []): Pending<T> {
  const system = useLesson4System();
  return useMemo(() => {
    if (!system.ok) return system;
    return attempt(() => fn(system.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, ...deps]);
}
