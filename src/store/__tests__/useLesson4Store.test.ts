import { beforeEach, describe, expect, it } from 'vitest';
import { matrix, matrixToStrings, vector } from '../../core/matrix';
import { useDataStore } from '../useDataStore';
import { useLesson4Store } from '../useLesson4Store';
import { parseLesson4 } from '../useLesson4System';
import { useStore } from '../useStore';

const s = () => useLesson4Store.getState();

beforeEach(() => {
  useLesson4Store.setState(useLesson4Store.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
  useDataStore.setState(useDataStore.getInitialState(), true);
});

describe('Lesson 4 store (§9)', () => {
  it('opens on the notes\' 4 × 2 example, notes sign, x = (2,2,1), w = (3,0,0)', () => {
    expect(s().presetId).toBe('qrExample');
    expect(s().bCells).toEqual(['3', '-1', '1', '3']);
    expect(s().sign).toBe('notes');
    expect(s().xCells).toEqual(['2', '2', '1']);
    expect(s().wCells).toEqual(['3', '0', '0']);
  });

  it('resize keeps m ≥ n and sizes within 1–4; b follows the rows', () => {
    s().resize(4, 3);
    expect(s().aCells.map((r) => r.length)).toEqual([3, 3, 3, 3]);
    s().resize(2, 3);
    expect(s().aCells).toHaveLength(4);
    s().resize(3, 3);
    expect(s().aCells).toHaveLength(3);
    expect(s().bCells).toHaveLength(3);
  });

  it('ℝ² / ℝ³ switch crops or pads x, w, y', () => {
    s().setReflectorDim(2);
    expect(s().xCells).toEqual(['2', '2']);
    s().setReflectorDim(3);
    expect(s().xCells).toEqual(['2', '2', '0']);
  });

  it('snap w to the axis: ‖(2,2,1)‖ = 3 gives w = (3, 0, 0)', () => {
    s().setVectorCell('w', 0, '0');
    s().snapWToAxis();
    expect(s().wCells).toEqual(['3', '0', '0']);
  });

  it('dragging w keeps its length ‖x‖ = 3; rescaleW fixes a mismatch', () => {
    s().dragW([0, 6, 0]);
    expect(s().wCells.map(Number)).toEqual([0, 3, 0]);
    s().setVectorCell('w', 1, '1');
    s().rescaleW();
    expect(s().wCells.map(Number)).toEqual([0, 3, 0]);
  });

  it('dragging y sets it freely', () => {
    s().dragY([1.5, -2, 0.25]);
    expect(s().yCells).toEqual(['1.5', '-2', '0.25']);
  });

  it('imports Lesson 1\'s A and b, and refuses m < n with a notice', () => {
    s().importFromLesson1();
    expect(s().aCells).toEqual(useStore.getState().aCells);
    useStore.getState().loadPreset('strang3x4');
    s().importFromLesson1();
    expect(s().notice).toMatch(/rows/i);
  });

  it('imports Lesson 2\'s X and Y (L4-LS5)', () => {
    s().importFromLesson2();
    expect(s().aCells).toEqual([
      ['1', '1'],
      ['1', '2.25'],
      ['1', '1.5'],
    ]);
    expect(s().bCells).toEqual(['4', '6', '5']);
  });

  it('opens a Lesson 1 view with this A and b', () => {
    s().openInLesson1(matrix([[1, 2], [3, 4]]), vector([5, 6]), 'subspaces');
    expect(useStore.getState()).toMatchObject({ lesson: 1, view: 'subspaces', aCells: [['1', '2'], ['3', '4']] });
  });
});

describe('parseLesson4', () => {
  it('parses A, b and the reflector vectors exactly, flagging bad cells', () => {
    const sys = parseLesson4([['1', 'x'], ['0.5', '2']], ['1', '?'], ['2', '2', '1'], ['3', '0', '0'], ['1', '0', '2']);
    expect(matrixToStrings(sys.A)).toEqual([['1', '0'], ['1/2', '2']]);
    expect(sys.invalid.A).toEqual([[0, 1]]);
    expect(sys.invalid.b).toEqual([1]);
    expect(sys.x).toHaveLength(3);
  });
});
