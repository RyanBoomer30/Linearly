import { useState, type ReactNode } from 'react';
import type { Vec3 } from '../../../components/canvas/types';

const realSpace = (k: number) => `ℝ${String(k).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}`;
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { BigPictureDiagram } from '../../../components/diagram/BigPictureDiagram';
import type { BigPictureMode, BigPictureViewMode, SubspaceId } from '../../../components/diagram/types';
import { Arrow, Label } from '../../../components/canvas/primitives';
import { formatFloat } from '../../../components/display/AnyMatrixTex';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { VectorEditor } from '../../../components/editor/VectorEditor';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { vector } from '../../../core/matrix';
import { useStore } from '../../../store/useStore';
import { bigPictureModel, pseudoinverseView, subspaceInfo, svdBigPicture } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { Tex } from '../../../components/display/Tex';

const COMPLEMENT_NAMES: Record<SubspaceId, string> = {
  row: 'the row space C(Aᵀ)',
  null: 'the nullspace N(A)',
  column: 'the column space C(A)',
  leftNull: 'the left nullspace N(Aᵀ)',
};
import { AmbientSpaceContents } from './SceneContents';

const MODES: { id: BigPictureViewMode; label: string; hint: string }[] = [
  { id: 'dimensions', label: 'Dimensions', hint: 'Sizes and right angles: dim C(Aᵀ) = dim C(A) = r.' },
  { id: 'A', label: 'A: ℝⁿ → ℝᵐ', hint: 'Split x = xᵣ + xₙ. A sends xᵣ to b and xₙ to 0, so Ax = A xᵣ = b.' },
  { id: 'At', label: 'Aᵀ: ℝᵐ → ℝⁿ', hint: 'Split b = p + e. Aᵀ sends e to 0, so Aᵀb = Aᵀp lands in the row space.' },
  { id: 'svd', label: 'Orthonormal bases (SVD)', hint: 'Strang Fig. 2: Avᵢ = σᵢuᵢ. The v’s and u’s are orthonormal bases of all four subspaces.' },
  { id: 'pinv', label: 'Pseudoinverse A⁺', hint: 'A⁺ sends p to xᵣ and e to 0: A⁺b is the row-space solution.' },
];

/** The diagram draws three modes; the SVD modes reuse them. */
const DIAGRAM_MODE: Record<BigPictureViewMode, BigPictureMode> = { dimensions: 'dimensions', A: 'A', At: 'At', svd: 'dimensions', pinv: 'At' };

/** ℝ² and ℝ³ get a canvas; ℝ¹ and ℝ⁴ are diagram-only. */
function AmbientCanvas({ dim, fit, children }: { dim: number; fit?: Vec3[]; children: ReactNode }) {
  if (dim === 2) return <Canvas2D fit={fit}>{children}</Canvas2D>;
  if (dim === 3) return <Canvas3D fit={fit}>{children}</Canvas3D>;
  return <p className="caption">{realSpace(dim)} can't be drawn, but the diagram above still holds.</p>;
}

/**
 * Strang's big picture of linear algebra: the four subspaces, their
 * dimensions and orthogonality, and how A and Aᵀ move vectors between them.
 * Hovering a region links the diagram to the drawn subspaces in ℝⁿ and ℝᵐ.
 */
