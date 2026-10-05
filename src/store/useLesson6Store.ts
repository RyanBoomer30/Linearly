import { create } from 'zustand';
import { ACTIONS, type Action, type GridCell, type Mdp, type Policy, type TerminalMode } from '../core/mdp';
import { mulberry32, newSeed as freshSeed } from '../core/random';
import { DEFAULT_RUNS, DEFAULT_SEED, lesson6PresetById, MAX_GRID, type Lesson6Preset } from '../presets/lesson6';
import type { NumberDisplay } from './useDataStore';

export type Lesson6ViewId = 'gridworld' | 'learning' | 'bellman' | 'where' | 'optimal' | 'policyIteration' | 'valueIteration';

/** What a click on the grid does (L6-G1 editor, L6-B1 painter, L6-G4 inspector). */
export type GridEditMode = 'inspect' | 'policy' | 'walls' | 'rewards' | 'terminals' | 'start';

/**
 * Lesson 6 store (§11): one MDP — grid, rewards, slip q, γ — and the current
 * hand-painted policy, shared across the Lesson 6 views. Changing γ or q never
 * resets the painted policy.
 */
export interface Lesson6State {
  rows: number;
  cols: number;
  walls: GridCell[];
  rewardCells: Record<string, string>;
  terminals: GridCell[];
  start: GridCell;
  /** q in hundredths (10 → 1/10). */
  slip: number;
  /** γ in hundredths (90 → 9/10). */
  gamma: number;
  /** L6-O5 (beyond the notes): reward of every non-terminal state without its own reward. */
  livingReward: string;
  terminalMode: TerminalMode;
  policyCells: Action[][];
  presetId: string | null;
  view: Lesson6ViewId;
  editMode: GridEditMode;
  /** L6-G4, L6-B4, L6-O2: the cell under inspection. */
  selectedCell: GridCell | null;
  selectedAction: Action;
  numberDisplay: NumberDisplay;
  /** Simulations show their seed; "new seed" is explicit (§11). */
  seed: number;
  runs: number;
  /** L6-W1 */
  t: number;
  /** The robot simulation follows the notes' plan ↑ ↑ → or the painted policy. */
  simSource: 'plan' | 'policy';
  /** L6-L1: transitions to collect. */
  experienceSteps: number;
  /** L6-Q4: the closing question's answer stays hidden until revealed. */
  qAnswerRevealed: boolean;
  /** L6-Q5 */
  qLearning: { episodes: number; alpha: number; epsilon: number };
  notice: string | null;

  setSlip: (hundredths: number) => void;
  /** L6-G3: q = 0. */
  setPerfect: (perfect: boolean) => void;
  setGamma: (hundredths: number) => void;
  setLivingReward: (text: string) => void;
  setTerminalMode: (mode: TerminalMode) => void;
  setRewardCell: (cell: GridCell, text: string) => void;
  setPolicyCell: (cell: GridCell, action: Action) => void;
  /** L6-B1: next arrow in the order ↑ → ↓ ←. */
  cyclePolicyCell: (cell: GridCell) => void;
  /** L6-B1: the same action everywhere. */
  fillPolicy: (action: Action) => void;
  /** L6-PI3: random from the current seed. */
  randomizePolicy: () => void;
  /** Paint a computed policy (e.g. π*) onto the grid, by state. */
  applyPolicy: (mdp: Mdp, policy: Policy) => void;
  /** What a grid click does in the current edit mode. */
  clickCell: (cell: GridCell) => void;
  /** L6-G1 editor: a wall cannot be the start or a terminal, and at least one state remains. */
  toggleWall: (cell: GridCell) => void;
  toggleTerminal: (cell: GridCell) => void;
  setStart: (cell: GridCell) => void;
  /** 1–5 in each direction; cells outside are dropped from walls, rewards, terminals; the start moves inside. */
  resizeGrid: (rows: number, cols: number) => void;
  loadPreset: (id: string) => void;
  setView: (view: Lesson6ViewId) => void;
  setEditMode: (mode: GridEditMode) => void;
  selectCell: (cell: GridCell | null) => void;
  selectAction: (action: Action) => void;
  setNumberDisplay: (mode: NumberDisplay) => void;
  newSeed: () => void;
  setRuns: (runs: number) => void;
  setT: (t: number) => void;
  setSimSource: (source: 'plan' | 'policy') => void;
  setExperienceSteps: (steps: number) => void;
  revealQAnswer: () => void;
  setQLearning: (patch: Partial<Lesson6State['qLearning']>) => void;
  dismissNotice: () => void;
}

