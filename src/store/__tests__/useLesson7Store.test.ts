import { beforeEach, describe, expect, it } from 'vitest';
import { matrixToStrings, vectorToStrings } from '../../core/matrix';
import { useLesson7Store } from '../useLesson7Store';
import { parseLesson7 } from '../useLesson7System';

const s = () => useLesson7Store.getState();

beforeEach(() => {
  useLesson7Store.setState(useLesson7Store.getInitialState(), true);
});

describe('Lesson 7 store (§12)', () => {
  it("opens on the notes' 2 × 3 example and the age/height data; regression results hidden", () => {
    expect(s().svdPresetId).toBe('notesExample');
    expect(s().svdCells).toEqual([['0', '1', '1'], ['1', '1', '0']]);
    expect(s().pcaCells[0]).toEqual(['3', '7', '70']);
    expect(s().sign).toBe('largest-positive');
    expect(s().regressionRevealed).toBe(false);
    expect(s().cutoff).toBe(0.01);
  });

  it('resizing the SVD matrix keeps 1–4 and pads with 0', () => {
    s().resizeSvd(3, 3);
    expect(s().svdCells).toEqual([['0', '1', '1'], ['1', '1', '0'], ['0', '0', '0']]);
    s().resizeSvd(5, 3);
    expect(s().svdCells).toHaveLength(3);
  });

  it('the test pattern becomes the image', () => {
    s().useTestPattern();
    expect(s().image).not.toBeNull();
    expect(s().imageName).toMatch(/test/i);
  });

  it('PCA rows can be added and removed (at least 2 remain)', () => {
    s().addPcaRow();
    expect(s().pcaCells).toHaveLength(7);
    expect(s().pcaCells[6]).toEqual(['0', '0', '0']);
    for (let k = 0; k < 10; k++) s().removePcaRow(0);
    expect(s().pcaCells).toHaveLength(2);
  });

  it('a dragged point is written back to the table, rounded to 2 decimals (L7-L3)', () => {
    s().movePoint(0, [3.14159, 6.999]);
    expect(s().pcaCells[0]).toEqual(['3.14', '7', '70']);
  });

  it('a dragged point is written back without the demo shift', () => {
    s().setShift(10);
    s().movePoint(0, [13, 17]);
    expect(s().pcaCells[0].slice(0, 2)).toEqual(['3', '7']);
  });

  it('a new face seed changes the seed', () => {
    const before = s().faceOptions.seed;
    s().newFaceSeed();
    expect(s().faceOptions.seed).not.toBe(before);
  });
});

describe('parseLesson7', () => {
  it('parses A, X (with the shift) and y; flags bad cells', () => {
    const p = parseLesson7([['0', '1'], ['x', '2']], [['3', '7', '70'], ['-4', 'q', '48']], 10);
    expect(matrixToStrings(p.A)).toEqual([['0', '1'], ['0', '2']]);
    expect(matrixToStrings(p.X)).toEqual([['13', '17'], ['6', '10']]);
    expect(vectorToStrings(p.y)).toEqual(['70', '48']);
    expect(p.invalid).toEqual({ A: [[1, 0]], table: [[1, 1]] });
  });
});
