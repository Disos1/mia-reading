import { useEffect, useMemo, useRef, useState } from 'react';
import type { Profile } from '../types';
import { t } from '../i18n/t';
import { PassageText } from '../components/primitives/PassageText';
import { BidiText } from '../components/primitives/BidiText';
import { BigButton } from '../components/primitives/BigButton';
import {
  entryItems, verificationItemsFor, assembleGapProfile, gapsAndStrengths,
  type DiagAnswer,
} from '../lib/diagnosticEngine';
import type { DiagItem } from '../content/diagnosticItems';
import { seedMasteryFromDiagnostic } from '../lib/masteryTracker';
import { loadMasteryMap, saveMasteryMap } from '../lib/sessionStore';
import { seedSignaturesFromDiagnostic } from '../lib/errorSignatures';
import { saveLocalProfile } from '../lib/profile';
import { READ_FLOOR_MS_PER_WORD, READ_FLOOR_MIN_MS } from '../constants/config';
import { DEV_FAST, DEV_FAST_FLOOR_MS } from '../lib/dev';

interface Props {
  profile: Profile;
  onDone:  (updated: Profile) => void;
}

/**
 * Diagnostic flow — spec Part 4. Entry (12 items) → conditional verification
 * (≤8) → gap profile → mastery + signature seeding → results (parent screen).
 *
 * Measurement discipline: single attempt per item, no hints, no right/wrong
 * feedback mid-run (it would teach mid-measure and discourage), no stepwise
 * delay (uniform timing keeps responseMs comparable). Timed reads use the same
 * read-floor as practice so wpm is honest.
 */
export function Diagnostic({ profile, onDone }: Props) {
  const g = { gender: profile.gender };
  const sessionId = useMemo(() => {
    try { return crypto.randomUUID(); } catch { return `diag_${Date.now()}`; }
  }, []);

  const [queue, setQueue] = useState<DiagItem[]>(entryItems());
  const [index, setIndex] = useState(0);
  const [inVerification, setInVerification] = useState(false);
  const answersRef = useRef<DiagAnswer[]>([]);

  const item = queue[index];
  const total = queue.length;

  // Per-item phase: timed read → question (except skipReading / picture gate,
  // where the sentence is short enough to show alongside the question).
  const [readPhase, setReadPhase] = useState(true);
  const [canFinish, setCanFinish] = useState(false);
  const mountRef = useRef(Date.now());
  const readMsRef = useRef(0);
  const questionShownAt = useRef(Date.now());

  const needsRead = item ? item.kind === 'passage' && !item.skipReading : false;

  // Shuffle option display order per item — authored correctOption is always 0,
  // and a fixed position would be a tell that corrupts the measurement.
  const order = useMemo(() => {
    const idx = (item?.options ?? []).map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    mountRef.current = Date.now();
    readMsRef.current = 0;
    setReadPhase(needsRead);
    setCanFinish(false);
    if (!needsRead) { questionShownAt.current = Date.now(); return; }
    const floorMs = DEV_FAST
      ? DEV_FAST_FLOOR_MS
      : Math.max(READ_FLOOR_MIN_MS, item.passage.wordCount * READ_FLOOR_MS_PER_WORD);
    const id = setTimeout(() => setCanFinish(true), floorMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;

  function finishReading() {
    readMsRef.current = Date.now() - mountRef.current;
    questionShownAt.current = Date.now();
    setReadPhase(false);
  }

  function answer(originalIndex: number) {
    const a: DiagAnswer = {
      itemId:     item.id,
      skillCode:  item.skillCode,
      secondarySkillCode: item.secondarySkillCode,
      correct:    originalIndex === item.correctOption,
      readMs:     readMsRef.current,
      responseMs: Date.now() - questionShownAt.current,
      wordCount:  item.passage.wordCount,
      rereadPass: item.rereadPass,
      noNikudTimed: item.noNikudTimed,
    };
    answersRef.current.push(a);

    const nextIdx = index + 1;
    if (nextIdx < queue.length) { setIndex(nextIdx); return; }

    if (!inVerification) {
      const verification = verificationItemsFor(answersRef.current);
      if (verification.length > 0) {
        setQueue(q => [...q, ...verification]);
        setInVerification(true);
        setIndex(nextIdx);
        return;
      }
    }
    complete();
  }

  function complete() {
    const gap = assembleGapProfile({
      profileId: profile.profileId,
      sessionId,
      answers:   answersRef.current,
    });

    // Seed mastery (existing practice records win over seeds) + signatures.
    const { gaps, strengths } = gapsAndStrengths(gap);
    const seeded = seedMasteryFromDiagnostic(profile.profileId, gaps, strengths, gap.completedAt);
    saveMasteryMap(profile.profileId, { ...seeded, ...loadMasteryMap(profile.profileId) });
    seedSignaturesFromDiagnostic(profile.profileId, gap);

    const updated: Profile = {
      ...profile,
      gapProfileJson:        gap,
      diagnosticCompletedAt: gap.completedAt,
      diagnosticVersion:     1,
    };
    saveLocalProfile(updated);
    onDone(updated);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-6">
      <div className="w-full max-w-2xl text-center text-sm font-medium text-gray-500 mb-4">
        {t('diag.progress', { ...g, current: index + 1, total })}
      </div>

      {readPhase ? (
        <div className="flex flex-col items-center gap-6 fade-in w-full max-w-2xl">
          {item.passage.picture && <div className="text-6xl">{item.passage.picture}</div>}
          <div className="bg-white card-shadow rounded-4xl p-6 md:p-8 w-full">
            <PassageText passage={item.passage} nikud={item.nikud} />
          </div>
          <BigButton onClick={finishReading} color="#7DD3B0" disabled={!canFinish}>
            {canFinish ? t('session.finished_reading', g) : t('session.keep_reading', g)}
          </BigButton>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 w-full max-w-2xl fade-in">
          {/* Picture gate + skip-reading items show the passage with the question. */}
          <div className="bg-white/70 rounded-3xl p-4 w-full">
            <PassageText passage={item.passage} nikud={item.nikud} className="text-xl md:text-2xl" />
          </div>

          <div className="bg-white card-shadow rounded-3xl p-5 w-full text-center">
            <div className="text-2xl font-bold text-brand-navy">
              <BidiText>{item.questionText}</BidiText>
            </div>
          </div>

          <div className={`grid gap-3 w-full ${item.kind === 'picture' ? 'grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {order.map(orig => (
              <button
                key={orig}
                onClick={() => answer(orig)}
                className={`rounded-3xl border-2 border-gray-200 bg-white transition-all
                  hover:scale-[1.01] active:scale-[0.99]
                  ${item.kind === 'picture' ? 'text-5xl py-5' : 'px-5 py-4 text-xl font-bold text-right'}`}
              >
                {item.kind === 'picture' ? item.options[orig] : <BidiText>{item.options[orig]}</BidiText>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
