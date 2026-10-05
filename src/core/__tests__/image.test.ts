import { describe, expect, it } from 'vitest';
import { resizeTo, resizeToFit, testPattern, toGrayscale, toPixels, toSignedPixels } from '../image';

describe('image utilities (F-M53)', () => {
  it('grayscale by luma, ignoring alpha', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 10, 0, 0, 255, 255, 255, 255, 255, 255]);
    const g = toGrayscale(rgba, 2, 2);
    expect(g).toHaveLength(2);
    expect(g[0][0]).toBeCloseTo(0.299 * 255, 6);
    expect(g[0][1]).toBeCloseTo(0.587 * 255, 6);
    expect(g[1][1]).toBeCloseTo(255, 6);
  });

  it('resizing to fit keeps the aspect ratio and leaves small images alone', () => {
    const big = Array.from({ length: 860 }, () => new Array(1280).fill(100));
    const r = resizeToFit(big, 640);
    expect(r[0].length).toBe(640);
    expect(r.length).toBe(430);
    expect(r[0][0]).toBeCloseTo(100, 6);
    const small = [[1, 2], [3, 4]];
    expect(resizeToFit(small, 1024)).toEqual(small);
    expect(resizeTo(small, 4, 4)).toHaveLength(4);
  });

  it('pixels are clipped to 0–255; signed matrices put 0 at mid-gray', () => {
    const p = toPixels([[-20, 300.4, 127.6]]);
    expect([p[0], p[4], p[8]]).toEqual([0, 255, 128]);
    expect(p[3]).toBe(255);
    const q = toSignedPixels([[-2, 0, 2]]);
    expect([q[0], q[4], q[8]]).toEqual([0, 128, 255]);
  });

  it('the test pattern has the requested size and a spread of gray levels', () => {
    const t = testPattern(48, 64);
    expect(t).toHaveLength(48);
    expect(t[0]).toHaveLength(64);
    const flat = t.flat();
    expect(Math.min(...flat)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...flat)).toBeLessThanOrEqual(255);
    expect(Math.max(...flat) - Math.min(...flat)).toBeGreaterThan(100);
  });
});
