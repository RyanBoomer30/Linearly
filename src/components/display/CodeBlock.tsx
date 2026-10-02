import { useState } from 'react';

/** F-D6: monospaced code with a copy button. */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <figure className="code-block">
      {label && <figcaption>{label}</figcaption>}
      <button type="button" className="code-copy" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
