import { beforeEach, describe, expect, it } from 'vitest';
import { matrix, matrixToStrings, vectorToStrings } from '../../core/matrix';
import { NOTES_SEQUENCE } from '../../presets/lesson5';
import { useLesson5Store } from '../useLesson5Store';
import { parseLesson5 } from '../useLesson5System';
import { useStore } from '../useStore';

const s = () => useLesson5Store.getState();

beforeEach(() => {
  useLesson5Store.setState(useLesson5Store.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
});

describe('Lesson 5 store (§10)', () => {
  it('opens on the mini web with x₀ = (1, 0, 0), fractions, and the notes\' sequence in practice mode', () => {
    expect(s().presetId).toBe('miniWeb');
    expect(s().pCells[0]).toEqual(['0.7', '0.1', '0.2']);
    expect(s().x0Cells).toEqual(['1', '0', '0']);
    expect(s().numberDisplay).toBe('fraction');
    expect(s().sequenceText).toBe(NOTES_SEQUENCE);
    expect(s().practiceRevealed).toBe(false);
  });

  it('graph and matrix edit the same cells: the arrow i → j is p_ji (L5-MC2, L5-MC3)', () => {
    s().setEdge(0, 2, '0.3');
    expect(s().pCells[2][0]).toBe('0.3');
    expect(s().presetId).toBeNull();
  });

  it('pure states (L5-EV1)', () => {
    s().setPureState(2);
    expect(s().x0Cells).toEqual(['0', '0', '1']);
  });

  it('x₀ from the simplex point, written as editor text', () => {
    s().setX0FromSimplex([0.25, 0.25, 0.5]);
    expect(s().x0Cells).toEqual(['0.25', '0.25', '0.5']);
  });

  it('add a state: up to 4, with a self-loop of 1 so P stays stochastic; x₀ and names follow', () => {
    s().addState();
    expect(s().pCells).toHaveLength(4);
    expect(s().pCells.map((r) => r[3])).toEqual(['0', '0', '0', '1']);
    expect(s().pCells[3].slice(0, 3)).toEqual(['0', '0', '0']);
    expect(s().x0Cells).toEqual(['1', '0', '0', '0']);
    expect(s().stateNames).toHaveLength(4);
    s().addState();
    expect(s().pCells).toHaveLength(4);
  });

  it('remove a state: at least 2 remain; the row and column go', () => {
    s().removeState(1);
    expect(s().pCells).toEqual([
      ['0.7', '0.2'],
      ['0.1', '0.6'],
    ]);
    expect(s().stateNames).toEqual(['Page 1', 'Page 3']);
    s().removeState(0);
    expect(s().pCells).toHaveLength(2);
  });

  it('normalize a column (L5-MC4)', () => {
    s().setPCell(0, 0, '0.6');
    s().normalizeColumn(0);
    const P = parseLesson5(s().pCells, s().x0Cells).P;
    expect(matrixToStrings(P).map((r) => r[0])).toEqual(['2/3', '2/9', '1/9']);
  });

  it('presets load P, x₀ and names; a counterexample keeps its explanation (L5-PF5)', () => {
    s().loadPreset('absorbing');
    expect(s().x0Cells).toEqual(['0', '0', '1']);
    expect(s().pCells[0]).toEqual(['1', '0', '0.5']);
  });

  it('new seed changes the seed; editing the sequence marks it pasted and hides the answer', () => {
    const before = s().seed;
    s().newSeed();
    expect(s().seed).not.toBe(before);
    s().revealPractice();
    s().setSequenceText('1 2 1');
    expect(s().sequenceSource).toBe('pasted');
    expect(s().practiceRevealed).toBe(false);
  });

  it('simulating a sequence uses the chain, seed and length (L5-ES1)', () => {
    s().setSequenceLength(50);
    s().simulateSequence();
    expect(s().sequenceSource).toBe('simulated');
    expect(s().sequenceText.replace(/\D/g, '')).toHaveLength(50);
    const first = s().sequenceText;
    s().simulateSequence();
    expect(s().sequenceText).toBe(first);
  });

  it('"Use this estimate" sends P̂ to the chain (L5-ES8)', () => {
    s().useEstimate(matrix([['1/6', '1/3', '1/2'], ['1/2', '1/3', '1/3'], ['1/3', '1/3', '1/6']]));
    expect(s().pCells[0]).toEqual(['1/6', '1/3', '1/2']);
    expect(s().presetId).toBeNull();
  });

  it('opens Lesson 1 elimination on P − λI (L5-EG2)', () => {
    s().openInLesson1(matrix([['-3/10', '1/10'], ['3/10', '-1/10']]), matrix([[0], [0]]).map((r) => r[0]), 'elimination');
    expect(useStore.getState().lesson).toBe(1);
    expect(useStore.getState().view).toBe('elimination');
    expect(useStore.getState().aCells[0]).toEqual(['-3/10', '1/10']);
  });
});

describe('parseLesson5', () => {
  it('parses decimals exactly and flags bad cells', () => {
    const r = parseLesson5([['0.7', 'x'], ['0.3', '1']], ['1', '']);
    expect(matrixToStrings(r.P)).toEqual([['7/10', '0'], ['3/10', '1']]);
    expect(vectorToStrings(r.x0)).toEqual(['1', '0']);
    expect(r.invalid).toEqual({ P: [[0, 1]], x0: [1] });
  });
});
