import { describe, expect, it } from 'vitest';
import { Rational, q } from '../rational';
import { expectRealThrow } from './fixtures';

describe('Rational (F-M1)', () => {
  it('reduces to lowest terms', () => {
    expect(q(2, 4).toString()).toBe('1/2');
    expect(q(6, 3).toString()).toBe('2');
  });

  it('normalizes the sign into the numerator', () => {
    const r = q(3, -4);
    expect(r.num).toBe(-3n);
    expect(r.den).toBe(4n);
    expect(r.toString()).toBe('-3/4');
  });

  it('throws on zero denominator', () => {
    expectRealThrow(() => Rational.of(1, 0));
  });

  it('adds, subtracts, multiplies, divides exactly', () => {
    expect(q(1, 3).add(q(1, 6)).toString()).toBe('1/2');
    expect(q(1, 2).sub(q(3, 4)).toString()).toBe('-1/4');
    expect(q(2, 3).mul(q(9, 4)).toString()).toBe('3/2');
    expect(q(2, 3).div(q(4, 9)).toString()).toBe('3/2');
  });

  it('has no floating point drift: 0.1 + 0.2 = 3/10', () => {
    expect(q('0.1').add(q('0.2')).equals(q(3, 10))).toBe(true);
  });

  it('throws on division by zero', () => {
    expectRealThrow(() => q(1).div(Rational.ZERO));
    expectRealThrow(() => Rational.ZERO.inv());
  });

  it('compares', () => {
    expect(q(1, 3).cmp(q(1, 2))).toBe(-1);
    expect(q(2, 4).cmp(q(1, 2))).toBe(0);
    expect(q(-1).cmp(q(-2))).toBe(1);
    expect(q(2, 4).equals(q(1, 2))).toBe(true);
  });

  it('neg, abs, inv, predicates', () => {
    expect(q(3, 4).neg().toString()).toBe('-3/4');
    expect(q(-3, 4).abs().toString()).toBe('3/4');
    expect(q(-3, 4).inv().toString()).toBe('-4/3');
    expect(Rational.ZERO.isZero()).toBe(true);
    expect(q(4, 2).isInteger()).toBe(true);
    expect(q(1, 2).isInteger()).toBe(false);
  });

  it('converts to number and TeX', () => {
    expect(q(1, 4).toNumber()).toBe(0.25);
    expect(q(-3, 4).toTex()).toBe('-\\frac{3}{4}');
    expect(q(5).toTex()).toBe('5');
  });

  it('fromNumber is exact for finite decimals', () => {
    expect(Rational.fromNumber(0.5).toString()).toBe('1/2');
    expect(Rational.fromNumber(-2).toString()).toBe('-2');
  });
});

describe('Rational.parse (F-E2)', () => {
  it.each([
    ['3/4', '3/4'],
    ['-2', '-2'],
    ['0.5', '1/2'],
    ['  7 ', '7'],
    ['-6/8', '-3/4'],
    ['1/-2', '-1/2'],
    ['.25', '1/4'],
  ])('parses %j as %s', (input, expected) => {
    expect(Rational.parse(input)?.toString()).toBe(expected);
  });

  it.each(['', 'abc', '1/0', '1//2', '3/4/5', '1.2.3', '--1'])('rejects %j', (input) => {
    expect(Rational.parse(input)).toBeNull();
  });
});
