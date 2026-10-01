import { useMemo } from 'react';
import { attempt, useSystem, type Pending } from '../../store/useSystem';
import type { Matrix, Vector } from '../../core/matrix';

/**
 * Parse the editor, then run a view-model. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useViewModel<T>(fn: (A: Matrix, b: Vector | null) => T, deps: unknown[] = []): Pending<T> {
  const system = useSystem();
  return useMemo(() => {
    if (!system.ok) return system;
    return attempt(() => fn(system.value.A, system.value.b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, ...deps]);
}
