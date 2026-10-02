import { create } from 'zustand';
import type { GsVariant } from '../core/gramSchmidt';
import type { HouseholderSign } from '../core/householder';
import type { Matrix, Vector } from '../core/matrix';
import { norm } from '../core/exactNorm';
import { designMatrix, modelSpecFor } from '../core/regression';
import { Rational } from '../core/rational';
import { dot } from '../core/products';
import type { ViewId } from '../presets';
import { lesson4PresetById, REFLECTOR_EXAMPLE, type Lesson4Preset } from '../presets/lesson4';
import { editorText, useDataStore } from './useDataStore';
import { parseDataset } from './useDataset';
import { useStore } from './useStore';

export type Lesson4ViewId = 'reflector' | 'properties' | 'qr' | 'reducedQr' | 'leastSquares' | 'conditioning' | 'gramSchmidt';

/**
 * Lesson 4 store (§9): one matrix A (m × n, m ≥ n) and one b, shared across
 * the Lesson 4 views; the reflector demo's x, w, y; the sign setting; and the
 * δ slider (stored as a power of ten). Imports are explicit.
 */
export interface Lesson4State {
  aCells: string[][];
  bCells: string[];
  presetId: string | null;
  view: Lesson4ViewId;
  /** L4-QR5 / open question 11: the notes' sign by default. */
  sign: HouseholderSign;
  /** L4-RQ1 */
  qrForm: 'full' | 'reduced';
  /** §8.1 vectors, in ℝ² or ℝ³. */
  xCells: string[];
  wCells: string[];
  yCells: string[];
  /** L4-C3: δ = 10^logDelta. */
  logDelta: number;
  gsVariant: GsVariant;
  notice: string | null;

  setACell: (row: number, col: number, value: string) => void;
  setBCell: (row: number, value: string) => void;
  /** Keeps m ≥ n, sizes 1–4; b follows the rows. */
  resize: (rows: number, cols: number) => void;
  loadPreset: (id: string) => void;
  setView: (view: Lesson4ViewId) => void;
  setSign: (sign: HouseholderSign) => void;
  setQrForm: (form: 'full' | 'reduced') => void;
  setVectorCell: (which: 'x' | 'w' | 'y', i: number, value: string) => void;
  /** §8.1 works in ℝ² or ℝ³. */
  setReflectorDim: (dim: 2 | 3) => void;
  /** L4-H1: drag w with its length locked to ‖x‖ (scene coordinates). */
  dragW: (to: number[]) => void;
  /** L4-H1: w = ‖x‖e₁. */
  snapWToAxis: () => void;
  /** L4-H6: rescale w to ‖x‖. */
  rescaleW: () => void;
  dragY: (to: number[]) => void;
  setLogDelta: (value: number) => void;
  setGsVariant: (variant: GsVariant) => void;
  /** §8: import A and b from Lesson 1; refuses m < n with a notice. */
  importFromLesson1: () => void;
  /** §8 / L4-LS5: import X and Y from Lesson 2. */
  importFromLesson2: () => void;
  /** Open a Lesson 1 view with this A and b (four subspaces L4-RQ3, projection L4-LS3, SVD mode §8.8). */
  openInLesson1: (A: Matrix, b: Vector, view: ViewId) => void;
  dismissNotice: () => void;
}

const initial = lesson4PresetById('qrExample')!;
const presetState = (p: Lesson4Preset) => ({ aCells: p.A, bCells: p.b, presetId: p.id, notice: null });
const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));
const fit = <T,>(arr: T[], n: number, fill: () => T) => Array.from({ length: n }, (_, i) => (i < arr.length ? arr[i] : fill()));
const MAX_SIZE = 4;

/** Exact entries of a cell list, or null when one does not parse. */
const parseCells = (cells: string[]) => {
  const values = cells.map((c) => Rational.parse(c));
  return values.every((v) => v !== null) ? (values as Rational[]) : null;
};

/** A dragged float, as editor text: 6 decimals is plenty for a drag. */
const dragText = (v: number) => String(Number(v.toFixed(6)));

/** Pull a point onto the sphere (circle) of the given radius; the origin goes to the first axis. */
function onSphere(point: number[], radius: number): number[] {
  const len = Math.hypot(...point);
  return len === 0 ? point.map((_, i) => (i === 0 ? radius : 0)) : point.map((p) => (p * radius) / len);
}

