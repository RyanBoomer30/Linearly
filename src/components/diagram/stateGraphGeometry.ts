import { notImplemented } from '../../core/notImplemented';

export type Point2 = [number, number];

/** The graph's drawing area in SVG units. */
export const GRAPH_SIZE = { width: 420, height: 340, nodeRadius: 30 };

/**
 * F-D11: preset layouts for 2–4 states — side by side for 2, a triangle for 3
 * with states 1 and 2 on top and 3 below (as in the notes' figure), a square
 * for 4. Inside the drawing area with room for self-loops.
 */
export function defaultLayout(n: number): Point2[] {
  return notImplemented('defaultLayout');
}

export interface EdgeGeometry {
  /** SVG path data from the edge of one node circle to the edge of the other. */
  path: string;
  /** Where the probability label sits. */
  labelAt: Point2;
}

/**
 * An arrow between two nodes. When the reverse arrow also exists the two are
 * drawn as curves bending to opposite sides, so both stay readable.
 */
export function edgeGeometry(from: Point2, to: Point2, curved: boolean, radius = GRAPH_SIZE.nodeRadius): EdgeGeometry {
  return notImplemented('edgeGeometry');
}

/** A self-loop on the side of the node facing away from the graph's center. */
export function selfLoopGeometry(at: Point2, center: Point2, radius = GRAPH_SIZE.nodeRadius): EdgeGeometry {
  return notImplemented('selfLoopGeometry');
}

/** Keep a dragged node inside the drawing area. */
export function clampToArea(p: Point2, radius = GRAPH_SIZE.nodeRadius): Point2 {
  return notImplemented('clampToArea');
}
