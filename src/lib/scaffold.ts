/**
 * Scaffold engine — the 2-axis analog of math's CPA state machine (spec Part 3).
 *
 * Two axes, moved by ONE streak counter:
 *   • Reading Level (1→2→3→4): length + vocab + syntax + question depth.
 *   • Nikud (full→partial→none): the pointed→unpointed weaning axis.
 *
 * Rules (spec Part 3):
 *   • Patient drop  — 2 consecutive wrong → step back down.
 *   • Aggressive climb — 2 consecutive correct → step up.
 *   • Floor comes from the gap profile (passageDifficultyFloor); ceiling = 4.
 *
 * Which axis moves, and why they ALTERNATE:
 *
 * Climbs alternate level → nikud → level → nikud. Advancing level alone (what
 * this did before) would leave her reading longer and longer passages that are
 * still fully pointed — a script she will not meet in a 4th-grade book. Advancing
 * nikud alone would strip support while the text itself stayed babyish. Neither
 * axis is the difficulty; the pair is. Alternating also means she meets unpointed
 * text EARLY and often, which is the whole point of the כתיב מלא engine.
 *
 * Drops reverse that order deliberately: **restore support before reducing
 * demand.** A struggling reader gets her nikud back first and keeps the
 * age-appropriate passage; only if she is already fully supported does the level
 * come down. Dropping level first would quietly walk a 4th-grader back to
 * Level 1 text while she still fought the script — the wrong lever, and a
 * humiliating one.
 *
 * Nikud advancement is suppressed while the diagnostic says she is
 * nikud-dependent; the composer's partial-nikud bridging and the morphology
 * skills carry her across that gap first (Share & Bar-On Triplex model).
 *
 * Pure functions — no side effects. In-session ScaffoldState is not persisted;
 * ScaffoldMemory carries the start level/nikud across the session boundary so a
 * drop survives (math lesson: never restart at the same wall every session).
 */

import type { ReadingLevel, NikudState, ScaffoldState } from '../types';
import { CLIMB_STREAK, DROP_STREAK, MAX_READING_LEVEL } from '../constants/config';

const clampLevel = (n: number): ReadingLevel =>
  (n < 1 ? 1 : n > MAX_READING_LEVEL ? MAX_READING_LEVEL : n) as ReadingLevel;

/** Support ladder, most supported first. Advancing = moving toward the end. */
const NIKUD_LADDER: NikudState[] = ['full', 'partial', 'none'];

const nikudStep = (n: NikudState, dir: 1 | -1): NikudState | null => {
  const i = NIKUD_LADDER.indexOf(n) + dir;
  return i >= 0 && i < NIKUD_LADDER.length ? NIKUD_LADDER[i] : null;
};

export function initScaffold(level: ReadingLevel, nikud: NikudState): ScaffoldState {
  return { level, nikud, consecutiveCorrect: 0, consecutiveWrong: 0, lastClimbAxis: 'nikud' };
}

export type ScaffoldMove = 'hold' | 'climb' | 'drop' | 'nikud_forward' | 'nikud_back';

export interface ScaffoldOptions {
  /** Lowest level allowed (from the gap profile). The state never drops below it. */
  floor?: ReadingLevel;
  /** False while ERR_NIKUD_DEPENDENT is active — keep the vowels on. */
  allowNikudAdvance?: boolean;
}

/**
 * Apply one first-attempt outcome to the scaffold state.
 *
 * @returns the next state plus the move taken, which drives the banner:
 *          climb → "מוכנה לאתגר?", drop → "משהו קצת יותר קצר",
 *          nikud_forward → the out-loud celebration of reading without vowels.
 */
export function applyOutcome(
  state: ScaffoldState,
  correct: boolean,
  options: ScaffoldOptions | ReadingLevel = {},
): { state: ScaffoldState; move: ScaffoldMove } {
  // Back-compat: earlier callers passed the floor positionally.
  const { floor = 1, allowNikudAdvance = true } =
    typeof options === 'number' ? { floor: options } : options;

  const cc = correct ? state.consecutiveCorrect + 1 : 0;
  const cw = correct ? 0 : state.consecutiveWrong + 1;
  const reset = { consecutiveCorrect: 0, consecutiveWrong: 0 };

  // ── Aggressive climb — alternate the axis so both advance together ──────────
  if (cc >= CLIMB_STREAK) {
    const nextNikud  = allowNikudAdvance ? nikudStep(state.nikud, 1) : null;
    const canLevel   = state.level < MAX_READING_LEVEL;
    const wantNikud  = state.lastClimbAxis === 'level';

    if (nextNikud && (wantNikud || !canLevel)) {
      return {
        state: { ...state, ...reset, nikud: nextNikud, lastClimbAxis: 'nikud' },
        move: 'nikud_forward',
      };
    }
    if (canLevel) {
      return {
        state: { ...state, ...reset, level: clampLevel(state.level + 1), lastClimbAxis: 'level' },
        move: 'climb',
      };
    }
    // Both axes maxed — hold, but clear the streak so the banner does not
    // re-fire on every subsequent correct answer.
    return { state: { ...state, ...reset }, move: 'hold' };
  }

  // ── Patient drop — restore support BEFORE reducing demand ───────────────────
  if (cw >= DROP_STREAK) {
    const backNikud = nikudStep(state.nikud, -1);
    if (backNikud) {
      return {
        state: { ...state, ...reset, nikud: backNikud, lastClimbAxis: 'level' },
        move: 'nikud_back',
      };
    }
    if (state.level > floor) {
      return {
        state: { ...state, ...reset, level: clampLevel(state.level - 1), lastClimbAxis: 'nikud' },
        move: 'drop',
      };
    }
    return { state: { ...state, ...reset }, move: 'hold' };
  }

  return { state: { ...state, consecutiveCorrect: cc, consecutiveWrong: cw }, move: 'hold' };
}
