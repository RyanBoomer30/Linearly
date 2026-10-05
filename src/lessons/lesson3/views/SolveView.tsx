import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import type { SubstitutionResult } from '../../../core/substitution';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { attempt } from '../../../store/useSystem';
import type { Matrix } from '../../../core/matrix';
import { solveView, solveWithFactorsView, type SolveView as SolveModel } from '../models';
import { useLesson3 } from '../useLesson3';
import { Controls, FactorEditors } from './Controls';
import { subscript, texColumn, texEntries } from './format';

/** §7.4 */
export function SolveView() {
  const pivoting = useLesson3Store((s) => s.pivoting);
  const rhsCount = useLesson3Store((s) => s.rhsCells.length);
  const openInLesson1 = useLesson3Store((s) => s.openInLesson1);
  const { solveInput, setSolveInput } = useLesson3Store();
  const [k, setK] = useState(0);
  const which = Math.min(k, rhsCount - 1);
  const view = useLesson3(
    (s) => ({
      ...(solveInput === 'LU' ? solveWithFactorsView(s.L, s.U, s.rhs[which]) : solveView(s.A, s.rhs[which], pivoting)),
      b: s.rhs[which],
    }),
    [pivoting, which, solveInput],
  );

  return (
    <ModuleLayout
      controls={
        <Controls
          showA={solveInput === 'A'}
          showPivoting={solveInput === 'A'}
          factors={<FactorEditors />}
          top={
            <div className="segmented" role="group" aria-label="Solve from">
              <button type="button" className={solveInput === 'A' ? 'active' : undefined} onClick={() => setSolveInput('A')}>
                Factor A
              </button>
              <button type="button" className={solveInput === 'LU' ? 'active' : undefined} onClick={() => setSolveInput('LU')}>
                Enter L and U
              </button>
            </div>
          }
        >
          <Caption section="§3.3">
            With A = LU, Ax = b becomes two triangular systems: Lc = b from the top down, then Ux = c from the bottom up.
          </Caption>
          {rhsCount > 1 && (
            <label className="preset-picker">
              Solve for{' '}
              <select value={which} onChange={(e) => setK(Number(e.target.value))}>
                {Array.from({ length: rhsCount }, (_, i) => (
                  <option key={i} value={i}>
                    b{subscript(i + 1)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          {solveInput === 'LU' && (
            <div className="matrix-pair">
              <Tex tex="A = LU =" />
              <MatrixTex entries={texEntries(view.value.A)} />
            </div>
          )}
          <Chain view={view.value} />
          <Substitution title="Forward substitution: Lc = b" matrix={view.value.L} result={view.value.forward} unknown="c" />
          {view.value.back && <Substitution title="Back substitution: Ux = c" matrix={view.value.U} result={view.value.back} unknown="x" />}
          {view.value.message && (
            <p className="solution-msg warn" role="status">
              {view.value.message}
            </p>
          )}
          {view.value.check && view.value.x && (
            <section>
              <p className={view.value.check.equal ? 'hit' : 'solution-msg warn'}>
                <Tex tex={view.value.check.tex} />
              </p>
              <button
                type="button"
                className="link-button"
                onClick={() => attempt(() => openInLesson1(view.value.A, view.value.b, 'column'))}
              >
                See this A, b and x in the Lesson 1 column picture
              </button>
            </section>
          )}
        </>
      )}
    </ModuleLayout>
  );
}

/** L3-S3: b → c → x, each arrow labeled by the triangular system it solves. */
function Chain({ view }: { view: SolveModel }) {
  return (
    <div className="solve-chain" aria-label="b to c to x">
      {view.chain.map((link, i) => (
        <span key={i} className="solve-chain-link">
          <Tex tex={link.from === 'Pb' ? 'Pb' : link.from} />
          <span className={`solve-chain-arrow ${link.shape}`}>
            <Tex tex={link.tex} /> →
          </span>
          {i === view.chain.length - 1 && <Tex tex={link.to} />}
        </span>
      ))}
    </div>
  );
}

/** L3-S1 / L3-S2: one unknown per step, with the row of the triangular matrix in use highlighted. */
function Substitution({ title, matrix, result, unknown }: { title: string; matrix: Matrix; result: SubstitutionResult; unknown: string }) {
  const stepper = useStepper(result.steps.length, result);
  const step = result.steps[stepper.index];
  const solved = new Set(result.steps.slice(0, stepper.index + 1).map((s) => s.index));
  return (
    <section>
      <h3>{title}</h3>
      <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />
      <div className="matrix-pair">
        <MatrixTex entries={texEntries(matrix)} highlights={{ rowBackgrounds: matrix.map((_, i) => (i === step?.row ? '#dbeafe' : undefined)) }} />
        {result.solution && (
          <MatrixTex
            entries={texColumn(result.solution).map((r, i) => (solved.has(i) ? r : [`${unknown}_${i + 1}`]))}
          />
        )}
      </div>
      {result.stopped && <p className="solution-msg warn">{result.stopped.reason}</p>}
    </section>
  );
}
