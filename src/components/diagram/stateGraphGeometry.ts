export type Point2 = [number, number];

/** The graph's drawing area in SVG units. */
export const GRAPH_SIZE = { width: 420, height: 340, nodeRadius: 30 };

const LAYOUTS: Record<number, Point2[]> = {
  2: [
    [120, 170],
    [300, 170],
  ],
  3: [
    [110, 100],
    [310, 100],
    [210, 250],
  ],
  4: [
    [110, 90],
    [310, 90],
    [310, 250],
    [110, 250],
  ],
};

/**
 * F-D11: preset layouts for 2–4 states — side by side for 2, a triangle for 3
 * with states 1 and 2 on top and 3 below (as in the notes' figure), a square
 * for 4. Inside the drawing area with room for self-loops.
 */
export function defaultLayout(n: number): Point2[] {
  const layout = LAYOUTS[n];
  if (!layout) throw new RangeError(`The graph shows 2–4 states, not ${n}`);
  return layout.map((p) => [...p] as Point2);
}

export interface EdgeGeometry {
  /** SVG path data from the edge of one node circle to the edge of the other. */
  path: string;
  /** Where the probability label sits. */
  labelAt: Point2;
}

const fmt = (x: number) => String(+x.toFixed(2));
const pt = (p: Point2) => `${fmt(p[0])} ${fmt(p[1])}`;
const unit = (x: number, y: number): Point2 => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};
const toward = (from: Point2, to: Point2, by: number): Point2 => {
  const [ux, uy] = unit(to[0] - from[0], to[1] - from[1]);
  return [from[0] + ux * by, from[1] + uy * by];
};
const rotate = ([x, y]: Point2, a: number): Point2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** How far a two-way pair bends from the straight line. */
const BEND = 22;

/**
 * An arrow between two nodes. When the reverse arrow also exists the two are
 * drawn as curves bending to opposite sides, so both stay readable.
 */
export function edgeGeometry(from: Point2, to: Point2, curved: boolean, radius = GRAPH_SIZE.nodeRadius): EdgeGeometry {
  if (!curved) {
    const start = toward(from, to, radius);
    const end = toward(to, from, radius);
    return { path: `M ${pt(start)} L ${pt(end)}`, labelAt: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] };
  }
  // Bend to the left of the direction of travel, so i → j and j → i separate.
  const [dx, dy] = unit(to[0] - from[0], to[1] - from[1]);
  const mid: Point2 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const control: Point2 = [mid[0] - dy * BEND * 2, mid[1] + dx * BEND * 2];
  const start = toward(from, control, radius);
  const end = toward(to, control, radius);
  const labelAt: Point2 = [0.25 * start[0] + 0.5 * control[0] + 0.25 * end[0], 0.25 * start[1] + 0.5 * control[1] + 0.25 * end[1]];
  return { path: `M ${pt(start)} Q ${pt(control)} ${pt(end)}`, labelAt };
}

/** A self-loop on the side of the node facing away from the graph's center. */
export function selfLoopGeometry(at: Point2, center: Point2, radius = GRAPH_SIZE.nodeRadius): EdgeGeometry {
  const out: Point2 = at[0] === center[0] && at[1] === center[1] ? [0, -1] : unit(at[0] - center[0], at[1] - center[1]);
  const on = (a: number, r: number): Point2 => {
    const [x, y] = rotate(out, a);
    return [at[0] + x * r, at[1] + y * r];
  };
  const start = on(-0.5, radius);
  const end = on(0.5, radius);
  const c1 = on(-0.7, radius * 2.8);
  const c2 = on(0.7, radius * 2.8);
  return { path: `M ${pt(start)} C ${pt(c1)} ${pt(c2)} ${pt(end)}`, labelAt: on(0, radius * 2.45) };
}

/** Keep a dragged node inside the drawing area. */
export function clampToArea(p: Point2, radius = GRAPH_SIZE.nodeRadius): Point2 {
  const { width, height } = GRAPH_SIZE;
  return [Math.min(width - radius, Math.max(radius, p[0])), Math.min(height - radius, Math.max(radius, p[1]))];
}
