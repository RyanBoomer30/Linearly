import { lazy, Suspense, useState } from 'react';
import { LessonNav } from './components/layout/LessonNav';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { useResolvedTheme } from './theme/useTheme';

// NF-2: lesson modules are lazy-loaded.
const Lesson1 = lazy(() => import('./lessons/lesson1/Lesson1'));

export function App() {
  useResolvedTheme();
  const [lesson, setLesson] = useState(1);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Linearly</h1>
        <span className="subtitle">MATH4570 · Linear Algebra for Data Science</span>
        <ThemeToggle />
      </header>
      <LessonNav active={lesson} onSelect={setLesson} />
      <main>
        <Suspense fallback={<p className="loading">Loading lesson…</p>}>{lesson === 1 && <Lesson1 />}</Suspense>
      </main>
    </div>
  );
}
