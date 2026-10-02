import { useMemo } from 'react';
import { useDataset } from '../../store/useDataset';
import { useDataStore } from '../../store/useDataStore';
import { attempt, type Pending } from '../../store/useSystem';
import { lessonData, type LessonData } from './models';

/** Parse the table and fit the shared model once; every Lesson 2 view starts from this. */
export function useLessonDataRoot(): Pending<LessonData> {
  const parsed = useDataset();
  const model = useDataStore((s) => s.model);
  return useMemo(() => {
    if (!parsed.ok) return parsed;
    return attempt(() => lessonData(parsed.value.dataset, model));
  }, [parsed, model]);
}

/**
 * Run a view-model on the shared LessonData. Any stub that is not yet
 * implemented surfaces as `{ ok: false, error }` instead of crashing the view.
 */
export function useLessonData<T>(fn: (data: LessonData) => T, deps: unknown[] = []): Pending<T> {
  const data = useLessonDataRoot();
  return useMemo(() => {
    if (!data.ok) return data;
    return attempt(() => fn(data.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ...deps]);
}
