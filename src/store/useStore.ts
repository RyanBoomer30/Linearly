import { create } from 'zustand';
import { notImplemented } from '../core/notImplemented';
import { presetById, type ViewId } from '../presets';

export type ThemeSetting = 'light' | 'dark' | 'system';

/**
 * Shared store (§3.2). Holds raw editor strings; parsing to Rational happens
 * in selectors (see useSystem) so invalid cells never crash the store.
 */
export interface AppState {
  aCells: string[][];
  bCells: string[] | null;
  uCells: string[];
  vCells: string[];
  presetId: string | null;
  view: ViewId;
  theme: ThemeSetting;

  setCell: (row: number, col: number, value: string) => void;
  setBCell: (row: number, value: string) => void;
  setUCell: (i: number, value: string) => void;
  setVCell: (i: number, value: string) => void;
  /** F-E3: sizes are clamped to 1–4. */
  addRow: () => void;
  removeRow: () => void;
  addColumn: () => void;
  removeColumn: () => void;
  toggleAugmented: () => void;
  loadPreset: (id: string) => void;
  setView: (view: ViewId) => void;
  setTheme: (theme: ThemeSetting) => void;
}

const initial = presetById('system2x2')!;

const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));

export const useStore = create<AppState>((set) => ({
  aCells: initial.A,
  bCells: initial.b ?? null,
  uCells: ['1', '1', '1'],
  vCells: ['1', '2', '3'],
  presetId: initial.id,
  view: 'row',
  theme: 'system',

  setCell: (row, col, value) =>
    set((s) => ({ aCells: replaceAt(s.aCells, row, replaceAt(s.aCells[row], col, value)), presetId: null })),
  setBCell: (row, value) => set((s) => ({ bCells: s.bCells && replaceAt(s.bCells, row, value), presetId: null })),
  setUCell: (i, value) => set((s) => ({ uCells: replaceAt(s.uCells, i, value) })),
  setVCell: (i, value) => set((s) => ({ vCells: replaceAt(s.vCells, i, value) })),

  addRow: () => notImplemented('addRow'),
  removeRow: () => notImplemented('removeRow'),
  addColumn: () => notImplemented('addColumn'),
  removeColumn: () => notImplemented('removeColumn'),
  toggleAugmented: () => notImplemented('toggleAugmented'),

  loadPreset: (id) => {
    const p = presetById(id);
    if (!p) return;
    set((s) => ({
      aCells: p.A,
      bCells: p.b ?? null,
      uCells: p.u ?? s.uCells,
      vCells: p.v ?? s.vCells,
      presetId: p.id,
    }));
  },
  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),
}));
