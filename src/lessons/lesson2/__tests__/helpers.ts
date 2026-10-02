import { CURVED, DEPENDENT, HOUSES, QUADRATIC, TWO_FEATURES } from '../../../core/__tests__/fixtures';
import { fromColumns, vector, type Scalarish } from '../../../core/matrix';
import type { Dataset, ModelChoice } from '../../../core/regression';
import { lessonData } from '../models';

/** A dataset from feature columns and a target column. */
export function dataset(features: Scalarish[][], y: Scalarish[], names?: string[]): Dataset {
  return {
    features: features.map((_, j) => ({ name: names?.[j] ?? `x${j + 1}`, unit: '' })),
    target: { name: 'y', unit: '' },
    inputs: fromColumns(features.map(vector)),
    y: vector(y),
    rowLabels: y.map((_, i) => `Point ${i + 1}`),
  };
}

export const HOUSES_DS: Dataset = {
  ...dataset([HOUSES.x], HOUSES.y),
  features: [{ name: 'Living area', unit: '1000 sq ft' }],
  target: { name: 'Price', unit: '$100,000' },
  rowLabels: ['House 1', 'House 2', 'House 3'],
};
export const QUADRATIC_DS = dataset([QUADRATIC.x], QUADRATIC.y);
export const TWO_FEATURES_DS = dataset([TWO_FEATURES.area, TWO_FEATURES.bedrooms], TWO_FEATURES.price, ['Living area', 'Bedrooms']);
export const CURVED_DS = dataset([CURVED.x], CURVED.y);
export const DEPENDENT_DS = dataset([DEPENDENT.x], DEPENDENT.y);

export const houses = (choice: ModelChoice) => lessonData(HOUSES_DS, choice);
export const ORIGIN: ModelChoice = { kind: 'origin' };
export const LINE: ModelChoice = { kind: 'line' };
export const poly = (degree: number): ModelChoice => ({ kind: 'polynomial', degree });
