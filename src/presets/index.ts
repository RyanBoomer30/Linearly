/** Preset library (F-P1, F-P2). Entries are editor strings, exactly as a student would type them. */
export type ViewId =
  | 'row'
  | 'column'
  | 'sideBySide'
  | 'elimination'
  | 'columnSpace'
  | 'products'
  | 'subspaces'
  | 'demo';

export interface Preset {
  id: string;
  name: string;
  A: string[][];
  b?: string[];
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
  { id: 'outer', name: 'Outer product', A: A3, u: ['1', '1', '1'], v: ['1', '2', '3'], view: 'products' },
  { id: 'cr', name: 'CR factorization', A: A3, view: 'products' },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);

/** Preset each view opens with (§6 UX notes). */
export const DEFAULT_PRESET_FOR_VIEW: Record<ViewId, string> = {
  row: 'system2x2',
  column: 'system2x2',
  sideBySide: 'consistent3x3',
  elimination: 'consistent3x3',
  columnSpace: 'consistent3x3',
  products: 'cr',
  subspaces: 'consistent3x3',
  demo: 'consistent3x3',
};
