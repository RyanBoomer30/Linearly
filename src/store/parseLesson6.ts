import { buildGridMdp, type Action, type GridCell, type GridSpec, type Mdp, type Policy } from '../core/mdp';
import { Rational } from '../core/rational';

/** The parts of the Lesson 6 store that define the MDP and the painted policy. */
export interface Lesson6Inputs {
  rows: number;
  cols: number;
  walls: GridCell[];
  /** Editor text per cell, key "row,col". */
  rewardCells: Record<string, string>;
  terminals: GridCell[];
  start: GridCell;
  /** In hundredths. */
  slip: number;
  gamma: number;
  livingReward: string;
  /** One action per cell; wall cells are ignored. */
  policyCells: Action[][];
}

export interface Lesson6System {
  spec: GridSpec;
  mdp: Mdp;
  gamma: Rational;
  /** policyCells read in state order. */
  policy: Policy;
  /** Reward cells (keys) and the living reward that don't parse; they are read as 0. */
  invalid: { rewards: string[]; livingReward: boolean };
}

/** Build the grid spec, the MDP and the state-ordered policy from the editors (F-E2: bad cells flagged, read as 0). */
export function parseLesson6(inputs: Lesson6Inputs): Lesson6System {
  const { rows, cols } = inputs;
  const inside = ([r, c]: GridCell) => r >= 0 && c >= 0 && r < rows && c < cols;
  const invalidRewards: string[] = [];
  const rewards = Object.entries(inputs.rewardCells).flatMap(([key, text]) => {
    const cell = key.split(',').map(Number) as GridCell;
    if (!inside(cell)) return [];
    const reward = Rational.parse(text.trim());
    if (!reward) {
      invalidRewards.push(key);
      return [{ cell, reward: Rational.ZERO }];
    }
    return [{ cell, reward }];
  });
  const living = Rational.parse(inputs.livingReward.trim());
  const spec: GridSpec = {
    rows,
    cols,
    walls: inputs.walls.filter(inside),
    rewards,
    terminals: inputs.terminals.filter(inside),
    start: inputs.start,
    slip: Rational.of(inputs.slip, 100),
    livingReward: living ?? Rational.ZERO,
  };
  const mdp = buildGridMdp(spec);
  const policy: Policy = mdp.states.map((st) => inputs.policyCells[st.row]?.[st.col] ?? 'up');
  return { spec, mdp, gamma: Rational.of(inputs.gamma, 100), policy, invalid: { rewards: invalidRewards, livingReward: living === null } };
}
