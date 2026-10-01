import { useId, type KeyboardEvent } from 'react';
import { SUBSPACE_COLORS } from '../../theme/colors';
import type { BigPictureLabels, BigPictureMode, SubspaceId } from './types';

/**
 * Strang's "big picture" of the four fundamental subspaces, drawn as in the
 * course notes (§1.4): in ℝⁿ the row space sits on top of the nullspace, in ℝᵐ
 * the column space sits on top of the left nullspace, each pair meeting at the
 * origin at a right angle. Diamond size grows with dimension.
 *
 * The diagram is schematic: positions are layout, not coordinates. Exact
 * values arrive as `labels`.
 */
interface BigPictureDiagramProps {
  m: number;
  n: number;
  /** null while the rank is unknown: draws symbolic "dim r" with default sizes. */
  rank: number | null;
  mode: BigPictureMode;
  focus?: SubspaceId | null;
  onFocus?: (id: SubspaceId | null) => void;
  labels?: BigPictureLabels;
}

type Pt = { x: number; y: number };

const W = 1200;
const P: Pt = { x: 360, y: 0 }; // origin of ℝⁿ
const Q: Pt = { x: 840, y: 0 }; // origin of ℝᵐ

/** Half-diagonal of a subspace diamond: 0 for the zero subspace. */
const halfDiag = (dim: number | null) => (dim === null ? 100 : dim === 0 ? 0 : (80 + 40 * dim) / Math.SQRT2);

const add = (a: Pt, dx: number, dy: number): Pt => ({ x: a.x + dx, y: a.y + dy });
const pts = (...ps: Pt[]) => ps.map((p) => `${p.x},${p.y}`).join(' ');

/** Diamond with one vertex at `o`, extending up (dir = -1) or down (dir = 1). */
const diamond = (o: Pt, k: number, dir: 1 | -1) => [o, add(o, k, dir * k), add(o, 0, dir * 2 * k), add(o, -k, dir * k)];

/** Pull both ends of a segment in so arrowheads don't sit on top of dots. */
function shorten(a: Pt, b: Pt, by = 9): [Pt, Pt] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 2 * by) return [a, b];
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  return [add(a, ux * by, uy * by), add(b, -ux * by, -uy * by)];
}

const sup = (k: number) => String(k).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);

