import { Line } from '@react-three/drei';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, Label } from '../../../components/canvas/primitives';
import type { Vec3 } from '../../../components/canvas/types';
import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridEditor } from '../../../components/editor/GridEditor';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { SVD_PRESETS } from '../../../presets/lesson7';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { useLesson7System } from '../../../store/useLesson7System';
import { attempt } from '../../../store/useSystem';
import { eigenColor } from '../../../theme/colors';
import { svdGeometry, svdView, type SvdFactor } from '../models';
import { useLesson7 } from '../useLesson7';
import { NumberDisplayPicker } from './PcaControls';

const round = (M: number[][]) => M.map((r) => r.map((x) => (Math.abs(x) < 5e-3 ? '0' : x.toFixed(2))));

function Factors({ factors, label }: { factors: SvdFactor[]; label: string }) {
  return (
    <div className="svd-factors">
      <span className="caption">{label}</span>
      <div className="matrix-pair">
        <Tex tex="A =" />
        {factors.map((f) => (
          <figure key={f.name} className="svd-factor">
            <Tex tex={f.tex} display />
            <figcaption>
              <Tex tex={`${f.name}\;(${f.shape})`} />
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** L7-S4: the unit circle (or sphere's great circles) and its image under A, with vᵢ ↦ σᵢuᵢ. */
function Geometry() {
  const geometry = useLesson7((s) => svdGeometry(s.A));
  if (!geometry.ok) return <p className="caption">The circle-to-ellipse picture needs a 2 × 2 or 3 × 3 matrix.</p>;
  const g = geometry.value;
  const map = (x: number[]): Vec3 => {
    const y = g.A.map((row) => row.reduce((acc, a, j) => acc + a * (x[j] ?? 0), 0));
    return [y[0] ?? 0, y[1] ?? 0, y[2] ?? 0];
  };
  const circles: number[][][] = g.dim === 2 ? [[[1, 0], [0, 1]]] : [[[1, 0, 0], [0, 1, 0]], [[0, 1, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]]];
  const ring = (a: number[], b: number[], f: (x: number[]) => Vec3) =>
    Array.from({ length: 97 }, (_, k) => {
      const t = (2 * Math.PI * k) / 96;
      return f(a.map((ai, i) => Math.cos(t) * ai + Math.sin(t) * b[i]));
    });
  const unit = (x: number[]): Vec3 => [x[0] ?? 0, x[1] ?? 0, x[2] ?? 0];
  const SceneCanvas = g.dim === 2 ? Canvas2D : Canvas3D;
  const reach = Math.max(1.5, ...g.axes.map((a) => a.sigma)) * 1.2;
  return (
    <SceneCanvas fit={[[-reach, -reach, 0], [reach, reach, 0]]}>
      {circles.map(([a, b], i) => (
        <group key={i}>
          <Line points={ring(a, b, unit)} color="#a1a1aa" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} />
          <Line points={ring(a, b, map)} color="#0072B2" lineWidth={2} />
        </group>
      ))}
      {g.axes.map((a, i) => (
        <group key={i}>
          <Arrow to={a.v} color="#a1a1aa" />
          <Label position={a.v} tex={`v_${i + 1}`} color="#71717a" />
          <Arrow to={a.image} color={eigenColor(i)} />
          <Label position={a.image} tex={`\\sigma_${i + 1}u_${i + 1}`} color={eigenColor(i)} />
        </group>
      ))}
    </SceneCanvas>
  );
}

/** §11.1 */
export function SvdView() {
  const { svdCells, svdPresetId, svdK, numberDisplay, setSvdCell, resizeSvd, loadSvdPreset, setSvdK, openInLesson1, openLesson5Layers } = useLesson7Store();
  const system = useLesson7System();
  const invalid = system.ok ? system.value.invalid.A : [];
  const view = useLesson7((s) => svdView(s.A, svdK, numberDisplay), [svdK, numberDisplay]);
  const rows = svdCells.length;
  const cols = svdCells[0]?.length ?? 0;
  const run = (fn: () => void) => attempt(fn);

  return (
    <ModuleLayout
      controls={
        <>
          <label className="preset-picker">
            Preset{' '}
            <select value={svdPresetId ?? ''} onChange={(e) => loadSvdPreset(e.target.value)}>
              <option value="" disabled>
                Custom
              </option>
              {SVD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <GridEditor
            label={`A (${rows} × ${cols})`}
            cells={svdCells}
            onChange={setSvdCell}
            invalid={invalid}
            onAddRow={() => run(() => resizeSvd(rows + 1, cols))}
            onRemoveRow={() => run(() => resizeSvd(rows - 1, cols))}
            onAddColumn={() => run(() => resizeSvd(rows, cols + 1))}
            onRemoveColumn={() => run(() => resizeSvd(rows, cols - 1))}
          />
          {view.ok && (
            <label className="sliders">
              <span>
                Best rank-k: k = {svdK} of {view.value.rank}
              </span>
              <input type="range" min={0} max={view.value.rank} step={1} value={svdK} onChange={(e) => setSvdK(Number(e.target.value))} />
            </label>
          )}
          <NumberDisplayPicker />
          <Caption section="§7.0">
            Every m × n matrix of rank r has an SVD A = UΣVᵀ, and so A = σ₁u₁v₁ᵀ + ⋯ + σᵣuᵣvᵣᵀ, a sum of rank-1 matrices in
            decreasing order of size.
          </Caption>
          <p>
            <button type="button" className="link-button" onClick={() => system.ok && run(() => openInLesson1(system.value.A))}>
              Orthonormal bases from the SVD (Lesson 1 big picture)
            </button>
            <br />
            <button type="button" className="link-button" onClick={() => run(openLesson5Layers)}>
              Compare: Pᵗ as rank-1 layers (Lesson 5)
            </button>
          </p>
          {!system.ok && <ViewNotice error={system.error} />}
        </>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.precision} />
          </div>
          <section>
            <Factors factors={view.value.full} label="Full SVD (the greyed parts only multiply zeros)" />
            <Factors factors={view.value.reduced} label="Reduced SVD" />
          </section>
          <section>
            <h3>
              <Tex tex="A = \sigma_1 u_1 v_1^T + \cdots + \sigma_r u_r v_r^T" />, largest first
            </h3>
            <div className="heatmap-row">
              {view.value.layers.map((l, i) => (
                <div key={l.index} className={i < svdK ? 'layer kept' : 'layer'}>
                  <MatrixHeatmap entries={l.entries} maxAbs={view.value.maxAbs} labels={round(l.entries)} caption={`σ${i + 1} layer, ‖·‖ ≈ ${l.size.toPrecision(3)}`} />
                  <Tex tex={l.tex} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3>Best rank-{svdK} approximation</h3>
            <div className="heatmap-row">
              <MatrixHeatmap entries={view.value.approx} maxAbs={view.value.maxAbs} labels={round(view.value.approx)} caption={`A${svdK}`} />
              <MatrixHeatmap entries={view.value.leftover} maxAbs={view.value.maxAbs} labels={round(view.value.leftover)} caption={`A − A${svdK}`} />
            </div>
            <Tex tex={view.value.errorTex} display />
          </section>
        </>
      )}
      <section>
        <h3>The unit circle and its image</h3>
        <Geometry />
      </section>
    </ModuleLayout>
  );
}
