/** Preset library (F-P1, F-P2). Entries are editor strings, exactly as a student would type them. */
export type ViewId =
  | 'row'
  | 'column'
  | 'columnVsRow'
  | 'elimination'
  | 'products'
  | 'subspaces'
  | 'bigPicture';

export interface Preset {
  id: string;
  name: string;
  A: string[][];
  b: string[];
  /** Products view inputs. */
  u?: string[];
  v?: string[];
  view: ViewId;
}

const A3 = [
  ['1', '0', '1'],
  ['2', '1', '3'],
  ['3', '-2', '1'],
];

export const PRESETS: Preset[] = [
  {
    id: 'system2x2',
    name: '2×2 system',
    A: [
      ['1', '1'],
      ['2', '-1'],
    ],
    b: ['5', '1'],
    view: 'row',
  },
  { id: 'consistent3x3', name: '3×3 consistent system', A: A3, b: ['2', '5', '4'], view: 'row' },
  { id: 'inconsistent3x3', name: '3×3 inconsistent system', A: A3, b: ['2', '5', '5'], view: 'row' },
  { id: 'outer', name: 'Outer product', A: A3, b: ['2', '5', '4'], u: ['1', '1', '1'], v: ['1', '2', '3'], view: 'products' },
  { id: 'cr', name: 'CR factorization', A: A3, b: ['2', '5', '4'], view: 'products' },
  {
    // Strang, "The Four Fundamental Subspaces: 4 Lines", §2: 3×4, rank 2.
    id: 'strang3x4',
    name: 'Strang 3×4, rank 2',
    A: [
      ['1', '0', '2', '3'],
      ['0', '1', '4', '5'],
      ['0', '0', '0', '0'],
    ],
    b: ['1', '2', '3'],
    view: 'bigPicture',
  },
  {
    // Strang §3: rank one A = xyᵀ in ℝ², all four subspaces are lines.
    id: 'rank1_2x2',
    name: 'Rank one 2×2 (four lines)',
    A: [
      ['1', '1'],
      ['2', '2'],
    ],
    b: ['1', '0'],
    view: 'bigPicture',
  },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);

/**
 * Matrix sizes a view can draw. Switching views keeps the current matrix when
 * it fits; otherwise the view loads its default preset (§6 UX notes).
 */
export const VIEW_REQUIREMENTS: Partial<Record<ViewId, { fits: (m: number, n: number) => boolean; needs: string }>> = {
  row: { fits: (_m, n) => n === 2 || n === 3, needs: 'The row picture needs 2 or 3 unknowns (columns)' },
  column: { fits: (m) => m === 2 || m === 3, needs: 'The column picture needs 2 or 3 equations (rows)' },
  columnVsRow: {
    fits: (m, n) => (m === 2 || m === 3) && (n === 2 || n === 3),
    needs: 'Column vs row needs 2 or 3 rows and 2 or 3 columns',
  },
};

export const fitsView = (view: ViewId, m: number, n: number) => VIEW_REQUIREMENTS[view]?.fits(m, n) ?? true;

/** Preset a view falls back to when the current matrix does not fit it. */
export const DEFAULT_PRESET_FOR_VIEW: Record<ViewId, string> = {
  row: 'system2x2',
  column: 'system2x2',
  columnVsRow: 'consistent3x3',
  elimination: 'consistent3x3',
  products: 'cr',
  subspaces: 'consistent3x3',
  bigPicture: 'consistent3x3',
};
