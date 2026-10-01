import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { SCENE_COLORS, type SceneColors } from './colors';

/** Resolve 'system' to the OS preference and keep <html data-theme> in sync (F-D4). */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  return resolved;
}

export function useSceneColors(): SceneColors {
  return SCENE_COLORS[useResolvedTheme()];
}
