import { Line } from '@react-three/drei';
import type { ReactNode } from 'react';
import { attempt } from '../../../store/useSystem';
import { useSceneColors } from '../../../theme/useTheme';
import { Label } from '../primitives/Label';
import { axisTitle } from './Axes2D';
import { ChartFrameContext, toWorld, type ChartFrame } from './frame';
import { niceTicks } from './ticks';

const fmtTick = (t: number) => String(+t.toFixed(4)).replace('-', '−');

/** F-C7: data axes in 3D (x₁, x₂, y). Place inside a bare <Canvas3D>; z is up. */
export function Axes3D({ frame, children }: { frame: ChartFrame; children?: ReactNode }) {
  const colors = useSceneColors();
  const z = frame.z!;
  const origin = toWorld(frame, [frame.x.min, frame.y.min, z.min]);
  const ends = [
    { spec: frame.x, end: toWorld(frame, [frame.x.max, frame.y.min, z.min]), at: (t: number) => [t, frame.y.min, z.min] },
    { spec: frame.y, end: toWorld(frame, [frame.x.min, frame.y.max, z.min]), at: (t: number) => [frame.x.min, t, z.min] },
    { spec: z, end: toWorld(frame, [frame.x.min, frame.y.min, z.max]), at: (t: number) => [frame.x.min, frame.y.min, t] },
  ];

  return (
    <ChartFrameContext.Provider value={frame}>
      {ends.map(({ spec, end, at }, k) => {
        const ticks = attempt(() => niceTicks(spec.min, spec.max, 5));
        return (
          <group key={k}>
            <Line points={[origin, end]} color={colors.axis} lineWidth={2} />
            {ticks.ok &&
              ticks.value.map((t) => (
                <Label key={t} position={toWorld(frame, at(t))} color={colors.text}>
                  {fmtTick(t)}
                </Label>
              ))}
            <Label position={end.map((c, i) => c + (end[i] !== origin[i] ? 0.8 : 0)) as typeof end} color={colors.text}>
              {axisTitle(spec)}
            </Label>
          </group>
        );
      })}
      {children}
    </ChartFrameContext.Provider>
  );
}
