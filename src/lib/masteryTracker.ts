/**
 * Mastery tracker — ported from mia-math with the hardened graduation rule.
 *
 *   status = 'שליטה' iff
 *     window accuracy ≥ 0.80 over the last 10 first attempts on the skill
 *     AND ≥ 10 first attempts recorded
 *     AND those attempts span ≥ 2 distinct calendar days
 *     AND session_count ≥ 2
 *
 * Why the hardening (math false-mastery audit, 2026-07): at hundreds of items/
 * day a same-day lucky streak of 10 was statistically guaranteed, so ≥2 days +
 * ≥2 sessions is required. Reading does NOT use math's abstract-layer gate
 * (that was CPA-specific); the reading analog — not counting the easiest
 * scaffold — is a deliberate future refinement (each ledger entry already
 * records level+nikud for it). The day/session/window rules alone kill the
 * lucky-streak failure mode.
 *
 * Retention probes: graduation schedules +7 days; passing schedules +30; both
 * passed → confirmed. A failed probe demotes to 'בתהליך' and returns the skill
 * to active practice.
 *
 * Pure functions, no side effects. Persistence lives in sessionStore.ts.
 */

import type {
  MasteryMap,
  MasteryRecord,
  PracticeAttempt,
  SkillCode,
  ReadingLevel,
  NikudState,
} from '../types';
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_ITEM_MINIMUM,
  MASTERY_SESSION_MINIMUM,
  MASTERY_MIN_DISTINCT_DAYS,
  RETENTION_PROBE_SHORT_DAYS,
  RETENTION_PROBE_LONG_DAYS,
} from '../constants/config';

const WINDOW = MASTERY_ITEM_MINIMUM; // 10
const DAY_MS = 24 * 60 * 60 * 1000;

/** One rolling-ledger entry: correctness, scaffold, local calendar day. */
export interface LedgerEntry {
  c: boolean;
  lv: ReadingLevel;
  n: NikudState;
  d: string;   // YYYY-MM-DD, local
}

/** Per-skill rolling ledger. Outer key: skillCode. */
export type AttemptLedger = Record<string, LedgerEntry[]>;

