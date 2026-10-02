/**
 * Okabe–Ito palette: stays distinguishable under common color-vision
 * deficiencies (NF-5). Column i uses COLUMN_COLORS[i] in the editor, KaTeX
 * display, and every canvas (F-E4).
 */
export const COLUMN_COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'] as const;
export const ROW_COLORS = ['#E69F00', '#56B4E9', '#882255', '#117733'] as const;

/** Pivot highlight, yellow as in the notes (L1-G2). */
export const PIVOT_COLOR = '#F0E442';
export const TARGET_COLOR = '#000000';

export const columnColor = (j: number) => COLUMN_COLORS[j % COLUMN_COLORS.length];
export const rowColor = (i: number) => ROW_COLORS[i % ROW_COLORS.length];

export interface SceneColors {
  background: string;
  grid: string;
  axis: string;
  text: string;
  result: string;
  target: string;
}

export const SCENE_COLORS: Record<'light' | 'dark', SceneColors> = {
  light: { background: '#ffffff', grid: '#e4e4e7', axis: '#52525b', text: '#18181b', result: '#18181b', target: '#18181b' },
  dark: { background: '#18181b', grid: '#3f3f46', axis: '#a1a1aa', text: '#f4f4f5', result: '#f4f4f5', target: '#f4f4f5' },
};

/** Four fundamental subspaces (Big picture view). Every region also carries a text label (NF-5). */
export const SUBSPACE_COLORS = {
  row: '#0072B2',
  null: '#D55E00',
  column: '#009E73',
  leftNull: '#CC79A7',
} as const;

/**
 * F-T4: one color per data row, used for its table row, its point, its row of
 * X and Y, its equation, and its axis in ℝⁿ. Cycles past 10 rows.
 */
export const DATA_ROW_COLORS = [
  '#E69F00',
  '#56B4E9',
  '#009E73',
  '#D55E00',
  '#CC79A7',
  '#0072B2',
  '#882255',
  '#117733',
  '#AA4499',
  '#44AA99',
] as const;

export const dataRowColor = (i: number) => DATA_ROW_COLORS[i % DATA_ROW_COLORS.length];

/** Fitted model, residuals and the current θ marker (Lesson 2). */
export const MODEL_COLOR = '#0072B2';
export const RESIDUAL_COLOR = '#D55E00';

/** Lesson 3: multipliers are red everywhere they appear (operation label, compact form, L), as in the notes. */
export const MULTIPLIER_COLOR = '#CC3311';
/** Growth chart curves (L3-K3). */
export const COST_COLORS = { factor: '#0072B2', solve: '#009E73', fromScratch: '#D55E00' } as const;
