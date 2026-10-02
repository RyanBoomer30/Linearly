import { create } from 'zustand';
import type { Matrix, Vector } from '../core/matrix';
import { Rational } from '../core/rational';
import type { ModelChoice, VariableInfo } from '../core/regression';
import type { ViewId } from '../presets';
import { datasetPresetById, type DatasetPreset } from '../presets/datasets';
import { useStore } from './useStore';

export type Lesson2ViewId = 'data' | 'inconsistent' | 'loss' | 'multi';

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
   * projection, the normal equation, or the big picture (L2-I4, L2-L7). X must be at most 4×4.
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
const insertAt = <T,>(arr: T[], i: number, value: T) => [...arr.slice(0, i), value, ...arr.slice(i)];
const removeAt = <T,>(arr: T[], i: number) => arr.filter((_, k) => k !== i);

/** "House 3" → "House 4"; falls back to "Point n". */
function nextLabel(labels: string[]): string {
  const m = /^(.*?)(\d+)$/.exec(labels[labels.length - 1] ?? '');
  return m ? `${m[1]}${labels.length + 1}` : `Point ${labels.length + 1}`;
}

/** Keep the model when it still fits the number of features; otherwise fall back to the linear model. */
function modelForFeatures(model: ModelChoice, featureCount: number): ModelChoice {
  const oneFeatureOnly = model.kind === 'origin' || model.kind === 'line' || model.kind === 'polynomial';
  if (oneFeatureOnly && featureCount !== 1) return { kind: 'linear' };
  if (model.kind === 'custom' && model.terms.some((t) => t.kind === 'monomial' && t.powers.length !== featureCount)) {
    return { kind: 'linear' };
  }
  return model;
}

/** Exact editor text for Lesson 1: a decimal when it is exact (2.25), otherwise a fraction (400/133). */
function editorText(r: Rational): string {
  const decimal = String(r.toNumber());
  const back = Rational.parse(decimal);
  return back && back.equals(r) ? decimal : r.toString();
}

export const useDataStore = create<DataState>((set) => ({
  ...presetState(initial),
  view: 'data',
  numberDisplay: 'decimal',

  setCell: (row, col, value) =>
    set((s) => ({ cells: replaceAt(s.cells, row, replaceAt(s.cells[row], col, value)), presetId: null, theta: null })),
  setColumnInfo: (col, info) => set((s) => ({ columns: replaceAt(s.columns, col, { ...s.columns[col], ...info }) })),
  setTargetCol: (targetCol) => set({ targetCol, presetId: null, theta: null }),
  addRow: () =>
    set((s) =>
      s.cells.length >= MAX_DATA_ROWS
        ? s
        : {
            // Empty cells are highlighted until filled in, rather than silently counting as 0.
            cells: [...s.cells, s.columns.map(() => '')],
            rowLabels: [...s.rowLabels, nextLabel(s.rowLabels)],
            presetId: null,
            theta: null,
          },
    ),
  removeRow: (row) =>
    set((s) =>
      s.cells.length <= 1
        ? s
        : {
            cells: removeAt(s.cells, row),
            rowLabels: removeAt(s.rowLabels, row),
            selectedRow: s.selectedRow === row ? null : s.selectedRow !== null && s.selectedRow > row ? s.selectedRow - 1 : s.selectedRow,
            presetId: null,
            theta: null,
          },
    ),
  addColumn: () =>
    set((s) => {
      const featureCount = s.columns.length - 1;
      if (featureCount >= MAX_FEATURES) return s;
      // New features go after the existing ones, before a trailing target.
      const at = s.targetCol === s.columns.length - 1 ? s.targetCol : s.columns.length;
      return {
        columns: insertAt(s.columns, at, { name: `Feature ${featureCount + 1}`, unit: '' }),
        cells: s.cells.map((r) => insertAt(r, at, '')),
        targetCol: s.targetCol >= at ? s.targetCol + 1 : s.targetCol,
        model: modelForFeatures(s.model, featureCount + 1),
        presetId: null,
        theta: null,
      };
    }),
  removeColumn: (col) =>
    set((s) => {
      if (col === s.targetCol || s.columns.length <= 2) return s;
      return {
        columns: removeAt(s.columns, col),
        cells: s.cells.map((r) => removeAt(r, col)),
        targetCol: s.targetCol > col ? s.targetCol - 1 : s.targetCol,
        model: modelForFeatures(s.model, s.columns.length - 2),
        presetId: null,
        theta: null,
      };
    }),
  pasteTable: ({ header, cells }) => {
    const width = cells[0]?.length ?? 0;
    if (width < 2) throw new RangeError('Paste at least two columns: one or more features, then the target');
    if (width - 1 > MAX_FEATURES) throw new RangeError(`At most ${MAX_FEATURES} features (the pasted table has ${width - 1})`);
    if (cells.length > MAX_DATA_ROWS) throw new RangeError(`At most ${MAX_DATA_ROWS} rows (the pasted table has ${cells.length})`);
    set((s) => {
      // The last pasted column is the target. Names come from the header, or are kept when the shape is unchanged.
      const keep = s.columns.length === width;
      const columns = Array.from({ length: width }, (_, j) => ({
        name: header?.[j] ?? (keep ? s.columns[j].name : j === width - 1 ? 'y' : width === 2 ? 'x' : `x${j + 1}`),
        unit: keep && !header ? s.columns[j].unit : '',
      }));
      return {
        columns,
        targetCol: width - 1,
        cells,
        rowLabels: cells.map((_, i) => `Point ${i + 1}`),
        model: modelForFeatures(s.model, width - 1),
        presetId: null,
        theta: null,
        selectedRow: null,
      };
    });
  },

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
  openInLesson1: (X, Y, view) => {
    const m = X.length;
    const n = X[0]?.length ?? 0;
    if (m > 4 || n > 4) throw new RangeError(`Lesson 1 takes matrices up to 4×4, and X is ${m}×${n}`);
    useStore.setState({
      aCells: X.map((r) => r.map(editorText)),
      bCells: Y.map(editorText),
      presetId: null,
      view,
      lesson: 1,
      notice: null,
    });
  },
}));
