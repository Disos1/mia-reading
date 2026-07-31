import { useState } from 'react';
import { t } from '../../i18n/t';
import type { Gender, PracticeItem } from '../../types';
import { PassageText } from '../primitives/PassageText';
import { BidiText } from '../primitives/BidiText';
import { BigButton } from '../primitives/BigButton';
import { strategyFor } from '../../constants/strategySteps';

interface Props {
  item:       PracticeItem;
  gender:     Gender;
  onComplete: () => void;
}

/**
 * The "I do it" half of gradual release (build plan H1).
 *
 * Leads a blocked-practice run: the passage, the question, the *strategy* for
 * this kind of question, and then the answer with its reasoning — all shown,
 * nothing asked. She reads it and taps "הבנתי".
 *
 * Deliberately produces NO PracticeAttempt. That single decision keeps it out
 * of the tally, the mastery ledger, the combo and the star maths for free,
 * with no special-casing anywhere else in the app.
 *
 * The steps come from the skill (constants/strategySteps) rather than the
 * question, so the same three steps recur every time the skill does — which is
 * how a strategy becomes hers — while the question's own `explanation` supplies
 * the specific reasoning.
 */
export function WorkedExample({ item, gender, onComplete }: Props) {
  const g = { gender };
  const steps = strategyFor(item.skillCode);
  const answer = item.question.options[item.question.correctOption];
  // Reveal in two beats so the strategy is read before the answer appears.
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl fade-in">
      <div className="bg-brand-purple/20 rounded-2xl px-4 py-2 text-brand-navy font-bold">
        {t('worked.banner', g)}
      </div>

      <div className="bg-white card-shadow rounded-4xl p-5 md:p-6 w-full">
        <PassageText passage={item.passage} nikud={item.nikud} className="text-xl md:text-2xl" />
      </div>

      {item.question.questionText && (
        <div className="bg-white card-shadow rounded-3xl p-4 w-full text-center">
          <div className="text-xl font-bold text-brand-navy">
            <BidiText>{item.question.questionText}</BidiText>
          </div>
        </div>
      )}

      {/* The transferable strategy */}
      <div className="bg-brand-yellow/25 border-2 border-brand-yellow rounded-3xl p-4 w-full" dir="rtl">
        <div className="text-sm font-bold text-brand-navy mb-2 text-center">
          {t('worked.strategy_title', g)}
        </div>
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-lg text-brand-navy">
              <span className="w-7 h-7 shrink-0 rounded-full bg-brand-yellow text-brand-navy
                font-bold flex items-center justify-center text-sm">{i + 1}</span>
              <BidiText className="flex-1">{s}</BidiText>
            </li>
          ))}
        </ol>
      </div>

      {!revealed ? (
        <BigButton onClick={() => setRevealed(true)} color="#8FC0E8">
          {t('worked.answer_title', g)}
        </BigButton>
      ) : (
        <div className="w-full flex flex-col items-center gap-3 reveal-in">
          <div className="bg-green-50 border-2 border-brand-teal rounded-3xl p-4 w-full text-center">
            <div className="text-sm font-bold text-green-800 mb-1">{t('worked.answer_title', g)}</div>
            <div className="text-xl font-bold text-green-900"><BidiText>{answer}</BidiText></div>
            {item.question.explanation && (
              <div className="text-base text-brand-navy mt-2 leading-relaxed">
                <BidiText>{item.question.explanation}</BidiText>
              </div>
            )}
          </div>
          <BigButton onClick={onComplete} color="#7DD3B0">{t('worked.cta', g)}</BigButton>
        </div>
      )}
    </div>
  );
}
