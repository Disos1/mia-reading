import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/t';
import { BidiText } from '../primitives/BidiText';
import { BigButton } from '../primitives/BigButton';
import { ExplanationCard } from './ExplanationCard';
import { READ_FLOOR_MIN_MS, STEPWISE_REVEAL_MS } from '../../constants/config';
import { DEV_FAST, DEV_FAST_FLOOR_MS, DEV_FAST_REVEAL_MS } from '../../lib/dev';
import { shuffledIndices, type FormatProps } from './shared';

/**
 * Format 6 — מה המילה אומרת כאן? (build plan H-U2).
 *
 * One unpointed sentence, one highlighted homograph, and the readings it could
 * be. Only the sentence decides — which is precisely the skill unpointed Hebrew
 * demands and that no other format trains.
 *
 * On a correct answer the pointed form is revealed beside the word, so the
 * reading she inferred gets confirmed visually.
 */
export function Ambiguity({ item, gender, onAttempt, onComplete }: FormatProps) {
  const g = { gender };
  const q = item.question;
  const spec = item.ambiguity!;

  type Phase = 'sentence' | 'options' | 'feedback';
  const [phase, setPhase] = useState<Phase>('sentence');
  const [attemptNo, setAttemptNo] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [firstCorrect, setFirstCorrect] = useState(false);

  const order = useMemo(() => shuffledIndices(q.options.length), [q.id]);
  const optionsAt = useRef(0);
  const lockRef = useRef(false);   // double-tap guard (see PassageComp)

  const floorMs  = DEV_FAST ? DEV_FAST_FLOOR_MS  : READ_FLOOR_MIN_MS;
  const revealMs = DEV_FAST ? DEV_FAST_REVEAL_MS : STEPWISE_REVEAL_MS;
  useEffect(() => {
    const id = setTimeout(() => {
      optionsAt.current = Date.now();
      setPhase('options');
    }, floorMs + revealMs);
    return () => clearTimeout(id);
  }, [item.itemId, floorMs, revealMs]);

  useEffect(() => { lockRef.current = false; }, [attemptNo, phase]);

  // Split the sentence around the homograph so it can be highlighted.
  const parts = useMemo(() => {
    const text = item.passage.textFullNikud;
    const i = text.indexOf(spec.word);
    return i < 0 ? [text] : [text.slice(0, i), spec.word, text.slice(i + spec.word.length)];
  }, [item.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(orig: number) {
    if (phase !== 'options' || lockRef.current) return;
    lockRef.current = true;
    const correct = orig === q.correctOption;
    const isFirst = attemptNo === 0;
    onAttempt({
      correct,
      firstAttempt: isFirst,
      usedHint:     showHint,
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
      setShowHint(true);
      optionsAt.current = Date.now();
    } else {
      setChosen(orig);
      setPhase('feedback');
    }
  }

  const inFeedback = phase === 'feedback';

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl fade-in">
      <div className="bg-brand-teal/20 rounded-2xl px-4 py-2 text-brand-navy font-bold">
        {t('ambiguity.intro', g)}
      </div>

      <div className="bg-white card-shadow rounded-4xl p-6 md:p-8 w-full">
        <div dir="rtl" className="text-2xl md:text-3xl leading-loose text-brand-navy text-right">
          {parts.length === 1 ? <BidiText>{parts[0]}</BidiText> : (
            <>
              <BidiText>{parts[0]}</BidiText>
              <span className="underline decoration-4 decoration-brand-teal bg-brand-teal/15 rounded px-1">
                {inFeedback ? spec.pointedForm : parts[1]}
              </span>
              <BidiText>{parts[2]}</BidiText>
            </>
          )}
        </div>
      </div>

      <div className="bg-white card-shadow rounded-3xl p-4 w-full text-center">
        <div className="text-xl font-bold text-brand-navy">{t('ambiguity.question', g)}</div>
        {phase === 'sentence' && (
          <div className="text-gray-400 mt-2 animate-pulse">{t('session.thinking', g)}</div>
        )}
      </div>

      {phase !== 'sentence' && (
        <div className="grid grid-cols-1 gap-3 w-full reveal-in">
          {order.map(orig => {
            const isCorrect = orig === q.correctOption;
            let style: React.CSSProperties = { background: 'white', borderColor: '#E5E7EB', color: '#2D3047' };
            if (inFeedback && isCorrect) style = { background: '#DCFCE7', borderColor: '#7DD3B0', color: '#166534' };
            else if (inFeedback && chosen === orig) style = { background: '#FEE2E2', borderColor: '#F5A8D6', color: '#9B1C1C' };
            return (
              <button key={orig} disabled={inFeedback} onClick={() => choose(orig)}
                className="rounded-3xl px-5 py-4 text-xl font-bold border-2 text-right transition-all
                  hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default"
                style={style}>
                <BidiText>{q.options[orig]}</BidiText>
              </button>
            );
          })}
        </div>
      )}

      {showHint && !inFeedback && (
        <div className="bg-brand-yellow/30 border-2 border-brand-yellow rounded-3xl p-3 w-full text-center reveal-in">
          <div className="text-lg text-brand-navy">💡 {t('ambiguity.hint', g)}</div>
        </div>
      )}

      {inFeedback && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-2xl font-bold" style={{ color: firstCorrect ? '#166534' : '#B45309' }}>
            {firstCorrect ? t('session.correct', g) : t('session.moving_on', g)}
          </div>
          {!firstCorrect && <ExplanationCard text={q.explanation} gender={gender} />}
          <BigButton onClick={() => onComplete({ firstAttemptCorrect: firstCorrect, readMs: 0 })} color="#C4A7E7">
            {t('session.next', g)}
          </BigButton>
        </div>
      )}
    </div>
  );
}
