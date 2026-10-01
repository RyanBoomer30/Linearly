import type { ReactNode } from 'react';

/** F-D3: controls and matrix on one side, canvas(es) on the other; stacks on narrow screens. */
export function ModuleLayout({ controls, children }: { controls: ReactNode; children: ReactNode }) {
  return (
    <div className="module-layout">
      <aside className="module-controls">{controls}</aside>
      <section className="module-canvas">{children}</section>
    </div>
  );
}
