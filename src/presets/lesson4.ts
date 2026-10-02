import type { FloatMatrix, FloatVector } from '../core/float';

/** Lesson 4 presets (F-P5, §12.4). A is m × n with m ≥ n; cells are editor strings. */
export interface Lesson4Preset {
  id: string;
  name: string;
  A: string[][];
  b: string[];
}

export const LESSON4_PRESETS: Lesson4Preset[] = [
  {
    // Notes §4.3–4.4: every norm is a whole number, so QR stays exact.
    id: 'qrExample',
    name: '4 × 2 QR example',
    A: [
      ['1', '4'],
      ['1', '1'],
      ['1', '1'],
      ['1', '0'],
    ],
    b: ['3', '-1', '1', '3'],
  },
  {
    // Lesson 2 houses, line model: ‖(1, 1, 1)‖ = √3, so QR switches to floating point (L4-LS5).
    id: 'housesLine',
    name: 'Houses, line model (Lesson 2)',
    A: [
      ['1', '1'],
      ['1', '2.25'],
      ['1', '1.5'],
    ],
    b: ['4', '6', '5'],
  },
  {
    // Lesson 1's matrix: square and singular (rank 2), for the SVD mode (§8.8).
    id: 'lesson1Matrix',
    name: 'Lesson 1 matrix',
    A: [
      ['1', '0', '1'],
      ['2', '1', '3'],
      ['3', '-2', '1'],
    ],
    b: ['2', '5', '5'],
  },
];

export const lesson4PresetById = (id: string) => LESSON4_PRESETS.find((p) => p.id === id);

/** Notes §4.1: the reflector example. */
export const REFLECTOR_EXAMPLE = { x: ['2', '2', '1'], w: ['3', '0', '0'], y: ['1', '0', '2'] };

/** L4-C3: three houses of almost equal size, X = [[1,1],[1,1+δ],[1,1+2δ]], with fixed prices. */
export function nearCollinearHouses(delta: number): { X: FloatMatrix; y: FloatVector } {
  return {
    X: [
      [1, 1],
      [1, 1 + delta],
      [1, 1 + 2 * delta],
    ],
    y: [1, 2, 4],
  };
}

/** δ slider range, as powers of ten. */
export const LOG_DELTA_RANGE: [number, number] = [-10, -1];
