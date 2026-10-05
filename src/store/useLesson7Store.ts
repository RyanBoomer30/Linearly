import { create } from 'zustand';
import type { FaceSetOptions } from '../core/faces';
import type { FloatMatrix } from '../core/float';
import type { Matrix } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';
import type { ComponentSign } from '../core/pca';
import { AGE_HEIGHT_ROWS, DEFAULT_FACE_COMPONENTS, DEFAULT_FACES, NOTES_CUTOFF, svdPresetById } from '../presets/lesson7';
import type { NumberDisplay } from './useDataStore';

export type Lesson7ViewId = 'svd' | 'image' | 'pca' | 'reduction' | 'covariance' | 'variance' | 'bestLine' | 'faces';

/** L7-F6: what to recognize. */
export type FaceQuery =
  /** A variation of a known person that is left out of the database. */
  | { kind: 'heldOut'; person: number }
  /** A database face with added noise. */
  | { kind: 'noisy'; index: number; noise: number }
  /** An uploaded image. */
  | { kind: 'upload' };

/**
 * Lesson 7 store (§12): three separate inputs — a matrix for the SVD view, an
 * image for compression, and the PCA table — plus the face set. Heavy results
 * (the image and its SVD) are kept when switching views.
 */
export interface Lesson7State {
  view: Lesson7ViewId;
  numberDisplay: NumberDisplay;
  notice: string | null;

  // §11.1
  svdCells: string[][];
  svdPresetId: string | null;
  svdK: number;

  // §11.2
  image: FloatMatrix | null;
  imageName: string;
  imageK: number;
  /** L7-I2: k from the slider, or from the cutoff rule σᵢ ≥ c·σ₁. */
  kMode: 'slider' | 'cutoff';
  cutoff: number;
  /** L7-I5: which single layer σᵢuᵢvᵢᵀ to show. */
  layerIndex: number;

  // §11.3–11.7
  pcaCells: string[][];
  /** L7-P2: added to x₁ and x₂ to show why centering matters. */
  shift: number;
  standardize: boolean;
  sign: ComponentSign;
  /** L7-P5: flip v₁ (and so z₁ and its coefficient). */
  flipV1: boolean;
  /** L7-V3: components kept as signal. */
  keep: number;
  /** L7-D4: the regression results are homework, so they open hidden. */
  regressionRevealed: boolean;
  /** L7-L4 */
  showReverseLine: boolean;
  selectedRow: number | null;

  // §11.8
  faceOptions: FaceSetOptions;
  faceComponents: number;
  faceQuery: FaceQuery;
  /** The face to reconstruct (L7-F5). */
  faceIndex: number;
  faceUpload: FloatMatrix | null;

  setView: (view: Lesson7ViewId) => void;
  setNumberDisplay: (mode: NumberDisplay) => void;
  dismissNotice: () => void;

  setSvdCell: (row: number, col: number, value: string) => void;
  /** 1–4 rows and columns. */
  resizeSvd: (rows: number, cols: number) => void;
  loadSvdPreset: (id: string) => void;
  setSvdK: (k: number) => void;
  /** L7-S5: open this matrix in the Lesson 1 big picture's SVD mode (§8.8). */
  openInLesson1: (A: Matrix) => void;
  /** L7-S5: open the Lesson 5 layers (§9.6) to compare factorizations. */
  openLesson5Layers: () => void;

  /** L7-I1: decode an upload (kept in the browser), grayscale, scaled to at most 1024 on the long side. */
  loadImageFile: (file: File) => Promise<void>;
  /** The generated test picture. */
  useTestPattern: () => void;
  setImageK: (k: number) => void;
  setKMode: (mode: 'slider' | 'cutoff') => void;
  setCutoff: (c: number) => void;
  setLayerIndex: (i: number) => void;

  setPcaCell: (row: number, col: number, value: string) => void;
  addPcaRow: () => void;
  removePcaRow: (row: number) => void;
  /** L7-L3: a dragged scatter point, written back to the table (rounded to 2 decimals). */
  movePoint: (row: number, to: [number, number]) => void;
  setShift: (shift: number) => void;
  setStandardize: (on: boolean) => void;
  setSign: (sign: ComponentSign) => void;
  setFlipV1: (flip: boolean) => void;
  setKeep: (keep: number) => void;
  revealRegression: () => void;
  setShowReverseLine: (show: boolean) => void;
  selectRow: (row: number | null) => void;
  resetPcaData: () => void;

