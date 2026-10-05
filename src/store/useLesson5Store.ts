import { create } from 'zustand';
import type { Matrix, Vector } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';
import type { VectorScaling } from '../core/scaling';
import type { ViewId } from '../presets';
import { DEFAULT_SEED, DEFAULT_SURFERS, lesson5PresetById, NOTES_SEQUENCE, type Lesson5Preset } from '../presets/lesson5';
import type { NumberDisplay } from './useDataStore';

export type Lesson5ViewId = 'chain' | 'evolution' | 'estimate' | 'eigen' | 'components' | 'layers' | 'perron';

/** Where the estimation view's sequence came from; only a simulated one has a true P to compare with (L5-ES5). */
export type SequenceSource = 'pasted' | 'simulated';

/**
 * Lesson 5 store (§10): one chain — the transition matrix P and an initial
 * distribution x₀ — shared across the Lesson 5 views, plus the graph layout,
 * the simulation seed, and the estimation view's sequence. Estimating P never
 * replaces the chain without "Use this estimate" (L5-ES8).
 */
export interface Lesson5State {
  /** n × n, n in 2–4; rows "to", columns "from". */
  pCells: string[][];
  x0Cells: string[];
  stateNames: string[];
  /** Node positions in the graph's SVG units; null means the preset layout for n states (F-D11). */
  positions: [number, number][] | null;
  presetId: string | null;
  view: Lesson5ViewId;
  /** L5-MC3: highlights the state's column and its outgoing arrows. */
  selectedState: number | null;
  /** Shared time slider: x(t), Pᵗ, the components and the layers. */
  t: number;
  /** L5-EG4: Pᵏ = VΛᵏV⁻¹. */
  k: number;
  /** L5-EG3: integer (notes) or probability (for λ = 1). */
  scaling: Exclude<VectorScaling, 'unit'>;
  /** F-D7: fractions by default in Lesson 5. */
  numberDisplay: NumberDisplay;
  /** L5-CO3 */
  logScale: boolean;
  /** Simulations show their seed; "new seed" is explicit (§10). */
  seed: number;
  surfers: number;
  sequenceText: string;
  sequenceSource: SequenceSource;
  sequenceLength: number;
  /** L5-ES7: the student's own P̂, and whether the answer is shown. */
  practiceCells: string[][];
  practiceRevealed: boolean;
  /** L5-EG6: the draggable probe vector in ℝ³. */
  probe: [number, number, number];
  notice: string | null;

  setPCell: (row: number, col: number, value: string) => void;
  /** L5-MC1: the arrow i → j is p_ji, so this edits pCells[to][from]. */
  setEdge: (from: number, to: number, value: string) => void;
  setX0Cell: (i: number, value: string) => void;
  /** L5-EV1: x₀ = e_i. */
  setPureState: (i: number) => void;
  /** L5-EV1: x₀ from the draggable simplex point (floats, already inside the simplex). */
  setX0FromSimplex: (p: number[]) => void;
  /** L5-MC1: up to 4 states; the new state gets a self-loop of 1 so P stays stochastic. */
  addState: () => void;
  /** L5-MC1: at least 2 states; columns that lose probability are flagged, not silently fixed. */
  removeState: (i: number) => void;
  setPositions: (positions: [number, number][]) => void;
  setStateName: (i: number, name: string) => void;
  /** L5-MC4 */
  normalizeColumn: (j: number) => void;
  loadPreset: (id: string) => void;
  setView: (view: Lesson5ViewId) => void;
  selectState: (i: number | null) => void;
  setT: (t: number) => void;
  setK: (k: number) => void;
  setScaling: (scaling: Exclude<VectorScaling, 'unit'>) => void;
  setNumberDisplay: (mode: NumberDisplay) => void;
  setLogScale: (log: boolean) => void;
  setSurfers: (n: number) => void;
  /** A fresh seed (§10). */
  newSeed: () => void;
  setSequenceText: (text: string) => void;
  setSequenceLength: (length: number) => void;
  /** L5-ES1: simulate the current chain from x₀'s most likely state with the current seed and length. */
  simulateSequence: () => void;
  /** L5-ES7 */
  setPracticeCell: (row: number, col: number, value: string) => void;
  revealPractice: () => void;
  /** L5-ES8: send P̂ to the chain editor; refuses with a notice when a column is undefined. */
  useEstimate: (estimate: Matrix) => void;
  setProbe: (p: [number, number, number]) => void;
  /** L5-EG2: open the Lesson 1 elimination stepper on P − λI (b = 0). */
  openInLesson1: (A: Matrix, b: Vector, view: ViewId) => void;
  dismissNotice: () => void;
}

