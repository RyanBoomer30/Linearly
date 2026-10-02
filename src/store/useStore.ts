import { create } from 'zustand';
import type { BigPictureViewMode } from '../components/diagram/types';
import { DEFAULT_PRESET_FOR_VIEW, fitsView, presetById, VIEW_REQUIREMENTS, type Preset, type ViewId } from '../presets';

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
  /** Active lesson (F-D2). Lives here so Lesson 2 can open Lesson 1 (L2-I4, L2-L7). */
  lesson: number;
  view: ViewId;
  /** The big picture's mode; in the store so Lesson 4 can open the SVD mode (§8.8). */
  bigPictureMode: BigPictureViewMode;
  theme: ThemeSetting;
  /** Shown after a view switch had to replace the matrix; null otherwise. */
  notice: string | null;

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
  /** Keeps A and b when they fit the new view; otherwise loads its default preset and sets `notice`. */
  setView: (view: ViewId) => void;
  setLesson: (lesson: number) => void;
  setBigPictureMode: (mode: BigPictureViewMode) => void;
  dismissNotice: () => void;
  setTheme: (theme: ThemeSetting) => void;
}

const initial = presetById('system2x2')!;
const MAX_SIZE = 4;

const presetState = (p: Preset, s: AppState) => ({
  aCells: p.A,
  bCells: p.b,
  uCells: p.u ?? s.uCells,
  vCells: p.v ?? s.vCells,
  presetId: p.id,
});

const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));

export const useStore = create<AppState>((set) => ({
  aCells: initial.A,
  bCells: initial.b,
  uCells: ['1', '1', '1'],
  vCells: ['1', '2', '3'],
  presetId: initial.id,
  lesson: 1,
  view: 'row',
  bigPictureMode: 'dimensions',
  theme: 'system',
  notice: null,

  setCell: (row, col, value) =>
    set((s) => ({ aCells: replaceAt(s.aCells, row, replaceAt(s.aCells[row], col, value)), presetId: null })),
  setBCell: (row, value) => set((s) => ({ bCells: s.bCells && replaceAt(s.bCells, row, value), presetId: null })),
  setUCell: (i, value) => set((s) => ({ uCells: replaceAt(s.uCells, i, value) })),
  setVCell: (i, value) => set((s) => ({ vCells: replaceAt(s.vCells, i, value) })),

  addRow: () =>
    set((s) =>
      s.aCells.length >= MAX_SIZE
        ? s
        : {
            aCells: [...s.aCells, s.aCells[0].map(() => '0')],
            bCells: s.bCells && [...s.bCells, '0'],
            presetId: null,
          },
    ),
  removeRow: () =>
    set((s) =>
      s.aCells.length <= 1 ? s : { aCells: s.aCells.slice(0, -1), bCells: s.bCells && s.bCells.slice(0, -1), presetId: null },
    ),
  addColumn: () =>
    set((s) => (s.aCells[0].length >= MAX_SIZE ? s : { aCells: s.aCells.map((r) => [...r, '0']), presetId: null })),
  removeColumn: () =>
    set((s) => (s.aCells[0].length <= 1 ? s : { aCells: s.aCells.map((r) => r.slice(0, -1)), presetId: null })),
  toggleAugmented: () => set((s) => ({ bCells: s.bCells ? null : s.aCells.map(() => '0'), presetId: null })),

  loadPreset: (id) => {
    const p = presetById(id);
    if (!p) return;
    set((s) => ({ ...presetState(p, s), notice: null }));
  },
  setView: (view) =>
    set((s) => {
      if (view === s.view) return s;
      const m = s.aCells.length;
      const n = s.aCells[0]?.length ?? 0;
      if (fitsView(view, m, n)) return { view, notice: null };
      const p = presetById(DEFAULT_PRESET_FOR_VIEW[view])!;
      return {
        view,
        ...presetState(p, s),
        notice: `${VIEW_REQUIREMENTS[view]!.needs}, and your matrix is ${m}×${n}, so the "${p.name}" preset was loaded.`,
      };
    }),
  setLesson: (lesson) => set({ lesson }),
  setBigPictureMode: (bigPictureMode) => set({ bigPictureMode }),
  dismissNotice: () => set({ notice: null }),
  setTheme: (theme) => set({ theme }),
}));
