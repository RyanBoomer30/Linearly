import { beforeEach, describe, expect, it } from 'vitest';
import { matrix, vector } from '../../core/matrix';
import { MAX_DATA_ROWS, useDataStore } from '../useDataStore';
import { useStore } from '../useStore';

const s = () => useDataStore.getState();

beforeEach(() => {
  useDataStore.setState(useDataStore.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
});

describe('Lesson 2 store', () => {
  it('opens on the 3-house preset with the line model (§7)', () => {
    expect(s().presetId).toBe('houses');
    expect(s().cells).toEqual([
      ['1', '4'],
      ['2.25', '6'],
      ['1.5', '5'],
    ]);
    expect(s().model).toEqual({ kind: 'line' });
  });

  it('editing a cell resets θ to θ* and marks the data as custom', () => {
    s().setTheta([1, 2]);
    s().setCell(0, 1, '4.5');
    expect(s().theta).toBeNull();
    expect(s().presetId).toBeNull();
  });

  it('changing the model resets θ', () => {
    s().setTheta([1, 2]);
    s().setModel({ kind: 'origin' });
    expect(s().theta).toBeNull();
  });
});

describe('rows (F-T2)', () => {
  it('adds an empty row with the next label', () => {
    s().addRow();
    expect(s().cells[3]).toEqual(['', '']);
    expect(s().rowLabels[3]).toBe('House 4');
  });

  it('stops at 100 rows', () => {
    useDataStore.setState({ cells: Array.from({ length: MAX_DATA_ROWS }, () => ['1', '1']), rowLabels: [] });
    s().addRow();
    expect(s().cells).toHaveLength(MAX_DATA_ROWS);
  });

  it('removes a row and keeps the selection on the same data point', () => {
    s().selectRow(2);
    s().removeRow(0);
    expect(s().cells).toEqual([
      ['2.25', '6'],
      ['1.5', '5'],
    ]);
    expect(s().rowLabels).toEqual(['House 2', 'House 3']);
    expect(s().selectedRow).toBe(1);
  });

  it('never removes the last row', () => {
    s().removeRow(0);
    s().removeRow(0);
    s().removeRow(0);
    expect(s().cells).toHaveLength(1);
  });
});

describe('columns (F-T2)', () => {
  it('adds a feature before the target', () => {
    s().addColumn();
    expect(s().columns.map((c) => c.name)).toEqual(['Living area', 'Feature 2', 'Price']);
    expect(s().targetCol).toBe(2);
    expect(s().cells[0]).toEqual(['1', '', '4']);
  });

  it('a one-feature model falls back to the linear model when a feature is added', () => {
    s().addColumn();
    expect(s().model).toEqual({ kind: 'linear' });
  });

  it('removes a feature but never the target', () => {
    s().loadPreset('twoFeature');
    s().removeColumn(2);
    expect(s().columns).toHaveLength(3);
    s().removeColumn(1);
    expect(s().columns.map((c) => c.name)).toEqual(['Living area', 'Price']);
    expect(s().targetCol).toBe(1);
    expect(s().cells[0]).toEqual(['1', '4']);
  });

  it('keeps at least one feature', () => {
    s().removeColumn(0);
    expect(s().columns).toHaveLength(2);
  });

  it('any column can be the target', () => {
    s().setTargetCol(0);
    expect(s().targetCol).toBe(0);
  });
});

describe('paste (F-T3)', () => {
  it('replaces the table; the last column is the target and the header names the columns', () => {
    s().pasteTable({
      header: ['x', 'y'],
      cells: [
        ['-1', '1'],
        ['0', '0'],
        ['1', '0'],
        ['2', '2'],
      ],
    });
    expect(s().columns.map((c) => c.name)).toEqual(['x', 'y']);
    expect(s().targetCol).toBe(1);
    expect(s().cells).toHaveLength(4);
    expect(s().rowLabels).toEqual(['Point 1', 'Point 2', 'Point 3', 'Point 4']);
    expect(s().presetId).toBeNull();
  });

  it('without a header, keeps the column names when the shape is unchanged', () => {
    s().pasteTable({ header: null, cells: [['3', '7']] });
    expect(s().columns).toEqual([
      { name: 'Living area', unit: '1000 sq ft' },
      { name: 'Price', unit: '$100,000' },
    ]);
  });

  it('rejects tables that do not fit', () => {
    expect(() => s().pasteTable({ header: null, cells: [['1'], ['2']] })).toThrow(RangeError);
    expect(() => s().pasteTable({ header: null, cells: [['1', '2', '3', '4', '5', '6']] })).toThrow(RangeError);
  });
});

describe('openInLesson1 (L2-I4, L2-L7)', () => {
  it('sends X and Y to Lesson 1 as A and b and opens the chosen view', () => {
    s().openInLesson1(matrix([[1, 1], [1, '2.25'], [1, '1.5']]), vector([4, 6, 5]), 'projection');
    const l1 = useStore.getState();
    expect(l1.lesson).toBe(1);
    expect(l1.view).toBe('projection');
    expect(l1.aCells).toEqual([
      ['1', '1'],
      ['1', '2.25'],
      ['1', '1.5'],
    ]);
    expect(l1.bCells).toEqual(['4', '6', '5']);
  });

  it('fractions that are not finite decimals stay fractions', () => {
    s().openInLesson1(matrix([['1/3']]), vector([1]), 'normal');
    expect(useStore.getState().aCells).toEqual([['1/3']]);
  });

  it('refuses matrices larger than 4×4', () => {
    expect(() => s().openInLesson1(matrix([[1], [2], [3], [4], [5]]), vector([1, 2, 3, 4, 5]), 'projection')).toThrow(RangeError);
  });
});
