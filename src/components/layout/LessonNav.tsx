export interface LessonInfo {
  id: number;
  title: string;
  available: boolean;
}

export const LESSONS: LessonInfo[] = [
  { id: 1, title: 'Matrices: Rows and Columns', available: true },
  { id: 2, title: 'Data, Regression, and ML', available: true },
  { id: 3, title: 'Rank-1 and LU', available: true },
  { id: 4, title: 'Householder QR', available: true },
  { id: 5, title: 'Markov Chains', available: false },
  { id: 6, title: 'MDPs', available: false },
];

/** F-D2: Lessons 1–4 are active in Phase 4; later lessons are "coming soon." */
export function LessonNav({ active, onSelect }: { active: number; onSelect: (id: number) => void }) {
  return (
    <nav className="lesson-nav" aria-label="Lessons">
      {LESSONS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={l.id === active ? 'lesson-tab active' : 'lesson-tab'}
          disabled={!l.available}
          aria-current={l.id === active ? 'page' : undefined}
          onClick={() => onSelect(l.id)}
        >
          <span className="lesson-number">Lesson {l.id}</span>
          <span className="lesson-title">{l.title}</span>
          {!l.available && <span className="coming-soon">Coming soon</span>}
        </button>
      ))}
    </nav>
  );
}
