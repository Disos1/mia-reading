/**
 * Trophy / reward computation — ported from mia-math (the proven anti-guessing
 * reward package) and extended with reading-specific badges.
 *
 * Star rule (rewards care, not volume — math lesson B1):
 *   Accuracy floor — a guessed session earns nothing:
 *     < 60 %  → 0 base stars   ·   60–79 % → 1   ·   ≥ 80 % → 2
 *   Combo bonus — only on a session that cleared the floor (base ≥ 1):
 *     maxCombo ≥ 5 → +1   ·   maxCombo ≥ 10 → +2
 *   Max 4 stars/session. Sessions under the item floor earn 0.
 *
 * Reading is a new app with no legacy sessions, so the item floor applies to
 * every session (no grandfathering date needed).
 *
 * Badges are all-time milestones; once earned they stay earned. Display order
 * is the order they were earned (a timeline), then locked-by-closest-first —
 * fixing the "badges reshuffle every run" feedback from math.
 */

import type { SessionRecord } from '../types';

// ─── Star rule ───────────────────────────────────────────────────────────────

export const HIGH_ACCURACY_THRESHOLD = 0.8;
export const MIN_ACCURACY_THRESHOLD  = 0.6;
export const COMBO_BONUS_1           = 5;
export const COMBO_BONUS_2           = 10;
export const MAX_STARS_PER_SESSION   = 4;
export const MIN_ITEMS_FOR_STARS     = 8;

export function isSubstantial(r: SessionRecord): boolean {
  return r.itemsAttempted >= MIN_ITEMS_FOR_STARS;
}

