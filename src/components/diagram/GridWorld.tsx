import type { Action, GridCell } from '../../core/mdp';
import { ACTION_ARROWS, ACTIONS } from '../../core/mdp';
import { PATH_COLOR, ROBOT_COLOR, WALL_COLOR } from '../../theme/colors';
import { divergingColor } from '../display/MatrixHeatmap';

/** One cell as a view draws it; built by the Lesson 6 view-models. */
export interface GridCellView {
  row: number;
  col: number;
  kind: 'wall' | 'state';
  /** 1-based state number (states only). */
  label?: number;
  /** Shown for a nonzero reward, e.g. "+1". */
  reward?: string;
  terminal?: boolean;
  robot?: boolean;
  arrow?: Action | null;
  /** L6-PI2, L6-O5: an arrow that changed is outlined. */
  arrowChanged?: boolean;
  /** Heatmap value on the fixed scale −1 … +1 (§11), with its number. */
  value?: number | null;
  valueLabel?: string;
  /** L6-Q3: Q(s, a) in ACTIONS order, the best one outlined. */
  q?: { values: number[]; labels: string[]; best: number } | null;
  /** L6-G4, L6-W1: a probability on this cell. */
  overlay?: { p: number; label: string } | null;
}

interface GridWorldProps {
  cells: GridCellView[][];
  /** L6-G6, L6-O4: a path through cell centers. */
  path?: GridCell[];
  selected?: GridCell | null;
  onCellClick?: (cell: GridCell) => void;
  /** Cell size in SVG units. */
  size?: number;
  caption?: string;
  /**
   * The notes' look (§6.1 figure): black lines, the dark wall, state numbers
   * and rewards large and centered, no terminal outline.
   */
  notes?: boolean;
  /** Where state numbers go; hidden in the notes' right-hand picture. */
  labels?: 'corner' | 'center' | 'none';
  /**
   * An animated robot (the simulation). It glides between cells; `aimed` marks
   * the cell the intended move would have reached when the robot slipped.
   * When given, the per-cell `robot` flags are ignored.
   */
  robot?: { at: GridCell; aimed?: GridCell | null; label?: string } | null;
}

/** The notes' figure uses a dark gray wall. */
const NOTES_WALL_COLOR = '#7a7a7a';
const OVERLAY = (p: number) => `rgba(86, 180, 233, ${(0.12 + 0.75 * Math.min(1, Math.max(0, p))).toFixed(3)})`;
const ROTATION: Record<Action, number> = { up: 0, right: 90, down: 180, left: 270 };

/** The four triangles of a cell meeting at its center, in ACTIONS order (↑ → ↓ ←). */
function triangles(x: number, y: number, s: number): string[] {
  const c = `${x + s / 2},${y + s / 2}`;
  return [
    `${x},${y} ${x + s},${y} ${c}`,
    `${x + s},${y} ${x + s},${y + s} ${c}`,
    `${x + s},${y + s} ${x},${y + s} ${c}`,
    `${x},${y + s} ${x},${y} ${c}`,
  ];
}
const TRIANGLE_LABEL = (x: number, y: number, s: number) => [
  [x + s / 2, y + s * 0.2],
  [x + s * 0.8, y + s / 2],
  [x + s / 2, y + s * 0.82],
  [x + s * 0.2, y + s / 2],
];

/**
 * F-D12: the notes' gridworld — numbered cells, walls, terminal rewards, the
 * robot ⌘, policy arrows, a value heatmap, Q-values as four triangles, a
 * probability overlay and path traces. Every color also carries a number (NF-5).
 */
