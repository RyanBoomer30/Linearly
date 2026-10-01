import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useStore } from '../../../store/useStore';
import { useSceneColors } from '../../../theme/useTheme';
import { rowPictureScene } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls, SolutionMessage } from './Controls';
import { RowPictureContents, rowPictureFit } from './SceneContents';

/** §5.1 */
export function RowPictureView() {
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const colors = useSceneColors();
  const scene = useViewModel((A, b) => rowPictureScene(A, b));
  const SceneCanvas = n === 2 ? Canvas2D : Canvas3D;

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.1">
            Row picture: each equation is a line (or plane). The solution is where they all meet.
          </Caption>
          {scene.ok && (
            <div className="readout">
              <Tex tex={scene.value.dotProductTex} display />
              {scene.value.equationsTex.map((eq, i) => (
                <Tex key={i} tex={eq} display />
              ))}
            </div>
          )}
          {scene.ok && <SolutionMessage marker={scene.value.solution} dim={scene.value.dim} />}
        </Controls>
      }
    >
      {!scene.ok && <ViewNotice error={scene.error} />}
      <SceneCanvas fit={scene.ok ? rowPictureFit(scene.value) : undefined}>{scene.ok && <RowPictureContents scene={scene.value} markerColor={colors.result} />}</SceneCanvas>
    </ModuleLayout>
  );
}
