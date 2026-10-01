import { useStore, type ThemeSetting } from '../../store/useStore';

const OPTIONS: ThemeSetting[] = ['system', 'light', 'dark'];

/** F-D4 */
export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <label className="theme-toggle">
      Theme{' '}
      <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeSetting)}>
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o[0].toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
