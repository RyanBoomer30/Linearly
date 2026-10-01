import { useState, type ReactNode } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { BigPictureDiagram } from '../../../components/diagram/BigPictureDiagram';
import type { BigPictureMode, SubspaceId } from '../../../components/diagram/types';
import { Caption } from '../../../components/display/Caption';
import { PendingNotice } from '../../../components/display/PendingNotice';
import { VectorEditor } from '../../../components/editor/VectorEditor';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { vector } from '../../../core/matrix';
import { useStore } from '../../../store/useStore';
import { bigPictureModel, subspaceInfo } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { AmbientSpaceContents } from './SceneContents';

const MODES: { id: BigPictureMode; label: string; hint: string }[] = [
  { id: 'dimensions', label: 'Dimensions', hint: 'Sizes and right angles: dim C(Aᵀ) = dim C(A) = r.' },
  { id: 'A', label: 'A: ℝⁿ → ℝᵐ', hint: 'Split x = xᵣ + xₙ. A sends xᵣ to b and xₙ to 0, so Ax = A xᵣ = b.' },
  { id: 'At', label: 'Aᵀ: ℝᵐ → ℝⁿ', hint: 'Split b = p + e. Aᵀ sends e to 0, so Aᵀb = Aᵀp lands in the row space.' },
];

/** ℝ² and ℝ³ get a canvas; ℝ¹ and ℝ⁴ are diagram-only. */
function AmbientCanvas({ dim, children }: { dim: number; children: ReactNode }) {
  if (dim === 2) return <Canvas2D>{children}</Canvas2D>;
  if (dim === 3) return <Canvas3D>{children}</Canvas3D>;
  return <p className="caption">ℝ{dim} can't be drawn, but the diagram above still holds.</p>;
}

/**
 * Strang's big picture of linear algebra: the four subspaces, their
 * dimensions and orthogonality, and how A and Aᵀ move vectors between them.
 * Hovering a region links the diagram to the drawn subspaces in ℝⁿ and ℝᵐ.
 */
export function BigPictureView() {
  const m = useStore((s) => s.aCells.length);
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const [mode, setMode] = useState<BigPictureMode>('dimensions');
  const [focus, setFocus] = useState<SubspaceId | null>(null);
  const [xCells, setXCells] = useState<string[]>(['2', '1', '0']);
  const xs = xCells.length === n ? xCells : Array.from({ length: n }, (_, i) => xCells[i] ?? '0');

  const model = useViewModel((A, b) => bigPictureModel(A, vector(xs), b), [xs.join(',')]);
  const info = model.ok && focus ? subspaceInfo(model.value, focus) : null;
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
            <button type="button" disabled title="Needs the SVD — coming in Lesson 4">
              Orthonormal bases (SVD)
            </button>
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
              {/* TODO: render info.basisTex with <Tex>; name the orthogonal complement */}
            </div>
          )}
        </Controls>
      }
    >
      {!model.ok && <PendingNotice error={model.error} />}
      <BigPictureDiagram
        m={m}
        n={n}
        rank={model.ok ? model.value.rank : null}
        mode={mode}
        focus={focus}
        onFocus={setFocus}
        labels={model.ok ? model.value.labels : undefined}
      />
      {/* TODO: exact checks panel — xᵣ·xₙ = 0, A xₙ = 0, A xᵣ = b, p·e = 0, Aᵀe = 0 */}
      <div className="side-by-side">
        <figure>
          <figcaption>ℝ{n}: row space and nullspace</figcaption>
          <AmbientCanvas dim={n}>
            {model.ok && <AmbientSpaceContents scene={model.value.scene} side="domain" mode={mode} focus={focus} />}
          </AmbientCanvas>
        </figure>
        <figure>
          <figcaption>ℝ{m}: column space and left nullspace</figcaption>
          <AmbientCanvas dim={m}>
            {model.ok && <AmbientSpaceContents scene={model.value.scene} side="codomain" mode={mode} focus={focus} />}
          </AmbientCanvas>
        </figure>
      </div>
    </ModuleLayout>
  );
}