export function BigPictureDiagram({ m, n, rank, mode, focus = null, onFocus, labels = {} }: BigPictureDiagramProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const known = rank !== null;
  const dims: Record<SubspaceId, number | null> = {
    row: rank,
    null: known ? n - rank : null,
    column: rank,
    leftNull: known ? m - rank : null,
  };
  const k: Record<SubspaceId, number> = {
    row: halfDiag(dims.row),
    null: halfDiag(dims.null),
    column: halfDiag(dims.column),
    leftNull: halfDiag(dims.leftNull),
  };

  // Points: x_r and x_n inside their diamonds, x = x_r + x_n (vector sum about P).
  const xr = add(P, -0.45 * k.row, -0.7 * k.row);
  const xn = add(P, -0.45 * k.null, 0.7 * k.null);
  const x = add(P, xr.x - P.x + xn.x - P.x, xr.y - P.y + xn.y - P.y);
  const b = add(Q, 0.45 * k.column, -0.7 * k.column);
  const e = add(Q, 0.45 * k.leftNull, 0.7 * k.leftNull);
  const t = add(Q, b.x - Q.x + e.x - Q.x, b.y - Q.y + e.y - Q.y);

  // Fit the viewBox to the content: tallest diamond above and below the origins.
  const up = 2 * Math.max(k.row, k.column, 40);
  const down = 2 * Math.max(k.null, k.leftNull, 40);
  const top = -up - 50;
  const height = up + down + 100;

  const regions: { id: SubspaceId; origin: Pt; dir: 1 | -1; name: string; symbol: string; caption: string; dimText: string }[] = [
    { id: 'row', origin: P, dir: -1, name: 'Row space', symbol: 'C(Aᵀ)', caption: 'all Aᵀy', dimText: 'r' },
    { id: 'null', origin: P, dir: 1, name: 'Nullspace', symbol: 'N(A)', caption: 'Ax = 0', dimText: 'n − r' },
    { id: 'column', origin: Q, dir: -1, name: 'Column space', symbol: 'C(A)', caption: 'all Ax', dimText: 'r' },
    { id: 'leftNull', origin: Q, dir: 1, name: 'Left nullspace', symbol: 'N(Aᵀ)', caption: 'Aᵀy = 0', dimText: 'm − r' },
  ];

  const keyToggle = (id: SubspaceId) => (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      onFocus?.(focus === id ? null : id);
    }
  };

  const marker = (color: keyof typeof SUBSPACE_COLORS | 'text') => `url(#${uid}-arrow-${color})`;
  const colorOf = (c: keyof typeof SUBSPACE_COLORS | 'text') => (c === 'text' ? 'var(--text)' : SUBSPACE_COLORS[c]);

  function Arrow({ from, to, color, dashed, bend = 0, label, labelDy = -8 }: { from: Pt; to: Pt; color: keyof typeof SUBSPACE_COLORS | 'text'; dashed?: boolean; bend?: number; label?: string; labelDy?: number }) {
    const [a, z] = shorten(from, to);
    const c = { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2 + bend };
    const mid = { x: 0.25 * a.x + 0.5 * c.x + 0.25 * z.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * z.y };
    return (
      <g>
        <path
          d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${z.x} ${z.y}`}
          fill="none"
          style={{ stroke: colorOf(color) }}
          strokeWidth={2.2}
          strokeDasharray={dashed ? '7 5' : undefined}
          markerEnd={marker(color)}
        />
        {label && (
          <text x={mid.x} y={mid.y + labelDy} textAnchor="middle" className="bp-arrow-label" style={{ fill: colorOf(color) }}>
            {label}
          </text>
        )}
      </g>
    );
  }

  function Dot({ at, color, label, side }: { at: Pt; color: keyof typeof SUBSPACE_COLORS | 'text'; label?: string; side: 'left' | 'right' }) {
    return (
      <g>
        <circle cx={at.x} cy={at.y} r={5} style={{ fill: colorOf(color) }} />
        {label && (
          <text
            x={at.x + (side === 'left' ? -10 : 10)}
            y={at.y + 4}
            textAnchor={side === 'left' ? 'end' : 'start'}
            className="bp-point-label"
          >
            {label}
          </text>
        )}
      </g>
    );
  }

  const thin = (a: Pt, z: Pt, color: keyof typeof SUBSPACE_COLORS | 'text', dashed = false) => (
    <line x1={a.x} y1={a.y} x2={z.x} y2={z.y} style={{ stroke: colorOf(color) }} strokeWidth={1.4} strokeDasharray={dashed ? '4 4' : undefined} />
  );

  return (
    <svg
      className="big-picture"
      viewBox={`0 ${top} ${W} ${height}`}
      role="group"
      aria-label={`Big picture of the four fundamental subspaces for a ${m} by ${n} matrix${known ? ` of rank ${rank}` : ''}`}
    >
      <defs>
        {(['row', 'null', 'column', 'leftNull', 'text'] as const).map((c) => (
          <marker key={c} id={`${uid}-arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: colorOf(c) }} />
          </marker>
        ))}
      </defs>

      {/* Ambient spaces */}
      <text x={P.x} y={P.y - 2 * Math.max(k.row, 20) - 22} textAnchor="middle" className="bp-ambient">ℝ{sup(n)}</text>
      <text x={Q.x} y={Q.y - 2 * Math.max(k.column, 20) - 22} textAnchor="middle" className="bp-ambient">ℝ{sup(m)}</text>

      {/* Subspace regions */}
      {regions.map((r) => {
        const kk = k[r.id];
        const d = dims[r.id];
        const focused = focus === r.id;
        const dimLabel = `dim ${r.dimText}${d !== null ? ` = ${d}` : ''}`;
        const common = {
          tabIndex: 0,
          role: 'button',
          'aria-pressed': focused,
          'aria-label': `${r.name} ${r.symbol}, ${dimLabel}`,
          onMouseEnter: () => onFocus?.(r.id),
          onMouseLeave: () => onFocus?.(null),
          onFocus: () => onFocus?.(r.id),
          onBlur: () => onFocus?.(null),
          onKeyDown: keyToggle(r.id),
          className: focused ? 'bp-region focused' : 'bp-region',
        };
        if (kk === 0) {
          // The zero subspace is just the origin.
          const ty = r.origin.y + r.dir * 26;
          return (
            <g key={r.id} {...common}>
              <circle cx={r.origin.x} cy={r.origin.y} r={7} style={{ fill: SUBSPACE_COLORS[r.id] }} />
              <text x={r.origin.x} y={ty} textAnchor="middle" className="bp-region-name" style={{ fill: SUBSPACE_COLORS[r.id] }}>
                {r.symbol} = {'{0}'}
              </text>
              <text x={r.origin.x} y={ty + r.dir * 18} textAnchor="middle" className="bp-region-dim">
                {dimLabel}
              </text>
            </g>
          );
        }
        // Centered when there are no points; otherwise in the outer half, away from the dots.
        const cy = r.origin.y + r.dir * (mode === 'dimensions' ? 1 : 1.3) * kk;
        const lines = [r.name, r.symbol, mode === 'dimensions' ? r.caption : null, dimLabel].filter(Boolean) as string[];
        const top = cy - ((lines.length - 1) * 17) / 2;
        return (
          <g key={r.id} {...common}>
            <polygon
              points={pts(...diamond(r.origin, kk, r.dir))}
              style={{ fill: SUBSPACE_COLORS[r.id], stroke: SUBSPACE_COLORS[r.id] }}
              fillOpacity={focused ? 0.32 : 0.12}
              strokeWidth={focused ? 3 : 1.8}
            />
            {lines.map((line, i) => (
              <text
                key={i}
                x={r.origin.x}
                y={top + i * 17}
                textAnchor="middle"
                className={i === 0 ? 'bp-region-name' : i === lines.length - 1 ? 'bp-region-dim' : 'bp-region-text'}
                style={i === 0 ? { fill: SUBSPACE_COLORS[r.id] } : undefined}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Right-angle markers: row ⟂ null at P, column ⟂ left null at Q */}
      {k.row > 0 && k.null > 0 && (
        <polyline points={pts(add(P, 9, -9), add(P, 18, 0), add(P, 9, 9))} fill="none" style={{ stroke: 'var(--text)' }} strokeWidth={1.4} />
      )}
      {k.column > 0 && k.leftNull > 0 && (
        <polyline points={pts(add(Q, -9, -9), add(Q, -18, 0), add(Q, -9, 9))} fill="none" style={{ stroke: 'var(--text)' }} strokeWidth={1.4} />
      )}

      {mode === 'dimensions' && (
        <g className="bp-perp">
          <text x={P.x + 28} y={P.y - 4}>Perpendicular</text>
          <text x={P.x + 28} y={P.y + 15}>xᵀ(Aᵀy) = 0</text>
          <text x={Q.x - 28} y={Q.y - 4} textAnchor="end">Perpendicular</text>
          <text x={Q.x - 28} y={Q.y + 15} textAnchor="end">yᵀ(Ax) = 0</text>
        </g>
      )}

      {mode === 'A' && (
        <g>
          {/* x = x_r + x_n as a parallelogram about the origin */}
          {k.row > 0 && thin(P, xr, 'row')}
          {k.null > 0 && thin(P, xn, 'null')}
          {k.row > 0 && k.null > 0 && (
            <>
              {thin(xr, x, 'null', true)}
              {thin(xn, x, 'row', true)}
            </>
          )}
          {k.row > 0 && k.null > 0 && <Dot at={x} color="text" label={labels.x ?? 'x = xᵣ + xₙ'} side="left" />}
          {k.row > 0 && (
            <Dot at={xr} color="row" label={k.null > 0 ? labels.xr ?? 'xᵣ' : labels.x ?? 'x = xᵣ'} side="left" />
          )}
          {k.null > 0 && <Dot at={xn} color="null" label={labels.xn ?? 'xₙ'} side="left" />}
          <Dot at={Q} color="text" label="0" side="right" />
          {k.column > 0 && <Dot at={b} color="column" label={labels.b ?? 'b'} side="right" />}

          {k.row > 0 && <Arrow from={xr} to={b} color="row" label="A xᵣ = b" />}
          {k.row > 0 && k.null > 0 && (
            <Arrow from={x} to={b} color="text" bend={-(2 * Math.max(k.row, k.column) + 40)} label="A x = b" />
          )}
          {k.null > 0 && <Arrow from={xn} to={Q} color="null" dashed bend={2 * k.null + 30} label="A xₙ = 0" labelDy={20} />}
        </g>
      )}

      {mode === 'At' && (
        <g>
          {k.column > 0 && thin(Q, b, 'column')}
          {k.leftNull > 0 && thin(Q, e, 'leftNull')}
          {k.column > 0 && k.leftNull > 0 && (
            <>
              {thin(b, t, 'leftNull', true)}
              {thin(e, t, 'column', true)}
            </>
          )}
          {k.column > 0 && k.leftNull > 0 && <Dot at={t} color="text" label={labels.t ?? 'b = p + e'} side="right" />}
          {k.column > 0 && (
            <Dot at={b} color="column" label={k.leftNull > 0 ? labels.p ?? 'p' : labels.t ?? 'b = p'} side="right" />
          )}
          {k.leftNull > 0 && <Dot at={e} color="leftNull" label={labels.e ?? 'e'} side="right" />}
          <Dot at={P} color="text" label="0" side="left" />
          {k.row > 0 && <Dot at={xr} color="row" label={labels.Att ?? 'Aᵀb'} side="left" />}

          {k.column > 0 && <Arrow from={b} to={xr} color="column" label="Aᵀp = Aᵀb" />}
          {k.column > 0 && k.leftNull > 0 && (
            <Arrow from={t} to={xr} color="text" bend={-(2 * Math.max(k.row, k.column) + 40)} label="Aᵀb" />
          )}
          {k.leftNull > 0 && <Arrow from={e} to={P} color="leftNull" dashed bend={2 * k.leftNull + 30} label="Aᵀe = 0" labelDy={20} />}
        </g>
      )}
    </svg>
  );
}
