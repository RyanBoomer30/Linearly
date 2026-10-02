import { describe, expect, it } from 'vitest';
import { fromWorld, toWorld, type ChartFrame } from '../frame';
import { logTicks } from '../ticks';

const frame: ChartFrame = { x: { min: 1, max: 1e8, title: 'cond', log: true }, y: { min: 1e-16, max: 1, title: 'error', log: true }, size: 8, equalAspect: false };

describe('log axes (F-C10)', () => {
  it('each power of ten is the same distance along a log axis', () => {
    const a = toWorld(frame, [1, 1e-16]);
    const b = toWorld(frame, [10, 1e-15]);
    const c = toWorld(frame, [100, 1e-14]);
    expect(b[0] - a[0]).toBeCloseTo(c[0] - b[0], 12);
    expect(b[1] - a[1]).toBeCloseTo(c[1] - b[1], 12);
    expect(a).toEqual([0, 0, 0]);
  });

  it('fromWorld undoes toWorld on log axes', () => {
    const [x, y] = fromWorld(frame, toWorld(frame, [1e4, 1e-8]));
    expect(x / 1e4).toBeCloseTo(1, 12);
    expect(y / 1e-8).toBeCloseTo(1, 12);
  });

  it('logTicks: powers of ten covering the range, about `target` of them', () => {
    expect(logTicks(1, 1e4)).toEqual([1, 10, 100, 1000, 10000]);
    const thin = logTicks(1e-16, 1, 6);
    expect(thin[0]).toBe(1e-16);
    expect(thin.at(-1)).toBe(1);
    expect(thin.length).toBeLessThanOrEqual(7);
    for (const t of thin) expect(Math.log10(t) % 1).toBeCloseTo(0, 12);
  });
});
