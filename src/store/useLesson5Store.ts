import { create } from 'zustand';
import { checkStochastic, normalizeColumn as normalizeMatrixColumn, simulatePath } from '../core/markov';
import type { Matrix, Vector } from '../core/matrix';
import { newSeed as freshSeed } from '../core/random';
import { Rational } from '../core/rational';
import type { VectorScaling } from '../core/scaling';
import type { ViewId } from '../presets';
import { DEFAULT_SEED, DEFAULT_SURFERS, lesson5PresetById, NOTES_SEQUENCE, type Lesson5Preset } from '../presets/lesson5';
import { editorText, type NumberDisplay } from './useDataStore';
import { parseLesson5 } from './parseLesson5';
import { useStore } from './useStore';

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

const MIN_STATES = 2;
const MAX_STATES = 4;

/** The name for a new state, following the existing names ("Page 4" after pages, otherwise "State 4"). */
const nameFor = (names: string[], i: number) => (names.length > 0 && names.every((n) => n.startsWith('Page')) ? `Page ${i + 1}` : `State ${i + 1}`);

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
  setX0FromSimplex: (p) =>
    set(() => {
      // Three decimals is plenty for a drag; the last entry takes up the rounding so x₀ sums to exactly 1.
      const rounded = p.map((x) => Rational.of(Math.round(Math.max(0, x) * 1000), 1000));
      const head = rounded.slice(0, -1);
      let last = Rational.ONE.sub(head.reduce((s, x) => s.add(x), Rational.ZERO));
      if (last.isNegative()) {
        const big = head.reduce((b, x, i) => (x.cmp(head[b]) > 0 ? i : b), 0);
        head[big] = head[big].add(last);
        last = Rational.ZERO;
      }
      return { x0Cells: [...head, last].map(editorText) };
    }),
  addState: () =>
    set((s) => {
      const n = s.pCells.length;
      if (n >= MAX_STATES) return s;
      return {
        pCells: [...s.pCells.map((r) => [...r, '0']), [...s.pCells.map(() => '0'), '1']],
        x0Cells: [...s.x0Cells, '0'],
        stateNames: [...s.stateNames, nameFor(s.stateNames, n)],
        positions: null,
        practiceCells: Array.from({ length: n + 1 }, () => new Array<string>(n + 1).fill('')),
        presetId: null,
        selectedState: null,
      };
    }),
  removeState: (i) =>
    set((s) => {
      const n = s.pCells.length;
      if (n <= MIN_STATES || i < 0 || i >= n) return s;
      const drop = <T,>(arr: T[]) => arr.filter((_, k) => k !== i);
      return {
        pCells: drop(s.pCells).map(drop),
        x0Cells: drop(s.x0Cells),
        stateNames: drop(s.stateNames),
        positions: s.positions ? drop(s.positions) : null,
        practiceCells: Array.from({ length: n - 1 }, () => new Array<string>(n - 1).fill('')),
        presetId: null,
        selectedState: null,
      };
    }),
  setPositions: (positions) => set({ positions }),
  setStateName: (i, name) => set((s) => ({ stateNames: replaceAt(s.stateNames, i, name) })),
  normalizeColumn: (j) =>
    set((s) => {
      const { P, invalid } = parseLesson5(s.pCells, s.x0Cells);
      if (invalid.P.some(([, col]) => col === j)) return { notice: `Column ${j + 1} has cells that don't parse; fix them first.` };
      try {
        const N = normalizeMatrixColumn(P, j);
        return { pCells: s.pCells.map((r, i) => r.map((c, k) => (k === j ? N[i][j].toString() : c))), presetId: null, notice: null };
      } catch (e) {
        return { notice: e instanceof Error ? e.message : String(e) };
      }
    }),
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
  newSeed: () =>
    set((s) => {
      let seed = freshSeed();
      while (seed === s.seed) seed = freshSeed();
      return { seed };
    }),
  setSequenceText: (sequenceText) => set({ sequenceText, sequenceSource: 'pasted', practiceRevealed: false }),
  setSequenceLength: (sequenceLength) => set({ sequenceLength }),
  simulateSequence: () =>
    set((s) => {
      const { P, x0, invalid } = parseLesson5(s.pCells, s.x0Cells);
      if (invalid.P.length > 0 || !checkStochastic(P).valid) return { notice: 'P is not a valid transition matrix, so the chain cannot be simulated. Fix it in the chain editor first.' };
      // Start in x₀'s most likely state.
      const start = x0.reduce((b, x, i) => (x.cmp(x0[b]) > 0 ? i : b), 0);
      const path = simulatePath(P, start, s.sequenceLength, s.seed);
      return { sequenceText: path.map((k) => k + 1).join(''), sequenceSource: 'simulated', practiceRevealed: true, notice: null };
    }),
  setPracticeCell: (row, col, value) => set((s) => ({ practiceCells: setGridCell(s.practiceCells, row, col, value) })),
  revealPractice: () => set({ practiceRevealed: true }),
  useEstimate: (estimate) =>
    set((s) => {
      const n = estimate.length;
      const sameSize = n === s.pCells.length;
      return {
        pCells: estimate.map((r) => r.map((x) => x.toString())),
        x0Cells: sameSize ? s.x0Cells : Array.from({ length: n }, (_, i) => (i === 0 ? '1' : '0')),
        stateNames: sameSize ? s.stateNames : Array.from({ length: n }, (_, i) => s.stateNames[i] ?? nameFor(s.stateNames, i)),
        positions: sameSize ? s.positions : null,
        presetId: null,
        selectedState: null,
        notice: 'P̂ is now the chain, in every Lesson 5 view.',
      };
    }),
  setProbe: (probe) => set({ probe }),
  openInLesson1: (A, b, view) =>
    useStore.setState({
      aCells: A.map((r) => r.map((x) => x.toString())),
      bCells: b.map((x) => x.toString()),
      presetId: null,
      view,
      lesson: 1,
      notice: null,
    }),
  dismissNotice: () => set({ notice: null }),
}));
