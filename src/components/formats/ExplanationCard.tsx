import { t } from '../../i18n/t';
import type { Gender } from '../../types';
import { BidiText } from '../primitives/BidiText';

interface Props {
  text:   string | null | undefined;
  gender: Gender;
}

/**
 * "Why is that the answer?" — shown after any miss.
 *
 * The single most important element added in Phase 4. Flashing a green answer
 * teaches nothing about comprehension: the reasoning IS the content (build plan
 * H1). Renders nothing when a question has no explanation, so older or
 * generated content degrades quietly instead of showing an empty box.
 */
export function ExplanationCard({ text, gender }: Props) {
  if (!text) return null;
  return (
    <div className="bg-brand-sky/15 border-2 border-brand-sky rounded-3xl p-4 w-full text-center reveal-in">
      <div className="text-sm font-bold text-brand-navy mb-1">
        💡 {t('explain.title', { gender })}
      </div>
      <div className="text-lg text-brand-navy leading-relaxed">
        <BidiText>{text}</BidiText>
      </div>
    </div>
  );
}
