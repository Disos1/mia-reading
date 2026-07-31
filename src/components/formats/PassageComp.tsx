import { useEffect, useMemo, useRef, useState } from 'react';
import type { Gender, PracticeItem } from '../../types';
import { t } from '../../i18n/t';
import { PassageText } from '../primitives/PassageText';
import { BidiText } from '../primitives/BidiText';
import { BigButton } from '../primitives/BigButton';
import { ExplanationCard } from './ExplanationCard';
import {
  READ_FLOOR_MS_PER_WORD,
  READ_FLOOR_MIN_MS,
  STEPWISE_REVEAL_MS,
} from '../../constants/config';
import { DEV_FAST, DEV_FAST_FLOOR_MS, DEV_FAST_REVEAL_MS } from '../../lib/dev';
import { speak, stopSpeaking, ttsSupported } from '../../lib/tts';
import type { FormatAttempt } from './shared';

/** One answer submission, reported up so Session can build the PracticeAttempt. */
export type AttemptResult = FormatAttempt;

interface Props {
  item:       PracticeItem;
  gender:     Gender;
  /** Read-floor inflation from the fast-inaccurate recipe (default 1). */
  readFloorMultiplier?: number;
  /** Called on every answer submission (first attempt AND retry). */
  onAttempt:  (r: AttemptResult) => void;
  /** Called once when the item is finished (after correct or 2nd wrong). */
  onComplete: (summary: { firstAttemptCorrect: boolean; readMs: number }) => void;
}

type Phase = 'reading' | 'revealQuestion' | 'options' | 'feedback';

