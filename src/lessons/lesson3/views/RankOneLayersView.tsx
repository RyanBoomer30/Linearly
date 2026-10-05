import { useState, type ReactNode } from 'react';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson3Store, type LayerSource } from '../../../store/useLesson3Store';
import { layersView } from '../models';
import { useLesson3 } from '../useLesson3';
import { ExplodedLayers } from './ExplodedLayers';
import { Controls, FactorEditors, ProductControls } from './Controls';
import { floatEntries } from './format';

const SOURCES: [LayerSource, string][] = [
  ['product', 'B × C'],
  ['cr', 'CR of A (Lesson 1)'],
  ['lu', 'LU of A (§3.2)'],
  ['factors', 'L and U'],
];

/** What the sum of the layers is, for each source. */
const TOTAL_LABEL: Record<LayerSource, string> = { product: 'sum = BC', cr: 'sum = CR = A', lu: 'sum = LU = A', factors: 'sum = LU' };

/** The inputs a source actually uses, so the sidebar never shows editors that don't affect the layers. */
function SourceInputs({ source, children }: { source: LayerSource; children: ReactNode }) {
  if (source === 'product') return <ProductControls>{children}</ProductControls>;
  if (source === 'factors') {
    return (
      <Controls showA={false} showRhs={false} showPivoting={false} factors={<FactorEditors />}>
        {children}
      </Controls>
    );
  }
  return (
    <Controls showRhs={false} showPivoting={false}>
      {children}
    </Controls>
  );
}

/** §7.2 */
export function RankOneLayersView() {
  const source = useLesson3Store((s) => s.layerSource);
  const setSource = useLesson3Store((s) => s.setLayerSource);
  const pivoting = useLesson3Store((s) => s.pivoting);
  const [keep, setKeep] = useState(1);
  const [sorted, setSorted] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [collapse, setCollapse] = useState(0);
  const view = useLesson3((s) => layersView(source, s, keep, sorted), [source, keep, sorted, pivoting]);
  const picker = (
    <div className="segmented" role="group" aria-label="Factorization">
      {SOURCES.map(([value, label]) => (
        <button key={value} type="button" className={source === value ? 'active' : undefined} onClick={() => setSource(value)}>
          {label}
        </button>
      ))}
      <button type="button" disabled title="Joins in Lesson 5">
        Eigendecomposition (Lesson 5)
      </button>
    </div>
  );
  const labels = (M: { toString(): string }[][]) => M.map((r) => r.map((x) => x.toString()));

  return (
    <ModuleLayout
      controls={
        <>
          {picker}
          <SourceInputs source={source}>
            <Caption section="§3.1">
              A product is a sum of rank-1 layers. The course theme: factor a matrix into rank-1 pieces and look for the large
              ones.
            </Caption>
            {source === 'factors' && (
              <p className="caption">Layer k is column k of L times row k of U; the layers add up to LU.</p>
            )}
            <label>
              <input type="checkbox" checked={sorted} onChange={(e) => setSorted(e.target.checked)} /> Sort layers by size
            </label>
            {view.ok && (
              <label className="sliders">
                <span>
                  Keep {keep} of {view.value.layers.length} layers
                </span>
                <input type="range" min={0} max={view.value.layers.length} step={1} value={keep} onChange={(e) => setKeep(Number(e.target.value))} />
              </label>
            )}
            <label>
              <input type="checkbox" checked={exploded} onChange={(e) => setExploded(e.target.checked)} /> Exploded 3D view
            </label>
          </SourceInputs>
        </>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>Layers</h3>
            <div className="heatmap-row">
              {view.value.layers.map((layer, k) => (
                <div key={layer.index} className={k < keep ? 'layer kept' : 'layer'}>
                  <MatrixHeatmap
                    entries={floatEntries(layer.matrix)}
                    maxAbs={view.value.maxAbs}
                    labels={labels(layer.matrix)}
                    caption={`rank ${layer.rank}, ‖·‖ ≈ ${layer.size.toFixed(2)}`}
                  />
                  <Tex tex={layer.tex} />
                </div>
              ))}
              <span className="heatmap-op">=</span>
              <MatrixHeatmap entries={floatEntries(view.value.total)} maxAbs={view.value.maxAbs} labels={labels(view.value.total)} caption={TOTAL_LABEL[source]} />
            </div>
          </section>
          <section>
            <h3>Keep {keep}, drop the rest</h3>
            <div className="heatmap-row">
              <MatrixHeatmap entries={floatEntries(view.value.partial)} maxAbs={view.value.maxAbs} labels={labels(view.value.partial)} caption="partial sum" />
              <span className="heatmap-op">+</span>
              <MatrixHeatmap
                entries={floatEntries(view.value.leftover)}
                maxAbs={view.value.maxAbs}
                labels={labels(view.value.leftover)}
                caption={`left over, ‖·‖ ≈ ${view.value.leftoverSize.toFixed(2)}`}
              />
            </div>
          </section>
          {exploded && (
            <section>
              <label className="sliders">
                <span>Collapse the stack</span>
                <input type="range" min={0} max={1} step={0.01} value={collapse} onChange={(e) => setCollapse(Number(e.target.value))} />
              </label>
              <Canvas3D bare cameraPosition={[8, -10, 8]}>
                <ExplodedLayers layers={view.value.layers.map((l) => floatEntries(l.matrix))} maxAbs={view.value.maxAbs} collapse={collapse} />
              </Canvas3D>
            </section>
          )}
          <Caption section="Why it matters">{view.value.caption}</Caption>
        </>
      )}
    </ModuleLayout>
  );
}