export function BigPictureView() {
  const m = useStore((s) => s.aCells.length);
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const mode = useStore((s) => s.bigPictureMode);
  const setMode = useStore((s) => s.setBigPictureMode);
  const diagramMode = DIAGRAM_MODE[mode];
  const [focus, setFocus] = useState<SubspaceId | null>(null);
  const [xCells, setXCells] = useState<string[]>(['2', '1', '0']);
  const xs = xCells.length === n ? xCells : Array.from({ length: n }, (_, i) => xCells[i] ?? '0');

  const model = useViewModel((A, b) => bigPictureModel(A, vector(xs), b), [xs.join(',')]);
  const info = model.ok && focus ? subspaceInfo(model.value, focus) : null;
  const svdModel = useViewModel((A) => (mode === 'svd' || mode === 'pinv' ? svdBigPicture(A) : null), [mode]);
  const pinv = useViewModel((A, b) => (mode === 'pinv' ? pseudoinverseView(A, b) : null), [mode]);
  const hint = MODES.find((md) => md.id === mode)!.hint;

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.4">
            The big picture (after Gilbert Strang): every m × n matrix has four subspaces, paired at right angles.
          </Caption>
          <div className="segmented" role="radiogroup" aria-label="Diagram mode">
            {MODES.map((md) => (
              <button
                key={md.id}
                type="button"
                role="radio"
                aria-checked={mode === md.id}
                className={mode === md.id ? 'active' : undefined}
                onClick={() => setMode(md.id)}
              >
                {md.label}
              </button>
            ))}
          </div>
          <p className="caption">{hint}</p>
          {mode === 'A' && (
            <VectorEditor
              label="x"
              values={xs}
              onChange={(i, v) => setXCells(xs.map((c, k) => (k === i ? v : c)))}
            />
          )}
          {mode === 'At' && <p className="caption">b comes from the editor's b column; try one outside C(A).</p>}
          {info && (
            <div className="subspace-info" style={{ borderColor: 'currentColor' }}>
              <strong>{info.title}</strong> ⊂ {info.ambient} · {info.dimLabel}
              <p>{info.description}</p>
              <p>{info.membership}</p>
              <div>
                Basis: {info.basisTex.length ? info.basisTex.map((tex, i) => <Tex key={i} tex={tex} />) : '{0}'}
              </div>
              <p>Orthogonal complement: {COMPLEMENT_NAMES[info.complement]}.</p>
            </div>
          )}
        </Controls>
      }
    >
      {!model.ok && <ViewNotice error={model.error} />}
      <BigPictureDiagram
        m={m}
        n={n}
        rank={model.ok ? model.value.rank : null}
        mode={diagramMode}
        focus={focus}
        onFocus={setFocus}
        labels={model.ok ? model.value.labels : undefined}
      />
      {(mode === 'svd' || mode === 'pinv') && <SvdPanel svd={svdModel} pinv={mode === 'pinv' ? pinv : null} />}
      {model.ok && (mode === 'A' || mode === 'At') && (
        <ul className="checks" aria-label="Exact checks">
          {mode === 'A' ? (
            <>
              <li>xᵣ · xₙ = {model.value.checks.xrDotXn.toString()}</li>
              <li>A xₙ = ({model.value.checks.Axn.map(String).join(', ')})</li>
              <li>A xᵣ = ({model.value.checks.Axr.map(String).join(', ')}) = b</li>
            </>
          ) : model.value.target ? (
            <>
              <li>p · e = {model.value.checks.pDotE?.toString()}</li>
              <li>Aᵀe = ({model.value.checks.Ate?.map(String).join(', ')})</li>
              <li>{model.value.target.e.every((x) => x.isZero()) ? 'e = 0, so b is in C(A).' : 'e ≠ 0, so b is not in C(A): Ax = b has no solution.'}</li>
            </>
          ) : (
            <li>Turn on the b column in the editor to split b = p + e.</li>
          )}
        </ul>
      )}
      <div className="side-by-side">
        <figure>
          <figcaption>{realSpace(n)}: row space and nullspace</figcaption>
          <AmbientCanvas dim={n} fit={model.ok ? [model.value.scene.x, model.value.scene.xr, model.value.scene.xn] : undefined}>
            {model.ok && mode !== 'svd' && <AmbientSpaceContents scene={model.value.scene} side="domain" mode={diagramMode} focus={focus} />}
            {mode === 'svd' && svdModel.ok && svdModel.value && <SvdVectors vectors={svdModel.value.scene.domain} />}
          </AmbientCanvas>
        </figure>
        <figure>
          <figcaption>{realSpace(m)}: column space and left nullspace</figcaption>
          <AmbientCanvas
            dim={m}
            fit={model.ok ? [model.value.scene.b, ...(model.value.scene.t ? [model.value.scene.t] : [])] : undefined}
          >
            {model.ok && mode !== 'svd' && <AmbientSpaceContents scene={model.value.scene} side="codomain" mode={diagramMode} focus={focus} />}
            {mode === 'svd' && svdModel.ok && svdModel.value && <SvdVectors vectors={svdModel.value.scene.codomain} />}
          </AmbientCanvas>
        </figure>
      </div>
    </ModuleLayout>
  );
}

type SvdModel = ReturnType<typeof svdBigPicture>;
type PinvModel = ReturnType<typeof pseudoinverseView>;
type Maybe<T> = { ok: true; value: T | null } | { ok: false; error: string };

const SUBSPACE_TITLES: Record<SubspaceId, string> = {
  row: 'Row space C(Aᵀ)',
  null: 'Nullspace N(A)',
  column: 'Column space C(A)',
  leftNull: 'Left nullspace N(Aᵀ)',
};
const tuple = (v: number[]) => `(${v.map((x) => formatFloat(Math.abs(x) < 1e-12 ? 0 : x, 4)).join(', ')})`;

/** L4-BP1–BP4: singular values, orthonormal bases, Avᵢ = σᵢuᵢ, and the pseudoinverse. */
function SvdPanel({ svd, pinv }: { svd: Maybe<SvdModel>; pinv: Maybe<PinvModel> | null }) {
  if (!svd.ok) return <ViewNotice error={svd.error} />;
  if (!svd.value) return null;
  const s = svd.value;
  return (
    <section className="svd-panel">
      <h3>
        Singular value decomposition <PrecisionBadge precision={{ kind: 'float', reason: 'singular values are found iteratively' }} />
      </h3>
      <p>
        σ = {s.sigma.map((x) => formatFloat(x, 4)).join(', ')} · rank {s.rank}
      </p>
      <dl className="basis-list">
        {(Object.keys(SUBSPACE_TITLES) as SubspaceId[]).map((id) => (
          <div key={id}>
            <dt>{SUBSPACE_TITLES[id]}</dt>
            <dd>{s.bases[id].length ? s.bases[id].map((b) => `${b.label} = ${tuple(b.vector)}`).join('; ') : '{0}'}</dd>
          </div>
        ))}
      </dl>
      <ul className="checks">
        {s.arrows.map((a) => (
          <li key={a.tex}>
            <Tex tex={a.tex} />
          </li>
        ))}
      </ul>
      {pinv && !pinv.ok && <ViewNotice error={pinv.error} />}
      {pinv?.ok && pinv.value && (
        <div className="readout">
          <p>
            A⁺b = {tuple(pinv.value.xr)}; the exact row-space solution is{' '}
            <Tex tex={`(${pinv.value.exact.map((x) => x.toTex()).join(', ')})`} />{' '}
            <span className={pinv.value.matches ? 'hit' : 'solution-msg warn'}>{pinv.value.matches ? '✓ they match' : '✗ they differ'}</span>
          </p>
          <p>{pinv.value.meaning}</p>
        </div>
      )}
    </section>
  );
}

/** L4-BP1: the v's (in ℝⁿ) or u's (in ℝᵐ) as arrows in the companion views. */
function SvdVectors({ vectors }: { vectors: { to: Vec3; label: string; color: string }[] }) {
  return (
    <>
      {vectors.map((v) => (
        <group key={v.label}>
          <Arrow to={v.to} color={v.color} />
          <Label position={v.to} tex={v.label} color={v.color} />
        </group>
      ))}
    </>
  );
}
