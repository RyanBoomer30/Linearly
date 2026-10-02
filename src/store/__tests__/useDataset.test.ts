import { describe, expect, it } from 'vitest';
import { matrixToStrings, vectorToStrings } from '../../core/matrix';
import { DATASET_PRESETS, datasetPresetById } from '../../presets/datasets';
import { parseDataset } from '../useDataset';

const parse = (id: string) => {
  const p = datasetPresetById(id)!;
  return parseDataset(p.columns, p.targetCol, p.cells, p.rowLabels);
};

describe('parseDataset (F-M11, F-T1)', () => {
  it('houses: decimals become exact rationals (2.25 → 9/4)', () => {
    const { dataset, invalid } = parse('houses');
    expect(invalid).toEqual([]);
    expect(matrixToStrings(dataset.inputs)).toEqual([['1'], ['9/4'], ['3/2']]);
    expect(vectorToStrings(dataset.y)).toEqual(['4', '6', '5']);
    expect(dataset.features).toEqual([{ name: 'Living area', unit: '1000 sq ft' }]);
    expect(dataset.target).toEqual({ name: 'Price', unit: '$100,000' });
    expect(dataset.rowLabels).toEqual(['House 1', 'House 2', 'House 3']);
  });

  it('two features: the target column is split off', () => {
    const { dataset } = parse('twoFeature');
    expect(dataset.features.map((f) => f.name)).toEqual(['Living area', 'Bedrooms']);
    expect(matrixToStrings(dataset.inputs)[3]).toEqual(['7/4', '3']);
    expect(vectorToStrings(dataset.y)[3]).toBe('11/2');
  });

  it('the target can be any column, not just the last (F-T2)', () => {
    const { dataset } = parseDataset(
      [
        { name: 'Price', unit: '' },
        { name: 'Area', unit: '' },
      ],
      0,
      [
        ['4', '1'],
        ['6', '2.25'],
      ],
      ['A', 'B'],
    );
    expect(dataset.target.name).toBe('Price');
    expect(matrixToStrings(dataset.inputs)).toEqual([['1'], ['9/4']]);
    expect(vectorToStrings(dataset.y)).toEqual(['4', '6']);
  });

  it('bad cells are flagged, never silently dropped (F-T3)', () => {
    const { dataset, invalid } = parseDataset(
      [
        { name: 'x', unit: '' },
        { name: 'y', unit: '' },
      ],
      1,
      [
        ['1', '4'],
        ['abc', '6'],
        ['1.5', ''],
      ],
      ['1', '2', '3'],
    );
    expect(invalid).toEqual([
      [1, 0],
      [2, 1],
    ]);
    expect(dataset.inputs).toHaveLength(3);
  });

  it('fractions are accepted as well as decimals', () => {
    const { dataset } = parseDataset(
      [
        { name: 'x', unit: '' },
        { name: 'y', unit: '' },
      ],
      1,
      [['3/4', '-0.5']],
      ['1'],
    );
    expect(matrixToStrings(dataset.inputs)).toEqual([['3/4']]);
    expect(vectorToStrings(dataset.y)).toEqual(['-1/2']);
  });

  it('every preset parses cleanly (F-P3)', () => {
    for (const p of DATASET_PRESETS) expect(parse(p.id).invalid).toEqual([]);
  });
});
