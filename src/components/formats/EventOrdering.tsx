import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/t';
import { PassageText } from '../primitives/PassageText';
import { BidiText } from '../primitives/BidiText';
import { BigButton } from '../primitives/BigButton';
import { ExplanationCard } from './ExplanationCard';
import { READ_FLOOR_MS_PER_WORD, READ_FLOOR_MIN_MS } from '../../constants/config';
import { DEV_FAST, DEV_FAST_FLOOR_MS } from '../../lib/dev';
import { shuffledIndices, type FormatProps } from './shared';

/**
 * Format 3 — סדר אירועים (Event Ordering). Spec Part 5.
 *
 * Tap-to-number (the tablet-safe default; drag-to-order was rejected until
 * proven on Mia's iPad): tapping an unnumbered card assigns the next position;
 * tapping a numbered card unassigns it (and renumbers the rest) so mistakes
 * are fixable before submitting.
 *
 * Scoring: exact order = correct · exactly one transposition (2 misplaced) =
 * first-wrong-equivalent → hint + one retry · otherwise wrong → flash the
 * correct order. `chosenOption` reports the misplaced-card count.
 */
export function EventOrdering({ item, gender, readFloorMultiplier = 1, onAttempt, onComplete }: FormatProps) {
  const g = { gender };
  const events = item.ordering ?? [];

  type Phase = 'reading' | 'ordering' | 'feedback';
  const [phase, setPhase] = useState<Phase>('reading');
  const [canFinish, setCanFinish] = useState(false);
  // Display order (shuffled once) and the child's picks (display idx → position).
  const display = useMemo(() => shuffledIndices(events.length), [item.itemId]);
  const [picks, setPicks] = useState<number[]>([]);   // display indices in tap order
  const [attemptNo, setAttemptNo] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [firstCorrect, setFirstCorrect] = useState(false);

  const mountRef = useRef(Date.now());
  const readMsRef = useRef(0);
  const orderingAt = useRef(0);
  const lockRef = useRef(false);   // double-tap guard (see PassageComp)

  const floorMs = DEV_FAST
    ? DEV_FAST_FLOOR_MS
    : Math.max(READ_FLOOR_MIN_MS, item.passage.wordCount * READ_FLOOR_MS_PER_WORD) * readFloorMultiplier;

  useEffect(() => {
    mountRef.current = Date.now();
    const id = setTimeout(() => setCanFinish(true), floorMs);
    return () => clearTimeout(id);
  }, [item.itemId, floorMs]);

  useEffect(() => { lockRef.current = false; }, [attemptNo, phase]);

  function finishReading() {
    readMsRef.current = Date.now() - mountRef.current;
    orderingAt.current = Date.now();
    setPhase('ordering');
  }

  function tap(displayIdx: number) {
    if (phase !== 'ordering') return;
    setPicks(prev => prev.includes(displayIdx)
      ? prev.filter(i => i !== displayIdx)   // unassign + renumber
      : [...prev, displayIdx]);
  }

  function submit() {
    if (lockRef.current) return;
    lockRef.current = true;
    // picks[k] is the display index the child put at position k; the correct
    // event for position k is original index k (events are authored in order).
    const misplaced = picks.reduce((n, dIdx, k) => n + (display[dIdx] === k ? 0 : 1), 0);
    const correct = misplaced === 0;
    const isFirst = attemptNo === 0;

    onAttempt({
      correct,
      firstAttempt: isFirst,
      usedHint:     showHint,
      chosenOption: misplaced,
      responseMs:   Date.now() - orderingAt.current,
      readMs:       readMsRef.current,
    });

    if (correct) {
      if (isFirst) setFirstCorrect(true);
      setPhase('feedback');
      return;
    }
    if (isFirst && misplaced === 2) {
      // Single transposition — the "almost" path: hint + one retry.
      setAttemptNo(1);
      setShowHint(true);
      setPicks([]);
      orderingAt.current = Date.now();
    } else {
      setPhase('feedback');
    }
  }

  // ── Reading ─────────────────────────────────────────────────────────────────
  if (phase === 'reading') {
    return (
      <div className="flex flex-col items-center gap-5 fade-in w-full max-w-2xl">
        <div className="bg-white card-shadow rounded-4xl p-6 md:p-8 w-full">
          <PassageText passage={item.passage} nikud={item.nikud} />
        </div>
        <BigButton onClick={finishReading} color="#7DD3B0" disabled={!canFinish}>
          {canFinish ? t('session.finished_reading', g) : t('session.keep_reading', g)}
        </BigButton>
      </div>
    );
  }

  const inFeedback = phase === 'feedback';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl fade-in">
      <div className="bg-white/70 rounded-3xl p-4 w-full">
        <PassageText passage={item.passage} nikud={item.nikud} className="text-lg md:text-xl" />
      </div>

      <div className="bg-white card-shadow rounded-3xl p-4 w-full text-center">
        <div className="text-xl font-bold text-brand-navy">{t('ordering.instruction', g)}</div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {display.map((origIdx, dIdx) => {
          const pos = picks.indexOf(dIdx);           // 0-based position or -1
          const correctPos = inFeedback ? origIdx : null;
          return (
            <button
              key={dIdx}
              disabled={inFeedback}
              onClick={() => tap(dIdx)}
              className="rounded-3xl px-5 py-4 text-xl font-bold border-2 text-right flex items-center gap-4
                transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default"
              style={{
                background:  pos >= 0 ? '#F3EEFF' : 'white',
                borderColor: pos >= 0 ? '#C4A7E7' : '#E5E7EB',
              }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{
                  background: inFeedback ? '#DCFCE7' : pos >= 0 ? '#C4A7E7' : '#F3F4F6',
                  color:      inFeedback ? '#166534' : pos >= 0 ? 'white' : '#9CA3AF',
                }}
              >
                {inFeedback ? (correctPos! + 1) : pos >= 0 ? pos + 1 : '·'}
              </span>
              <BidiText className="flex-1">{events[origIdx]}</BidiText>
            </button>
          );
        })}
      </div>

      {showHint && !inFeedback && (
        <div className="bg-brand-yellow/30 border-2 border-brand-yellow rounded-3xl p-4 w-full text-center reveal-in">
          <div className="text-lg text-brand-navy">💡 {t('ordering.almost', g)}</div>
        </div>
      )}

      {!inFeedback && (
        <BigButton onClick={submit} color="#7DD3B0" disabled={picks.length !== events.length}>
          {t('ordering.submit', g)}
        </BigButton>
      )}

      {inFeedback && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-2xl font-bold" style={{ color: firstCorrect ? '#166534' : '#B45309' }}>
            {firstCorrect ? t('session.correct', g) : t('ordering.correct_order', g)}
          </div>
          {!firstCorrect && <ExplanationCard text={item.question.explanation} gender={gender} />}
          <BigButton
            onClick={() => onComplete({ firstAttemptCorrect: firstCorrect, readMs: readMsRef.current })}
            color="#C4A7E7"
          >
            {t('session.next', g)}
          </BigButton>
        </div>
      )}
    </div>
  );
}
