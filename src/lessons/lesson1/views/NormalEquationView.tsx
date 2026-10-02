import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { MathText } from '../../../components/display/MathText';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import type { Rational } from '../../../core/rational';
import { useStore } from '../../../store/useStore';
import { PIVOT_COLOR } from '../../../theme/colors';
import { entryDotProduct, normalEquationView } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

type Entry = { which: 'AtA' | 'Atb'; i: number; j: number };

/** Normal equation: AᵀAx̂ = Aᵀb, and when AᵀA is invertible. */
export function NormalEquationView() {
  const setView = useStore((s) => s.setView);
  const view = useViewModel((A, b) => normalEquationView(A, b));
  const derivation = useStepper(view.ok ? view.value.derivation.length : 0);
  const steps = view.ok ? view.value.trace.trace.steps : [];
  const solver = useStepper(steps.length, view.ok ? view.value.AtA : null);
  const step = steps[solver.index];
  const [entry, setEntry] = useState<Entry | null>(null);
  const entryTex = useViewModel((A, b) => (entry ? entryDotProduct(A, b, entry.which, entry.i, entry.j) : null), [entry]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="Lesson 2, §2.2–2.3">
            <MathText>
              {'The best $\\hat x$ makes $e = b - A\\hat x$ perpendicular to $C(A)$. That one condition is the normal equation $A^TA\\hat x = A^Tb$.'}
            </MathText>
          </Caption>
          {view.ok && (
            <ol className="derivation">
              {view.value.derivation.slice(0, derivation.index + 1).map((d, k) => (
                <li key={k} className={k === derivation.index ? 'current' : undefined}>
                  <Tex tex={d.tex} display />
                  <span className="caption">
                    <MathText>{d.reason}</MathText>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <StepperControls stepper={derivation} />
          <p className="caption">
            See e ⟂ C(A) in the{' '}
            <button type="button" className="link-button" onClick={() => setView('projection')}>
              projection view
            </button>
            .
          </p>
          {/* TODO(L2-N1): link the current derivation step's highlight to the projection picture. */}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>AᵀA and Aᵀb</h3>
            <p className="caption">Click an entry to see the dot product that produced it.</p>
            <div className="matrix-pair">
              <ClickableMatrix
                name="A^TA"
                entries={view.value.AtA}
                selected={entry?.which === 'AtA' ? entry : null}
                onSelect={(i, j) => setEntry({ which: 'AtA', i, j })}
              />
              <ClickableMatrix
                name="A^Tb"
                entries={view.value.Atb.map((x) => [x])}
                selected={entry?.which === 'Atb' ? entry : null}
                onSelect={(i) => setEntry({ which: 'Atb', i, j: 0 })}
              />
            </div>
            {entryTex.ok && entryTex.value && <Tex tex={entryTex.value} display />}
            {!entryTex.ok && <ViewNotice error={entryTex.error} />}
          </section>

          <section>
            <h3>Solve [AᵀA | Aᵀb]</h3>
            <StepperControls stepper={solver} description={step?.description} tex={step?.tex} />
            {step && (
              <MatrixTex
                augmented
                entries={step.matrix.map((r) => r.map((x) => x.toTex()))}
                highlights={{
                  rowBackgrounds: step.matrix.map((_, i) => (step.changedRows.includes(i) ? '#dbeafe' : undefined)),
                  entryBackgrounds: Object.fromEntries(step.pivots.map((p) => [`${p.row},${p.col}`, PIVOT_COLOR])),
                }}
              />
            )}
            {view.value.xHat && (
              <Tex
                tex={`\\hat{x} = ${columnTex(view.value.xHat, (x) => x.toTex())} \\approx ${columnTex(view.value.xHat, (x) =>
                  String(+x.toNumber().toFixed(4)),
                )}`}
                display
              />
            )}
            {view.value.roundingNote && (
              <p className="caption">
                <MathText>{view.value.roundingNote}</MathText>
              </p>
            )}
          </section>

          <section>
            <h3>When is AᵀA invertible?</h3>
            <Tex tex={view.value.invertibility.theoremTex} display />
            <p>
              rank(A) = {view.value.invertibility.rank} of {view.value.invertibility.columns} columns.{' '}
              <MathText>{view.value.invertibility.explanation}</MathText>
            </p>
            {view.value.invertibility.dependencies.length > 0 && (
              <ul className="checks">
                {view.value.invertibility.dependencies.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            <p className="caption">
              Dependent columns are found with the{' '}
              <button type="button" className="link-button" onClick={() => setView('cr')}>
                CR factorization
              </button>
              .
            </p>
            {view.value.proof.map((part) => (
              <details key={part.title} className="proof">
                <summary>{part.title}</summary>
                <ol>
                  {part.steps.map((s, k) => (
                    <li key={k}>
                      <Tex tex={s.tex} /> <span className="caption">{s.reason}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </section>
        </>
      )}
    </ModuleLayout>
  );
}

const columnTex = (v: Rational[], fmt: (x: Rational) => string) => `\\begin{bmatrix}${v.map(fmt).join(' \\\\ ')}\\end{bmatrix}`;

/** L2-N2: a matrix whose entries are buttons. */
function ClickableMatrix({
  name,
  entries,
  selected,
  onSelect,
}: {
  name: string;
  entries: Rational[][];
  selected: { i: number; j: number } | null;
  onSelect: (i: number, j: number) => void;
}) {
  return (
    <div className="clickable-matrix">
      <Tex tex={`${name} =`} />
      <table>
        <tbody>
          {entries.map((row, i) => (
            <tr key={i}>
              {row.map((x, j) => (
                <td key={j}>
                  <button
                    type="button"
                    className={selected?.i === i && selected.j === j ? 'entry active' : 'entry'}
                    onClick={() => onSelect(i, j)}
                  >
                    <Tex tex={x.toTex()} />
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