export function starsForSession(r: SessionRecord): number {
  if (r.itemsAttempted < MIN_ITEMS_FOR_STARS) return 0;
  const acc  = r.itemsCorrect / r.itemsAttempted;
  const base =
    acc >= HIGH_ACCURACY_THRESHOLD ? 2 :
    acc >= MIN_ACCURACY_THRESHOLD  ? 1 :
                                     0;
  if (base === 0) return 0;
  const combo = r.maxCombo ?? 0;
  const bonus = combo >= COMBO_BONUS_2 ? 2 : combo >= COMBO_BONUS_1 ? 1 : 0;
  return Math.min(base + bonus, MAX_STARS_PER_SESSION);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionStar {
  sessionId: string;
  stars:     number;
  pct:       number;
  date:      string | null;
}

export interface Trophy {
  id:       string;
  labelKey: string;   // i18n key → t(labelKey, {gender})
  emoji:    string;
  earned:   boolean;
  earnedAt: string | null;
  progress: number;
  target:   number;
}

export interface TrophyState {
  totalStars:    number;
  sessionStars:  SessionStar[];
  trophies:      Trophy[];
  earnedCount:   number;
  totalTrophies: number;
  currentStreak: number;
}

/** Reading-specific counters the caller derives from the attempt ledger
 *  (they need per-item level/nikud, which SessionRecord doesn't carry). */
export interface TrophyExtras {
  masteredCount:   number;
  noNikudPassages: number;
  level3Passages:  number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Main entry ──────────────────────────────────────────────────────────────

export function computeTrophyState(
  records: SessionRecord[],
  extras: TrophyExtras = { masteredCount: 0, noNikudPassages: 0, level3Passages: 0 },
): TrophyState {
  const completed = records
    .filter(r => r.completedAt)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));

  const sessionStars: SessionStar[] = completed.map(r => ({
    sessionId: r.sessionId,
    stars:     starsForSession(r),
    pct:       r.itemsAttempted > 0 ? Math.round((r.itemsCorrect / r.itemsAttempted) * 100) : 0,
    date:      r.completedAt,
  }));

  const totalStars   = sessionStars.reduce((s, x) => s + x.stars, 0);
  const substantial  = completed.filter(isSubstantial);
  const sessionCount = substantial.length;
  const wordsRead    = completed.reduce((s, r) => s + (r.wordsRead ?? 0), 0);

  const maxStreak     = computeMaxDayStreak(completed);
  const currentStreak = computeCurrentStreak(completed);

  // ── earnedAt helpers ──────────────────────────────────────────────────────
  const nthSessionDate = (n: number): string | null =>
    substantial.length >= n ? (substantial[n - 1].completedAt ?? null) : null;

  const nthPerfectDate = (n: number): string | null => {
    let count = 0;
    for (const r of substantial) {
      if (r.itemsAttempted > 0 && r.itemsCorrect === r.itemsAttempted) {
        if (++count >= n) return r.completedAt ?? null;
      }
    }
    return null;
  };

  const firstStarThresholdDate = (threshold: number): string | null => {
    let running = 0;
    for (const s of sessionStars) { running += s.stars; if (running >= threshold) return s.date; }
    return null;
  };

  const firstWordsThresholdDate = (threshold: number): string | null => {
    let running = 0;
    for (const r of completed) { running += r.wordsRead ?? 0; if (running >= threshold) return r.completedAt ?? null; }
    return null;
  };

  const firstComboDate = (n: number): string | null => {
    for (const r of completed) if ((r.maxCombo ?? 0) >= n) return r.completedAt ?? null;
    return null;
  };

  const firstStreakDate = (streakLen: number): string | null => {
    const days = Array.from(new Set(completed.map(r => toLocalDate(r.completedAt!)))).sort();
    let cur = 1;
    for (let i = 1; i < days.length; i++) {
      const gap = new Date(days[i]).getTime() - new Date(days[i - 1]).getTime();
      cur = gap <= DAY_MS * 1.5 ? cur + 1 : 1;
      if (cur >= streakLen) {
        const last = [...completed].reverse().find(r => toLocalDate(r.completedAt!) === days[i]);
        return last?.completedAt ?? null;
      }
    }
    return null;
  };

  const perfectCount = substantial.filter(r => r.itemsAttempted > 0 && r.itemsCorrect === r.itemsAttempted).length;
  const bestCombo    = completed.reduce((m, r) => Math.max(m, r.maxCombo ?? 0), 0);
  const { masteredCount, noNikudPassages, level3Passages } = extras;

  // ── Trophy definitions ────────────────────────────────────────────────────
  // Ordered: sessions → stars → words → perfect → combo → streak → reading
  // milestones → mastery.
  const trophies: Trophy[] = [
    // Session milestones
    { id: 'first_session',   labelKey: 'trophy.first_session',   emoji: '🌱', earned: sessionCount >= 1,   earnedAt: nthSessionDate(1),   progress: Math.min(sessionCount, 1),   target: 1 },
    { id: 'three_sessions',  labelKey: 'trophy.three_sessions',  emoji: '🔥', earned: sessionCount >= 3,   earnedAt: nthSessionDate(3),   progress: Math.min(sessionCount, 3),   target: 3 },
    { id: 'five_sessions',   labelKey: 'trophy.five_sessions',   emoji: '🌟', earned: sessionCount >= 5,   earnedAt: nthSessionDate(5),   progress: Math.min(sessionCount, 5),   target: 5 },
    { id: 'ten_sessions',    labelKey: 'trophy.ten_sessions',    emoji: '🏆', earned: sessionCount >= 10,  earnedAt: nthSessionDate(10),  progress: Math.min(sessionCount, 10),  target: 10 },
    { id: 'twenty_sessions', labelKey: 'trophy.twenty_sessions', emoji: '🚀', earned: sessionCount >= 20,  earnedAt: nthSessionDate(20),  progress: Math.min(sessionCount, 20),  target: 20 },
    { id: 'fifty_sessions',  labelKey: 'trophy.fifty_sessions',  emoji: '💎', earned: sessionCount >= 50,  earnedAt: nthSessionDate(50),  progress: Math.min(sessionCount, 50),  target: 50 },
    { id: 'hundred_sessions',labelKey: 'trophy.hundred_sessions',emoji: '📚', earned: sessionCount >= 100, earnedAt: nthSessionDate(100), progress: Math.min(sessionCount, 100), target: 100 },
    // Star milestones
    { id: 'twenty_stars',       labelKey: 'trophy.twenty_stars',       emoji: '✨', earned: totalStars >= 20,  earnedAt: firstStarThresholdDate(20),  progress: Math.min(totalStars, 20),  target: 20 },
    { id: 'fifty_stars',        labelKey: 'trophy.fifty_stars',        emoji: '🌠', earned: totalStars >= 50,  earnedAt: firstStarThresholdDate(50),  progress: Math.min(totalStars, 50),  target: 50 },
    { id: 'hundred_stars',      labelKey: 'trophy.hundred_stars',      emoji: '💫', earned: totalStars >= 100, earnedAt: firstStarThresholdDate(100), progress: Math.min(totalStars, 100), target: 100 },
    { id: 'two_hundred_stars',  labelKey: 'trophy.two_hundred_stars',  emoji: '🌌', earned: totalStars >= 200, earnedAt: firstStarThresholdDate(200), progress: Math.min(totalStars, 200), target: 200 },
    // Words read (reading-specific)
    { id: 'words_500',   labelKey: 'trophy.words_500',   emoji: '📖', earned: wordsRead >= 500,   earnedAt: firstWordsThresholdDate(500),   progress: Math.min(wordsRead, 500),   target: 500 },
    { id: 'words_2000',  labelKey: 'trophy.words_2000',  emoji: '📗', earned: wordsRead >= 2000,  earnedAt: firstWordsThresholdDate(2000),  progress: Math.min(wordsRead, 2000),  target: 2000 },
    { id: 'words_10000', labelKey: 'trophy.words_10000', emoji: '📚', earned: wordsRead >= 10000, earnedAt: firstWordsThresholdDate(10000), progress: Math.min(wordsRead, 10000), target: 10000 },
    // Accuracy
    { id: 'perfect_session', labelKey: 'trophy.perfect_session', emoji: '🎯', earned: perfectCount >= 1,  earnedAt: nthPerfectDate(1),  progress: Math.min(perfectCount, 1),  target: 1 },
    { id: 'three_perfect',   labelKey: 'trophy.three_perfect',   emoji: '🏅', earned: perfectCount >= 3,  earnedAt: nthPerfectDate(3),  progress: Math.min(perfectCount, 3),  target: 3 },
    { id: 'ten_perfect',     labelKey: 'trophy.ten_perfect',     emoji: '🥇', earned: perfectCount >= 10, earnedAt: nthPerfectDate(10), progress: Math.min(perfectCount, 10), target: 10 },
    // Combos (sustained focus)
    { id: 'combo_ten',    labelKey: 'trophy.combo_ten',    emoji: '🔥', earned: bestCombo >= 10, earnedAt: firstComboDate(10), progress: Math.min(bestCombo, 10), target: 10 },
    { id: 'combo_twenty', labelKey: 'trophy.combo_twenty', emoji: '🌋', earned: bestCombo >= 20, earnedAt: firstComboDate(20), progress: Math.min(bestCombo, 20), target: 20 },
    // Streaks
    { id: 'three_day_streak',    labelKey: 'trophy.three_day_streak',    emoji: '📅', earned: maxStreak >= 3,  earnedAt: firstStreakDate(3),  progress: Math.min(maxStreak, 3),  target: 3 },
    { id: 'seven_day_streak',    labelKey: 'trophy.seven_day_streak',    emoji: '📆', earned: maxStreak >= 7,  earnedAt: firstStreakDate(7),  progress: Math.min(maxStreak, 7),  target: 7 },
    { id: 'fourteen_day_streak', labelKey: 'trophy.fourteen_day_streak', emoji: '🗓️', earned: maxStreak >= 14, earnedAt: firstStreakDate(14), progress: Math.min(maxStreak, 14), target: 14 },
    // Reading milestones (weaning off nikud — disproportionately important per spec)
    { id: 'first_no_nikud',  labelKey: 'trophy.first_no_nikud',  emoji: '🪄', earned: noNikudPassages >= 1, earnedAt: null, progress: Math.min(noNikudPassages, 1), target: 1 },
    { id: 'five_no_nikud',   labelKey: 'trophy.five_no_nikud',   emoji: '🧙', earned: noNikudPassages >= 5, earnedAt: null, progress: Math.min(noNikudPassages, 5), target: 5 },
    { id: 'first_level3',    labelKey: 'trophy.first_level3',    emoji: '🧗', earned: level3Passages >= 1,  earnedAt: null, progress: Math.min(level3Passages, 1),  target: 1 },
    // Mastery
    { id: 'first_mastery', labelKey: 'trophy.first_mastery', emoji: '🎓', earned: masteredCount >= 1, earnedAt: null, progress: Math.min(masteredCount, 1), target: 1 },
    { id: 'three_mastery', labelKey: 'trophy.three_mastery', emoji: '🧠', earned: masteredCount >= 3, earnedAt: null, progress: Math.min(masteredCount, 3), target: 3 },
    { id: 'five_mastery',  labelKey: 'trophy.five_mastery',  emoji: '🦉', earned: masteredCount >= 5, earnedAt: null, progress: Math.min(masteredCount, 5), target: 5 },
  ];

  const earnedCount = trophies.filter(tr => tr.earned).length;

  // Display order = the order they were earned (a timeline), then locked
  // closest-to-earning first so the next goals surface.
  const ordered = trophies
    .map((tr, idx) => ({ tr, idx }))
    .sort((a, b) => {
      if (a.tr.earned !== b.tr.earned) return a.tr.earned ? -1 : 1;
      if (a.tr.earned) {
        const da = a.tr.earnedAt, db = b.tr.earnedAt;
        if (da && db) { const cmp = da.localeCompare(db); return cmp !== 0 ? cmp : a.idx - b.idx; }
        if (da) return -1;
        if (db) return 1;
        return a.idx - b.idx;
      }
      const ra = a.tr.target > 0 ? a.tr.progress / a.tr.target : 0;
      const rb = b.tr.target > 0 ? b.tr.progress / b.tr.target : 0;
      return rb !== ra ? rb - ra : a.idx - b.idx;
    })
    .map(x => x.tr);

  return { totalStars, sessionStars, trophies: ordered, earnedCount, totalTrophies: ordered.length, currentStreak };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeMaxDayStreak(records: SessionRecord[]): number {
  const days = Array.from(new Set(
    records.filter(r => r.completedAt).map(r => toLocalDate(r.completedAt!)),
  )).sort();
  let max = 0, cur = 0, prevTime = -Infinity;
  for (const day of days) {
    const t = new Date(day).getTime();
    cur = t - prevTime > DAY_MS * 1.5 ? 1 : cur + 1;
    if (cur > max) max = cur;
    prevTime = t;
  }
  return max;
}

function computeCurrentStreak(records: SessionRecord[]): number {
  const days = new Set(records.filter(r => r.completedAt).map(r => toLocalDate(r.completedAt!)));
  const today = toLocalDate(new Date().toISOString());
  const yesterday = toLocalDate(new Date(Date.now() - DAY_MS).toISOString());
  if (!days.has(today) && !days.has(yesterday)) return 0;
  let streak = 0;
  let cursor = new Date();
  while (days.has(toLocalDate(cursor.toISOString()))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

function toLocalDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
