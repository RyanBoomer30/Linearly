import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, Label, Line2D, ParametricLine, Plane, Point, Span } from '../../../components/canvas/primitives';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { COLUMN_COLORS, PIVOT_COLOR, ROW_COLORS } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';

/** M2: renders every primitive in 2D and 3D with hard-coded floats (no math core). */
export function PrimitivesDemoView() {
  const colors = useSceneColors();
  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="M2">Renderer check: every canvas primitive, independent of the math core.</Caption>
          <MatrixTex
            augmented
            entries={[
              ['1', '0', '1', '2'],
              ['0', '1', '1', '1'],
              ['0', '0', '0', '0'],
            ]}
            highlights={{
              columnColors: [...COLUMN_COLORS],
              entryBackgrounds: { '0,0': PIVOT_COLOR, '1,1': PIVOT_COLOR },
            }}
          />
        </>
      }
    >
      <div className="side-by-side">
        <Canvas2D>
          <Line2D a={1} b={1} c={5} color={ROW_COLORS[0]} />
          <Line2D a={2} b={-1} c={1} color={ROW_COLORS[1]} />
          <Point position={[2, 3, 0]} color={colors.result} />
          <Label position={[2.6, 3.4, 0]} tex="(2,3)" color={colors.text} />
          <Arrow to={[1, 2, 0]} color={COLUMN_COLORS[0]} />
          <Arrow to={[1, -1, 0]} color={COLUMN_COLORS[1]} />
        </Canvas2D>
        <Canvas3D>
          <Plane normal={[1, 0, 1]} offset={2} color={ROW_COLORS[0]} renderOrder={0} />
          <Plane normal={[2, 1, 3]} offset={5} color={ROW_COLORS[1]} renderOrder={1} />
          <Plane normal={[3, -2, 1]} offset={4} color={ROW_COLORS[2]} renderOrder={2} />
          <ParametricLine point={[2, 1, 0]} dir={[-1, -1, 1]} color={colors.result} lineWidth={5} />
          <Span vectors={[[-7, 2, 1]]} color={COLUMN_COLORS[3]} />
          <Arrow to={[1, 2, 3]} color={COLUMN_COLORS[0]} />
          <Arrow to={[0, 1, -2]} color={COLUMN_COLORS[1]} />
          <Arrow to={[1, 3, 1]} color={COLUMN_COLORS[2]} />
          <Point position={[2, 5, 4]} color={colors.target} />
          <Label position={[2, 5, 4.5]} tex="b" color={colors.text} />
        </Canvas3D>
      </div>
    </ModuleLayout>
  );
}
