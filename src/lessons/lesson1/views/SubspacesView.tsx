import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { PendingNotice } from '../../../components/display/PendingNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { subspacesView } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

/** §5.7 */
export function SubspacesView() {
  const view = useViewModel((A) => subspacesView(A));

  return (
    <ModuleLayout
      controls={
        <Controls showB={false}>
          <Caption section="§1.4">
            The four fundamental subspaces: C(Aᵀ) ⟂ N(A) in ℝⁿ, and C(A) ⟂ N(Aᵀ) in ℝᵐ.
          </Caption>
          {view.ok && <Tex tex={view.value.rankNullityTex} display />}
        </Controls>
      }
    >
      {!view.ok && <PendingNotice error={view.error} />}
      {/* TODO: diamond diagram with live dimensions (L1-F1) and basis lists (L1-F2) */}
      <div className="side-by-side">
        <figure>
          <figcaption>ℝⁿ: row space and null space</figcaption>
          <Canvas3D>{/* TODO: L1-F3 spans + right-angle marker */}</Canvas3D>
        </figure>
        <figure>
          <figcaption>ℝᵐ: column space and left null space</figcaption>
          <Canvas3D>{/* TODO: L1-F4 */}</Canvas3D>
        </figure>
      </div>
    </ModuleLayout>
  );
}