/** Deterministic-per-mount shuffle so retries keep the same option layout. */
function shuffle<T>(arr: T[]): number[] {
  const idx = arr.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function PassageComp({ item, gender, readFloorMultiplier = 1, onAttempt, onComplete }: Props) {
  const g = { gender };
  const { passage, question } = item;

  const [phase, setPhase]         = useState<Phase>('reading');
  const [canFinish, setCanFinish] = useState(false);
  const [attemptNo, setAttemptNo] = useState(0);      // 0 = first, 1 = retry
  const [showHint, setShowHint]   = useState(false);
  const [chosen, setChosen]       = useState<number | null>(null); // original index
  const [firstCorrect, setFirstCorrect] = useState(false);

  // Option display order (stable across retries within this item).
  const order = useMemo(() => shuffle(question.options), [question.id]);

  // Timers.
  const mountRef       = useRef<number>(Date.now());
  const readMsRef      = useRef<number>(0);
  const optionsShownAt = useRef<number>(0);
  // Double-tap guard. `attemptNo` is React state and therefore async: without
  // this, several fast taps all read attemptNo === 0 and each records another
  // "first attempt", inflating the denominator exactly like the math-app bug.
  const lockRef = useRef(false);

  const floorMs = DEV_FAST
    ? DEV_FAST_FLOOR_MS
    : Math.max(READ_FLOOR_MIN_MS, passage.wordCount * READ_FLOOR_MS_PER_WORD) * readFloorMultiplier;
  const revealMs = DEV_FAST ? DEV_FAST_REVEAL_MS : STEPWISE_REVEAL_MS;

  // Read-time floor: enable "finished reading" only after a real dwell (protects
  // the fluency-rate measurement and blunts click-through).
  useEffect(() => {
    mountRef.current = Date.now();
    setCanFinish(false);
    const id = setTimeout(() => setCanFinish(true), floorMs);
    return () => clearTimeout(id);
  }, [item.itemId, floorMs]);

  // Never let read-aloud audio bleed into the next item.
  useEffect(() => () => stopSpeaking(), [item.itemId]);

  // Stepwise reveal: after "finished reading", show the question ALONE, then
  // fade the options in (forces covert retrieval before recognition — C4).
  useEffect(() => {
    if (phase !== 'revealQuestion') return;
    const id = setTimeout(() => {
      optionsShownAt.current = Date.now();
      setPhase('options');
    }, revealMs);
    return () => clearTimeout(id);
  }, [phase, revealMs]);

  // Release the tap guard once the state change it caused has rendered.
  useEffect(() => { lockRef.current = false; }, [attemptNo, phase]);

  function finishReading() {
    readMsRef.current = Date.now() - mountRef.current;
    setPhase('revealQuestion');
  }

  function choose(originalIndex: number) {
    if (phase !== 'options' || lockRef.current) return;
    lockRef.current = true;
    const correct = originalIndex === question.correctOption;
    const responseMs = Date.now() - optionsShownAt.current;
    const isFirst = attemptNo === 0;

    onAttempt({
      correct,
      firstAttempt: isFirst,
      usedHint:     showHint,
      chosenOption: originalIndex,
      responseMs,
      readMs:       readMsRef.current,
    });

    if (correct) {
      if (isFirst) setFirstCorrect(true);
      setChosen(originalIndex);
      setPhase('feedback');
      return;
    }

    // Wrong.
    if (isFirst) {
      // First miss → show hint, let her retry the same item.
      setAttemptNo(1);
      setShowHint(true);
      setChosen(null);
      optionsShownAt.current = Date.now(); // reset response timer for the retry
    } else {
      // Second miss → flash the correct answer and move on.
      setChosen(originalIndex);
      setPhase('feedback');
    }
  }

  const hintText = question.hintText ?? t('hint.generic', g);

  // ── Reading phase ──────────────────────────────────────────────────────────
  if (phase === 'reading') {
    return (
      <div className="flex flex-col items-center gap-6 fade-in w-full max-w-2xl">
        {passage.picture && <div className="text-6xl">{passage.picture}</div>}
        <div className="bg-white card-shadow rounded-4xl p-6 md:p-8 w-full">
          <PassageText passage={passage} nikud={item.nikud} />
        </div>
        <BigButton onClick={finishReading} color="#7DD3B0" disabled={!canFinish}>
          {canFinish ? t('session.finished_reading', g) : t('session.keep_reading', g)}
        </BigButton>
      </div>
    );
  }

  // ── Question + options ──────────────────────────────────────────────────────
  const inFeedback = phase === 'feedback';
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl">
      {/* Passage stays visible so she can look back (comprehension strategy). */}
      <div className="bg-white/70 rounded-3xl p-4 w-full">
        <PassageText passage={passage} nikud={item.nikud} className="text-xl md:text-2xl" />
      </div>

      {/* Question */}
      <div className="bg-white card-shadow rounded-3xl p-5 w-full text-center">
        <div className="text-2xl font-bold text-brand-navy">
          <BidiText>{question.questionText}</BidiText>
        </div>
        {phase === 'revealQuestion' && (
          <div className="text-gray-400 mt-3 animate-pulse">{t('session.thinking', g)}</div>
        )}
      </div>

      {/* Options — appear only after the stepwise reveal */}
      {(phase === 'options' || inFeedback) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full reveal-in">
          {order.map(orig => {
            const isCorrect = orig === question.correctOption;
            const isChosen  = chosen === orig;
            let bg = 'white', border = '#E5E7EB', color = '#2D3047';
            if (inFeedback && isCorrect) { bg = '#DCFCE7'; border = '#7DD3B0'; color = '#166534'; }
            else if (inFeedback && isChosen && !isCorrect) { bg = '#FEE2E2'; border = '#F5A8D6'; color = '#9B1C1C'; }
            return (
              <button
                key={orig}
                disabled={inFeedback}
                onClick={() => choose(orig)}
                className="rounded-3xl px-5 py-4 text-xl font-bold border-2 text-right transition-all
                  hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default"
                style={{ background: bg, borderColor: border, color }}
              >
                <BidiText>{question.options[orig]}</BidiText>
              </button>
            );
          })}
        </div>
      )}

      {/* Hint card (after first wrong) */}
      {showHint && !inFeedback && (
        <div className="bg-brand-yellow/30 border-2 border-brand-yellow rounded-3xl p-4 w-full text-center reveal-in">
          <div className="text-sm font-bold text-brand-navy mb-1">💡 {t('session.hint_title', g)}</div>
          <div className="text-lg text-brand-navy"><BidiText>{hintText}</BidiText></div>
        </div>
      )}

      {/* Feedback + advance */}
      {inFeedback && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-2xl font-bold" style={{ color: firstCorrect ? '#166534' : '#B45309' }}>
            {firstCorrect ? t('session.correct', g) : t('session.moving_on', g)}
          </div>
          {!firstCorrect && <ExplanationCard text={question.explanation} gender={gender} />}
          {/* Conditional read-aloud (spec Part 7): offered ONLY after a failed
              comp probe — never up-front, so it's remediation, not avoidance. */}
          {!firstCorrect && ttsSupported() && (
            <button
              onClick={() => speak(passage.textFullNikud)}
              className="bg-white border-2 border-brand-sky rounded-2xl px-4 py-2 text-brand-navy
                font-medium hover:scale-[1.02] transition-all"
            >
              🔊 {t('session.read_aloud', g)}
            </button>
          )}
          <BigButton
            onClick={() => { stopSpeaking(); onComplete({ firstAttemptCorrect: firstCorrect, readMs: readMsRef.current }); }}
            color="#C4A7E7"
          >
            {t('session.next', g)}
          </BigButton>
        </div>
      )}
    </div>
  );
}
