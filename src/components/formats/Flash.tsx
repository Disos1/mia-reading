import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/t';
import { BigButton } from '../primitives/BigButton';
import { ExplanationCard } from './ExplanationCard';
import { shuffledIndices, type FormatProps } from './shared';

/**
 * Format 5 — בזק (Flash). Spec Part 5. Maintenance gate for WR_HF_* skills.
 *
 * The word flashes for the tier's duration (1500/1000/600 ms), then four
 * unpointed options appear. Every confusable distractor is pair-tagged: a
 * wrong tap on one emits signatureHit ERR_LETTER_CONFUSE, feeding the
 * letter-confusion detector with WHICH pair fired.
 *
 * Hint on first wrong (spec): show the real word next to the tapped distractor
 * — yes, this reveals the answer; the side-by-side comparison IS the teaching
 * moment (errorful learning + corrective feedback), and the retry never mints
 * reward (first-attempt-only accounting).
 */
export function Flash({ item, gender, onAttempt, onComplete }: FormatProps) {
  const g = { gender };
  const flash = item.flash!;

  type Phase = 'intro' | 'flashing' | 'options' | 'feedback';
  const [phase, setPhase] = useState<Phase>('intro');
  const [attemptNo, setAttemptNo] = useState(0);
  const [hintPair, setHintPair] = useState<string | null>(null);   // tapped distractor text
  const [chosen, setChosen] = useState<number | null>(null);
  const [firstCorrect, setFirstCorrect] = useState(false);

  const order = useMemo(() => shuffledIndices(flash.options.length), [item.itemId]);
  const optionsAt = useRef(0);
  const lockRef = useRef(false);   // double-tap guard (see PassageComp)

  // intro (brief) → flash (durationMs) → options.
  useEffect(() => {
    if (phase === 'intro') {
      const id = setTimeout(() => setPhase('flashing'), 1200);
      return () => clearTimeout(id);
    }
    if (phase === 'flashing') {
      const id = setTimeout(() => { optionsAt.current = Date.now(); setPhase('options'); }, flash.durationMs);
      return () => clearTimeout(id);
    }
  }, [phase, flash.durationMs]);

  useEffect(() => { lockRef.current = false; }, [attemptNo, phase]);

  function choose(orig: number) {
    if (phase !== 'options' || lockRef.current) return;
    lockRef.current = true;
    const opt = flash.options[orig];
    const correct = orig === 0;   // options[0] is always the real word
    const isFirst = attemptNo === 0;
    onAttempt({
      correct,
      firstAttempt: isFirst,
      usedHint:     hintPair !== null,
      chosenOption: orig,
      responseMs:   Date.now() - optionsAt.current,
      readMs:       0,
      signatureHit: !correct && opt.pair ? 'ERR_LETTER_CONFUSE' : null,
    });
    if (correct) {
      if (isFirst) setFirstCorrect(true);
      setChosen(orig);
      setPhase('feedback');
    } else if (isFirst) {
      setAttemptNo(1);
      setHintPair(opt.text);
      optionsAt.current = Date.now();
    } else {
      setChosen(orig);
      setPhase('feedback');
    }
  }

  if (phase === 'intro' || phase === 'flashing') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 fade-in w-full max-w-md min-h-64 text-center">
        {phase === 'intro'
          ? <div className="text-2xl font-bold text-brand-navy">{t('flash.intro', g)}</div>
          : <div dir="rtl" className="bg-white card-shadow rounded-4xl px-10 py-8 text-5xl font-bold text-brand-navy">
              {flash.word}
            </div>}
      </div>
    );
  }

  const inFeedback = phase === 'feedback';

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md fade-in">
      <div className="bg-white card-shadow rounded-3xl p-5 w-full text-center">
        <div className="text-2xl font-bold text-brand-navy">{t('flash.question', g)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full reveal-in" dir="rtl">
        {order.map(orig => {
          const isCorrect = orig === 0;
          let style: React.CSSProperties = { background: 'white', borderColor: '#E5E7EB', color: '#2D3047' };
          if (inFeedback && isCorrect) style = { background: '#DCFCE7', borderColor: '#7DD3B0', color: '#166534' };
          else if (inFeedback && chosen === orig) style = { background: '#FEE2E2', borderColor: '#F5A8D6', color: '#9B1C1C' };
          return (
            <button key={orig} disabled={inFeedback} onClick={() => choose(orig)}
              className="rounded-3xl px-4 py-5 text-2xl font-bold border-2 transition-all
                hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default"
              style={style}>
              {flash.options[orig].text}
            </button>
          );
        })}
      </div>

      {hintPair && !inFeedback && (
        <div className="bg-brand-yellow/30 border-2 border-brand-yellow rounded-3xl p-4 w-full text-center reveal-in">
          <div className="text-lg text-brand-navy mb-2">💡 {t('flash.hint', g)}</div>
          <div dir="rtl" className="flex items-center justify-center gap-4 text-2xl font-bold">
            <span className="text-green-700 bg-green-50 rounded-xl px-3 py-1">{flash.word}</span>
            <span className="text-gray-400">≠</span>
            <span className="text-red-400 bg-red-50 rounded-xl px-3 py-1 line-through">{hintPair}</span>
          </div>
        </div>
      )}

      {inFeedback && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-2xl font-bold" style={{ color: firstCorrect ? '#166534' : '#B45309' }}>
            {firstCorrect ? t('session.correct', g) : t('session.moving_on', g)}
          </div>
          {!firstCorrect && <ExplanationCard text={item.question.explanation} gender={gender} />}
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
