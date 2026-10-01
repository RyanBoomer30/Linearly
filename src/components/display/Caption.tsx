import type { ReactNode } from 'react';

/** Short caption tying a view back to its section of the notes (§5). */
export function Caption({ section, children }: { section: string; children: ReactNode }) {
  return (
    <p className="caption">
      <span className="caption-section">{section}</span> {children}
    </p>
  );
}