export function GridWorld({ cells, path, selected = null, onCellClick, size = 76, caption, notes = false, labels = notes ? 'center' : 'corner', robot }: GridWorldProps) {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const pad = 2;
  const center = ([r, c]: GridCell) => [pad + c * size + size / 2, pad + r * size + size / 2];
  return (
    <figure className={notes ? 'gridworld notes' : 'gridworld'}>
      <svg
        viewBox={`0 0 ${cols * size + 2 * pad} ${rows * size + 2 * pad}`}
        role="img"
        aria-label={caption ?? 'Gridworld'}
        style={{ maxWidth: cols * size + 2 * pad }}
      >
        {cells.flat().map((cell) => {
          const x = pad + cell.col * size;
          const y = pad + cell.row * size;
          const key = `${cell.row},${cell.col}`;
          if (cell.kind === 'wall') {
            return (
              <rect
                key={key}
                className="grid-wall"
                x={x}
                y={y}
                width={size}
                height={size}
                fill={notes ? NOTES_WALL_COLOR : WALL_COLOR}
                stroke={notes ? 'var(--text)' : 'var(--border)'}
                onClick={() => onCellClick?.([cell.row, cell.col])}
              />
            );
          }
          const isSelected = selected?.[0] === cell.row && selected?.[1] === cell.col;
          const fill = cell.value !== undefined && cell.value !== null ? divergingColor(cell.value, 1) : 'var(--surface)';
          return (
            <g
              key={key}
              className="grid-cell"
              role="button"
              tabIndex={onCellClick ? 0 : -1}
              aria-label={`State ${cell.label}${cell.reward ? `, reward ${cell.reward}` : ''}${cell.arrow ? `, action ${ACTION_ARROWS[cell.arrow]}` : ''}${cell.valueLabel ? `, value ${cell.valueLabel}` : ''}`}
              onClick={() => onCellClick?.([cell.row, cell.col])}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCellClick?.([cell.row, cell.col])}
            >
              <rect x={x} y={y} width={size} height={size} fill={fill} stroke={notes ? 'var(--text)' : 'var(--border)'} strokeWidth={notes ? 1.5 : 1} />
              {cell.overlay && <rect x={x} y={y} width={size} height={size} fill={OVERLAY(cell.overlay.p)} />}
              {cell.q &&
                triangles(x, y, size).map((pts, k) => (
                  <polygon
                    key={k}
                    points={pts}
                    fill={divergingColor(cell.q!.values[k], 1)}
                    stroke={k === cell.q!.best ? 'var(--text)' : 'var(--border)'}
                    strokeWidth={k === cell.q!.best ? 2 : 0.5}
                  />
                ))}
              {cell.q &&
                TRIANGLE_LABEL(x, y, size).map(([tx, ty], k) => (
                  <text key={`q${k}`} x={tx} y={ty} className="grid-q" textAnchor="middle" dominantBaseline="central">
                    {cell.q!.labels[k]}
                  </text>
                ))}
              {labels === 'corner' && (
                <text x={x + 5} y={y + 13} className="grid-label">
                  {cell.label}
                </text>
              )}
              {labels === 'center' && (
                <text x={x + size / 2} y={y + size / 2} className="grid-label-center" textAnchor="middle" dominantBaseline="central">
                  {cell.label}
                </text>
              )}
              {cell.reward &&
                (notes ? (
                  <text x={x + size / 2} y={y + size / 2} className="grid-reward-center" textAnchor="middle" dominantBaseline="central">
                    {cell.reward}
                  </text>
                ) : (
                  <text x={x + size - 5} y={y + 14} className="grid-reward" textAnchor="end">
                    {cell.reward}
                  </text>
                ))}
              {cell.terminal && !notes && <rect x={x + 3} y={y + 3} width={size - 6} height={size - 6} fill="none" stroke="var(--text)" strokeDasharray="4 3" />}
              {cell.arrow && !cell.terminal && !cell.q && (
                <g transform={`translate(${x + size / 2} ${y + size / 2}) rotate(${ROTATION[cell.arrow]})`}>
                  <path
                    d={`M 0 ${-size * 0.22} L ${size * 0.11} ${-size * 0.06} L ${size * 0.04} ${-size * 0.06} L ${size * 0.04} ${size * 0.2} L ${-size * 0.04} ${size * 0.2} L ${-size * 0.04} ${-size * 0.06} L ${-size * 0.11} ${-size * 0.06} Z`}
                    className={cell.arrowChanged ? 'grid-arrow changed' : 'grid-arrow'}
                  />
                </g>
              )}
              {(cell.valueLabel || cell.overlay) && !cell.q && (
                <text x={x + size / 2} y={y + size - 8} className="grid-value" textAnchor="middle">
                  {cell.overlay ? cell.overlay.label : cell.valueLabel}
                </text>
              )}
              {cell.robot && robot === undefined && (
                <text x={x + size / 2} y={y + 17} className="grid-robot" textAnchor="middle" fill={ROBOT_COLOR}>
                  ⌘
                </text>
              )}
              {isSelected && <rect x={x + 1.5} y={y + 1.5} width={size - 3} height={size - 3} fill="none" stroke="var(--accent)" strokeWidth={3} />}
            </g>
          );
        })}
        {path && path.length > 1 && (
          <polyline points={path.map((p) => center(p).join(',')).join(' ')} fill="none" stroke={PATH_COLOR} strokeWidth={3} strokeLinejoin="round" opacity={0.8} />
        )}
        {robot?.aimed && (
          // Where the intended move would have taken it: a dashed ghost.
          <g className="grid-robot-aimed" transform={`translate(${center(robot.aimed).join(' ')})`}>
            <rect x={-size / 2 + 6} y={-size / 2 + 6} width={size - 12} height={size - 12} />
            <text textAnchor="middle" dominantBaseline="central">
              ⌘
            </text>
          </g>
        )}
        {robot && (
          // CSS transform (not the SVG attribute) so the move animates.
          <g className="grid-robot-layer" style={{ transform: `translate(${center(robot.at)[0]}px, ${center(robot.at)[1]}px)` }}>
            <text className="grid-robot-big" textAnchor="middle" dominantBaseline="central" fill={notes ? 'var(--text)' : ROBOT_COLOR}>
              ⌘
            </text>
            {robot.label && (
              <text className="grid-robot-tag" y={size / 2 - 8} textAnchor="middle">
                {robot.label}
              </text>
            )}
          </g>
        )}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Legend for the arrows in tie-break order (F-M43). */
export const ACTION_ORDER_TEXT = ACTIONS.map((a) => ACTION_ARROWS[a]).join(' ');
