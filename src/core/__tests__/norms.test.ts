import { describe, expect, it } from 'vitest';
import { matrix, vector } from '../matrix';
import { frobeniusNorm, frobeniusSquared, normSquared } from '../norms';

describe('Frobenius norm (F-M23)', () => {
  it('the CR layers of the Lesson 1 matrix: ‖·‖² = 28 and 10', () => {
    expect(frobeniusSquared(matrix([[1, 0, 1], [2, 0, 2], [3, 0, 3]])).toString()).toBe('28');
    expect(frobeniusSquared(matrix([[0, 0, 0], [0, 1, 1], [0, -2, -2]])).toString()).toBe('10');
  });

  it('sizes ≈ 5.29 and 3.16', () => {
    expect(frobeniusNorm(matrix([[1, 0, 1], [2, 0, 2], [3, 0, 3]]))).toBeCloseTo(Math.sqrt(28), 12);
    expect(frobeniusNorm(matrix([[0, 0, 0], [0, 1, 1], [0, -2, -2]]))).toBeCloseTo(Math.sqrt(10), 12);
  });

  it('for a rank-1 layer, ‖bc*‖² = ‖b‖²‖c‖²', () => {
    expect(normSquared(vector([1, 2, 3])).mul(normSquared(vector([1, 0, 1]))).toString()).toBe('28');
  });

  it('exact for fractions', () => {
    expect(frobeniusSquared(matrix([['1/2', '-1/3']])).toString()).toBe('13/36');
  });
});
