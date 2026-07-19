import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/t';
import { BidiText } from '../primitives/BidiText';
import { BigButton } from '../primitives/BigButton';
import { READ_FLOOR_MIN_MS, STEPWISE_REVEAL_MS } from '../../constants/config';
import { DEV_FAST, DEV_FAST_FLOOR_MS, DEV_FAST_REVEAL_MS } from '../../lib/dev';
import { shuffledIndices, type FormatProps } from './shared';

/**
 * Format 4 — מילה בהקשר (Word in Context). Spec Part 5.
 *
 * One sentence with the target word visually highlighted; four meaning options.
 * Hint on first wrong: cross out the most-obviously-wrong distractor (authored
 * as options[3]) — narrowing 4 → 3 rather than pointing at the answer.
 *
 * V1 renders the sentence in full nikud regardless of the session's nikud axis:
 * the skill probed is vocabulary, not decoding, and stripping nikud would blur
 * which failure we're seeing. (DEC_NO_NIKUD_INFER variants are a later layer.)
 */
export function WordInContext({ item, gender, onAttempt, onComplete }: FormatProps) {
  const g = { gender };
  const q = item.question;
  const target = item.targetWord ?? '';

  type Phase = 'sentence' | 'options' | 'feedback';
  const [phase, setPhase] = useState<Phase>('sentence');
  const [attemptNo, setAttemptNo] = useState(0);
  const [crossedOut, setCrossedOut] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [firstCorrect, setFirstCorrect] = useState(false);

  const order = useMemo(() => shuffledIndices(q.options.length), [q.id]);
  const mountRef = useRef(Date.now());
  const optionsAt = useRef(0);

  // Short dwell on the sentence, then the stepwise reveal into options.
  const floorMs = DEV_FAST ? DEV_FAST_FLOOR_MS : READ_FLOOR_MIN_MS;
  const revealMs = DEV_FAST ? DEV_FAST_REVEAL_MS : STEPWISE_REVEAL_MS;
  useEffect(() => {
    mountRef.current = Date.now();
    const id = setTimeout(() => {
      optionsAt.current = Date.now();
      setPhase('options');
    }, floorMs + revealMs);
    return () => clearTimeout(id);
  }, [item.itemId, floorMs, revealMs]);

  // Sentence with the target word highlighted (underline + tint).
  const sentenceParts = useMemo(() => {
    const text = item.passage.textFullNikud;
    const i = target ? text.indexOf(target) : -1;
    if (i < 0) return [text];
    return [text.slice(0, i), target, text.slice(i + target.length)];
  }, [item.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(orig: number) {
    if (phase !== 'options') return;
    const correct = orig === q.correctOption;
    const isFirst = attemptNo === 0;
    onAttempt({
      correct,
      firstAttempt: isFirst,
      usedHint:     crossedOut !== null,
      chosenOption: orig,
      responseMs:   Date.now() - optionsAt.current,
      readMs:       0,
    });
    if (correct) {
      if (isFirst) setFirstCorrect(true);
      setChosen(orig);
      setPhase('feedback');
    } else if (isFirst) {
      setAttemptNo(1);
      setCrossedOut(3);   // authoring convention: options[3] is the most-wrong
      optionsAt.current = Date.now();
    } else {
      setChosen(orig);
      setPhase('feedback');
    }
  }

  const inFeedback = phase === 'feedback';

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl fade-in">
      {/* Sentence with highlighted target */}
      <div className="bg-white card-shadow rounded-4xl p-6 md:p-8 w-full">
        <div dir="rtl" className="text-2xl md:text-3xl leading-loose text-brand-navy text-right">
          {sentenceParts.length === 1
            ? <BidiText>{sentenceParts[0]}</BidiText>
            : <>
                <BidiText>{sentenceParts[0]}</BidiText>
                <span className="underline decoration-4 decoration-brand-coral bg-brand-coral/15 rounded px-1">
                  {sentenceParts[1]}
                </span>
                <BidiText>{sentenceParts[2]}</BidiText>
              </>}
        </div>
      </div>

      <div className="bg-white card-shadow rounded-3xl p-5 w-full text-center">
        <div className="text-2xl font-bold text-brand-navy">
          {t('wic.question', { ...g, word: target })}
        </div>
        {phase === 'sentence' && (
          <div className="text-gray-400 mt-3 animate-pulse">{t('session.thinking', g)}</div>
        )}
      </div>

      {phase !== 'sentence' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full reveal-in">
          {order.map(orig => {
            const isCorrect = orig === q.correctOption;
            const isCrossed = crossedOut === orig && !inFeedback;
            let style: React.CSSProperties = { background: 'white', borderColor: '#E5E7EB', color: '#2D3047' };
            if (inFeedback && isCorrect) style = { background: '#DCFCE7', borderColor: '#7DD3B0', color: '#166534' };
            else if (inFeedback && chosen === orig) style = { background: '#FEE2E2', borderColor: '#F5A8D6', color: '#9B1C1C' };
            else if (isCrossed) style = { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#C0C4CC', textDecoration: 'line-through' };
            return (
              <button
                key={orig}
                disabled={inFeedback || isCrossed}
                onClick={() => choose(orig)}
                className="rounded-3xl px-5 py-4 text-xl font-bold border-2 text-right transition-all
                  hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default"
                style={style}
              >
                <BidiText>{q.options[orig]}</BidiText>
              </button>
            );
          })}
        </div>
      )}

      {crossedOut !== null && !inFeedback && (
        <div className="bg-brand-yellow/30 border-2 border-brand-yellow rounded-3xl p-3 w-full text-center reveal-in">
          <div className="text-lg text-brand-navy">💡 {t('wic.hint_crossout', g)}</div>
        </div>
      )}

      {inFeedback && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-2xl font-bold" style={{ color: firstCorrect ? '#166534' : '#B45309' }}>
            {firstCorrect ? t('session.correct', g) : t('session.moving_on', g)}
          </div>
          <BigButton
            onClick={() => onComplete({ firstAttemptCorrect: firstCorrect, readMs: 0 })}
            color="#C4A7E7"
          >
            {t('session.next', g)}
          </BigButton>
        </div>
      )}
    </div>
  );
}
