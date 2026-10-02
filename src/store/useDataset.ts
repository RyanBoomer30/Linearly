import { useMemo } from 'react';
import { notImplemented } from '../core/notImplemented';
import type { Dataset, VariableInfo } from '../core/regression';
import { useDataStore } from './useDataStore';
import { attempt, type Pending } from './useSystem';

export interface ParsedDataset {
  dataset: Dataset;
  /** [row, col] of every cell that failed to parse (F-T3: highlighted, never silently dropped). */
  invalid: [number, number][];
}

/** F-M11: parse the table strings into an exact Dataset (2.25 → 9/4). */
export function parseDataset(
  columns: VariableInfo[],
  targetCol: number,
  cells: string[][],
  rowLabels: string[],
): ParsedDataset {
  return notImplemented('parseDataset');
}

export function useDataset(): Pending<ParsedDataset> {
  const columns = useDataStore((s) => s.columns);
  const targetCol = useDataStore((s) => s.targetCol);
  const cells = useDataStore((s) => s.cells);
  const rowLabels = useDataStore((s) => s.rowLabels);
  return useMemo(
    () => attempt(() => parseDataset(columns, targetCol, cells, rowLabels)),
    [columns, targetCol, cells, rowLabels],
  );
}
