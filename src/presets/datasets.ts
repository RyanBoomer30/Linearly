import type { ModelChoice, VariableInfo } from '../core/regression';

/** Dataset presets (F-P3, §10.2). Cells are editor strings, exactly as a student would type or paste them. */
export interface DatasetPreset {
  id: string;
  name: string;
  /** Feature columns, then the target column. */
  columns: VariableInfo[];
  /** Index into `columns` of the target. */
  targetCol: number;
  /** One row per data point, one cell per column. */
  cells: string[][];
  rowLabels: string[];
  /** Model loaded with the preset. */
  model: ModelChoice;
}

const labels = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

const LIVING_AREA: VariableInfo = { name: 'Living area', unit: '1000 sq ft' };
const PRICE: VariableInfo = { name: 'Price', unit: '$100,000' };

export const DATASET_PRESETS: DatasetPreset[] = [
  {
    // Notes §2.1: three houses.
    id: 'houses',
    name: '3 houses',
    columns: [LIVING_AREA, PRICE],
    targetCol: 1,
    cells: [
      ['1', '4'],
      ['2.25', '6'],
      ['1.5', '5'],
    ],
    rowLabels: labels('House', 3),
    model: { kind: 'line' },
  },
  {
    // Notes §2.4: four points, quadratic fit.
    id: 'quadratic',
    name: '4 points (quadratic)',
    columns: [
      { name: 'x', unit: '' },
      { name: 'y', unit: '' },
    ],
    targetCol: 1,
    cells: [
      ['-1', '1'],
      ['0', '0'],
      ['1', '0'],
      ['2', '2'],
    ],
    rowLabels: labels('Point', 4),
    model: { kind: 'polynomial', degree: 2 },
  },
  {
    // Illustrative, not in the notes.
    id: 'twoFeature',
    name: 'Housing, 2 features',
    columns: [LIVING_AREA, { name: 'Bedrooms', unit: '' }, PRICE],
    targetCol: 2,
    cells: [
      ['1', '2', '4'],
      ['2.25', '4', '6'],
      ['1.5', '3', '5'],
      ['1.75', '3', '5.5'],
      ['2.5', '4', '6.5'],
    ],
    rowLabels: labels('House', 5),
    model: { kind: 'linear' },
  },
  {
    // Notes §2.4 figure (illustrative values): curved data a straight line
    // underfits, the motivation for polynomial regression.
    id: 'curved',
    name: 'Curved data (a line underfits)',
    columns: [
      { name: 'x', unit: '' },
      { name: 'y', unit: '' },
    ],
    targetCol: 1,
    cells: [
      ['0', '1'],
      ['0.5', '2.5'],
      ['1', '3.2'],
      ['1.5', '3'],
      ['2', '2.1'],
      ['2.5', '1.6'],
      ['3', '1.8'],
      ['3.5', '3'],
      ['4', '4.8'],
      ['4.5', '6'],
      ['5', '6.3'],
    ],
    rowLabels: labels('Point', 11),
    model: { kind: 'line' },
  },
  {
    // All three x equal: X has dependent columns and XᵀX is singular (L2-N4).
    id: 'dependent',
    name: 'Dependent columns',
    columns: [LIVING_AREA, PRICE],
    targetCol: 1,
    cells: [
      ['1', '4'],
      ['1', '6'],
      ['1', '5'],
    ],
    rowLabels: labels('House', 3),
    model: { kind: 'line' },
  },
];

export const datasetPresetById = (id: string) => DATASET_PRESETS.find((p) => p.id === id);
