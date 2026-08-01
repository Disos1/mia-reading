import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Gender,
  MasteryMap,
  NikudState,
  PracticeAttempt,
  PracticeItem,
  Profile,
  ScaffoldState,
  SessionMode,
  SessionPhase,
  SessionRecord,
} from '../types';
import { t } from '../i18n/t';
import { PassageComp } from '../components/formats/PassageComp';
import { Reread } from '../components/formats/Reread';
import { EventOrdering } from '../components/formats/EventOrdering';
import { WordInContext } from '../components/formats/WordInContext';
import { Flash } from '../components/formats/Flash';
import { Ambiguity } from '../components/formats/Ambiguity';
import { WorkedExample } from '../components/formats/WorkedExample';
import type { FormatAttempt } from '../components/formats/shared';
import { ItemFormat } from '../types';
import { EndSession } from './EndSession';
import { composeSession, pickItem } from '../lib/sessionComposer';
import { applyOutcome, initScaffold } from '../lib/scaffold';
import {
  applyAttemptToMastery, applyProbeResult, ensureProbeSchedules,
  type AttemptLedger,
} from '../lib/masteryTracker';
import { tallyAttempts } from '../lib/tally';
import {
  loadMasteryMap, saveMasteryMap,
  loadLedger, saveLedger,
  upsertSessionRecord, appendAttempts, loadAttempts, loadSessionRecords,
  loadScaffoldMemory, saveScaffoldMemory,
} from '../lib/sessionStore';
import { syncPassageShown } from '../lib/sync';
import { appendRecentPassageIds, appendRecentQuestionIds, loadRecentPassageIds, loadRecentQuestionIds } from '../lib/recentItems';
import { bumpSessionsCompleted } from '../lib/profile';
import { loadSignatures, saveSignatures, resolveRecipes, updateSignatures } from '../lib/errorSignatures';
import {
  SESSION_TIME_MS, TIMED_MODE_MAX_OVERRUN,
  STRUGGLE_SESSIONS_TO_ESCALATE, STRUGGLE_ACCURACY, RECOVERY_ACCURACY,
  MIN_ATTEMPTS_TO_JUDGE,
} from '../constants/config';
import { MIN_ITEMS_FOR_STARS } from '../lib/trophies';
import type { ScaffoldMove } from '../lib/scaffold';

interface Props {
  profile: Profile;
  mode:    SessionMode;
  onExit:  (updated: Profile) => void;
  onTrophyRoom: (updated: Profile) => void;
}

interface RunItem {
  item:  PracticeItem;
  phase: SessionPhase;
  /** Re-test of a mastered skill — a miss demotes it (see handleAttempt). */
  isRetentionProbe?: boolean;
  /** Teaching slot — walked through, never scored (build plan H1). */
  isWorkedExample?: boolean;
}

