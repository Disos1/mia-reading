/**
 * Reading engine thresholds — named constants, never hardcoded inline.
 * Mirrors mia-math/constants/config.ts, tuned for reading.
 */

// ─── Mastery (spec Part 3, hardened per math false-mastery audit) ──────────────

export const MASTERY_ACCURACY_THRESHOLD = 0.80; // 80% first-attempt window accuracy
export const MASTERY_ITEM_MINIMUM       = 10;   // min first attempts in the rolling window
export const MASTERY_SESSION_MINIMUM    = 2;    // min distinct sessions spanning them
export const MASTERY_MIN_DISTINCT_DAYS  = 2;    // window must span ≥ 2 calendar days

// ─── Retention probes (days after mastery) ─────────────────────────────────────

export const RETENTION_PROBE_SHORT_DAYS  = 7;
export const RETENTION_PROBE_LONG_DAYS   = 30;
export const RETENTION_DEMOTION_ACCURACY = 0.70;

// ─── Re-diagnostic triggers ────────────────────────────────────────────────────

export const REDIAG_SESSION_THRESHOLD = 10;
export const REDIAG_DAY_THRESHOLD     = 7;

// ─── Scaffold (spec Part 3: patient drop / aggressive climb) ───────────────────

/** Highest reading level the scaffold will climb to (4 = 4th grade, added in
 *  Phase 5 — the ceiling stayed at 3 until Phase 6, which capped her). */
export const MAX_READING_LEVEL = 4;
export const CLIMB_STREAK = 2;  // 2 consecutive correct at a level → climb one level
export const DROP_STREAK  = 2;  // 2 consecutive wrong at a level → drop one level

// ─── Session shape (spec Part 3) ───────────────────────────────────────────────

/** Timed mode target (ms) — 15 min start (auto-ramp to 20 is V1.5). */
export const SESSION_TIME_MS = 15 * 60 * 1000;
/** How far past SESSION_TIME_MS a timed session may run while waiting for her
 *  to reach star eligibility. Past this it ends regardless. */
export const TIMED_MODE_MAX_OVERRUN = 1.5;
/** Quantity mode default item count. */
export const SESSION_QUANTITY_ITEMS = 15;
/** Open-mode "עוד אחד?" nudge cadence. */
export const OPEN_MODE_NUDGE_EVERY = 5;

// ─── Read-time floor (spec Part 4 anti-cheat; plan D4) ─────────────────────────
//
// "סיימתי לקרוא" stays disabled until roughly this many ms per passage word
// have elapsed. Protects the silent-rate measurement AND blunts click-through.
// ~1s/word is generous for an 8-year-old; a floor, not a target.
export const READ_FLOOR_MS_PER_WORD = 1000;
/** Absolute minimum so 1-2 word Level-1 passages still require a real beat. */
export const READ_FLOOR_MIN_MS = 2500;

/**
 * Calibrated floor. The fixed 1s/word above assumes ~60 wpm — right for a
 * struggling 3rd grader, wrong for a 4th grader reading 90–140, who would sit
 * in front of a button that refuses to unlock and learn that it lies.
 *
 * Once a diagnostic baseline exists we derive the floor from HER measured rate
 * instead: she must spend at least this fraction of her own typical reading
 * time on the passage. Clamped so a wild baseline can't remove the floor
 * altogether or make it punitive.
 */
export const READ_FLOOR_BASELINE_FRACTION = 0.6;
export const READ_FLOOR_MIN_MS_PER_WORD   = 220;   // ≈ 270 wpm ceiling on speed
export const READ_FLOOR_MAX_MS_PER_WORD   = 1000;  // the old fixed value, as a cap

/** Israeli grade-level silent reading norms (wpm), used for parent-facing
 *  comparisons and the fast/slow zone split. 3rd ≈ 60, 4th ≈ 90. */
export const GRADE_NORM_WPM_G3 = 60;
export const GRADE_NORM_WPM_G4 = 90;

// ─── Stepwise question reveal (plan B1.2 / C4, research-backed anti-guessing) ──
//
// After "סיימתי לקרוא" the question shows ALONE for this long before the four
// answer options fade in — forcing covert retrieval before recognition.
export const STEPWISE_REVEAL_MS = 4000;

// ─── Passage no-repeat (spec Part 9, sized up per plan B2) ─────────────────────

export const PASSAGE_NO_REPEAT_DAYS = 10;
export const RECENT_BUFFER_MAX      = 300; // passage + question ids kept per profile

// ─── Session store caps (math lessons B2/B5) ───────────────────────────────────

export const MAX_SESSIONS = 500;
export const MAX_ATTEMPTS = 500;
