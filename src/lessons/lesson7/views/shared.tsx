import type { ReactNode } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, ChartDragHandle, FunctionPlot, Scatter, Segment, SlopeLine, type ChartFrame } from '../../../components/canvas/charts';
import { MathText } from '../../../components/display/MathText';
import { Tex } from '../../../components/display/Tex';
import { dataRowColor } from '../../../theme/colors';
import type { Check, Point } from '../models';

/** "✓ XV = UΣ" lines. */
export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.name} className={c.holds ? 'hit' : 'solution-msg warn'}>
          {c.holds ? '✓' : '✗'} <Tex tex={c.tex} />
          {c.residual !== undefined && <span className="caption"> (difference {c.residual.toExponential(1)})</span>}
        </li>
      ))}
    </ul>
  );
}

export interface ScatterLine {
  from: Point;
  to: Point;
  color: string;
  label?: string;
  dashed?: boolean;
  width?: number;
}

/**
 * The PCA views' scatter: points colored by row (F-T4), optional lines and
 * segments, optionally draggable points (L7-L3), and anything else as children.
 */
export function Scatter2D({
  frame,
  points,
  lines = [],
  onDrag,
  colors,
  children,
}: {
  frame: ChartFrame;
  points: Point[];
  lines?: ScatterLine[];
  onDrag?: (row: number, to: Point) => void;
  colors?: string[];
  children?: ReactNode;
}) {
  return (
    <Canvas2D bare fit={chartFit(frame)}>
      <Axes2D frame={frame}>
        {lines.map((l, i) => (
          <Segment key={i} from={l.from} to={l.to} color={l.color} dashed={l.dashed} lineWidth={l.width ?? 2} />
        ))}
        {children}
        {onDrag ? (
          points.map((p, i) => <ChartDragHandle key={i} at={p} color={colors?.[i] ?? dataRowColor(i)} onDrag={(to) => onDrag(i, to)} />)
        ) : (
          <Scatter points={points.map((p, i) => ({ at: p, color: colors?.[i] ?? dataRowColor(i) }))} />
        )}
      </Axes2D>
    </Canvas2D>
  );
}

/** A small chart: series as lines with points, plus an optional reference curve or log–log slope line. */
export function LineChart({
  frame,
  series,
  curves = [],
  slope,
}: {
  frame: ChartFrame;
  series: { label: string; color: string; points: [number, number][]; dots?: boolean }[];
  curves?: { label: string; color: string; points: [number, number][] }[];
  slope?: { slope: number; through: [number, number]; label: string };
}) {
  return (
    <>
      <Canvas2D bare fit={chartFit(frame)}>
        <Axes2D frame={frame}>
          {slope && <SlopeLine slope={slope.slope} through={slope.through} color="#71717a" label={slope.label} />}
          {curves.map((c) => (
            <FunctionPlot key={c.label} points={c.points} color={c.color} lineWidth={1} dashed />
          ))}
          {series.map((s) => (
            <group key={s.label}>
              <FunctionPlot points={s.points} color={s.color} lineWidth={2} />
              {s.dots !== false && <Scatter points={s.points.map((p) => ({ at: p, color: s.color }))} />}
            </group>
          ))}
        </Axes2D>
      </Canvas2D>
      <ul className="legend">
        {[...series, ...curves].map((s) => (
          <li key={s.label} style={{ color: s.color }}>
            <MathText>{s.label}</MathText>
          </li>
        ))}
      </ul>
    </>
  );
}
