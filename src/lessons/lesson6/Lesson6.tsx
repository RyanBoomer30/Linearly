import type { ComponentType } from 'react';
import { useLesson6Store, type Lesson6ViewId } from '../../store/useLesson6Store';
import { BellmanView } from './views/BellmanView';
import { GridworldView } from './views/GridworldView';
import { LearningView } from './views/LearningView';
import { OptimalView } from './views/OptimalView';
import { PolicyIterationView } from './views/PolicyIterationView';
import { StatisticsView } from './views/StatisticsView';
import { ValueIterationView } from './views/ValueIterationView';
import { WhereView } from './views/WhereView';

const VIEWS: { id: Lesson6ViewId; label: string; component: ComponentType }[] = [
  { id: 'gridworld', label: 'Gridworld & MDP', component: GridworldView },
  { id: 'learning', label: 'Learning the model', component: LearningView },
  { id: 'bellman', label: 'Value of a policy (Bellman equation)', component: BellmanView },
  { id: 'where', label: 'Where the robot ends up', component: WhereView },
  { id: 'optimal', label: 'Optimal value & best actions', component: OptimalView },
  { id: 'policyIteration', label: 'Policy iteration', component: PolicyIterationView },
  { id: 'valueIteration', label: 'Value iteration, Q-values & Q-learning', component: ValueIterationView },
  { id: 'statistics', label: 'Sample mean, variance & covariance', component: StatisticsView },
];

/** Lesson 6: Markov decision processes and reinforcement learning. One MDP and one painted policy are shared (§11). */
export default function Lesson6() {
  const view = useLesson6Store((s) => s.view);
  const setView = useLesson6Store((s) => s.setView);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      <p className="lesson-intro">
        A Markov decision process adds choices to a Markov chain: in each state the robot picks an action, and the action
        sets the transition probabilities. For a fixed policy the values solve a linear system, one Bellman equation per
        state; policy iteration alternates solving it with choosing the best action everywhere.
      </p>
      <div className="view-tabs" role="tablist" aria-label="Lesson 6 views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === view}
            className={v.id === view ? 'view-tab active' : 'view-tab'}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <Active key={view} />
    </div>
  );
}
