import { Caption } from '../../../components/display/Caption';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { Ellipse } from '../../../components/canvas/charts';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { matrixToTex } from '../../../components/display/MatrixTex';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { covarianceSteps, covarianceView, scatterView } from '../models';
import { useLesson7 } from '../useLesson7';
import { PcaControls } from './PcaControls';
import { CheckList, Scatter2D } from './shared';

const POSITIVE = '#009E73';
const NEGATIVE = '#D55E00';

/** §11.5 */
export function CovarianceView() {
  const { numberDisplay } = useLesson7Store();
  const steps = useLesson7((s) => covarianceSteps(s.X, numberDisplay), [numberDisplay]);
  const view = useLesson7((s) => covarianceView(s.X, numberDisplay), [numberDisplay]);
  const scatter = useLesson7(() => (view.ok ? scatterView(view.value.products.map((p) => p.point), ['x₁ − x̄₁', 'x₂ − x̄₂']) : null), [view]);
  const stepper = useStepper(steps.ok ? steps.value.length : 0);
  const step = steps.ok ? steps.value[stepper.index] : undefined;

  return (
    <ModuleLayout
      controls={
        <PcaControls showStandardize={false}>
          <Caption section="§7.2">
            XᵀX/(n − 1) is the sample covariance matrix: variances on the diagonal, the covariance off it. A positive covariance
            means x₂ tends to rise when x₁ does.
          </Caption>
        </PcaControls>
      }
    >
      <section>
        <h3>Mean, variance and covariance</h3>
        {!steps.ok && <ViewNotice error={steps.error} />}
        {steps.ok && <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />}
      </section>
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>The sign of each product (x₁ − x̄₁)(x₂ − x̄₂)</h3>
            {scatter.ok && scatter.value && (
              <Scatter2D
                frame={scatter.value.frame}
                points={scatter.value.points}
                colors={view.value.products.map((p) => (p.product >= 0 ? POSITIVE : NEGATIVE))}
              >
                <Ellipse center={view.value.ellipse.center} axes={view.value.ellipse.axes} color="#0072B2" />
              </Scatter2D>
            )}
            <ul className="legend">
              <li style={{ color: POSITIVE }}>product ≥ 0 (quadrants I and III)</li>
              <li style={{ color: NEGATIVE }}>product &lt; 0 (quadrants II and IV)</li>
              <li style={{ color: '#0072B2' }}>covariance ellipse, axes along v₁ and v₂</li>
            </ul>
            <ul className="product-list">
              {view.value.products.map((p, i) => (
                <li key={i}>{p.label}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>
              <Tex tex="S = \frac{X^TX}{n-1}" />
            </h3>
            <Tex tex={view.value.sumsTex} display />
            <div className="matrix-pair">
              <Tex tex={`X^TX = ${matrixToTex(view.value.XtX.map((r) => r.map((x) => x.toTex())), false, {})}`} display />
              <Tex tex={`S = ${matrixToTex(view.value.S.map((r) => r.map((x) => x.toTex())), false, {})}`} display />
            </div>
          </section>
          <section>
            <h3>Eigenvectors of S = singular vectors of X/√(n − 1)</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>λᵢ (eigenvalue of S)</th>
                  <th>vᵢ</th>
                  <th>σᵢ/√(n − 1)</th>
                </tr>
              </thead>
              <tbody>
                {view.value.eigen.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <Tex tex={e.lambdaTex} />
                    </td>
                    <td>
                      ({e.vector[0].toFixed(4)}, {e.vector[1].toFixed(4)})
                    </td>
                    <td>{view.value.sigmaOverRoot[i].toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CheckList checks={[view.value.check]} />
            <p className="caption">S is symmetric, so its eigenvectors are perpendicular.</p>
          </section>
        </>
      )}
    </ModuleLayout>
  );
}
