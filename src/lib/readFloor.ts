/**
 * How long "סיימתי לקרוא" stays locked.
 *
 * The floor exists to protect the silent-rate measurement and to blunt
 * click-through — but a floor calibrated to the wrong reader is worse than
 * none. A fixed 1s/word assumes ~60 wpm; a 4th grader reads 90–140, finishes,
 * and then sits in front of a button that refuses to open. The lesson she
 * learns is that the button lies, which costs us the honesty of every timing
 * signal after it.
 *
 * So once the diagnostic has measured her, the floor is a fraction of HER
 * typical reading time for a passage of that length, clamped at both ends.
 * Before that (and if the baseline looks implausible) we fall back to the
 * conservative fixed rate.
 */

import {
  READ_FLOOR_MS_PER_WORD,
  READ_FLOOR_MIN_MS,
  READ_FLOOR_BASELINE_FRACTION,
  READ_FLOOR_MIN_MS_PER_WORD,
  READ_FLOOR_MAX_MS_PER_WORD,
} from '../constants/config';
import type { GapProfile } from '../types';

/** Her measured silent rate in wpm, or null when not yet diagnosed. */
export function baselineWpm(gap: GapProfile | null): number | null {
  const w = gap?.baselineMetrics.silentRateWithNikudWpm;
  // Guard nonsense: a mis-tapped diagnostic can produce absurd rates, and a
  // 900-wpm "baseline" would remove the floor entirely.
  return typeof w === 'number' && w >= 20 && w <= 400 ? w : null;
}

/**
 * Milliseconds the passage must be on screen before she can continue.
 *
 * @param wordCount  words in the passage
 * @param gap        diagnostic profile, for her measured rate
 * @param multiplier recipe inflation (fast-inaccurate zone asks for more dwell)
 */
export function readFloorMs(
  wordCount: number,
  gap: GapProfile | null,
  multiplier = 1,
): number {
  const wpm = baselineWpm(gap);
  const perWord = wpm === null
    ? READ_FLOOR_MS_PER_WORD
    : clamp((60000 / wpm) * READ_FLOOR_BASELINE_FRACTION,
            READ_FLOOR_MIN_MS_PER_WORD, READ_FLOOR_MAX_MS_PER_WORD);
  return Math.max(READ_FLOOR_MIN_MS, wordCount * perWord) * multiplier;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
