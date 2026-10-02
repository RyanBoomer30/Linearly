import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every .tsx file under src. */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('TeX in JSX attributes', () => {
  // In tex="…" a backslash is literal (no JS escapes), so \\hat reaches KaTeX as a line break
  // followed by "hat". KaTeX accepts it, so nothing errors; it just renders wrong.
  it('uses single backslashes for commands in tex="…" attributes', () => {
    const offenders = tsxFiles(join(__dirname, '..')).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/tex="([^"]*)"/g)]
        .filter((m) => /\\\\[A-Za-z|]/.test(m[1]))
        .map((m) => `${file}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });
});
