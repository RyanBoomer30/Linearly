/** Lesson 5 presets (F-P6, §13.5). P is column-stochastic: rows "to", columns "from". Cells are editor strings. */
export interface Lesson5Preset {
  id: string;
  name: string;
  P: string[][];
  x0: string[];
  /** Node names in the graph, e.g. "Page 1". */
  stateNames: string[];
  /** L5-PF5: for a counterexample, which Perron–Frobenius assumption fails. */
  explanation: string | null;
}

export const LESSON5_PRESETS: Lesson5Preset[] = [
  {
    // Notes §5.1: the mini web with 3 pages.
    id: 'miniWeb',
    name: 'Mini web (3 pages)',
    P: [
      ['0.7', '0.1', '0.2'],
      ['0.2', '0.4', '0.2'],
      ['0.1', '0.5', '0.6'],
    ],
    x0: ['1', '0', '0'],
    stateNames: ['Page 1', 'Page 2', 'Page 3'],
    explanation: null,
  },
  {
    id: 'flip',
    name: 'Two-state flip (periodic)',
    P: [
      ['0', '1'],
      ['1', '0'],
    ],
    x0: ['1', '0'],
    stateNames: ['State 1', 'State 2'],
    explanation:
      'P is not regular: every power is either P or I, so some entry is always 0. λ = −1 has |λ| = 1, so its component never decays and x(t) flips back and forth forever, even though x_eq = (1/2, 1/2) exists.',
  },
  {
    id: 'cycle',
    name: 'Three-state cycle (complex eigenvalues)',
    P: [
      ['0', '0', '1'],
      ['1', '0', '0'],
      ['0', '1', '0'],
    ],
    x0: ['1', '0', '0'],
    stateNames: ['State 1', 'State 2', 'State 3'],
    explanation:
      'P is not regular: the chain goes round 1 → 2 → 3 → 1, so Pᵏ always has zeros. Two eigenvalues are complex with |λ| = 1 (angles ±120°), so x(t) cycles with period 3 instead of converging.',
  },
  {
    id: 'absorbing',
    name: 'Two absorbing states',
    P: [
      ['1', '0', '0.5'],
      ['0', '1', '0.5'],
      ['0', '0', '0'],
    ],
    x0: ['0', '0', '1'],
    stateNames: ['State 1', 'State 2', 'State 3'],
    explanation:
      'P is not regular: states 1 and 2 are never left, so their columns of Pᵏ keep zeros. λ = 1 appears twice, so there is more than one stationary distribution and the limit depends on where you start.',
  },
];

export const lesson5PresetById = (id: string) => LESSON5_PRESETS.find((p) => p.id === id);

/** Notes §5.2: the 40-state sequence (homework, so it opens in practice mode, L5-ES7). */
export const NOTES_SEQUENCE = '311213223112123122331313 3122321213223221';

/** L5-EV3 default, and the slider's range (NF-11: up to 1,000 at 60 fps). */
export const DEFAULT_SURFERS = 200;
export const SURFER_RANGE: [number, number] = [10, 1000];
/** L5-ES1: simulated sequence length slider. */
export const SEQUENCE_LENGTH_RANGE: [number, number] = [10, 10000];
/** First-load seed, so the opening simulation is the same for everyone. */
export const DEFAULT_SEED = 2026;
/** Time slider range for x(t), Pᵗ and the components. */
export const T_RANGE: [number, number] = [0, 30];
