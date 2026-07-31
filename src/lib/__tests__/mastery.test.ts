import { describe, it, expect } from 'vitest';
import {
  applyAttemptToMastery, applyProbeResult, probesDue,
  windowAccuracy, masteredSkills, type AttemptLedger,
} from '../masteryTracker';
import { tallyAttempts, accuracyOf } from '../tally';
import type { MasteryMap, PracticeAttempt, SkillCode } from '../../types';
import { ItemFormat } from '../../types';

const PROFILE = 'p1';

function attempt(over: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: Math.random().toString(36).slice(2),
    profileId: PROFILE, sessionId: 's1',
    itemId: 'i1', passageId: 'pa1', questionId: 'q1',
    skillCode: 'COMP_LITERAL' as SkillCode,
    itemFormat: ItemFormat.PassageComp, sessionPhase: 'interleaved',
    level: 1, nikud: 'full',
    answer: 0, correct: true, firstAttempt: true, usedHint: false,
    signatureHit: null, responseMs: 1000, readMs: 5000,
    sequenceNumber: 0, createdAt: '2026-07-01T10:00:00.000Z',
    ...over,
  };
}

/** Feed n first attempts, all on one skill. */
function feed(
  n: number, correct: boolean, day: string, sessionId: string,
  state: { map: MasteryMap; ledger: AttemptLedger },
) {
  for (let i = 0; i < n; i++) {
    const res = applyAttemptToMastery({
      profileId: PROFILE,
      attempt: attempt({ correct, sessionId, createdAt: `${day}T10:0${i}:00.000Z` }),
      masteryMap: state.map, ledger: state.ledger,
      isNewSessionForSkill: i === 0,
    });
    state.map = res.masteryMap;
    state.ledger = res.ledger;
  }
}

describe('mastery graduation — the false-mastery hardening', () => {
  it('does NOT grant שליטה for 10 correct answers in one sitting', () => {
    // This is the exact failure the math app shipped with: at hundreds of items
    // a day, a same-day streak of 10 was statistically guaranteed.
    const s = { map: {} as MasteryMap, ledger: {} as AttemptLedger };
    feed(10, true, '2026-07-01', 's1', s);
    expect(windowAccuracy(s.ledger, 'COMP_LITERAL')).toBe(1);
    expect(s.map.COMP_LITERAL.status).toBe('בתהליך');
  });

  it('grants שליטה once the evidence spans 2 days and 2 sessions', () => {
    const s = { map: {} as MasteryMap, ledger: {} as AttemptLedger };
    feed(5, true, '2026-07-01', 's1', s);
    expect(s.map.COMP_LITERAL.status).toBe('בתהליך');
    feed(5, true, '2026-07-02', 's2', s);
    expect(s.map.COMP_LITERAL.status).toBe('שליטה');
    expect(masteredSkills(s.map)).toEqual(['COMP_LITERAL']);
  });

  it('withholds שליטה when accuracy is below the threshold', () => {
    const s = { map: {} as MasteryMap, ledger: {} as AttemptLedger };
    feed(5, true, '2026-07-01', 's1', s);
    feed(5, false, '2026-07-02', 's2', s);   // 50% over the window
    expect(s.map.COMP_LITERAL.status).toBe('בתהליך');
  });

  it('ignores retries entirely — only first attempts count', () => {
    const s = { map: {} as MasteryMap, ledger: {} as AttemptLedger };
    const res = applyAttemptToMastery({
      profileId: PROFILE,
      attempt: attempt({ firstAttempt: false, correct: true }),
      masteryMap: s.map, ledger: s.ledger, isNewSessionForSkill: true,
    });
    expect(res.ledger.COMP_LITERAL).toBeUndefined();
    expect(res.masteryMap.COMP_LITERAL).toBeUndefined();
  });

  it('demotes a mastered skill when the rolling window decays', () => {
    const s = { map: {} as MasteryMap, ledger: {} as AttemptLedger };
    feed(5, true, '2026-07-01', 's1', s);
    feed(5, true, '2026-07-02', 's2', s);
    expect(s.map.COMP_LITERAL.status).toBe('שליטה');
    feed(6, false, '2026-07-03', 's3', s);   // window now 40%
    expect(s.map.COMP_LITERAL.status).toBe('בתהליך');
  });
});

describe('retention probes', () => {
  function mastered(): MasteryMap {
    const s = { map: {} as MasteryMap, ledger: {} as AttemptLedger };
    feed(5, true, '2026-07-01', 's1', s);
    feed(5, true, '2026-07-02', 's2', s);
    return s.map;
  }

  it('schedules a probe 7 days after graduation, not before', () => {
    const map = mastered();
    expect(probesDue(map, '2026-07-05T10:00:00.000Z')).toEqual([]);
    expect(probesDue(map, '2026-07-10T10:00:00.000Z')).toEqual(['COMP_LITERAL']);
  });

  it('a failed probe returns the skill to active practice', () => {
    const next = applyProbeResult(mastered(), 'COMP_LITERAL', false, '2026-07-10T10:00:00.000Z');
    expect(next.COMP_LITERAL.status).toBe('בתהליך');
    expect(next.COMP_LITERAL.retentionProbeDueAt).toBeNull();
  });

  it('two passed probes confirm retention and stop the schedule', () => {
    let map = applyProbeResult(mastered(), 'COMP_LITERAL', true, '2026-07-10T10:00:00.000Z');
    expect(map.COMP_LITERAL.retentionProbeDueAt).not.toBeNull();
    map = applyProbeResult(map, 'COMP_LITERAL', true, '2026-08-03T10:00:00.000Z');
    expect(map.COMP_LITERAL.status).toBe('שליטה');
    expect(map.COMP_LITERAL.retentionProbeDueAt).toBeNull();
  });
});

describe('tally — first-attempt-only accounting', () => {
  it('excludes retries from both numerator and denominator', () => {
    // The math-app bug: a wrong first try plus a correct retry read as 1/2
    // attempted-and-correct, inflating accuracy and star counts.
    const attempts = [
      attempt({ correct: false, firstAttempt: true }),
      attempt({ correct: true,  firstAttempt: false }),
      attempt({ correct: true,  firstAttempt: true }),
    ];
    const t = tallyAttempts(attempts);
    expect(t.attempted).toBe(2);
    expect(t.correct).toBe(1);
    expect(accuracyOf(t)).toBe(0.5);
  });

  it('sums words read across first attempts only', () => {
    const attempts = [
      attempt({ firstAttempt: true,  passageId: 'a' }),
      attempt({ firstAttempt: false, passageId: 'a' }),
    ];
    expect(tallyAttempts(attempts, () => 10).wordsRead).toBe(10);
  });

  it('reports zero accuracy rather than NaN for an empty session', () => {
    expect(accuracyOf(tallyAttempts([]))).toBe(0);
  });
});
