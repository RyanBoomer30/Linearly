import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { BigPictureDiagram } from '../../../components/diagram/BigPictureDiagram';
import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { toFloatVector, type Vector } from '../../../core/matrix';
import { toVec3 } from '../../../components/canvas/types';
import { useStore } from '../../../store/useStore';
import { SUBSPACE_COLORS } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';
import { subspacesView } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { PerpendicularPair } from './SceneContents';

const realSpace = (k: number) => `ℝ${String(k).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}`;

const basisTex = (vs: Vector[]) =>
  vs.length === 0 ? '\\{\\mathbf{0}\\}' : vs.map((v) => `(${v.map((x) => x.toTex()).join(',')})`).join(',\;');
const f3 = (vs: Vector[]) => vs.map((v) => toVec3(toFloatVector(v)));

/** §5.7 */
export function SubspacesView() {
  const view = useViewModel((A) => subspacesView(A));
  const m = useStore((s) => s.aCells.length);
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const colors = useSceneColors();
  const s = view.ok ? view.value.spaces : null;

  return (
    <ModuleLayout
      controls={
        <Controls showB={false}>
          <Caption section="§1.4">
            The four fundamental subspaces: C(Aᵀ) ⟂ N(A) in ℝⁿ, and C(A) ⟂ N(Aᵀ) in ℝᵐ.
          </Caption>
          {view.ok && <Tex tex={view.value.rankNullityTex} display />}
          {s && (
            <dl className="basis-list">
              <dt style={{ color: SUBSPACE_COLORS.row }}>C(Aᵀ), dim {s.rank}</dt>
              <dd><Tex tex={basisTex(s.row)} /></dd>
              <dt style={{ color: SUBSPACE_COLORS.null }}>N(A), dim {s.n - s.rank}</dt>
              <dd><Tex tex={basisTex(s.nullSpace)} /></dd>
              <dt style={{ color: SUBSPACE_COLORS.column }}>C(A), dim {s.rank}</dt>
              <dd><Tex tex={basisTex(s.column)} /></dd>
              <dt style={{ color: SUBSPACE_COLORS.leftNull }}>N(Aᵀ), dim {s.m - s.rank}</dt>
              <dd><Tex tex={basisTex(s.leftNull)} /></dd>
            </dl>
          )}
          {view.ok && (
            <div className="readout">
              <div>Row · null dot products: {view.value.rowNullDots.join(', ') || '—'}</div>
              <div>Column · left-null dot products: {view.value.colLeftNullDots.join(', ') || '—'}</div>
            </div>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      <BigPictureDiagram m={m} n={n} rank={s ? s.rank : null} mode="dimensions" />
      <div className="side-by-side">
        <figure>
          <figcaption>{realSpace(n)}: row space and null space</figcaption>
          {n === 3 ? (
            <Canvas3D fit={s ? [...f3(s.row), ...f3(s.nullSpace)] : undefined}>{s && <PerpendicularPair a={f3(s.row)} b={f3(s.nullSpace)} colors={[SUBSPACE_COLORS.row, SUBSPACE_COLORS.null]} markerColor={colors.text} />}</Canvas3D>
          ) : (
            <p className="caption">The 3D view needs n = 3.</p>
          )}
        </figure>
        <figure>
          <figcaption>{realSpace(m)}: column space and left null space</figcaption>
          {m === 3 ? (
            <Canvas3D fit={s ? [...f3(s.column), ...f3(s.leftNull)] : undefined}>{s && <PerpendicularPair a={f3(s.column)} b={f3(s.leftNull)} colors={[SUBSPACE_COLORS.column, SUBSPACE_COLORS.leftNull]} markerColor={colors.text} />}</Canvas3D>
          ) : (
            <p className="caption">The 3D view needs m = 3.</p>
          )}
        </figure>
      </div>
    </ModuleLayout>
  );
}
