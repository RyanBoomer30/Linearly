import type { ReactNode } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import {
  Axes2D,
  Axes3D,
  chartFit,
  FunctionPlot,
  ResidualSquare,
  Scatter,
  Segment,
  SurfacePlot,
} from '../../../components/canvas/charts';
import { useDataStore } from '../../../store/useDataStore';
import { MODEL_COLOR } from '../../../theme/colors';
import type { DataPlotScene } from '../models';

interface DataPlotProps {
  scene: DataPlotScene;
  /** Vertical residual segments (L2-P4, L2-L1). */
  residuals?: boolean;
  /** Squared errors as areas (L2-L1); only honest when the scene's frame has equal aspect. */
  squares?: boolean;
  /** Extra chart content in data coordinates: prediction marker, drag handles, … */
  children?: ReactNode;
}

/**
 * The data with the model drawn on it, in 2D (one feature) or 3D (two
 * features). Shared by the data, projection, loss and multi-variable views.
 * Selecting a point selects its table row (L2-D2).
 */
export function DataPlot({ scene, residuals = false, squares = false, children }: DataPlotProps) {
  const selectedRow = useDataStore((s) => s.selectedRow);
  const selectRow = useDataStore((s) => s.selectRow);
  const marks = (residuals || squares) && scene.residuals;

  if (scene.dim === 3) {
    return (
      <Canvas3D bare fit={chartFit(scene.frame)} cameraPosition={[14, -10, 9]}>
        <Axes3D frame={scene.frame}>
          {scene.surface && <SurfacePlot grid={scene.surface} color={MODEL_COLOR} />}
          {marks && marks.map((r) => <Segment key={r.row} from={r.from} to={r.to} color={r.color} />)}
          <Scatter points={scene.points} selected={selectedRow} onSelect={selectRow} />
          {children}
        </Axes3D>
      </Canvas3D>
    );
  }

  return (
    <Canvas2D bare fit={chartFit(scene.frame)}>
      <Axes2D frame={scene.frame}>
        {scene.overlays.map((o) => (
          <FunctionPlot key={o.label} points={o.curve} color={o.color} lineWidth={2} />
        ))}
        <FunctionPlot points={scene.curve} color={MODEL_COLOR} />
        {marks &&
          marks.map((r) => (
            <group key={r.row}>
              {squares && <ResidualSquare x={r.x} y={r.y} prediction={r.prediction} color={r.color} />}
              {residuals && <Segment from={r.from} to={r.to} color={r.color} dashed />}
            </group>
          ))}
        <Scatter points={scene.points} selected={selectedRow} onSelect={selectRow} />
        {children}
      </Axes2D>
    </Canvas2D>
  );
}
