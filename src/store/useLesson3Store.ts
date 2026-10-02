import { create } from 'zustand';
import type { Pivoting } from '../core/lu';
import type { Matrix, Vector } from '../core/matrix';
import type { ViewId } from '../presets';
import { lesson3PresetById, productPresetById, type Lesson3Preset } from '../presets/lesson3';
import { editorText } from './useDataStore';
import { useStore } from './useStore';

export type Lesson3ViewId = 'twoWays' | 'layers' | 'lu' | 'solve' | 'manyRhs' | 'ldu' | 'permutations';

/** Which factorization the layers view peels into rank-1 pieces (L3-R4). */
export type LayerSource = 'product' | 'cr' | 'lu';

/**
 * Lesson 3 store (§8): one square matrix A and a list of right-hand sides,
 * shared across the Lesson 3 views, plus B and C for the product views.
 * Separate from Lesson 1's matrix; importing is explicit.
 */
export interface Lesson3State {
  aCells: string[][];
  rhsCells: string[][];
  presetId: string | null;
  bCells: string[][];
  cCells: string[][];
  productPresetId: string | null;
  view: Lesson3ViewId;
  pivoting: Pivoting;
  /** L3-LU4 */
  compact: boolean;
  layerSource: LayerSource;
  notice: string | null;

  setACell: (row: number, col: number, value: string) => void;
  /** A stays square: n × n with n in 1–4; right-hand sides follow. */
  setSize: (n: number) => void;
  setRhsCell: (k: number, i: number, value: string) => void;
  /** L3-K1 */
  addRhs: () => void;
  removeRhs: (k: number) => void;
  setBCell: (row: number, col: number, value: string) => void;
  setCCell: (row: number, col: number, value: string) => void;
  /** L3-MM1: B is m × p and C is p × n, each up to 4 × 4. */
  resizeProduct: (which: 'B' | 'C', rows: number, cols: number) => void;
  loadPreset: (id: string) => void;
  loadProductPreset: (id: string) => void;
  setView: (view: Lesson3ViewId) => void;
  setPivoting: (pivoting: Pivoting) => void;
  setCompact: (compact: boolean) => void;
  setLayerSource: (source: LayerSource) => void;
  /** §8: "Use Lesson 1's matrix" — imports A and b when A is square, otherwise sets `notice`. */
  importFromLesson1: () => void;
  /** L3-MM5 / L3-S4: open a Lesson 1 view with this A and b (b may be x for the column picture's weights). */
  openInLesson1: (A: Matrix, b: Vector, view: ViewId) => void;
  dismissNotice: () => void;
}

const initial = lesson3PresetById('luExample')!;
const initialProduct = productPresetById('crProduct')!;

const presetState = (p: Lesson3Preset) => ({ aCells: p.A, rhsCells: p.rhs, presetId: p.id, pivoting: p.pivoting, notice: null });

const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));
const setGridCell = (grid: string[][], row: number, col: number, value: string) => replaceAt(grid, row, replaceAt(grid[row], col, value));
/** Crop or pad a list to length n, padding with `fill`. */
const fit = <T,>(arr: T[], n: number, fill: () => T) => Array.from({ length: n }, (_, i) => (i < arr.length ? arr[i] : fill()));
const MAX_SIZE = 4;
const MAX_RHS = 9;

export const useLesson3Store = create<Lesson3State>((set) => ({
  ...presetState(initial),
  bCells: initialProduct.B,
  cCells: initialProduct.C,
  productPresetId: initialProduct.id,
  view: 'twoWays',
  compact: false,
  layerSource: 'product',

  setACell: (row, col, value) => set((s) => ({ aCells: setGridCell(s.aCells, row, col, value), presetId: null })),
  setSize: (n) =>
    set((s) =>
      n < 1 || n > MAX_SIZE
        ? s
        : {
            aCells: fit(s.aCells, n, () => []).map((r) => fit(r, n, () => '0')),
            rhsCells: s.rhsCells.map((b) => fit(b, n, () => '0')),
            presetId: null,
          },
    ),
  setRhsCell: (k, i, value) => set((s) => ({ rhsCells: replaceAt(s.rhsCells, k, replaceAt(s.rhsCells[k], i, value)), presetId: null })),
  addRhs: () =>
    set((s) => (s.rhsCells.length >= MAX_RHS ? s : { rhsCells: [...s.rhsCells, s.aCells.map(() => '0')], presetId: null })),
  removeRhs: (k) => set((s) => (s.rhsCells.length <= 1 ? s : { rhsCells: s.rhsCells.filter((_, i) => i !== k), presetId: null })),
  setBCell: (row, col, value) => set((s) => ({ bCells: setGridCell(s.bCells, row, col, value), productPresetId: null })),
  setCCell: (row, col, value) => set((s) => ({ cCells: setGridCell(s.cCells, row, col, value), productPresetId: null })),
  resizeProduct: (which, rows, cols) =>
    set((s) => {
      if (rows < 1 || rows > MAX_SIZE || cols < 1 || cols > MAX_SIZE) return s;
      const grid = (which === 'B' ? s.bCells : s.cCells).map((r) => fit(r, cols, () => '0'));
      const resized = fit(grid, rows, () => Array.from({ length: cols }, () => '0'));
      return which === 'B' ? { bCells: resized, productPresetId: null } : { cCells: resized, productPresetId: null };
    }),
  loadPreset: (id) => {
    const p = lesson3PresetById(id);
    if (p) set(presetState(p));
  },
  loadProductPreset: (id) => {
    const p = productPresetById(id);
    if (p) set({ bCells: p.B, cCells: p.C, productPresetId: p.id });
  },
  setView: (view) => set({ view }),
  setPivoting: (pivoting) => set({ pivoting }),
  setCompact: (compact) => set({ compact }),
  setLayerSource: (layerSource) => set({ layerSource }),
  importFromLesson1: () => {
    const { aCells, bCells } = useStore.getState();
    const m = aCells.length;
    const n = aCells[0]?.length ?? 0;
    if (m !== n) {
      set({ notice: `Lesson 1's matrix is ${m}×${n}, and LU needs a square matrix, so Lesson 3 kept its own A.` });
      return;
    }
    set({ aCells, rhsCells: [bCells ?? aCells.map(() => '0')], presetId: null, notice: null });
  },
  openInLesson1: (A, b, view) =>
    useStore.setState({
      aCells: A.map((r) => r.map(editorText)),
      bCells: b.map(editorText),
      presetId: null,
      view,
      lesson: 1,
      notice: null,
    }),
  dismissNotice: () => set({ notice: null }),
}));
