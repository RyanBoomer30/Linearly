import { describe, expect, it } from 'vitest';
import { clampToArea, defaultLayout, edgeGeometry, GRAPH_SIZE, selfLoopGeometry } from '../stateGraphGeometry';

const { width, height, nodeRadius } = GRAPH_SIZE;
const inside = ([x, y]: [number, number]) => x >= nodeRadius && x <= width - nodeRadius && y >= nodeRadius && y <= height - nodeRadius;

describe('StateGraph geometry (F-D11)', () => {
  it('preset layouts for 2–4 states stay inside the drawing area', () => {
    for (const n of [2, 3, 4]) {
      const layout = defaultLayout(n);
      expect(layout).toHaveLength(n);
      expect(layout.every(inside)).toBe(true);
    }
  });

  it('3 states form a triangle as in the notes: pages 1 and 2 on top, page 3 below', () => {
    const [p1, p2, p3] = defaultLayout(3);
    expect(p1[1]).toBeCloseTo(p2[1], 6);
    expect(p1[0]).toBeLessThan(p2[0]);
    expect(p3[1]).toBeGreaterThan(p1[1]);
    expect(p3[0]).toBeCloseTo((p1[0] + p2[0]) / 2, 6);
  });

  it('a straight arrow starts and ends on the node circles', () => {
    const g = edgeGeometry([100, 100], [300, 100], false, 30);
    const nums = g.path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums.slice(0, 2)).toEqual([130, 100]);
    expect(nums.slice(-2)).toEqual([270, 100]);
    expect(g.labelAt[0]).toBeCloseTo(200, 6);
  });

  it('two-way arrows bend to opposite sides', () => {
    const there = edgeGeometry([100, 100], [300, 100], true);
    const back = edgeGeometry([300, 100], [100, 100], true);
    expect(Math.sign(there.labelAt[1] - 100)).toBe(-Math.sign(back.labelAt[1] - 100));
  });

  it('a self-loop sits on the side away from the center', () => {
    const g = selfLoopGeometry([100, 100], [210, 170]);
    expect(g.labelAt[0]).toBeLessThan(100);
    expect(g.labelAt[1]).toBeLessThan(100);
  });

  it('dragging stays inside', () => {
    expect(clampToArea([-50, 1000])).toEqual([nodeRadius, height - nodeRadius]);
    expect(clampToArea([200, 150])).toEqual([200, 150]);
  });
});
