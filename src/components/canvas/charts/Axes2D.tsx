import { Line } from '@react-three/drei';
import type { ReactNode } from 'react';
import { attempt } from '../../../store/useSystem';
import { useSceneColors } from '../../../theme/useTheme';
import { Label } from '../primitives/Label';
import type { Vec3 } from '../types';
import { ChartFrameContext, toWorld, type AxisSpec, type ChartFrame } from './frame';
import { logTicks, niceTicks } from './ticks';

export const axisTitle = (a: AxisSpec) => (a.unit ? `${a.title}, ${a.unit}` : a.title);
const SUPERSCRIPT: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** Very small or large ticks (log axes) as powers of ten: 10⁻¹⁶. */
const fmtTick = (t: number) =>
  Math.abs(t) > 0 && (Math.abs(t) < 1e-3 || Math.abs(t) >= 1e5)
    ? `10${String(Math.round(Math.log10(Math.abs(t)))).replace(/[-\d]/g, (c) => SUPERSCRIPT[c])}`
    : String(+t.toFixed(4)).replace('-', '−');

/**
 * F-C7: data axes with nice ticks, tick labels, and titles with units. Place
 * inside a bare <Canvas2D>; children are drawn in data coordinates.
 */
export function Axes2D({ frame, children }: { frame: ChartFrame; children?: ReactNode }) {
  const colors = useSceneColors();
  const right = toWorld(frame, [frame.x.max, frame.y.min])[0];
  const top = toWorld(frame, [frame.x.min, frame.y.max])[1];
  const ticksFor = (a: AxisSpec) => attempt(() => (a.log ? logTicks(a.min, a.max) : niceTicks(a.min, a.max)));
  const xTicks = ticksFor(frame.x);
  const yTicks = ticksFor(frame.y);
  const grid: Vec3[] = [];
  if (xTicks.ok) for (const t of xTicks.value) grid.push(toWorld(frame, [t, frame.y.min]), toWorld(frame, [t, frame.y.max]));
  if (yTicks.ok) for (const t of yTicks.value) grid.push(toWorld(frame, [frame.x.min, t]), toWorld(frame, [frame.x.max, t]));

  return (
    <ChartFrameContext.Provider value={frame}>
      {grid.length > 0 && <Line points={grid} segments color={colors.grid} lineWidth={1} />}
      <Line
        points={[
          [0, top, 0],
          [0, 0, 0],
          [right, 0, 0],
        ]}
        color={colors.axis}
        lineWidth={2}
      />
      {xTicks.ok &&
        xTicks.value.map((t) => (
          <Label key={`x${t}`} position={[toWorld(frame, [t, frame.y.min])[0], -0.35, 0]} color={colors.text}>
            {fmtTick(t)}
          </Label>
        ))}
      {yTicks.ok &&
        yTicks.value.map((t) => (
          <Label key={`y${t}`} position={[-0.45, toWorld(frame, [frame.x.min, t])[1], 0]} color={colors.text}>
            {fmtTick(t)}
          </Label>
        ))}
      <Label position={[right / 2, -0.9, 0]} color={colors.text}>
        {axisTitle(frame.x)}
      </Label>
      <Label position={[-1.2, top + 0.5, 0]} color={colors.text}>
        {axisTitle(frame.y)}
      </Label>
      {children}
    </ChartFrameContext.Provider>
  );
}
