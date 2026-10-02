import { Fragment } from 'react';
import { Tex } from './Tex';

/**
 * Prose with inline math in $…$, typeset by KaTeX. Use it instead of Unicode
 * math (Hₖ, xₙ, v̂): symbols like ₖ and ₙ are missing from most system fonts,
 * so the browser falls back to another font and they render at the wrong size.
 */
export function MathText({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\$[^$]+\$)/g).map((part, i) =>
        part.length > 2 && part.startsWith('$') && part.endsWith('$') ? <Tex key={i} tex={part.slice(1, -1)} /> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
