import type { Passage, NikudState } from '../../types';
import { textForNikud } from '../../lib/nikud';
import { BidiText } from './BidiText';

interface Props {
  passage: Passage;
  nikud:   NikudState;
  className?: string;
}

/**
 * Renders a passage at the requested nikud state. The text is resolved via
 * lib/nikud (full authored, partial/none derived) and routed through BidiText
 * so any numerals inside stay LTR. Large, generously line-spaced type for an
 * 8-year-old reader; whitespace preserved so multi-sentence passages breathe.
 */
export function PassageText({ passage, nikud, className = '' }: Props) {
  const text = textForNikud(passage, nikud);
  return (
    <div
      dir="rtl"
      className={`text-2xl md:text-3xl leading-loose text-brand-navy text-right whitespace-pre-line ${className}`}
    >
      <BidiText>{text}</BidiText>
    </div>
  );
}
