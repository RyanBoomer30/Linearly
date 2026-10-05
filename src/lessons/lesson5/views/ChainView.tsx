import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { StateGraph } from '../../../components/diagram/StateGraph';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { attempt } from '../../../store/useSystem';
import { stateColor } from '../../../theme/colors';
import { chainView, CONVENTION_CAPTION } from '../models';
import { useLesson5 } from '../useLesson5';
import { Controls } from './Controls';

/** L5-MC1: pick an arrow (from the graph or the selects) and edit its probability; it is the same cell of P. */
function ArrowEditor({ from, to, setFrom, setTo }: { from: number; to: number; setFrom: (i: number) => void; setTo: (j: number) => void }) {
  const { pCells, stateNames, setEdge } = useLesson5Store();
  const value = pCells[to]?.[from] ?? '';
  const options = stateNames.map((name, i) => (
    <option key={i} value={i}>
      {name}
    </option>
  ));
  return (
    <fieldset className="arrow-editor">
      <legend>Arrow</legend>
      <label>
        From <select value={from} onChange={(e) => setFrom(Number(e.target.value))}>{options}</select>
      </label>
      <label>
        To <select value={to} onChange={(e) => setTo(Number(e.target.value))}>{options}</select>
      </label>
      <label>
        Probability <input value={value} onChange={(e) => setEdge(from, to, e.target.value)} size={6} />
      </label>
      <p className="caption">
        This is p<sub>{to + 1}{from + 1}</sub>: row {to + 1}, column {from + 1} of P. Set it to 0 to remove the arrow.
      </p>
    </fieldset>
  );
}

/** §9.1 */
export function ChainView() {
  const { stateNames, positions, selectedState, numberDisplay, setPositions, selectState, removeState } = useLesson5Store();
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const view = useLesson5((s) => chainView(s.P, stateNames, positions, selectedState, numberDisplay), [stateNames, positions, selectedState, numberDisplay]);

  return (
    <ModuleLayout
      controls={
        <Controls showX0={false}>
          <Caption section="§5.1">
            A Markov chain with states 1, …, n is described by its transition matrix P: p_ji is the probability of going from
            state i to state j, so column i holds state i&apos;s outgoing probabilities.
          </Caption>
          <ArrowEditor from={from} to={to} setFrom={setFrom} setTo={setTo} />
          {selectedState !== null && stateNames.length > 2 && (
            <button type="button" onClick={() => attempt(() => removeState(selectedState))}>
              Remove {stateNames[selectedState]}
            </button>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="chain-layout">
            <StateGraph
              nodes={view.value.nodes}
              edges={view.value.edges}
              selected={selectedState}
              onSelectNode={selectState}
              onMoveNodes={setPositions}
              onSelectEdge={(i, j) => {
                setFrom(i);
                setTo(j);
              }}
            />
            <div className="chain-matrix">
              <div className="matrix-labels" aria-hidden="true">
                {view.value.columnLabels.map((l, j) => (
                  <span key={l} style={{ color: stateColor(j) }}>
                    {l}
                  </span>
                ))}
              </div>
              <div className="matrix-with-rows">
                <div className="row-labels">
                  {view.value.rowLabels.map((l, i) => (
                    <span key={l} style={{ color: stateColor(i) }}>
                      {l}
                    </span>
                  ))}
                </div>
                <MatrixTex entries={view.value.entries} highlights={view.value.highlights} />
              </div>
            </div>
          </div>
          {selectedState !== null && (
            <p>
              Column {selectedState + 1} is {stateNames[selectedState]}&apos;s outgoing probabilities; they sum to{' '}
              {view.value.check.columns[selectedState]?.sum.toString()}.
            </p>
          )}
          <p className="caption">{CONVENTION_CAPTION}</p>
        </>
      )}
    </ModuleLayout>
  );
}
