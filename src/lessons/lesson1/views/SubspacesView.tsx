import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { BigPictureDiagram } from '../../../components/diagram/BigPictureDiagram';
import { useStore } from '../../../store/useStore';
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
  const m = useStore((s) => s.aCells.length);
  const n = useStore((s) => s.aCells[0]?.length ?? 0);

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
      {/* L1-F1: diamond diagram with live dimensions; the Big picture view adds the A / Aᵀ mappings. */}
      <BigPictureDiagram m={m} n={n} rank={view.ok ? view.value.spaces.rank : null} mode="dimensions" />
      {/* TODO: basis lists (L1-F2) */}
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