  setFaceOptions: (patch: Partial<FaceSetOptions>) => void;
  newFaceSeed: () => void;
  setFaceComponents: (m: number) => void;
  setFaceQuery: (query: FaceQuery) => void;
  setFaceIndex: (i: number) => void;
  /** L7-F6: an uploaded query face, resized to the set's size. */
  loadFaceUpload: (file: File) => Promise<void>;
}

const initialSvd = svdPresetById('notesExample')!;
const replaceAt = <T,>(arr: T[], i: number, value: T) => arr.map((x, k) => (k === i ? value : x));
const setGridCell = (grid: string[][], row: number, col: number, value: string) => replaceAt(grid, row, replaceAt(grid[row], col, value));

export const useLesson7Store = create<Lesson7State>((set) => ({
  view: 'svd',
  numberDisplay: 'fraction',
  notice: null,

  svdCells: initialSvd.A,
  svdPresetId: initialSvd.id,
  svdK: 1,

  image: null,
  imageName: '',
  imageK: 20,
  kMode: 'slider',
  cutoff: NOTES_CUTOFF,
  layerIndex: 0,

  pcaCells: AGE_HEIGHT_ROWS,
  shift: 0,
  standardize: false,
  sign: 'largest-positive',
  flipV1: false,
  keep: 1,
  regressionRevealed: false,
  showReverseLine: false,
  selectedRow: null,

  faceOptions: DEFAULT_FACES,
  faceComponents: DEFAULT_FACE_COMPONENTS,
  faceQuery: { kind: 'heldOut', person: 0 },
  faceIndex: 0,
  faceUpload: null,

  setView: (view) => set({ view }),
  setNumberDisplay: (numberDisplay) => set({ numberDisplay }),
  dismissNotice: () => set({ notice: null }),

  setSvdCell: (row, col, value) => set((s) => ({ svdCells: setGridCell(s.svdCells, row, col, value), svdPresetId: null })),
  resizeSvd: () => notImplemented('resizeSvd'),
  loadSvdPreset: (id) => {
    const p = svdPresetById(id);
    if (p) set({ svdCells: p.A, svdPresetId: p.id, svdK: 1 });
  },
  setSvdK: (svdK) => set({ svdK }),
  openInLesson1: () => notImplemented('openInLesson1'),
  openLesson5Layers: () => notImplemented('openLesson5Layers'),

  loadImageFile: () => notImplemented('loadImageFile'),
  useTestPattern: () => notImplemented('useTestPattern'),
  setImageK: (imageK) => set({ imageK }),
  setKMode: (kMode) => set({ kMode }),
  setCutoff: (cutoff) => set({ cutoff }),
  setLayerIndex: (layerIndex) => set({ layerIndex }),

  setPcaCell: (row, col, value) => set((s) => ({ pcaCells: setGridCell(s.pcaCells, row, col, value) })),
  addPcaRow: () => notImplemented('addPcaRow'),
  removePcaRow: () => notImplemented('removePcaRow'),
  movePoint: () => notImplemented('movePoint'),
  setShift: (shift) => set({ shift }),
  setStandardize: (standardize) => set({ standardize }),
  setSign: (sign) => set({ sign }),
  setFlipV1: (flipV1) => set({ flipV1 }),
  setKeep: (keep) => set({ keep }),
  revealRegression: () => set({ regressionRevealed: true }),
  setShowReverseLine: (showReverseLine) => set({ showReverseLine }),
  selectRow: (selectedRow) => set({ selectedRow }),
  resetPcaData: () => set({ pcaCells: AGE_HEIGHT_ROWS, shift: 0 }),

  setFaceOptions: (patch) => set((s) => ({ faceOptions: { ...s.faceOptions, ...patch } })),
  newFaceSeed: () => notImplemented('newFaceSeed'),
  setFaceComponents: (faceComponents) => set({ faceComponents }),
  setFaceQuery: (faceQuery) => set({ faceQuery }),
  setFaceIndex: (faceIndex) => set({ faceIndex }),
  loadFaceUpload: () => notImplemented('loadFaceUpload'),
}));