const initial = lesson5PresetById('miniWeb')!;
const presetState = (p: Lesson5Preset) => ({
  pCells: p.P,
  x0Cells: p.x0,
  stateNames: p.stateNames,
  positions: null,
  presetId: p.id,
  selectedState: null,
  practiceCells: p.P.map((r) => r.map(() => '')),
  notice: null,
});

const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));
const setGridCell = (grid: string[][], row: number, col: number, value: string) => replaceAt(grid, row, replaceAt(grid[row], col, value));

export const useLesson5Store = create<Lesson5State>((set) => ({
  ...presetState(initial),
  view: 'chain',
  t: 2,
  k: 2,
  scaling: 'integer',
  numberDisplay: 'fraction',
  logScale: false,
  seed: DEFAULT_SEED,
  surfers: DEFAULT_SURFERS,
  sequenceText: NOTES_SEQUENCE,
  sequenceSource: 'pasted',
  sequenceLength: 200,
  practiceRevealed: false,
  probe: [1, 1, 1],

  setPCell: (row, col, value) => set((s) => ({ pCells: setGridCell(s.pCells, row, col, value), presetId: null })),
  setEdge: (from, to, value) => set((s) => ({ pCells: setGridCell(s.pCells, to, from, value), presetId: null })),
  setX0Cell: (i, value) => set((s) => ({ x0Cells: replaceAt(s.x0Cells, i, value) })),
  setPureState: (i) => set((s) => ({ x0Cells: s.x0Cells.map((_, k) => (k === i ? '1' : '0')) })),
  setX0FromSimplex: () => notImplemented('setX0FromSimplex'),
  addState: () => notImplemented('addState'),
  removeState: () => notImplemented('removeState'),
  setPositions: (positions) => set({ positions }),
  setStateName: (i, name) => set((s) => ({ stateNames: replaceAt(s.stateNames, i, name) })),
  normalizeColumn: () => notImplemented('normalizeColumn'),
  loadPreset: (id) => {
    const p = lesson5PresetById(id);
    if (p) set(presetState(p));
  },
  setView: (view) => set({ view }),
  selectState: (selectedState) => set({ selectedState }),
  setT: (t) => set({ t }),
  setK: (k) => set({ k }),
  setScaling: (scaling) => set({ scaling }),
  setNumberDisplay: (numberDisplay) => set({ numberDisplay }),
  setLogScale: (logScale) => set({ logScale }),
  setSurfers: (surfers) => set({ surfers }),
  newSeed: () => notImplemented('newSeed'),
  setSequenceText: (sequenceText) => set({ sequenceText, sequenceSource: 'pasted', practiceRevealed: false }),
  setSequenceLength: (sequenceLength) => set({ sequenceLength }),
  simulateSequence: () => notImplemented('simulateSequence'),
  setPracticeCell: (row, col, value) => set((s) => ({ practiceCells: setGridCell(s.practiceCells, row, col, value) })),
  revealPractice: () => set({ practiceRevealed: true }),
  useEstimate: () => notImplemented('useEstimate'),
  setProbe: (probe) => set({ probe }),
  openInLesson1: () => notImplemented('openInLesson1'),
  dismissNotice: () => set({ notice: null }),
}));
