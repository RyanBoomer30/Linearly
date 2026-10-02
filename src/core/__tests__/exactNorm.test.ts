import { describe, expect, it } from 'vitest';
import { exactSqrt, norm } from '../exactNorm';
import { vector } from '../matrix';
import { q } from '../rational';

describe('exact when possible (F-M25)', () => {
  it('exactSqrt of perfect squares of rationals', () => {
    expect(exactSqrt(q(9))?.toString()).toBe('3');
    expect(exactSqrt(q(9, 4))?.toString()).toBe('3/2');
    expect(exactSqrt(q(0))?.toString()).toBe('0');
    expect(exactSqrt(q(2))).toBeNull();
    expect(exactSqrt(q(1, 3))).toBeNull();
  });

  it('the notes\' vectors have whole-number lengths', () => {
    expect(norm(vector([2, 2, 1]))).toMatchObject({ kind: 'exact' });
    const r = norm(vector([1, 1, 1, 1]));
    expect(r.kind === 'exact' && r.value.toString()).toBe('2');
  });

  it('‖(1, 1, 1)‖ = √3 is irrational: floating point with the reason', () => {
    const r = norm(vector([1, 1, 1]));
    expect(r.kind).toBe('float');
    if (r.kind !== 'float') return;
    expect(r.value).toBeCloseTo(Math.sqrt(3), 15);
    expect(r.reason).toMatch(/√3/);
  });
});
