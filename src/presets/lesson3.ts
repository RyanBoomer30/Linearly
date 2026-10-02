import type { Pivoting } from '../core/lu';

/** Lesson 3 presets (F-P4, §11.3). Cells are editor strings. */
export interface Lesson3Preset {
  id: string;
  name: string;
  /** Square A. */
  A: string[][];
  /** Right-hand sides b₁ … bₖ. */
  rhs: string[][];
  pivoting: Pivoting;
}

export const LESSON3_PRESETS: Lesson3Preset[] = [
  {
    // Notes §3.2–3.3: the LU example, with b = (2, 5, −1).
    id: 'luExample',
    name: 'LU example',
    A: [
      ['1', '2', '2'],
      ['2', '6', '5'],
      ['-1', '8', '7'],
    ],
    rhs: [['2', '5', '-1']],
    pivoting: 'none',
  },
  {
    // Notes §3.4: needs row exchanges. b = A·(1, 1, 1), so x = (1, 1, 1).
    id: 'paluExample',
    name: 'PA = LU example',
    A: [
      ['1', '2', '2'],
      ['2', '4', '2'],
      ['-1', '1', '0'],
    ],
    rhs: [['5', '8', '0']],
    pivoting: 'partial',
  },
  {
    // Lesson 1's matrix: singular, so U has a zero last pivot (L3-LU7).
    id: 'lesson1Singular',
    name: 'Lesson 1 matrix (singular)',
    A: [
      ['1', '0', '1'],
      ['2', '1', '3'],
      ['3', '-2', '1'],
    ],
    rhs: [['2', '5', '4']],
    pivoting: 'none',
  },
  {
    // L3-K4: XᵀX for the Lesson 2 houses (line model), with XᵀY for three years of prices.
    id: 'housingYears',
    name: 'Houses, three years (XᵀX)',
    A: [
      ['3', '4.75'],
      ['4.75', '8.3125'],
    ],
    rhs: [
      ['15', '25'],
      ['16.3', '27.125'],
      ['17', '28.5'],
    ],
    pivoting: 'none',
  },
];

export const lesson3PresetById = (id: string) => LESSON3_PRESETS.find((p) => p.id === id);

/** Products for the two-ways and layers views (L3-MM6). */
export interface ProductPreset {
  id: string;
  name: string;
  B: string[][];
  C: string[][];
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  {
    // Lesson 1: A = CR.
    id: 'crProduct',
    name: 'CR from Lesson 1',
    B: [
      ['1', '0'],
      ['2', '1'],
      ['3', '-2'],
    ],
    C: [
      ['1', '0', '1'],
      ['0', '1', '1'],
    ],
  },
  {
    // §7.3: A = LU for the LU example.
    id: 'luProduct',
    name: 'L × U from the LU example',
    B: [
      ['1', '0', '0'],
      ['2', '1', '0'],
      ['-1', '5', '1'],
    ],
    C: [
      ['1', '2', '2'],
      ['0', '2', '1'],
      ['0', '0', '4'],
    ],
  },
  {
    // Lesson 1 products view: uvᵀ with u = (1, 1, 1), v = (1, 2, 3).
    id: 'outerProduct',
    name: 'Outer product uvᵀ',
    B: [['1'], ['1'], ['1']],
    C: [['1', '2', '3']],
  },
];

export const productPresetById = (id: string) => PRODUCT_PRESETS.find((p) => p.id === id);

/** L3-PM6: the tiny-pivot system, in floats. */
export const TINY_PIVOT = { A: [[1e-20, 1], [1, 1]], b: [1, 2] };

/**
 * L3-K4: the Lesson 2 houses with prices for three years (years 2 and 3 are
 * illustrative, not from the notes).
 */
export const HOUSING_YEARS = {
  x: ['1', '2.25', '1.5'],
  years: [
    { label: 'Year 1 (notes)', y: ['4', '6', '5'] },
    { label: 'Year 2', y: ['4.4', '6.5', '5.4'] },
    { label: 'Year 3', y: ['4.5', '7', '5.5'] },
  ],
};
