import { lazy, Suspense } from 'react';
import { LessonNav } from './components/layout/LessonNav';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { useStore } from './store/useStore';
import { useResolvedTheme } from './theme/useTheme';

// NF-2: lesson modules are lazy-loaded.
const Lesson1 = lazy(() => import('./lessons/lesson1/Lesson1'));
const Lesson2 = lazy(() => import('./lessons/lesson2/Lesson2'));
const Lesson3 = lazy(() => import('./lessons/lesson3/Lesson3'));

export function App() {
  useResolvedTheme();
  const lesson = useStore((s) => s.lesson);
  const setLesson = useStore((s) => s.setLesson);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Linearly</h1>
        <span className="subtitle">MATH4570 · Linear Algebra for Data Science</span>
        <ThemeToggle />
      </header>
      <LessonNav active={lesson} onSelect={setLesson} />
      <main>
        <Suspense fallback={<p className="loading">Loading lesson…</p>}>
          {lesson === 1 && <Lesson1 />}
          {lesson === 2 && <Lesson2 />}
          {lesson === 3 && <Lesson3 />}
        </Suspense>
      </main>
    </div>
  );
}
