import type { FaceSetOptions } from '../core/faces';

/** Lesson 7 presets (F-P8, §15.7). Cells are editor strings. */
export interface SvdPreset {
  id: string;
  name: string;
  A: string[][];
}

export const SVD_PRESETS: SvdPreset[] = [
  {
    // Notes §7.0 (from the MATH 2331 notes): σ = √3, 1.
    id: 'notesExample',
    name: "Notes' 2 × 3 example",
    A: [
      ['0', '1', '1'],
      ['1', '1', '0'],
    ],
  },
  {
    // A 2 × 2 for the circle-to-ellipse picture (L7-S4): AᵀA = [[25, 20], [20, 25]], σ = 3√5, √5.
    id: 'ellipse2x2',
    name: '2 × 2: circle to ellipse',
    A: [
      ['3', '0'],
      ['4', '5'],
    ],
  },
  {
    // Lesson 1's matrix: rank 2, so one singular value is 0.
    id: 'lesson1',
    name: 'Lesson 1 matrix (rank 2)',
    A: [
      ['1', '0', '1'],
      ['2', '1', '3'],
      ['3', '-2', '1'],
    ],
  },
];

export const svdPresetById = (id: string) => SVD_PRESETS.find((p) => p.id === id);

/** Notes §7.1: centered age x₁ and height x₂ for six people, with illustrative weights y (not in the notes). */
export const PCA_COLUMNS = ['Age x₁', 'Height x₂', 'Weight y'];
export const AGE_HEIGHT_ROWS: string[][] = [
  ['3', '7', '70'],
  ['-4', '-6', '48'],
  ['7', '8', '80'],
  ['1', '-1', '58'],
  ['-4', '-1', '52'],
  ['-3', '-7', '44'],
];

/** Images (L7-I1): the generated test picture, or an upload. Scaled so the long side is at most this. */
export const MAX_IMAGE_SIDE = 1024;
export const TEST_PATTERN_SIZE = { rows: 192, cols: 256 };
/** The notes' cutoff c in "keep σᵢ ≥ c·σ₁". */
export const NOTES_CUTOFF = 0.01;

/** L7-F2: the generated face set (F-M55). */
export const DEFAULT_FACES: FaceSetOptions = { people: 12, variations: 6, size: 64, seed: 2026 };
/** L7-F5: the notes suggest 20–50 components for real faces; small sets need fewer. */
export const DEFAULT_FACE_COMPONENTS = 12;
