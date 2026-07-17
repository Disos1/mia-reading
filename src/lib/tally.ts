/**
 * First-attempt-only accounting — the single source of truth for every
 * denominator in the app (stars, accuracy %, mastery window, parent
 * dashboard, daily email).
 *
 * Math lesson B3: retries inflated the accuracy denominator and star counts
 * were wrong for weeks. The fix is one shared helper, used everywhere, never
 * reimplemented inline. Retries exist for pedagogy (hint → retry) but never
 * enter a denominator.
 */

import type { PracticeAttempt } from '../types';

export interface Tally {
  attempted: number;   // distinct items answered (first attempts)
  correct:   number;   // first attempts that were correct
  wordsRead: number;   // total words across the passages first-attempted
}

/** Count first attempts only; sum words read on those first attempts. */
export function tallyAttempts(
  attempts: PracticeAttempt[],
  wordCountFor?: (a: PracticeAttempt) => number,
): Tally {
  const firsts = attempts.filter(a => a.firstAttempt);
  return {
    attempted: firsts.length,
    correct:   firsts.filter(a => a.correct).length,
    wordsRead: wordCountFor ? firsts.reduce((s, a) => s + wordCountFor(a), 0) : 0,
  };
}

/** First-attempt accuracy in [0,1]; 0 when nothing has been attempted. */
export function accuracyOf(tally: Tally): number {
  return tally.attempted > 0 ? tally.correct / tally.attempted : 0;
}
