import type { ReactNode } from 'react';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ACTION_ARROWS, ACTIONS, type TerminalMode } from '../../../core/mdp';
import { GAMMA_RANGE, LESSON6_PRESETS, lesson6PresetById, MAX_GRID, SLIP_RANGE } from '../../../presets/lesson6';
import { cellKey, useLesson6Store, type GridEditMode } from '../../../store/useLesson6Store';
import { useLesson6System } from '../../../store/useLesson6System';
import { attempt } from '../../../store/useSystem';
import { TERMINAL_MODE_NOTE } from '../models';

const pct = (h: number) => (h / 100).toFixed(2);

/** F-D7: fractions (default) or decimals. */
export function NumberDisplayPicker() {
  const mode = useLesson6Store((s) => s.numberDisplay);
  const setMode = useLesson6Store((s) => s.setNumberDisplay);
  return (
    <div className="segmented" role="group" aria-label="Number display">
      <button type="button" className={mode === 'fraction' ? 'active' : undefined} onClick={() => setMode('fraction')}>
        Fractions
      </button>
      <button type="button" className={mode === 'decimal' ? 'active' : undefined} onClick={() => setMode('decimal')}>
        Decimals
      </button>
    </div>
  );
}

/** L6-B1, L6-PI3: fill the policy with one action, or draw it at random from the seed. */
export function PolicyPainter() {
  const { fillPolicy, randomizePolicy, seed, newSeed } = useLesson6Store();
  return (
    <fieldset className="policy-painter">
      <legend>Policy</legend>
      <div className="editor-buttons" role="group" aria-label="Fill the policy">
        {ACTIONS.map((a) => (
          <button key={a} type="button" onClick={() => fillPolicy(a)} aria-label={`Every state ${a}`}>
            All {ACTION_ARROWS[a]}
          </button>
        ))}
        <button type="button" onClick={() => attempt(randomizePolicy)}>
          Random
        </button>
      </div>
      <p className="caption">
        Seed {seed}{' '}
        <button type="button" className="link-button" onClick={() => attempt(newSeed)}>
          New seed
        </button>
      </p>
    </fieldset>
  );
}

const EDIT_MODES: [GridEditMode, string][] = [
  ['inspect', 'Inspect'],
  ['policy', 'Paint arrows'],
  ['walls', 'Walls'],
  ['rewards', 'Rewards'],
  ['terminals', 'Terminals'],
  ['start', 'Start'],
];

/** L6-G1: grid size and what a click edits; the reward of the selected cell in "Rewards" mode. */
export function GridEditor() {
  const { rows, cols, editMode, selectedCell, rewardCells, resizeGrid, setEditMode, setRewardCell } = useLesson6Store();
  const system = useLesson6System();
  const invalid = system.ok ? system.value.invalid.rewards : [];
  const run = (fn: () => void) => attempt(fn);
  return (
    <fieldset className="grid-editor">
      <legend>
        Grid {rows} × {cols}
      </legend>
      <div className="editor-buttons">
        <button type="button" disabled={rows >= MAX_GRID} onClick={() => run(() => resizeGrid(rows + 1, cols))}>
          + row
        </button>
        <button type="button" disabled={rows <= 1} onClick={() => run(() => resizeGrid(rows - 1, cols))}>
          − row
        </button>
        <button type="button" disabled={cols >= MAX_GRID} onClick={() => run(() => resizeGrid(rows, cols + 1))}>
          + col
        </button>
        <button type="button" disabled={cols <= 1} onClick={() => run(() => resizeGrid(rows, cols - 1))}>
          − col
        </button>
      </div>
      <div className="segmented" role="group" aria-label="Click edits">
        {EDIT_MODES.map(([mode, label]) => (
          <button key={mode} type="button" className={editMode === mode ? 'active' : undefined} onClick={() => setEditMode(mode)}>
            {label}
          </button>
        ))}
      </div>
      {editMode === 'rewards' &&
        (selectedCell ? (
          <label className={invalid.includes(cellKey(selectedCell)) ? 'invalid' : undefined}>
            R at row {selectedCell[0] + 1}, column {selectedCell[1] + 1}{' '}
            <input value={rewardCells[cellKey(selectedCell)] ?? '0'} onChange={(e) => setRewardCell(selectedCell, e.target.value)} size={6} />
          </label>
        ) : (
          <p className="caption">Click a cell to set its reward.</p>
        ))}
    </fieldset>
  );
}

/**
 * Sidebar shared by the Lesson 6 views: preset, slip q (with perfect
 * locomotion), γ, the optional living reward, the terminal setting, and
 * whatever the view adds.
 */
export function Controls({ children, showPainter = true, showGrid = false }: { children?: ReactNode; showPainter?: boolean; showGrid?: boolean }) {
  const { presetId, slip, gamma, livingReward, terminalMode, notice, loadPreset, setSlip, setPerfect, setGamma, setLivingReward, setTerminalMode, dismissNotice } =
    useLesson6Store();
  const system = useLesson6System();
  const preset = presetId ? lesson6PresetById(presetId) : null;
  const badLiving = system.ok && system.value.invalid.livingReward;

  return (
    <>
      <label className="preset-picker">
        Preset{' '}
        <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
          <option value="" disabled>
            Custom
          </option>
          {LESSON6_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {preset?.explanation && <p className="caption counterexample">{preset.explanation}</p>}
      <label className="sliders">
        <span>
          Slip q = {pct(slip)} (intended move {pct(100 - 2 * slip)})
        </span>
        <input type="range" min={SLIP_RANGE[0]} max={SLIP_RANGE[1]} step={1} value={slip} onChange={(e) => setSlip(Number(e.target.value))} />
      </label>
      <label>
        <input type="checkbox" checked={slip === 0} onChange={(e) => setPerfect(e.target.checked)} /> Perfect locomotion
      </label>
      <label className="sliders">
        <span>γ = {pct(gamma)}</span>
        <input type="range" min={GAMMA_RANGE[0]} max={GAMMA_RANGE[1]} step={1} value={gamma} onChange={(e) => setGamma(Number(e.target.value))} />
      </label>
      <label className={badLiving ? 'invalid' : undefined}>
        Living reward <input value={livingReward} onChange={(e) => setLivingReward(e.target.value)} size={6} />{' '}
        <span className="caption">(beyond the notes)</span>
      </label>
      <div className="segmented" role="group" aria-label="Terminal states">
        {(['terminal', 'absorbing'] as TerminalMode[]).map((mode) => (
          <button key={mode} type="button" className={terminalMode === mode ? 'active' : undefined} onClick={() => setTerminalMode(mode)}>
            {mode === 'terminal' ? 'Terminal' : 'Absorbing'}
          </button>
        ))}
      </div>
      <p className="caption">{TERMINAL_MODE_NOTE[terminalMode]}</p>
      {showGrid && <GridEditor />}
      {showPainter && <PolicyPainter />}
      {notice && (
        <div className="view-notice" role="status">
          {notice}
          <button type="button" onClick={dismissNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <NumberDisplayPicker />
      {!system.ok && <ViewNotice error={system.error} />}
      {children}
    </>
  );
}
