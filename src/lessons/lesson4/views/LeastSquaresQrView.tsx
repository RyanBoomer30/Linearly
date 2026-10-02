import { useState } from 'react';
import { anyVectorEntries } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { useStore } from '../../../store/useStore';
import { attempt } from '../../../store/useSystem';
import { housesByQr, leastSquaresQrView } from '../models';
import { useLesson4 } from '../useLesson4';
import { Controls } from './Controls';

const tuple = (entries: string[]) => `(${entries.join(', ')})`;

/** §8.5 */
export function LeastSquaresQrView() {
  const { sign, openInLesson1 } = useLesson4Store();
  const view = useLesson4((s) => ({ ...leastSquaresQrView(s.A, s.b, sign), A: s.A, b: s.b }), [sign]);
  const houses = attempt(() => housesByQr(sign));
  const derivation = useStepper(view.ok ? view.value.derivation.length : 0);
  const back = view.ok ? view.value.back : null;
  const backStepper = useStepper(back?.steps.length ?? 0, back);
  const backStep = back?.steps[backStepper.index];
  const [showHouses, setShowHouses] = useState(false);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§4.4">With A = QR, the normal equation becomes Rx* = Qᵀb: no AᵀA, and only a triangular solve.</Caption>
          {view.ok && (
            <ol className="derivation">
              {view.value.derivation.slice(0, derivation.index + 1).map((d, k) => (
                <li key={k} className={k === derivation.index ? 'current' : undefined}>
                  <Tex tex={d.tex} display />
                  <span className="caption">{d.reason}</span>
                </li>
              ))}
            </ol>
          )}
          <StepperControls stepper={derivation} />
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
            <h3>Qᵀb splits b into the fit and the residual</h3>
            <Tex
              tex={`Q^Tb = ${tuple(anyVectorEntries(view.value.Qtb))} = (\\underbrace{${anyVectorEntries(view.value.split.fit).join(', ')}}_{p \\text{ in } C(A)} \\mid \\underbrace{${anyVectorEntries(view.value.split.residual).join(', ')}}_{e \\text{ in } N(A^T)})`}
              display
            />
            <Tex tex={`\\|e\\|^2 = ${view.value.split.residualNormSquaredTex}`} display />
            <button
              type="button"
              className="link-button"
              onClick={() =>
                attempt(() => {
                  openInLesson1(view.value.A, view.value.b, 'projection');
                })
              }
            >
              See p and e in the projection view (Lesson 1)
            </button>
          </section>
          <section>
            <h3>Solve Rx* = Qᵀb by back substitution</h3>
            {back ? (
              <>
                <StepperControls stepper={backStepper} description={backStep?.description} tex={backStep?.tex} />
              </>
            ) : (
              <p className="caption">In floating point the solve is done directly; switch to an exact example to step through it.</p>
            )}
            <Tex tex={`x^* = ${tuple(anyVectorEntries(view.value.xStar))}`} display />
          </section>
          <section>
            <h3>Same answer as the normal equation</h3>
            <div className="matrix-pair">
              <Tex tex="A^TA =" />
              <MatrixTex entries={view.value.normalEquation.AtA.map((r) => r.map((x) => x.toTex()))} />
              <Tex tex={`A^Tb = ${tuple(view.value.normalEquation.Atb.map((x) => x.toTex()))}`} />
            </div>
            <p className={view.value.normalEquation.same ? 'hit' : 'solution-msg warn'}>
              {view.value.normalEquation.same ? '✓ Both give the same x*.' : '✗ The two answers differ.'}
            </p>
            <p className="caption">{view.value.signNote}</p>
            <button
              type="button"
              className="link-button"
              onClick={() =>
                attempt(() => {
                  openInLesson1(view.value.A, view.value.b, 'bigPicture');
                  useStore.getState().setBigPictureMode('pinv');
                })
              }
            >
              A⁺b in the big picture (Lesson 1)
            </button>
          </section>
          <section>
            <label>
              <input type="checkbox" checked={showHouses} onChange={(e) => setShowHouses(e.target.checked)} /> Lesson 2 houses: QR
              in floating point vs the exact θ*
            </label>
            {showHouses &&
              (houses.ok ? (
                <p>
                  <PrecisionBadge precision={houses.value.precision} /> QR gives θ* ≈ ({houses.value.qr.map((t) => t.toPrecision(15)).join(', ')}); exact{' '}
                  <Tex tex={tuple(houses.value.exact.map((x) => x.toTex()))} />, agreeing to {houses.value.digits} digits.
                </p>
              ) : (
                <ViewNotice error={houses.error} />
              ))}
          </section>
        </>
      )}
    </ModuleLayout>
  );
}
