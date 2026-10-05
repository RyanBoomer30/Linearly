import { lazy, Suspense } from 'react';
import { LessonNav } from './components/layout/LessonNav';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { useStore } from './store/useStore';
import { useResolvedTheme } from './theme/useTheme';

// NF-2: lesson modules are lazy-loaded.
const Lesson1 = lazy(() => import('./lessons/lesson1/Lesson1'));
const Lesson2 = lazy(() => import('./lessons/lesson2/Lesson2'));
const Lesson3 = lazy(() => import('./lessons/lesson3/Lesson3'));
const Lesson4 = lazy(() => import('./lessons/lesson4/Lesson4'));
const Lesson5 = lazy(() => import('./lessons/lesson5/Lesson5'));
const Lesson6 = lazy(() => import('./lessons/lesson6/Lesson6'));
const Lesson7 = lazy(() => import('./lessons/lesson7/Lesson7'));

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
          {lesson === 4 && <Lesson4 />}
          {lesson === 5 && <Lesson5 />}
          {lesson === 6 && <Lesson6 />}
          {lesson === 7 && <Lesson7 />}
        </Suspense>
      </main>
    </div>
  );
}
