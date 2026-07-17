import React from 'react';

/**
 * BidiText — LTR isolate for numeric/latin runs inside Hebrew (RTL) text.
 *
 * Ported from mia-math's MathText (incl. the July `?`-operand fix). Reading
 * passages contain numerals, times ("14:30"), and quantities; without isolation
 * the bidi algorithm reorders them ("14:30" → "30:14"). All passage and
 * question text renders through this (math lesson B6).
 *
 * Detects runs of: operand [op operand]* plus standalone time/number tokens,
 * and wraps each in <bdi dir="ltr">.
 */

const OPERAND = String.raw`(?:\d+(?:[.,:]\d+)?|\?)`;
const RUN = new RegExp(
  `(${OPERAND}(?:\\s*[+\\-−×÷=<>/:]\\s*${OPERAND})*)`,
  'g',
);

interface Props {
  children: string;
  className?: string;
}

export function BidiText({ children, className }: Props) {
  const text = String(children);
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  RUN.lastIndex = 0;
  while ((match = RUN.exec(text)) !== null) {
    // Skip zero-length matches (the * quantifier can match empty at a boundary).
    if (match[0].length === 0) { RUN.lastIndex++; continue; }
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <bdi key={idx++} dir="ltr" style={{ unicodeBidi: 'isolate' }}>
        {match[0]}
      </bdi>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span className={className}>{parts}</span>;
}
