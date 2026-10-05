import { useRef, useState, type PointerEvent } from 'react';
import { attempt } from '../../store/useSystem';
import { clampToArea, edgeGeometry, GRAPH_SIZE, selfLoopGeometry, type Point2 } from './stateGraphGeometry';

export interface GraphNode {
  label: string;
  color: string;
  position: Point2;
}

export interface GraphEdge {
  from: number;
  to: number;
  /** The probability as shown, e.g. "0.7" or "7/10". */
  label: string;
  /** L5-MC3: an outgoing arrow of the selected state. */
  highlighted?: boolean;
}

interface StateGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selected?: number | null;
  onSelectNode?: (i: number | null) => void;
  /** Called while dragging with every node's new position. */
  onMoveNodes?: (positions: Point2[]) => void;
  onSelectEdge?: (from: number, to: number) => void;
}

/**
 * F-D11: states as nodes and transitions as labeled arrows, with curved pairs
 * for two-way transitions, self-loops, and draggable nodes. Every color cue
 * also has a text label (NF-5).
 */
export function StateGraph({ nodes, edges, selected = null, onSelectNode, onMoveNodes, onSelectEdge }: StateGraphProps) {
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const { width, height, nodeRadius } = GRAPH_SIZE;
  const center: Point2 = [width / 2, height / 2];
  const hasEdge = (from: number, to: number) => edges.some((e) => e.from === from && e.to === to);

  const toSvg = (e: PointerEvent): Point2 | null => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  };

  const onPointerMove = (e: PointerEvent) => {
    if (dragging === null || !onMoveNodes) return;
    const p = toSvg(e);
    if (!p) return;
    const clamped = attempt(() => clampToArea(p));
    if (!clamped.ok) return;
    onMoveNodes(nodes.map((n, i) => (i === dragging ? clamped.value : n.position)));
  };

  return (
    <svg
      ref={svg}
      className="state-graph"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="State transition graph"
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
      onClick={(e) => e.target === svg.current && onSelectNode?.(null)}
    >
      <defs>
        <marker id="state-graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      {edges.map((e) => {
        const from = nodes[e.from]?.position;
        const to = nodes[e.to]?.position;
        if (!from || !to) return null;
        const geometry = attempt(() =>
          e.from === e.to ? selfLoopGeometry(from, center) : edgeGeometry(from, to, hasEdge(e.to, e.from)),
        );
        if (!geometry.ok) return null;
        const dim = selected !== null && !e.highlighted;
        return (
          <g
            key={`${e.from}-${e.to}`}
            className={e.highlighted ? 'graph-edge highlighted' : dim ? 'graph-edge dim' : 'graph-edge'}
            onClick={() => onSelectEdge?.(e.from, e.to)}
          >
            <path d={geometry.value.path} stroke={nodes[e.from].color} markerEnd="url(#state-graph-arrow)" />
            <text x={geometry.value.labelAt[0]} y={geometry.value.labelAt[1]} textAnchor="middle" dominantBaseline="central">
              {e.label}
            </text>
          </g>
        );
      })}
      {nodes.map((n, i) => (
        <g
          key={i}
          className={selected === i ? 'graph-node selected' : 'graph-node'}
          transform={`translate(${n.position[0]} ${n.position[1]})`}
          tabIndex={0}
          role="button"
          aria-label={`${n.label}${selected === i ? ' (selected)' : ''}`}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setDragging(i);
          }}
          onClick={() => onSelectNode?.(selected === i ? null : i)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectNode?.(selected === i ? null : i)}
        >
          <circle r={nodeRadius} fill="var(--surface)" stroke={n.color} strokeWidth={selected === i ? 4 : 2.5} />
          <text textAnchor="middle" dominantBaseline="central" fill={n.color}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
