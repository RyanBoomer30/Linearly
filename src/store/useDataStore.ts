import { create } from 'zustand';
import type { Matrix, Vector } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';
import type { ModelChoice, VariableInfo } from '../core/regression';
import type { ViewId } from '../presets';
import { datasetPresetById, type DatasetPreset } from '../presets/datasets';

export type Lesson2ViewId = 'data' | 'inconsistent' | 'loss' | 'multi' | 'python';

/** F-D7: Lesson 2 shows decimals by default; the exact value is always one hover away. */
export type NumberDisplay = 'decimal' | 'fraction';

/** Result of pasting spreadsheet / CSV text into the table (F-T3). */
export interface PastedTable {
  header: string[] | null;
  cells: string[][];
}

/**
 * Lesson 2 store (§3.2, §7). One dataset and one model shared by every
 * Lesson 2 view, kept separate from Lesson 1's matrix. Holds raw table
 * strings; parsing to Rational happens in useDataset.
 */
export interface DataState {
  columns: VariableInfo[];
  targetCol: number;
  /** One row per data point, one cell per column (F-T1). */
  cells: string[][];
  rowLabels: string[];
  presetId: string | null;
  model: ModelChoice;
  /**
   * θ chosen by sliders or dragging (floats, for drawing). null means "at θ*":
   * views then follow the exact fit. Changing the data or model resets it.
   */
  theta: number[] | null;
  /** F-T4: a selected row highlights everywhere. */
  selectedRow: number | null;
  view: Lesson2ViewId;
  numberDisplay: NumberDisplay;

  setCell: (row: number, col: number, value: string) => void;
  setColumnInfo: (col: number, info: Partial<VariableInfo>) => void;
  /** F-T2 */
  setTargetCol: (col: number) => void;
  /** F-T2: at most 100 rows. */
  addRow: () => void;
  removeRow: (row: number) => void;
  /** F-T2: at most 4 feature columns. */
  addColumn: () => void;
  removeColumn: (col: number) => void;
  /** F-T3: replace the table with pasted data. */
  pasteTable: (table: PastedTable) => void;
  loadPreset: (id: string) => void;
  setModel: (model: ModelChoice) => void;
  setTheta: (theta: number[] | null) => void;
  selectRow: (row: number | null) => void;
  setView: (view: Lesson2ViewId) => void;
  setNumberDisplay: (mode: NumberDisplay) => void;
  /**
   * Send X and Y to Lesson 1 as A and b and open one of its views: the
   * projection, the normal equation, or the big picture (L2-P6). X must be at most 4×4.
   */
  openInLesson1: (X: Matrix, Y: Vector, view: ViewId) => void;
}

export const MAX_DATA_ROWS = 100;
export const MAX_FEATURES = 4;

const initial = datasetPresetById('houses')!;

const presetState = (p: DatasetPreset) => ({
  columns: p.columns,
  targetCol: p.targetCol,
  cells: p.cells,
  rowLabels: p.rowLabels,
  presetId: p.id,
  model: p.model,
  theta: null,
  selectedRow: null,
});

const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));

export const useDataStore = create<DataState>((set) => ({
  ...presetState(initial),
  view: 'data',
  numberDisplay: 'decimal',

  setCell: (row, col, value) =>
    set((s) => ({ cells: replaceAt(s.cells, row, replaceAt(s.cells[row], col, value)), presetId: null, theta: null })),
  setColumnInfo: (col, info) => set((s) => ({ columns: replaceAt(s.columns, col, { ...s.columns[col], ...info }) })),
  setTargetCol: () => notImplemented('setTargetCol'),
  addRow: () => notImplemented('addRow'),
  removeRow: () => notImplemented('removeRow'),
  addColumn: () => notImplemented('addColumn'),
  removeColumn: () => notImplemented('removeColumn'),
  pasteTable: () => notImplemented('pasteTable'),

  loadPreset: (id) => {
    const p = datasetPresetById(id);
    if (!p) return;
    set(presetState(p));
  },
  setModel: (model) => set({ model, theta: null }),
  setTheta: (theta) => set({ theta }),
  selectRow: (selectedRow) => set({ selectedRow }),
  setView: (view) => set({ view }),
  setNumberDisplay: (numberDisplay) => set({ numberDisplay }),
  openInLesson1: () => notImplemented('openInLesson1'),
}));
