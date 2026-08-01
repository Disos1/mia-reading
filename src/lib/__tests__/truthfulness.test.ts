/**
 * Truthfulness tests (build plan Phase 6).
 *
 * Every case here is something the app used to SAY that the engine did not do.
 * Nothing crashed; the screen simply promised a reward, a badge, or a duration
 * that was never real. A child cannot debug that — she just learns the praise
 * is noise. These assertions keep the copy tied to the mechanics.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTrophyState, deriveTrophyExtras, starsForSession, MIN_ITEMS_FOR_STARS,
} from '../trophies';
import { SESSION_TIME_MS, TIMED_MODE_MAX_OVERRUN } from '../../constants/config';
import type { PracticeAttempt, SessionRecord } from '../../types';
import { ItemFormat } from '../../types';

function attempt(over: Partial<PracticeAttempt>): PracticeAttempt {
  return {
    id: 'a', profileId: 'p', sessionId: 's', itemId: 'i',
    passageId: 'p1', questionId: 'q1', skillCode: 'COMP_LITERAL',
    itemFormat: ItemFormat.PassageComp, sessionPhase: 'blocked_practice',
    level: 1, nikud: 'full', answer: 0, correct: true, firstAttempt: true,
    usedHint: false, signatureHit: null, responseMs: 1000, readMs: 5000,
    rereadPass: undefined, sequenceNumber: 1, createdAt: '2026-08-01T10:00:00.000Z',
    ...over,
  } as PracticeAttempt;
}

function session(over: Partial<SessionRecord>): SessionRecord {
  return {
    sessionId: 's', profileId: 'p', mode: 'quantity',
    startedAt: '2026-08-01T10:00:00.000Z', completedAt: '2026-08-01T10:15:00.000Z',
    itemsAttempted: 10, itemsCorrect: 9, primarySkillCode: 'COMP_LITERAL',
    wordsRead: 200, maxCombo: 3,
    ...over,
  } as SessionRecord;
}

describe('trophy extras are derived, not hardcoded to zero', () => {
  it('counts unpointed passages so the no-nikud badges are reachable at all', () => {
    const extras = deriveTrophyExtras([
      attempt({ passageId: 'p1', nikud: 'none' }),
      attempt({ passageId: 'p2', nikud: 'none' }),
      attempt({ passageId: 'p3', nikud: 'full' }),
    ], 0);
    expect(extras.noNikudPassages).toBe(2);

    const state = computeTrophyState([session({})], extras);
    expect(state.trophies.find(t => t.id === 'first_no_nikud')?.earned).toBe(true);
  });

  it('counts a passage once no matter how many questions it carried', () => {
    const extras = deriveTrophyExtras([
      attempt({ passageId: 'p1', nikud: 'none', questionId: 'q1' }),
      attempt({ passageId: 'p1', nikud: 'none', questionId: 'q2' }),
      attempt({ passageId: 'p1', nikud: 'none', questionId: 'q3' }),
    ], 0);
    expect(extras.noNikudPassages).toBe(1);
  });

  it('ignores retries and misses — first-attempt-correct only, like everything else', () => {
    const extras = deriveTrophyExtras([
      attempt({ passageId: 'p1', nikud: 'none', firstAttempt: false }),
      attempt({ passageId: 'p2', nikud: 'none', correct: false }),
      attempt({ passageId: 'p3', level: 4, firstAttempt: false }),
    ], 0);
    expect(extras.noNikudPassages).toBe(0);
    expect(extras.level3Passages).toBe(0);
  });

  it('treats Level 4 as clearing the Level-3 bar', () => {
    const extras = deriveTrophyExtras([attempt({ passageId: 'p1', level: 4 })], 0);
    expect(extras.level3Passages).toBe(1);
  });
});

describe('zero stars distinguishes a short session from careless reading', () => {
  it('a short session earns nothing even at perfect accuracy — so the copy must not blame her', () => {
    const short = session({ itemsAttempted: MIN_ITEMS_FOR_STARS - 1, itemsCorrect: MIN_ITEMS_FOR_STARS - 1 });
    expect(starsForSession(short)).toBe(0);
    // The card branches on exactly this predicate.
    expect(short.itemsAttempted < MIN_ITEMS_FOR_STARS).toBe(true);
  });

  it('a long session below the accuracy floor is the case where the nudge IS fair', () => {
    const careless = session({ itemsAttempted: 12, itemsCorrect: 5, maxCombo: 1 });
    expect(starsForSession(careless)).toBe(0);
    expect(careless.itemsAttempted < MIN_ITEMS_FOR_STARS).toBe(false);
  });
});

describe('timed mode has a real clock behind the label', () => {
  it('promises ~15 minutes and the constant says 15 minutes', () => {
    expect(SESSION_TIME_MS).toBe(15 * 60 * 1000);
  });

  it('bounds the star-eligibility grace period instead of running forever', () => {
    expect(TIMED_MODE_MAX_OVERRUN).toBeGreaterThan(1);
    expect(SESSION_TIME_MS * TIMED_MODE_MAX_OVERRUN).toBeLessThanOrEqual(25 * 60 * 1000);
  });
});