function toLocalDay(iso: string): string {
  const dt = new Date(iso);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Append a first-attempt result; keep the last WINDOW entries. */
export function appendToLedger(
  ledger: AttemptLedger,
  skillCode: string,
  entry: LedgerEntry,
): AttemptLedger {
  const prior = ledger[skillCode] ?? [];
  const next = [...prior, entry].slice(-WINDOW);
  return { ...ledger, [skillCode]: next };
}

export function windowAccuracy(ledger: AttemptLedger, skillCode: string): number {
  const window = ledger[skillCode];
  if (!window || window.length === 0) return 0;
  return window.filter(e => e.c).length / window.length;
}

export function windowSize(ledger: AttemptLedger, skillCode: string): number {
  return ledger[skillCode]?.length ?? 0;
}

function windowSpansDays(ledger: AttemptLedger, skillCode: string, minDays: number): boolean {
  const window = ledger[skillCode];
  if (!window) return false;
  return new Set(window.map(e => e.d)).size >= minDays;
}

// ─── Mastery update ────────────────────────────────────────────────────────────

/**
 * Apply one practice attempt to the mastery map + ledger. Side-effect free.
 *
 *  - Only first-attempt answers affect the ledger (retries never count).
 *  - itemCount increments per first attempt.
 *  - sessionCount increments once per (skill, session) — caller passes the flag.
 *  - Graduation requires the window to span ≥ 2 distinct days AND ≥ 2 sessions.
 *  - Graduation schedules the 7-day retention probe.
 *  - Demotion from שליטה → בתהליך when window accuracy drops below threshold.
 */
export function applyAttemptToMastery(args: {
  profileId:            string;
  attempt:              PracticeAttempt;
  masteryMap:           MasteryMap;
  ledger:               AttemptLedger;
  isNewSessionForSkill: boolean;
}): { masteryMap: MasteryMap; ledger: AttemptLedger } {
  const { attempt, profileId, isNewSessionForSkill } = args;
  let { masteryMap, ledger } = args;

  if (!attempt.firstAttempt) {
    return { masteryMap, ledger };
  }

  ledger = appendToLedger(ledger, attempt.skillCode, {
    c: attempt.correct,
    lv: attempt.level,
    n: attempt.nikud,
    d: toLocalDay(attempt.createdAt),
  });

  const prior: MasteryRecord = masteryMap[attempt.skillCode] ?? {
    profileId,
    skillCode:            attempt.skillCode,
    status:               'בתהליך',
    firstAttemptAccuracy: 0,
    itemCount:            0,
    sessionCount:         0,
    lastPracticedAt:      attempt.createdAt,
    needsRetentionProbe:  false,
    retentionProbeDueAt:  null,
  };

  const itemCount    = prior.itemCount + 1;
  const sessionCount = prior.sessionCount + (isNewSessionForSkill ? 1 : 0);
  const accuracy     = windowAccuracy(ledger, attempt.skillCode);
  const size         = windowSize(ledger, attempt.skillCode);

  const graduates =
    prior.status !== 'שליטה' &&
    accuracy     >= MASTERY_ACCURACY_THRESHOLD &&
    size         >= MASTERY_ITEM_MINIMUM &&
    sessionCount >= MASTERY_SESSION_MINIMUM &&
    windowSpansDays(ledger, attempt.skillCode, MASTERY_MIN_DISTINCT_DAYS);

  const demotes =
    prior.status === 'שליטה' &&
    size     >= MASTERY_ITEM_MINIMUM &&
    accuracy <  MASTERY_ACCURACY_THRESHOLD;

  const nextStatus: MasteryRecord['status'] =
    graduates ? 'שליטה' :
    demotes   ? 'בתהליך' :
                prior.status;

  const next: MasteryRecord = {
    ...prior,
    status:               nextStatus,
    firstAttemptAccuracy: accuracy,
    itemCount,
    sessionCount,
    lastPracticedAt:      attempt.createdAt,
  };

  if (graduates) {
    next.probesPassed        = 0;
    next.needsRetentionProbe = false;
    next.retentionProbeDueAt = new Date(
      new Date(attempt.createdAt).getTime() + RETENTION_PROBE_SHORT_DAYS * DAY_MS,
    ).toISOString();
  } else if (demotes) {
    next.probesPassed        = undefined;
    next.needsRetentionProbe = false;
    next.retentionProbeDueAt = null;
  }

  return {
    masteryMap: { ...masteryMap, [attempt.skillCode]: next },
    ledger,
  };
}

// ─── Retention probes ─────────────────────────────────────────────────────────

export function probesDue(masteryMap: MasteryMap, nowIso: string): SkillCode[] {
  return Object.values(masteryMap)
    .filter(r =>
      r.status === 'שליטה' &&
      r.retentionProbeDueAt !== null &&
      r.retentionProbeDueAt <= nowIso)
    .map(r => r.skillCode);
}

export function applyProbeResult(
  masteryMap: MasteryMap,
  skillCode:  SkillCode,
  correct:    boolean,
  nowIso:     string,
): MasteryMap {
  const prior = masteryMap[skillCode];
  if (!prior || prior.status !== 'שליטה') return masteryMap;

  let next: MasteryRecord;
  if (!correct) {
    next = {
      ...prior,
      status:              'בתהליך',
      probesPassed:        undefined,
      needsRetentionProbe: false,
      retentionProbeDueAt: null,
    };
  } else {
    const passed = (prior.probesPassed ?? 0) + 1;
    next = {
      ...prior,
      probesPassed:        passed,
      needsRetentionProbe: false,
      retentionProbeDueAt: passed >= 2
        ? null
        : new Date(
            new Date(nowIso).getTime() +
            (RETENTION_PROBE_LONG_DAYS - RETENTION_PROBE_SHORT_DAYS) * DAY_MS,
          ).toISOString(),
    };
  }
  return { ...masteryMap, [skillCode]: next };
}

/** Self-healing: any שליטה record with no probe scheduled gets probed now. */
export function ensureProbeSchedules(masteryMap: MasteryMap, nowIso: string): MasteryMap {
  let changed = false;
  const next: MasteryMap = { ...masteryMap };
  for (const [skill, r] of Object.entries(masteryMap)) {
    if (r.status === 'שליטה' && r.retentionProbeDueAt === null && (r.probesPassed ?? 0) < 2) {
      next[skill] = { ...r, probesPassed: r.probesPassed ?? 0, retentionProbeDueAt: nowIso };
      changed = true;
    }
  }
  return changed ? next : masteryMap;
}

// ─── Seeding from gap profile ─────────────────────────────────────────────────

/**
 * Build the initial mastery map from diagnostic results. Seeds active-work
 * skills as 'בתהליך'; leaves untouched skills as 'טרם נלמד'.
 */
export function seedMasteryFromDiagnostic(
  profileId: string,
  gaps: SkillCode[],
  strengths: SkillCode[],
  completedAtIso: string,
): MasteryMap {
  const map: MasteryMap = {};
  const build = (skillCode: SkillCode, initialAccuracy: number): MasteryRecord => ({
    profileId,
    skillCode,
    status:               'בתהליך',
    firstAttemptAccuracy: initialAccuracy,
    itemCount:            0,
    sessionCount:         0,
    lastPracticedAt:      completedAtIso,
    needsRetentionProbe:  false,
    retentionProbeDueAt:  null,
  });
  for (const g of gaps)      map[g] = build(g, 0.5);
  for (const s of strengths) map[s] = build(s, 1.0);
  return map;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export function isUnprobed(masteryMap: MasteryMap, skillCode: string): boolean {
  return !(skillCode in masteryMap);
}

export function isMastered(masteryMap: MasteryMap, skillCode: string): boolean {
  return masteryMap[skillCode]?.status === 'שליטה';
}

export function skillsInProgress(masteryMap: MasteryMap): SkillCode[] {
  return Object.values(masteryMap)
    .filter(r => r.status === 'בתהליך')
    .map(r => r.skillCode);
}

export function masteredSkills(masteryMap: MasteryMap): SkillCode[] {
  return Object.values(masteryMap)
    .filter(r => r.status === 'שליטה')
    .map(r => r.skillCode);
}
