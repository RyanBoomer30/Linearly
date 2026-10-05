import type { Action, GridCell } from '../core/mdp';

/**
 * Lesson 6 presets (F-P7, §14.6). Rewards are editor strings; slip q and γ
 * are in hundredths so the sliders stay exact (10 → 1/10, 90 → 9/10).
 */
export interface Lesson6Preset {
  id: string;
  name: string;
  rows: number;
  cols: number;
  walls: GridCell[];
  rewards: { cell: GridCell; reward: string }[];
  terminals: GridCell[];
  start: GridCell;
  slip: number;
  gamma: number;
  /** The painted policy: one action everywhere. */
  policy: Action;
  explanation: string | null;
}

const NOTES = {
  rows: 3,
  cols: 4,
  walls: [[1, 1]] as GridCell[],
  rewards: [
    { cell: [0, 3] as GridCell, reward: '1' },
    { cell: [1, 3] as GridCell, reward: '-1' },
  ],
  terminals: [
    [0, 3],
    [1, 3],
  ] as GridCell[],
  start: [2, 2] as GridCell,
};

export const LESSON6_PRESETS: Lesson6Preset[] = [
  { id: 'notesGrid', name: "Notes' gridworld (γ = 0.9, slip 0.1)", ...NOTES, slip: 10, gamma: 90, policy: 'up', explanation: null },
  {
    id: 'perfect',
    name: 'Perfect locomotion (slip 0)',
    ...NOTES,
    slip: 0,
    gamma: 90,
    policy: 'up',
    explanation: 'With q = 0 every move goes where it is aimed, so ↑ ↑ → from state 10 always reaches +1 and V*(10) = 0.9³ = 0.729.',
  },
  {
    id: 'patient',
    name: 'Patient robot (γ = 0.99)',
    ...NOTES,
    slip: 10,
    gamma: 99,
    policy: 'up',
    explanation: 'With γ = 0.99 waiting costs almost nothing, so the robot takes the long way round the wall rather than risk slipping into −1.',
  },
  {
    id: 'shortSighted',
    name: 'Short-sighted robot (γ = 0.5)',
    ...NOTES,
    slip: 10,
    gamma: 50,
    policy: 'up',
    explanation: 'With γ = 0.5 the distant +1 is worth little, so near −1 the robot mainly moves away from it.',
  },
  {
    id: 'allLeft',
    name: 'All-← starting policy',
    ...NOTES,
    slip: 10,
    gamma: 90,
    policy: 'left',
    explanation: 'Policy iteration from π(s) = ← everywhere, as in the acceptance example: 7 evaluations reach π*.',
  },
  {
    id: 'corridor',
    name: '1 × 3 corridor',
    rows: 1,
    cols: 3,
    walls: [],
    rewards: [{ cell: [0, 2], reward: '1' }],
    terminals: [[0, 2]],
    start: [0, 0],
    slip: 10,
    gamma: 90,
    policy: 'right',
    explanation: 'Three states, so the whole Bellman system (I − γP_π)V = R fits on screen.',
  },
];

export const lesson6PresetById = (id: string) => LESSON6_PRESETS.find((p) => p.id === id);

/** Grids up to 5 × 5 (§1.2). */
export const MAX_GRID = 5;
/** γ slider: 0 to 0.99 in hundredths (L6-B1). Slip slider: 0 to 0.25. */
export const GAMMA_RANGE: [number, number] = [0, 99];
export const SLIP_RANGE: [number, number] = [0, 25];
export const DEFAULT_SEED = 2026;
export const DEFAULT_RUNS = 200;
/** L6-G6: the notes' plan from state 10. */
export const NOTES_PLAN: Action[] = ['up', 'up', 'right'];