function newId(): string {
  try { return crypto.randomUUID(); } catch { return `a_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
}

export function Session({ profile, mode, onExit, onTrophyRoom }: Props) {
  const gender: Gender = profile.gender;
  const g = { gender };
  const sessionId = useMemo(newId, []);
  const startedAt = useMemo(() => new Date().toISOString(), []);
  const startedMs = useRef(Date.now());

  // Persistent state carried across items (refs so item callbacks see latest).
  // Self-heal on load: any skill sitting at שליטה with no probe scheduled gets
  // one now. Without this, a skill that graduated before probes were wired stays
  // "mastered" forever without ever being re-tested (the exact false-100% bug
  // the math audit found).
  const masteryRef = useRef<MasteryMap>(
    ensureProbeSchedules(loadMasteryMap(profile.profileId), new Date().toISOString()),
  );
  const ledgerRef  = useRef<AttemptLedger>(loadLedger(profile.profileId));
  const attemptsRef = useRef<PracticeAttempt[]>([]);
  const seqRef = useRef(0);
  const skillsSeenRef = useRef<Set<string>>(new Set());
  const seenPassagesRef = useRef<Set<string>>(new Set());
  const seenQuestionsRef = useRef<Set<string>>(new Set());

  // Combo (consecutive first-attempt-correct).
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const [combo, setCombo] = useState(0);

  // Scaffold — starts from cross-session memory (per profile), floor from gap.
  const floor = profile.gapProfileJson?.composerNotes.passageDifficultyFloor ?? 1;
  const nikudDependent = profile.gapProfileJson?.composerNotes.nikudDependence === true;

  // First-ever session has no memory to resume from. A reader the diagnostic
  // placed at Level 3+ and who is NOT nikud-dependent already reads unpointed
  // text at school, so starting her on full nikud would be a step backwards.
  const startNikud: NikudState = !nikudDependent && floor >= 3 ? 'partial' : 'full';

  const scaffoldRef = useRef<ScaffoldState>((() => {
    const mem = loadScaffoldMemory(profile.profileId)['reading'];
    return initScaffold(mem?.level ?? floor, mem?.nikud ?? startNikud);
  })());

  // Error-signature recipes shape this session (spec Part 4).
  const signaturesRef = useRef(loadSignatures(profile.profileId));
  const recipes = useMemo(() => resolveRecipes(signaturesRef.current), []);

  // Format eligibility (spec Part 5 caps): Reread max 4/week (1/session is
  // structural in the composer); Flash only under maintenance signatures.
  const { allowReread, maintenanceDrill } = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const rereadSessions = new Set(
      loadAttempts(profile.profileId)
        .filter(a => a.itemFormat === ItemFormat.Reread && new Date(a.createdAt).getTime() >= weekAgo)
        .map(a => a.sessionId),
    );
    const sigs = signaturesRef.current.signatures;
    return {
      allowReread: rereadSessions.size < 4,
      maintenanceDrill:
        sigs.ERR_LETTER_CONFUSE?.isActive === true ||
        sigs.ERR_NIKUD_DEPENDENT?.isActive === true,
    };
  }, [profile.profileId]);

  // Compose the plan once.
  const plan = useMemo(() => composeSession({
    sessionId,
    profileId:       profile.profileId,
    mode,
    masteryMap:      masteryRef.current,
    gapProfile:      profile.gapProfileJson,
    startLevel:      scaffoldRef.current.level,
    // The RESUMED nikud, not the cold-start default — otherwise every session
    // silently reset her to full vowels and the weaning never happened.
    startNikud:      scaffoldRef.current.nikud,
    recentPassages:  loadRecentPassageIds(profile.profileId),
    recentQuestions: loadRecentQuestionIds(profile.profileId),
    recipes,
    allowReread,
    maintenanceDrill,
  }), [sessionId]);

  // Composer trace — visible in devtools; helps Dima (and us) audit sessions.
  useEffect(() => {
    console.info('[composer]', plan.composerReasoning.join(' | '));
    console.info('[composer] items:', plan.plannedItems.map(p =>
      `${p.sessionPhase}:${p.item.skillCode}@L${p.item.level}/${p.item.nikud}`).join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const [items, setItems] = useState<RunItem[]>(
    plan.plannedItems.map(p => ({
      item: p.item, phase: p.sessionPhase,
      isWorkedExample: p.isWorkedExample, isRetentionProbe: p.isRetentionProbe,
    })),
  );
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  // Scaffold banner ("something shorter" / "ready for a challenge") — shown
  // briefly when the level moves (spec Part 3 scaffolding rules).
  const [banner, setBanner] = useState<ScaffoldMove | null>(null);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(id);
  }, [banner]);

  // Timed-mode clock. Ticks every 15s (a minute-granularity display does not
  // need a per-second re-render of the whole session).
  const [minutesLeft, setMinutesLeft] = useState(() => Math.ceil(SESSION_TIME_MS / 60000));
  useEffect(() => {
    if (mode !== 'time') return;
    const tick = () => setMinutesLeft(
      Math.max(0, Math.ceil((SESSION_TIME_MS - (Date.now() - startedMs.current)) / 60000)),
    );
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [mode]);

  const total = plan.targetItems ?? items.length;
  const current = items[index];

  // Mark the passage as shown the moment it renders (protects the no-repeat
  // constraint even if the session is abandoned mid-passage — spec Part 9).
  useEffect(() => {
    if (!current) return;
    seenPassagesRef.current.add(current.item.passage.id);
    seenQuestionsRef.current.add(current.item.question.id);
    syncPassageShown(current.item.passage.id);
  }, [current?.item.itemId]);

  // Partial-save on tab hide (kids close tabs mid-session — math lesson B7).
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden' && !finished) persistDraft(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  });

  function buildRecord(completed: boolean): SessionRecord {
    const wordCountByPassage: Record<string, number> = {};
    for (const a of attemptsRef.current) {
      const it = items.find(r => r.item.passage.id === a.passageId);
      if (it) wordCountByPassage[a.passageId] = it.item.passage.wordCount;
    }
    const tally = tallyAttempts(attemptsRef.current);
    const wordsRead = Object.values(
      Object.fromEntries(
        attemptsRef.current
          .filter(a => a.firstAttempt)
          .map(a => [a.passageId, wordCountByPassage[a.passageId] ?? 0]),
      ),
    ).reduce((s, n) => s + n, 0);

    return {
      sessionId,
      profileId:        profile.profileId,
      mode,
      startedAt,
      completedAt:      completed ? new Date().toISOString() : null,
      itemsAttempted:   tally.attempted,
      itemsCorrect:     tally.correct,
      primarySkillCode: plan.primarySkillCode,
      wordsRead,
      maxCombo:         maxComboRef.current,
    };
  }

  function persistDraft() {
    upsertSessionRecord(profile.profileId, buildRecord(false));
    saveMasteryMap(profile.profileId, masteryRef.current);
    saveLedger(profile.profileId, ledgerRef.current);
  }

  function handleAttempt(runItem: RunItem, r: FormatAttempt) {
    const attempt: PracticeAttempt = {
      id:            newId(),
      profileId:     profile.profileId,
      sessionId,
      itemId:        runItem.item.itemId,
      passageId:     runItem.item.passage.id,
      // Multi-question formats (reread) override skill/question per probe.
      questionId:    r.questionId ?? runItem.item.question.id,
      skillCode:     r.skillCode  ?? runItem.item.skillCode,
      itemFormat:    runItem.item.format,
      sessionPhase:  runItem.phase,
      level:         runItem.item.level,
      nikud:         runItem.item.nikud,
      answer:        r.chosenOption,
      correct:       r.correct,
      firstAttempt:  r.firstAttempt,
      usedHint:      r.usedHint,
      signatureHit:  r.signatureHit ?? null,
      responseMs:    r.responseMs,
      readMs:        r.readMs,
      rereadPass:    r.rereadPass,
      sequenceNumber: seqRef.current++,
      createdAt:     new Date().toISOString(),
    };
    attemptsRef.current.push(attempt);

    if (r.firstAttempt) {
      // Mastery (first attempts only).
      const isNewForSkill = !skillsSeenRef.current.has(runItem.item.skillCode);
      skillsSeenRef.current.add(runItem.item.skillCode);
      const res = applyAttemptToMastery({
        profileId: profile.profileId,
        attempt,
        masteryMap: masteryRef.current,
        ledger: ledgerRef.current,
        isNewSessionForSkill: isNewForSkill,
      });
      masteryRef.current = res.masteryMap;
      ledgerRef.current  = res.ledger;

      // Retention probe: the same answer also decides whether שליטה survives.
      // A pass pushes the next probe out (7 days → 30 → confirmed); a miss
      // demotes the skill back to בתהליך so the composer starts teaching it
      // again. Without this the app awards mastery and never rechecks it.
      if (runItem.isRetentionProbe) {
        masteryRef.current = applyProbeResult(
          masteryRef.current, runItem.item.skillCode, r.correct, attempt.createdAt,
        );
      }

      // Combo.
      if (r.correct) {
        comboRef.current += 1;
        maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      } else {
        comboRef.current = 0;
      }
      setCombo(comboRef.current);
    }
  }

  function handleComplete(summary: { firstAttemptCorrect: boolean }) {
    // Scaffold: apply the first-attempt outcome, re-pick the NEXT item's level
    // if the scaffold moved (aggressive climb / patient drop).
    const prev = scaffoldRef.current;
    const { state, move } = applyOutcome(prev, summary.firstAttemptCorrect, {
      floor,
      allowNikudAdvance: !nikudDependent,
    });
    scaffoldRef.current = state;
    if (move !== 'hold') setBanner(move);

    const nextIdx = index + 1;
    if (move !== 'hold' && nextIdx < items.length &&
        items[nextIdx].item.format === ItemFormat.PassageComp &&
        (items[nextIdx].item.level !== state.level || prev.nikud !== state.nikud)) {
      const replacement = pickItem({
        skill:            items[nextIdx].phase === 'blocked_practice' ? plan.primarySkillCode : undefined,
        level:            state.level,
        nikud:            state.nikud,
        excludePassages:  seenPassagesRef.current,
        excludeQuestions: seenQuestionsRef.current,
      });
      if (replacement) {
        setItems(prev => prev.map((it, i) => (i === nextIdx ? { ...it, item: replacement } : it)));
      }
    }

    if (nextIdx >= items.length) {
      finish();
      return;
    }

    // Timed mode: "מצב זמן — בערך 15 דקות" used to be decoration (the item
    // count alone decided the length). Now the clock actually ends the session,
    // but only at an item boundary and never before she has attempted enough
    // items to be eligible for stars — running out the clock at item 6 would
    // hand her a zero-star card she did nothing to deserve. The hard cap stops
    // that grace from stretching a slow session indefinitely.
    if (mode === 'time') {
      const elapsed = Date.now() - startedMs.current;
      const attempted = tallyAttempts(attemptsRef.current).attempted;
      const overtime = elapsed >= SESSION_TIME_MS * TIMED_MODE_MAX_OVERRUN;
      if (elapsed >= SESSION_TIME_MS && (attempted >= MIN_ITEMS_FOR_STARS || overtime)) {
        finish();
        return;
      }
    }

    setIndex(nextIdx);
  }

  function finish() {
    const record = buildRecord(true);
    upsertSessionRecord(profile.profileId, record);
    saveMasteryMap(profile.profileId, masteryRef.current);
    saveLedger(profile.profileId, ledgerRef.current);
    appendAttempts(profile.profileId, attemptsRef.current);
    appendRecentPassageIds(profile.profileId, [...seenPassagesRef.current]);
    appendRecentQuestionIds(profile.profileId, [...seenQuestionsRef.current]);
    // Cross-session struggle escalator. `struggleSessions` was declared, typed
    // and documented ("At 3 the composer escalates") — and then written as a
    // literal 0 on every save, so it could never reach 3 and nothing ever
    // escalated. A reader can be quietly under water for weeks without the
    // in-session scaffold noticing, which is exactly what the math audit found.
    const priorStruggle = loadScaffoldMemory(profile.profileId)['reading']?.struggleSessions ?? 0;
    const sessionAcc = record.itemsAttempted > 0
      ? record.itemsCorrect / record.itemsAttempted
      : null;

    let struggleSessions = priorStruggle;
    let carryLevel = scaffoldRef.current.level;

    if (sessionAcc !== null && record.itemsAttempted >= MIN_ATTEMPTS_TO_JUDGE) {
      if (sessionAcc < STRUGGLE_ACCURACY) {
        struggleSessions += 1;
        if (struggleSessions >= STRUGGLE_SESSIONS_TO_ESCALATE) {
          // Three weak sessions running: start the next one a level lower than
          // where this one ended, never below the diagnostic floor.
          carryLevel = Math.max(floor, carryLevel - 1) as typeof carryLevel;
          struggleSessions = 0;
        }
      } else if (sessionAcc >= RECOVERY_ACCURACY) {
        struggleSessions = 0;
      }
    }

    saveScaffoldMemory(profile.profileId, {
      reading: { level: carryLevel, nikud: scaffoldRef.current.nikud, struggleSessions },
    });
    // Re-detect error signatures over the full history incl. this session
    // (2×2 zone, fatigue, vocab breakdown, literal-vs-inference, nikud ratio).
    const nextSignatures = updateSignatures({
      prev:        signaturesRef.current,
      allAttempts: loadAttempts(profile.profileId),
      sessions:    loadSessionRecords(profile.profileId),
      gap:         profile.gapProfileJson,
    });
    signaturesRef.current = nextSignatures;
    saveSignatures(profile.profileId, nextSignatures);
    setRecord(record);
    setFinished(true);
  }

  const [record, setRecord] = useState<SessionRecord | null>(null);
  const updatedProfile = useMemo(
    () => (finished ? bumpSessionsCompleted(profile) : profile),
    [finished],
  );

  if (finished && record) {
    const masteredCount = Object.values(masteryRef.current).filter(r => r.status === 'שליטה').length;
    return (
      <EndSession
        record={record}
        gender={gender}
        name={profile.displayName}
        masteredCount={masteredCount}
        storiesRead={seenPassagesRef.current.size}
        onHome={() => onExit(updatedProfile)}
        onTrophyRoom={() => onTrophyRoom(updatedProfile)}
      />
    );
  }

  if (!current) {
    // Bank exhausted before any item — degrade gracefully.
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-lg text-gray-500">{t('trophy_room.empty', g)}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-6">
      {/* Header: progress + combo + exit */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button onClick={() => finish()} className="text-sm text-gray-400 underline">
          {t('session.exit', g)}
        </button>
        <div className="text-sm font-medium text-gray-500">
          {mode === 'time'
            ? t('session.time_left', { ...g, min: minutesLeft })
            : t('session.progress', { ...g, current: index + 1, total })}
        </div>
        <div className="text-sm font-bold text-brand-coral min-w-16 text-start">
          {combo >= 2 ? t('session.combo', { ...g, count: combo }) : ''}
        </div>
      </div>

      {/* Scaffold move banner. The nikud step gets its own loud green moment —
          reading without vowels is the milestone she can actually feel. */}
      {banner && (
        <div className="w-full max-w-2xl mb-3 reveal-in">
          <div
            className="rounded-2xl px-4 py-2 text-center font-bold"
            style={banner === 'climb' || banner === 'nikud_forward'
              ? { background: '#DCFCE7', color: '#166534' }
              : { background: '#FEF3C7', color: '#92400E' }}
          >
            {banner === 'climb'         ? t('scaffold.climb', g)
             : banner === 'nikud_forward' ? t(scaffoldRef.current.nikud === 'none'
                                              ? 'scaffold.nikud_none' : 'scaffold.nikud_partial', g)
             : banner === 'nikud_back'    ? t('scaffold.nikud_back', g)
             :                              t('scaffold.drop', g)}
          </div>
        </div>
      )}

      <div className="flex-1 w-full flex items-start justify-center">
        {(() => {
          const common = {
            key:  current.item.itemId,
            item: current.item,
            gender,
            readFloorMultiplier: recipes.readFloorMultiplier,
            gapProfile: profile.gapProfileJson,
            onAttempt:  (r: FormatAttempt) => handleAttempt(current, r),
            onComplete: handleComplete,
          };
          if (current.isWorkedExample) {
            return (
              <WorkedExample
                key={current.item.itemId}
                item={current.item}
                gender={gender}
                onComplete={() => handleComplete({ firstAttemptCorrect: true })}
              />
            );
          }
          switch (current.item.format) {
            case ItemFormat.Ambiguity:     return <Ambiguity {...common} />;
            case ItemFormat.Reread:        return <Reread {...common} />;
            case ItemFormat.EventOrdering: return <EventOrdering {...common} />;
            case ItemFormat.WordInContext: return <WordInContext {...common} />;
            case ItemFormat.Flash:         return <Flash {...common} />;
            default:                       return <PassageComp {...common} />;
          }
        })()}
      </div>
    </div>
  );
}
