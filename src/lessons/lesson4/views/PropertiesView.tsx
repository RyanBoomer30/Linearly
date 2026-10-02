import { Caption } from '../../../components/display/Caption';
import { MathText } from '../../../components/display/MathText';
import { anyVectorEntries } from '../../../components/display/AnyMatrixTex';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { lesson4PresetById } from '../../../presets/lesson4';
import { matrix } from '../../../core/matrix';
import { propertiesView, type Check } from '../models';
import { useLesson4 } from '../useLesson4';
import { VectorEditors } from './VectorEditors';

const QR_EXAMPLE = matrix(lesson4PresetById('qrExample')!.A);

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.name} className={c.holds ? 'hit' : 'solution-msg warn'}>
          {c.holds ? '✓' : '✗'} <Tex tex={c.tex} />
          {c.residual !== undefined && <span className="caption"> (difference {c.residual.toExponential(1)})</span>}
          {c.reason && (
            <div className="caption">
              <MathText>{c.reason}</MathText>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** §8.2 */
export function PropertiesView() {
  const view = useLesson4((s) => propertiesView(s.x, s.w, s.y, QR_EXAMPLE));
  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="§4.2">A reflector is symmetric, its own inverse, and orthogonal.</Caption>
          <VectorEditors />
        </>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>
              H is symmetric, self-inverse and orthogonal <PrecisionBadge precision={view.value.precision} />
            </h3>
            <CheckList checks={view.value.checks} />
          </section>
          <section>
            <h3>What reflecting does</h3>
            <ul className="checks">
              {view.value.demos.map((d) => (
                <li key={d.label} className={d.holds ? 'hit' : 'solution-msg warn'}>
                  {d.label}: <Tex tex={d.tex} />
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>A product of reflectors is orthogonal (MATH2331)</h3>
            <CheckList checks={[view.value.productCheck]} />
          </section>
          <aside className="callout">
            <strong>Beyond the notes.</strong> {view.value.eigenPreview.note} Vectors in U:{' '}
            {view.value.eigenPreview.mirrorVectors.map((v, i) => (
              <Tex key={i} tex={`(${anyVectorEntries(v, 4).join(', ')})`} />
            ))}
            ; flipped: <Tex tex={`(${anyVectorEntries(view.value.eigenPreview.flipped, 4).join(', ')})`} />. Eigenvalues come back in
            Lesson 5.
          </aside>
        </>
      )}
    </ModuleLayout>
  );
}
