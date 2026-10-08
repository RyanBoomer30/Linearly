export interface LessonInfo {
  id: number;
  title: string;
  available: boolean;
}

export interface SectionInfo {
  title: string;
  lessons: LessonInfo[];
}

/** Lessons are grouped into course sections; each section renders as its own box. */
export const SECTIONS: SectionInfo[] = [
  {
    title: 'Linear Algebra & Statistics',
    lessons: [
      { id: 1, title: 'Matrices: Rows and Columns', available: true },
      { id: 2, title: 'Data, Regression, and ML', available: true },
      { id: 3, title: 'Rank-1 and LU', available: true },
      { id: 4, title: 'Householder QR', available: true },
      { id: 5, title: 'Markov Chains', available: true },
      { id: 6, title: 'MDPs', available: true },
      { id: 7, title: 'SVD, Compression, PCA', available: true },
    ],
  },
  {
    title: 'Multivariable Calculus',
    lessons: [],
  },
];

export const LESSONS: LessonInfo[] = SECTIONS.flatMap((s) => s.lessons);

/** F-D2: Lessons 1–7 are active in Phase 7; later lessons are "coming soon." */
export function LessonNav({ active, onSelect }: { active: number; onSelect: (id: number) => void }) {
  return (
    <nav className="lesson-nav" aria-label="Lessons">
      {SECTIONS.map((section) => (
        <section key={section.title} className="lesson-section" aria-label={section.title}>
          <h2 className="lesson-section-title">{section.title}</h2>
          <div className="lesson-section-tabs">
            {section.lessons.length === 0 && <span className="coming-soon">Coming soon</span>}
            {section.lessons.map((l) => (
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
          </div>
        </section>
      ))}
    </nav>
  );
}
