import { describe, expect, it } from 'vitest';
import { vector, vectorToStrings } from '../matrix';
import { integerFromFloat, scaleInteger, scaleProbability, scaleUnit } from '../scaling';
import { sv } from './fixtures';

describe('vector scaling (F-M37)', () => {
  it('integer: clear denominators, divide by the gcd, first nonzero entry positive', () => {
    expect(vectorToStrings(scaleInteger(vector(['7/8', '5/8', 1])))).toEqual(sv([7, 5, 8]));
    expect(vectorToStrings(scaleInteger(vector([14, 10, 16])))).toEqual(sv([7, 5, 8]));
    expect(vectorToStrings(scaleInteger(vector([-1, 0, 1])))).toEqual(sv([1, 0, -1]));
    expect(vectorToStrings(scaleInteger(vector([0, '-1/2', '1/3'])))).toEqual(sv([0, 3, -2]));
  });

  it('probability: entries sum to 1', () => {
    expect(vectorToStrings(scaleProbability(vector([7, 5, 8])))).toEqual(['7/20', '1/4', '2/5']);
    expect(() => scaleProbability(vector([1, 0, -1]))).toThrow(/sum/i);
  });

  it('unit: length 1, sign kept (NumPy\'s form)', () => {
    const u = scaleUnit(vector([3, 0, -4]));
    expect(u).toEqual([0.6, 0, -0.8]);
  });

  it('back from NumPy: a unit vector rescaled to the notes\' integers (L5-EG7)', () => {
    const n = Math.hypot(7, 5, 8);
    expect(vectorToStrings(integerFromFloat([-7 / n, -5 / n, -8 / n])!)).toEqual(sv([7, 5, 8]));
    expect(integerFromFloat([1, Math.SQRT2])).toBeNull();
  });
});
