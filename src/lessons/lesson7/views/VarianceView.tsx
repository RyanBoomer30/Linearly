import { BarChart } from '../../../components/display/BarChart';
import { Caption } from '../../../components/display/Caption';
import { CodeBlock } from '../../../components/display/CodeBlock';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { NOTES_CORRECTION_SQRT, pythonExport, varianceView } from '../models';
import { useLesson7 } from '../useLesson7';
import { PcaControls } from './PcaControls';
import { CheckList } from './shared';

/** §11.6 */
export function VarianceView() {
  const { standardize, sign, keep, setKeep } = useLesson7Store();
  const view = useLesson7((s) => varianceView(s.X, { standardize, sign, keep }), [standardize, sign, keep]);
  const code = useLesson7((s) => pythonExport(s.X, standardize), [standardize]);

  return (
    <ModuleLayout
      controls={
        <PcaControls>
          <Caption section="§7.3">
            A PCA calculator finds the eigenvalues λᵢ of S. Each component&apos;s share λᵢ/Σλ of the variance measures its
            contribution to the signal; components with small shares are mostly noise.
          </Caption>
          {view.ok && (
            <label className="sliders">
              <span>
                Keep {keep} of {view.value.bars.length} components
              </span>
              <input type="range" min={1} max={view.value.bars.length} step={1} value={keep} onChange={(e) => setKeep(Number(e.target.value))} />
            </label>
          )}
        </PcaControls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>Variance explained</h3>
            <BarChart bars={view.value.bars} overlay={view.value.running} overlayLabel="black lines: running total" />
            <p>{view.value.keptText}</p>
            <CheckList checks={[view.value.check]} />
          </section>
          <section>
            <h3>{view.value.matrixName}</h3>
            <Tex tex={view.value.matrixTex} display />
            <p className="caption">{NOTES_CORRECTION_SQRT}</p>
          </section>
        </>
      )}
      <section>
        <h3>In Python</h3>
        {code.ok ? <CodeBlock code={code.value} /> : <ViewNotice error={code.error} />}
      </section>
    </ModuleLayout>
  );
}
