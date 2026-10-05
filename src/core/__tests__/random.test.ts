import { describe, expect, it } from 'vitest';
import { mulberry32, newSeed, sampleIndex } from '../random';

describe('mulberry32 (seeded random numbers, §3.1)', () => {
  it('the same seed repeats exactly', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 20 }, a);
    expect(Array.from({ length: 20 }, b)).toEqual(xs);
  });

  it('different seeds give different sequences', () => {
    const a = Array.from({ length: 5 }, mulberry32(1));
    const b = Array.from({ length: 5 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it('values are in [0, 1) and roughly uniform', () => {
    const rng = mulberry32(7);
    const xs = Array.from({ length: 10000 }, rng);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('newSeed is a 32-bit unsigned integer', () => {
    const s = newSeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});

describe('sampleIndex', () => {
  it('never picks a zero weight', () => {
    const rng = mulberry32(3);
    for (let k = 0; k < 200; k++) expect(sampleIndex([0, 1, 0], rng)).toBe(1);
  });

  it('frequencies follow the weights', () => {
    const rng = mulberry32(11);
    const counts = [0, 0, 0];
    for (let k = 0; k < 20000; k++) counts[sampleIndex([0.7, 0.2, 0.1], rng)]++;
    expect(counts[0] / 20000).toBeCloseTo(0.7, 1);
    expect(counts[1] / 20000).toBeCloseTo(0.2, 1);
    expect(counts[2] / 20000).toBeCloseTo(0.1, 1);
  });
});
