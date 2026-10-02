import { useMemo } from 'react';
import { Rational } from '../core/rational';
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
  const invalid: [number, number][] = [];
  // Invalid cells are flagged and read as 0 so the views keep drawing.
  const cell = (text: string, row: number, col: number) => {
    const r = Rational.parse(text);
    if (r) return r;
    invalid.push([row, col]);
    return Rational.ZERO;
  };
  const featureCols = columns.map((_, j) => j).filter((j) => j !== targetCol);
  const parsed = cells.map((row, i) => row.map((text, j) => cell(text, i, j)));
  return {
    dataset: {
      features: featureCols.map((j) => columns[j]),
      target: columns[targetCol],
      inputs: parsed.map((row) => featureCols.map((j) => row[j])),
      y: parsed.map((row) => row[targetCol]),
      rowLabels,
    },
    invalid,
  };
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
