import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { attempt } from '../../../store/useSystem';
import { reflectorView } from '../models';
import { useLesson4 } from '../useLesson4';
import { ReflectorScene } from './ReflectorScene';
import { VectorEditors } from './VectorEditors';

/** §8.1 */
export function ReflectorView() {
  const { dragW, dragY, rescaleW } = useLesson4Store();
  const view = useLesson4((s) => reflectorView(s.x, s.w, s.y));

  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="§4.1">
            A Householder reflector H sends x to any w of the same length by reflecting across the mirror U, the hyperplane
            perpendicular to v = x − w. Then v = 2Px, so Hx = x − 2Px = (I − 2P)x.
          </Caption>
          <VectorEditors />
          {view.ok && view.value.reflector && <PrecisionBadge precision={view.value.reflector.precision} />}
          {view.ok && (
            <div className="readout">
              {view.value.formula.map((f) => (
                <div key={f.label}>
                  <Tex tex={f.tex} display />
                </div>
              ))}
              {view.value.identities.map((t) => (
                <Tex key={t} tex={t} />
              ))}
            </div>
          )}
          {view.ok && view.value.notesCorrection && (
            <aside className="callout">
              <strong>Notes correction.</strong> {view.value.notesCorrection}
            </aside>
          )}
        </>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && view.value.lengthMismatch && (
        <div className="view-notice" role="status">
          {view.value.lengthMismatch}
          <button type="button" className="link-button" onClick={() => attempt(rescaleW)}>
            Rescale w to ‖x‖
          </button>
        </div>
      )}
      {view.ok && view.value.scene && (
        <ReflectorScene scene={view.value.scene} onDragW={(p) => attempt(() => dragW(p))} onDragY={(p) => attempt(() => dragY(p))} />
      )}
    </ModuleLayout>
  );
}
