import { Point } from '../primitives/Point';
import { Label } from '../primitives/Label';
import { toWorld, useChartFrame } from './frame';

export interface ScatterPoint {
  /** Data coordinates: (x, y) or (x₁, x₂, y). */
  at: number[];
  color: string;
  label?: string;
}

/** F-C8: data points, colored per data row. Clicking a point selects its table row (L2-D2). */
export function Scatter({
  points,
  selected = null,
  onSelect,
}: {
  points: ScatterPoint[];
  selected?: number | null;
  onSelect?: (i: number | null) => void;
}) {
  const frame = useChartFrame();
  return (
    <>
      {points.map((p, i) => {
        const at = toWorld(frame, p.at);
        return (
          <group key={i}>
            <Point
              position={at}
              color={p.color}
              radius={i === selected ? 0.2 : 0.13}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect?.(i === selected ? null : i);
              }}
            />
            {p.label && i === selected && (
              <Label position={[at[0] + 0.5, at[1] + 0.4, at[2]]} color={p.color}>
                {p.label}
              </Label>
            )}
          </group>
        );
      })}
    </>
  );
}
