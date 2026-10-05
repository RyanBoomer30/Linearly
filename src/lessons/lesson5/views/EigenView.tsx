import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, DragHandle, Label, ParametricLine } from '../../../components/canvas/primitives';
import { AnyMatrixTex, anyMatrixEntries } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { CodeBlock } from '../../../components/display/CodeBlock';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { zeroVector } from '../../../core/matrix';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { attempt } from '../../../store/useSystem';
import { eigenScene, eigenView, numpyView, snapToEigenLine } from '../models';
import { useLesson5 } from '../useLesson5';
import { CheckList, Controls } from './Controls';

const PROBE_COLOR = '#E69F00';
const IMAGE_COLOR = '#CC3311';

/** §9.4 */
export function EigenView() {
  const { scaling, setScaling, k, setK, probe, setProbe, openInLesson1 } = useLesson5Store();
  const view = useLesson5((s) => eigenView(s.P, scaling, k), [scaling, k]);
  const scene = useLesson5((s) => (s.P.length === 3 ? eigenScene(s.P, probe) : null), [probe]);
  const numpy = useLesson5((s) => numpyView(s.P));
  const snap = useLesson5((s) => (p: [number, number, number]) => setProbe(snapToEigenLine(s.P, p)), [setProbe]);

  return (
    <ModuleLayout
      controls={
        <Controls showX0={false}>
          <Caption section="§5.3">
            If an n × n matrix has n independent eigenvectors, A = VΛV⁻¹ and Aᵏ = VΛᵏV⁻¹. The notes find the eigenvalues
            with a calculator; here they are computed exactly when they are rational.
          </Caption>
          <div className="segmented" role="group" aria-label="Eigenvector scaling">
            <button type="button" className={scaling === 'integer' ? 'active' : undefined} onClick={() => setScaling('integer')}>
              Integer (notes)
            </button>
            <button type="button" className={scaling === 'probability' ? 'active' : undefined} onClick={() => setScaling('probability')}>
              Probability (λ = 1)
            </button>
          </div>
          <label className="sliders">
            <span>k = {k}</span>
            <input type="range" min={0} max={20} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} />
          </label>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.precision} />
          </div>
          <section>
            <h3>Eigenvalues</h3>
            <Tex tex={`\\det(\\lambda I - P) = ${view.value.polynomialTex}`} display />
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>λ</th>
                  <th>Multiplicity</th>
                  <th>Eigenvectors: N(P − λI)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {view.value.rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <Tex tex={r.lambdaTex} />
                    </td>
                    <td>{r.multiplicity}</td>
                    <td>
                      {r.vectors.length > 0 ? r.vectors.map((v) => <Tex key={v} tex={v} />) : <span className="caption">complex λ: not shown</span>}
                    </td>
                    <td>
                      {r.shifted && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => attempt(() => openInLesson1(r.shifted!, zeroVector(r.shifted!.length), 'elimination'))}
                        >
                          Eliminate P − λI in Lesson 1
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3>
              <Tex tex="P = V\Lambda V^{-1}" />
            </h3>
            {view.value.decomposition.kind === 'available' ? (
              <>
                <div className="matrix-pair">
                  <Tex tex="P =" />
                  <AnyMatrixTex M={view.value.decomposition.V} />
                  {/* Diagonal: written entry by entry, not as (1/d)[…]. */}
                  <MatrixTex entries={anyMatrixEntries(view.value.decomposition.Lambda, 4)} />
                  <AnyMatrixTex M={view.value.decomposition.Vinv} />
                </div>
                <CheckList checks={[view.value.decomposition.check]} />
              </>
            ) : (
              <p className="solution-msg warn">{view.value.decomposition.reason}</p>
            )}
          </section>
          {view.value.power && (
            <section>
              <h3>
                <Tex tex={`P^{${k}} = V\\Lambda^{${k}}V^{-1}`} />
              </h3>
              <Tex tex={view.value.power.tex} display />
              <CheckList checks={[view.value.power.check]} />
            </section>
          )}
        </>
      )}
      <section>
        <h3>Eigenvectors stay on their line</h3>
        {!scene.ok && <ViewNotice error={scene.error} />}
        {scene.ok && !scene.value && <p className="caption">The ℝ³ picture needs 3 states.</p>}
        {scene.ok && scene.value && (
          <>
            <Canvas3D fit={[scene.value.probe, scene.value.image, ...scene.value.lines.map((l) => l.dir)]}>
              {scene.value.lines.map((l) => (
                <group key={l.label}>
                  <ParametricLine point={[0, 0, 0]} dir={l.dir} color={l.color} lineWidth={2} />
                  <Label position={l.dir} tex={l.label} color={l.color} />
                </group>
              ))}
              <Arrow to={scene.value.probe} color={PROBE_COLOR} />
              <Label position={scene.value.probe} tex="u" color={PROBE_COLOR} />
              <Arrow to={scene.value.image} color={IMAGE_COLOR} />
              <Label position={scene.value.image} tex="Pu" color={IMAGE_COLOR} />
              <DragHandle position={scene.value.probe} color={PROBE_COLOR} onDrag={(p) => snap.ok && attempt(() => snap.value(p))} />
            </Canvas3D>
            <p className="caption">
              {scene.value.onLine ? `u is on the ${scene.value.onLine.label} line, so Pu = λu.` : scene.value.caption}
            </p>
          </>
        )}
      </section>
      <section>
        <h3>Check with NumPy</h3>
        {!numpy.ok && <ViewNotice error={numpy.error} />}
        {numpy.ok && (
          <>
            <CodeBlock code={numpy.value.code} />
            <p className="caption">{numpy.value.note}</p>
            <details>
              <summary>Rescale NumPy&apos;s output to the notes&apos; form</summary>
              <ul>
                {numpy.value.columns.map((col, i) => (
                  <li key={i}>
                    ({col.map((x) => x.toFixed(4)).join(', ')}) →{' '}
                    {numpy.value.rescaled[i] ? `(${numpy.value.rescaled[i]!.map((x) => x.toString()).join(', ')})` : 'no integer form'}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </section>
    </ModuleLayout>
  );
}