export const useLesson4Store = create<Lesson4State>((set) => ({
  ...presetState(initial),
  view: 'reflector',
  sign: 'notes',
  qrForm: 'full',
  xCells: REFLECTOR_EXAMPLE.x,
  wCells: REFLECTOR_EXAMPLE.w,
  yCells: REFLECTOR_EXAMPLE.y,
  logDelta: -6,
  gsVariant: 'classical',

  setACell: (row, col, value) => set((s) => ({ aCells: replaceAt(s.aCells, row, replaceAt(s.aCells[row], col, value)), presetId: null })),
  setBCell: (row, value) => set((s) => ({ bCells: replaceAt(s.bCells, row, value), presetId: null })),
  resize: (rows, cols) =>
    set((s) => {
      if (rows < 1 || cols < 1 || rows > MAX_SIZE || cols > MAX_SIZE || rows < cols) return s;
      return {
        aCells: fit(s.aCells, rows, () => []).map((r) => fit(r, cols, () => '0')),
        bCells: fit(s.bCells, rows, () => '0'),
        presetId: null,
      };
    }),
  loadPreset: (id) => {
    const p = lesson4PresetById(id);
    if (p) set(presetState(p));
  },
  setView: (view) => set({ view }),
  setSign: (sign) => set({ sign }),
  setQrForm: (qrForm) => set({ qrForm }),
  setVectorCell: (which, i, value) =>
    set((s) => {
      const key = `${which}Cells` as 'xCells' | 'wCells' | 'yCells';
      return { [key]: replaceAt(s[key], i, value) };
    }),
  setReflectorDim: (dim) =>
    set((s) => ({
      xCells: fit(s.xCells, dim, () => '0'),
      wCells: fit(s.wCells, dim, () => '0'),
      yCells: fit(s.yCells, dim, () => '0'),
    })),
  dragW: (to) =>
    set((s) => {
      const x = parseCells(s.xCells);
      if (!x) return s;
      const length = Math.sqrt(dot(x, x).toNumber());
      return { wCells: onSphere(to.slice(0, s.xCells.length), length).map(dragText) };
    }),
  snapWToAxis: () =>
    set((s) => {
      const x = parseCells(s.xCells);
      if (!x) return s;
      const length = norm(x);
      const first = length.kind === 'exact' ? editorText(length.value) : String(length.value);
      return { wCells: s.xCells.map((_, i) => (i === 0 ? first : '0')) };
    }),
  rescaleW: () =>
    set((s) => {
      const x = parseCells(s.xCells);
      const w = parseCells(s.wCells);
      if (!x || !w) return s;
      const nx = norm(x);
      const nw = norm(w);
      if (nw.kind === 'exact' && nw.value.isZero()) {
        return { wCells: s.xCells.map((_, i) => (i === 0 ? (nx.kind === 'exact' ? editorText(nx.value) : String(nx.value)) : '0')) };
      }
      // Exact when both lengths are rational; otherwise rounded.
      if (nx.kind === 'exact' && nw.kind === 'exact') return { wCells: w.map((e) => editorText(e.mul(nx.value).div(nw.value))) };
      const asNumber = (r: typeof nx) => (r.kind === 'exact' ? r.value.toNumber() : r.value);
      const ratio = asNumber(nx) / asNumber(nw);
      return { wCells: w.map((e) => dragText(e.toNumber() * ratio)) };
    }),
  dragY: (to) => set((s) => ({ yCells: to.slice(0, s.xCells.length).map(dragText) })),
  setLogDelta: (logDelta) => set({ logDelta }),
  setGsVariant: (gsVariant) => set({ gsVariant }),
  importFromLesson1: () => {
    const { aCells, bCells } = useStore.getState();
    const m = aCells.length;
    const n = aCells[0]?.length ?? 0;
    if (m < n) {
      set({ notice: `Lesson 1's matrix is ${m}×${n}, and QR needs at least as many rows as columns, so Lesson 4 kept its own A.` });
      return;
    }
    set({ aCells, bCells: bCells ?? aCells.map(() => '0'), presetId: null, notice: null });
  },
  importFromLesson2: () => {
    const d = useDataStore.getState();
    const { dataset, invalid } = parseDataset(d.columns, d.targetCol, d.cells, d.rowLabels);
    if (invalid.length > 0) {
      set({ notice: "Lesson 2's table has cells that don't parse; fix them there first." });
      return;
    }
    const { X, Y } = designMatrix(dataset, modelSpecFor(d.model, dataset.features.length));
    const m = X.length;
    const n = X[0]?.length ?? 0;
    if (m > MAX_SIZE || n > MAX_SIZE || m < n) {
      set({ notice: `Lesson 2's X is ${m}×${n}; Lesson 4 takes up to 4×4 with at least as many rows as columns.` });
      return;
    }
    set({ aCells: X.map((r) => r.map(editorText)), bCells: Y.map(editorText), presetId: null, notice: null });
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