const initial = lesson6PresetById('notesGrid')!;
const sameCell = (a: GridCell, b: GridCell) => a[0] === b[0] && a[1] === b[1];
const hasCell = (list: GridCell[], cell: GridCell) => list.some((c) => sameCell(c, cell));
const without = (list: GridCell[], cell: GridCell) => list.filter((c) => !sameCell(c, cell));
const nextAction = (a: Action) => ACTIONS[(ACTIONS.indexOf(a) + 1) % ACTIONS.length];
export const cellKey = ([r, c]: GridCell) => `${r},${c}`;
const presetState = (p: Lesson6Preset) => ({
  rows: p.rows,
  cols: p.cols,
  walls: p.walls,
  rewardCells: Object.fromEntries(p.rewards.map((r) => [cellKey(r.cell), r.reward])),
  terminals: p.terminals,
  start: p.start,
  slip: p.slip,
  gamma: p.gamma,
  livingReward: '0',
  policyCells: Array.from({ length: p.rows }, () => new Array<Action>(p.cols).fill(p.policy)),
  presetId: p.id,
  selectedCell: null,
  notice: null,
});

export const useLesson6Store = create<Lesson6State>((set) => ({
  ...presetState(initial),
  terminalMode: 'terminal',
  view: 'gridworld',
  editMode: 'inspect',
  selectedAction: 'up',
  numberDisplay: 'fraction',
  seed: DEFAULT_SEED,
  runs: DEFAULT_RUNS,
  t: 3,
  simSource: 'plan',
  experienceSteps: 2000,
  qAnswerRevealed: false,
  // Enough exploration and a small enough step that Q visibly approaches Q* (its greedy policy matches π* on the notes' grid).
  qLearning: { episodes: 2000, alpha: 0.1, epsilon: 0.5 },

  setSlip: (slip) => set({ slip, presetId: null }),
  setPerfect: (perfect) => set((s) => ({ slip: perfect ? 0 : s.slip === 0 ? 10 : s.slip, presetId: null })),
  setGamma: (gamma) => set({ gamma, presetId: null }),
  setLivingReward: (livingReward) => set({ livingReward, presetId: null }),
  setTerminalMode: (terminalMode) => set({ terminalMode }),
  setRewardCell: (cell, text) => set((s) => ({ rewardCells: { ...s.rewardCells, [cellKey(cell)]: text }, presetId: null })),
  setPolicyCell: ([r, c], action) => set((s) => ({ policyCells: s.policyCells.map((row, i) => row.map((a, j) => (i === r && j === c ? action : a))) })),
  cyclePolicyCell: ([r, c]) =>
    set((s) => ({ policyCells: s.policyCells.map((row, i) => row.map((a, j) => (i === r && j === c ? nextAction(a) : a))) })),
  fillPolicy: (action) => set((s) => ({ policyCells: s.policyCells.map((row) => row.map(() => action)) })),
  randomizePolicy: () =>
    set((s) => {
      const rng = mulberry32(s.seed);
      return { policyCells: s.policyCells.map((row) => row.map(() => ACTIONS[Math.floor(rng() * ACTIONS.length)])) };
    }),
  applyPolicy: (mdp, policy) =>
    set((s) => {
      const cells = s.policyCells.map((row) => [...row]);
      mdp.states.forEach((st, i) => {
        if (cells[st.row]) cells[st.row][st.col] = policy[i];
      });
      return { policyCells: cells };
    }),
  clickCell: (cell) => {
    const s = useLesson6Store.getState();
    switch (s.editMode) {
      case 'policy':
        if (!hasCell(s.walls, cell)) s.cyclePolicyCell(cell);
        return;
      case 'walls':
        s.toggleWall(cell);
        return;
      case 'terminals':
        s.toggleTerminal(cell);
        return;
      case 'start':
        s.setStart(cell);
        return;
      default:
        // Inspect and Rewards select the cell; clicking it again clears the selection.
        set({ selectedCell: s.selectedCell && sameCell(s.selectedCell, cell) && s.editMode === 'inspect' ? null : cell });
    }
  },
  toggleWall: (cell) =>
    set((s) => {
      if (hasCell(s.walls, cell)) return { walls: without(s.walls, cell), presetId: null, notice: null };
      if (sameCell(s.start, cell)) return { notice: 'The start cannot be a wall. Move the start first.' };
      if (hasCell(s.terminals, cell)) return { notice: 'A terminal cell cannot be a wall. Make it non-terminal first.' };
      return {
        walls: [...s.walls, cell],
        selectedCell: s.selectedCell && sameCell(s.selectedCell, cell) ? null : s.selectedCell,
        presetId: null,
        notice: null,
      };
    }),
  toggleTerminal: (cell) =>
    set((s) => {
      if (hasCell(s.terminals, cell)) return { terminals: without(s.terminals, cell), presetId: null, notice: null };
      if (hasCell(s.walls, cell)) return { notice: 'A wall cannot be terminal.' };
      if (sameCell(s.start, cell)) return { notice: 'The start cannot be terminal: the episode would end before it begins.' };
      return { terminals: [...s.terminals, cell], presetId: null, notice: null };
    }),
  setStart: (cell) =>
    set((s) => {
      if (hasCell(s.walls, cell)) return { notice: 'The start must be a state, not a wall.' };
      if (hasCell(s.terminals, cell)) return { notice: 'The start cannot be terminal.' };
      return { start: cell, presetId: null, notice: null };
    }),
  resizeGrid: (rows, cols) =>
    set((s) => {
      if (rows < 1 || cols < 1 || rows > MAX_GRID || cols > MAX_GRID) return s;
      const inside = ([r, c]: GridCell) => r < rows && c < cols;
      const start: GridCell = [Math.min(s.start[0], rows - 1), Math.min(s.start[1], cols - 1)];
      return {
        rows,
        cols,
        start,
        // A wall or terminal where the start lands gives way to it.
        walls: s.walls.filter((c) => inside(c) && !sameCell(c, start)),
        terminals: s.terminals.filter((c) => inside(c) && !sameCell(c, start)),
        rewardCells: Object.fromEntries(Object.entries(s.rewardCells).filter(([k]) => inside(k.split(',').map(Number) as GridCell))),
        policyCells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => s.policyCells[r]?.[c] ?? 'up')),
        selectedCell: s.selectedCell && inside(s.selectedCell) ? s.selectedCell : null,
        presetId: null,
      };
    }),
  loadPreset: (id) => {
    const p = lesson6PresetById(id);
    if (p) set(presetState(p));
  },
  setView: (view) => set({ view }),
  setEditMode: (editMode) => set({ editMode }),
  selectCell: (selectedCell) => set({ selectedCell }),
  selectAction: (selectedAction) => set({ selectedAction }),
  setNumberDisplay: (numberDisplay) => set({ numberDisplay }),
  newSeed: () =>
    set((s) => {
      let seed = freshSeed();
      while (seed === s.seed) seed = freshSeed();
      return { seed };
    }),
  setRuns: (runs) => set({ runs }),
  setT: (t) => set({ t }),
  setSimSource: (simSource) => set({ simSource }),
  setExperienceSteps: (experienceSteps) => set({ experienceSteps }),
  revealQAnswer: () => set({ qAnswerRevealed: true }),
  setQLearning: (patch) => set((s) => ({ qLearning: { ...s.qLearning, ...patch } })),
  dismissNotice: () => set({ notice: null }),
}));
