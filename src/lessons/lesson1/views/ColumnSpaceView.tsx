import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, DragHandle, Span } from '../../../components/canvas/primitives';
import { Caption } from '../../../components/display/Caption';
import { PendingNotice } from '../../../components/display/PendingNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useSceneColors } from '../../../theme/useTheme';
import { columnSpaceScene } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

/** §5.5 */
export function ColumnSpaceView() {
  const colors = useSceneColors();
  const scene = useViewModel((A, b) => columnSpaceScene(A, b!));

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.2">Ax = b has a solution if and only if b is in C(A).</Caption>
          {scene.ok && (
            <div className="readout">
              <div>dim C(A) = {scene.value.rank}</div>
              <div>
                b is {scene.value.inSpace ? 'in' : 'not in'} C(A)
                {!scene.value.inSpace && ` (distance ${scene.value.distance.toFixed(3)})`}
              </div>
            </div>
          )}
        </Controls>
      }
    >
      {!scene.ok && <PendingNotice error={scene.error} />}
      <Canvas3D>
        {scene.ok && (
          <>
            {(scene.value.shape === 'line' || scene.value.shape === 'plane') && (
              <Span vectors={scene.value.basis.map((v) => v.to)} color={colors.axis} opacity={0.25} />
            )}
            {scene.value.basis.map((v) => (
              <Arrow key={v.column} to={v.to} color={v.color} />
            ))}
            <DragHandle position={scene.value.b} color={colors.target} onDrag={() => {}} snap />
          </>
        )}
      </Canvas3D>
    </ModuleLayout>
  );
}
