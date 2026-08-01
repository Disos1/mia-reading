import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/t';
import { PassageText } from '../primitives/PassageText';
import { BidiText } from '../primitives/BidiText';
import { BigButton } from '../primitives/BigButton';
import { STEPWISE_REVEAL_MS } from '../../constants/config';
import { readFloorMs } from '../../lib/readFloor';
import { DEV_FAST, DEV_FAST_FLOOR_MS, DEV_FAST_REVEAL_MS } from '../../lib/dev';
import { shuffledIndices, type FormatProps } from './shared';

/**
 * Format 2 — שתי קריאות (Reread Challenge). Spec Part 5.
 *
 * The evidence-backed repeated-reading intervention: the same passage is read
 * twice, each pass gated by the read-time floor and followed by its own comp
 * probe (single attempt, no hints — retries would muddy the timing signal).
 * Between passes a celebration shows pass-1 time; the end screen celebrates
 * the speed gain (negative gain is never penalized — comprehension first).
 *
 * item.question = pass-1 probe · item.question2 = pass-2 probe.
 */
export function Reread({ item, gender, readFloorMultiplier = 1, gapProfile, onAttempt, onComplete }: FormatProps) {
  const g = { gender };
  const { passage } = item;
  const q2 = item.question2 ?? item.question;

  type Phase = 'read1' | 'q1' | 'between' | 'read2' | 'q2' | 'done';
  const [phase, setPhase] = useState<Phase>('read1');
  const [canFinish, setCanFinish] = useState(false);
  const [optionsIn, setOptionsIn] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  const read1Ms = useRef(0);
  const read2Ms = useRef(0);
  const q1Correct = useRef(false);
  const q2Correct = useRef(false);
  const readStart = useRef(Date.now());
  const optionsAt = useRef(0);
  const lockRef = useRef(false);   // double-tap guard (see PassageComp)

  const floorMs = DEV_FAST
    ? DEV_FAST_FLOOR_MS
    : readFloorMs(passage.wordCount, gapProfile ?? null, readFloorMultiplier);
  const revealMs = DEV_FAST ? DEV_FAST_REVEAL_MS : STEPWISE_REVEAL_MS;

  const inRead = phase === 'read1' || phase === 'read2';
  const activeQ = phase === 'q2' || phase === 'done' ? q2 : item.question;
  const order = useMemo(() => shuffledIndices(activeQ.options.length), [activeQ.id]);

  // Read floor per pass.
  useEffect(() => {
    if (!inRead) return;
    readStart.current = Date.now();
    setCanFinish(false);
    const id = setTimeout(() => setCanFinish(true), floorMs);
    return () => clearTimeout(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stepwise reveal per probe.
  useEffect(() => {
    if (phase !== 'q1' && phase !== 'q2') return;
    setOptionsIn(false);
    setChosen(null);
    const id = setTimeout(() => { optionsAt.current = Date.now(); setOptionsIn(true); }, revealMs);
    return () => clearTimeout(id);
  }, [phase, revealMs]);

  useEffect(() => { lockRef.current = false; }, [phase]);

  function finishReading() {
    const ms = Date.now() - readStart.current;
    if (phase === 'read1') { read1Ms.current = ms; setPhase('q1'); }
    else                   { read2Ms.current = ms; setPhase('q2'); }
  }

  function answer(orig: number) {
    if (chosen !== null || lockRef.current) return;
    lockRef.current = true;
    const isQ1 = phase === 'q1';
    const q = isQ1 ? item.question : q2;
    const correct = orig === q.correctOption;
    setChosen(orig);
    onAttempt({
      correct,
      firstAttempt: true,          // each probe is its own single first attempt
      usedHint:     false,
      chosenOption: orig,
      responseMs:   Date.now() - optionsAt.current,
      readMs:       isQ1 ? read1Ms.current : read2Ms.current,
      questionId:   q.id,
      skillCode:    q.skillCode,
      rereadPass:   isQ1 ? 1 : 2,
    });
    if (isQ1) q1Correct.current = correct;
    else      q2Correct.current = correct;
    setTimeout(() => setPhase(isQ1 ? 'between' : 'done'), 900);
  }

  const gainSec = Math.round((read1Ms.current - read2Ms.current) / 1000);
  // Speed only counts when comprehension held. Cheering a faster second pass
  // that she got WRONG would reward exactly the speed-over-care habit the
  // diagnostic flagged — repeated reading is meant to build fluency WITH
  // understanding, not a race.
  const earnedTheGain = gainSec > 0 && q2Correct.current;

  // ── Reading passes ──────────────────────────────────────────────────────────
  if (inRead) {
    return (
      <div className="flex flex-col items-center gap-5 fade-in w-full max-w-2xl">
        <div className="bg-brand-purple/20 rounded-2xl px-4 py-2 text-brand-navy font-bold">
          {phase === 'read1' ? t('reread.banner', g) : t('reread.again_cta', g)}
        </div>
        <div className="bg-white card-shadow rounded-4xl p-6 md:p-8 w-full">
          <PassageText passage={passage} nikud={item.nikud} />
        </div>
        <BigButton onClick={finishReading} color="#7DD3B0" disabled={!canFinish}>
          {canFinish ? t('session.finished_reading', g) : t('session.keep_reading', g)}
        </BigButton>
      </div>
    );
  }

  // ── Between passes ──────────────────────────────────────────────────────────
  if (phase === 'between') {
    return (
      <div className="flex flex-col items-center gap-5 fade-in w-full max-w-md text-center">
        <div className="text-6xl">⏱️</div>
        <div className="text-2xl font-bold text-brand-navy">
          {t('reread.first_time', { ...g, sec: Math.max(1, Math.round(read1Ms.current / 1000)) })}
        </div>
        <BigButton onClick={() => setPhase('read2')} color="#8FC0E8">
          {t('reread.again_button', g)}
        </BigButton>
      </div>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-5 fade-in w-full max-w-md text-center">
        <div className="text-6xl">{earnedTheGain ? '🚀' : '🌟'}</div>
        <div className="text-2xl font-bold text-brand-navy">
          {earnedTheGain              ? t('reread.faster', { ...g, sec: gainSec })
           : gainSec > 0              ? t('reread.faster_but_missed', { ...g, sec: gainSec })
           :                            t('reread.no_gain', g)}
        </div>
        <BigButton
          onClick={() => onComplete({ firstAttemptCorrect: q1Correct.current, readMs: read1Ms.current })}
          color="#C4A7E7"
        >
          {t('session.next', g)}
        </BigButton>
      </div>
    );
  }

  // ── Probes (q1 / q2) ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl fade-in">
      <div className="bg-white/70 rounded-3xl p-4 w-full">
        <PassageText passage={passage} nikud={item.nikud} className="text-xl md:text-2xl" />
      </div>
      <div className="bg-white card-shadow rounded-3xl p-5 w-full text-center">
        <div className="text-2xl font-bold text-brand-navy">
          <BidiText>{activeQ.questionText}</BidiText>
        </div>
        {!optionsIn && <div className="text-gray-400 mt-3 animate-pulse">{t('session.thinking', g)}</div>}
      </div>
      {optionsIn && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full reveal-in">
          {order.map(orig => {
            const isCorrect = orig === activeQ.correctOption;
            const show = chosen !== null;
            let style: React.CSSProperties = { background: 'white', borderColor: '#E5E7EB', color: '#2D3047' };
            if (show && isCorrect) style = { background: '#DCFCE7', borderColor: '#7DD3B0', color: '#166534' };
            else if (show && chosen === orig) style = { background: '#FEE2E2', borderColor: '#F5A8D6', color: '#9B1C1C' };
            return (
              <button key={orig} disabled={show} onClick={() => answer(orig)}
                className="rounded-3xl px-5 py-4 text-xl font-bold border-2 text-right transition-all
                  hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default"
                style={style}>
                <BidiText>{activeQ.options[orig]}</BidiText>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
