import { beforeEach, describe, expect, it } from 'vitest';
import { matrix, matrixToStrings, vector } from '../../core/matrix';
import { useLesson3Store } from '../useLesson3Store';
import { parseLesson3 } from '../useLesson3System';
import { useStore } from '../useStore';

const s = () => useLesson3Store.getState();

beforeEach(() => {
  useLesson3Store.setState(useLesson3Store.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
});

describe('Lesson 3 store (§8)', () => {
  it('opens on the notes\' LU example with b = (2, 5, −1)', () => {
    expect(s().presetId).toBe('luExample');
    expect(s().aCells).toEqual([
      ['1', '2', '2'],
      ['2', '6', '5'],
      ['-1', '8', '7'],
    ]);
    expect(s().rhsCells).toEqual([['2', '5', '-1']]);
  });

  it('setSize keeps A square and resizes every right-hand side', () => {
    s().setSize(4);
    expect(s().aCells).toHaveLength(4);
    expect(s().aCells.every((r) => r.length === 4)).toBe(true);
    expect(s().rhsCells[0]).toHaveLength(4);
    s().setSize(2);
    expect(s().aCells).toEqual([
      ['1', '2'],
      ['2', '6'],
    ]);
    expect(s().rhsCells[0]).toEqual(['2', '5']);
  });

  it('sizes stay within 1–4', () => {
    s().setSize(5);
    expect(s().aCells).toHaveLength(3);
  });

  it('adds and removes right-hand sides, keeping at least one (L3-K1)', () => {
    s().addRhs();
    expect(s().rhsCells).toHaveLength(2);
    expect(s().rhsCells[1]).toEqual(['0', '0', '0']);
    s().removeRhs(0);
    s().removeRhs(0);
    expect(s().rhsCells).toHaveLength(1);
  });

  it('B and C resize independently, up to 4 × 4 (L3-MM1)', () => {
    s().resizeProduct('B', 3, 3);
    expect(s().bCells.map((r) => r.length)).toEqual([3, 3, 3]);
    s().resizeProduct('C', 5, 1);
    expect(s().cCells).toHaveLength(2);
  });

  it('imports a square Lesson 1 matrix with its b (§8)', () => {
    s().importFromLesson1();
    expect(s().aCells).toEqual(useStore.getState().aCells);
    expect(s().rhsCells).toEqual([useStore.getState().bCells]);
  });

  it('never imports a non-square matrix silently: a notice explains why', () => {
    useStore.getState().loadPreset('strang3x4');
    s().importFromLesson1();
    expect(s().presetId).toBe('luExample');
    expect(s().notice).toMatch(/square/i);
  });

  it('opens Lesson 1 with this A and b (L3-S4)', () => {
    s().openInLesson1(matrix([[1, 2], [3, 4]]), vector([5, 6]), 'column');
    expect(useStore.getState()).toMatchObject({ lesson: 1, view: 'column', aCells: [['1', '2'], ['3', '4']], bCells: ['5', '6'] });
  });
});

describe('solving from L and U (L3-S6)', () => {
  it('starts on "factor A", with L and U already filled from the LU example', () => {
    expect(s().solveInput).toBe('A');
    expect(s().lCells).toEqual([
      ['1', '0', '0'],
      ['2', '1', '0'],
      ['-1', '5', '1'],
    ]);
    expect(s().uCells).toEqual([
      ['1', '2', '2'],
      ['0', '2', '1'],
      ['0', '0', '4'],
    ]);
  });

  it('loading a preset refactors L and U (housing XᵀX: L = [[1,0],[19/12,1]], U = [[3,19/4],[0,19/24]])', () => {
    s().loadPreset('housingYears');
    expect(s().lCells).toEqual([
      ['1', '0'],
      ['19/12', '1'],
    ]);
    expect(s().uCells).toEqual([
      ['3', '4.75'],
      ['0', '19/24'],
    ]);
  });

  it('a matrix that needs row exchanges falls back to partial pivoting', () => {
    s().setPivoting('none');
    s().loadPreset('paluExample');
    s().setPivoting('none');
    s().fillFactorsFromA();
    expect(s().uCells[0]).toEqual(['2', '4', '2']);
    expect(s().notice).toMatch(/PA = LU/);
  });

  it('resizing keeps L and U square, padding with 1s on the diagonal', () => {
    s().setSize(4);
    expect(s().lCells.map((r) => r.length)).toEqual([4, 4, 4, 4]);
    expect(s().lCells[3]).toEqual(['0', '0', '0', '1']);
    expect(s().uCells[3]).toEqual(['0', '0', '0', '1']);
    s().setSize(2);
    expect(s().lCells).toEqual([
      ['1', '0'],
      ['2', '1'],
    ]);
  });

  it('edits L and U cell by cell, and switches input', () => {
    s().setLCell(2, 1, '7');
    s().setUCell(0, 0, '3');
    s().setSolveInput('LU');
    expect(s().lCells[2][1]).toBe('7');
    expect(s().uCells[0][0]).toBe('3');
    expect(s().solveInput).toBe('LU');
  });

  it('"fill from A" refactors, and explains PA = LU when A needs row exchanges', () => {
    s().setLCell(2, 1, '7');
    s().fillFactorsFromA();
    expect(s().lCells[2][1]).not.toBe('7');
    expect(s().notice).toBeNull();
    s().loadPreset('paluExample');
    s().fillFactorsFromA();
    expect(s().notice).toMatch(/PA = LU/);
    expect(s().uCells).toEqual([
      ['2', '4', '2'],
      ['0', '3', '1'],
      ['0', '0', '1'],
    ]);
  });
});

describe('parseLesson3', () => {
  it('parses every grid exactly and flags bad cells', () => {
    const sys = parseLesson3([['1', 'x'], ['0.5', '2']], [['1', '2']], [['1']], [['3/4']]);
    expect(matrixToStrings(sys.A)).toEqual([['1', '0'], ['1/2', '2']]);
    expect(sys.invalid.A).toEqual([[0, 1]]);
    expect(sys.rhs).toHaveLength(1);
    expect(matrixToStrings(sys.C)).toEqual([['3/4']]);
  });

  it('parses L and U, flagging bad cells', () => {
    const sys = parseLesson3([['1']], [['1']], [['1']], [['1']], [['1', '0'], ['x', '1']], [['2', '1'], ['0', '3/2']]);
    expect(matrixToStrings(sys.U)).toEqual([['2', '1'], ['0', '3/2']]);
    expect(sys.invalid.L).toEqual([[1, 0]]);
  });

  it('right-hand side cells are flagged as [k, i]', () => {
    expect(parseLesson3([['1']], [['1'], ['?']], [['1']], [['1']]).invalid.rhs).toEqual([[1, 0]]);
  });
});
