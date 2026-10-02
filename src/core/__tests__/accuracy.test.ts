import { describe, expect, it } from 'vitest';
import { exactLeastSquaresFromFloats, exactRationalFromFloat, orthogonalityLoss, relativeError } from '../accuracy';
import { vector, vectorToStrings } from '../matrix';

describe('accuracy metrics (F-M31)', () => {
  it('a double\'s exact value: 0.1 is not 1/10', () => {
    expect(exactRationalFromFloat(0.1).toString()).toBe('3602879701896397/36028797018963968');
    expect(exactRationalFromFloat(0.5).toString()).toBe('1/2');
    expect(exactRationalFromFloat(-3).toString()).toBe('-3');
    expect(exactRationalFromFloat(2.25).toString()).toBe('9/4');
  });

  it('exact least squares from float data', () => {
    expect(vectorToStrings(exactLeastSquaresFromFloats([[1, 1], [1, 2.25], [1, 1.5]], [4, 6, 5]))).toEqual(['5/2', '30/19']);
  });

  it('relative error ‖x − x_exact‖ / ‖x_exact‖', () => {
    expect(relativeError([3, 4], vector([3, 4]))).toBe(0);
    expect(relativeError([3, 5], vector([3, 4]))).toBeCloseTo(1 / 5, 15);
  });

  it('loss of orthogonality ‖QᵀQ − I‖', () => {
    expect(orthogonalityLoss([[1, 0], [0, 1], [0, 0]])).toBe(0);
    // q₁ = q₂ = (1, 0): QᵀQ − I = [[0, 1], [1, 0]].
    expect(orthogonalityLoss([[1, 1], [0, 0]])).toBeCloseTo(Math.SQRT2, 15);
  });
});
