import katex from 'katex';
import { useMemo } from 'react';

/** Inline (or display-mode) KaTeX. Malformed TeX renders as red source text instead of throwing. */
export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' }),
    [tex, display],
  );
  return <span className="tex" dangerouslySetInnerHTML={{ __html: html }} />;
}
