import { describe, expect, it } from 'vitest';
import { cAbs, cArg, complex, complexTex, formatComplex } from '../complex';

describe('Complex (F-M39)', () => {
  const w = complex(-0.5, Math.sqrt(3) / 2);

  it('absolute value and argument', () => {
    expect(cAbs(complex(3, 4))).toBe(5);
    expect(cAbs(w)).toBeCloseTo(1, 14);
    expect(cArg(w)).toBeCloseTo((2 * Math.PI) / 3, 14);
    expect(cArg(complex(-0.5, -Math.sqrt(3) / 2))).toBeCloseTo((-2 * Math.PI) / 3, 14);
    expect(cArg(complex(-1, 0))).toBeCloseTo(Math.PI, 14);
  });

  it('formats with significant digits and a typographic minus', () => {
    expect(formatComplex(w)).toBe('−0.5 + 0.866i');
    expect(formatComplex(complex(-0.5, -Math.sqrt(3) / 2))).toBe('−0.5 − 0.866i');
    expect(formatComplex(complex(2, 0))).toBe('2');
    expect(formatComplex(complex(0, -1))).toBe('−i');
    expect(formatComplex(complex(1, 1e-15))).toBe('1');
  });

  it('TeX form', () => {
    expect(complexTex(w)).toBe('-0.5 + 0.866i');
  });
});
