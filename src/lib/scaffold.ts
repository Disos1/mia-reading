/**
 * Scaffold engine — the 2-axis analog of math's CPA state machine (spec Part 3).
 *
 * Two INDEPENDENT axes:
 *   • Reading Level (1→2→3): length + vocab + syntax + question depth.
 *   • Nikud (full→partial→none): the pointed→unpointed weaning axis.
 *
 * Rules (spec Part 3):
 *   • Patient drop  — 2 consecutive wrong at a level → drop one level.
 *   • Aggressive climb — 2 consecutive correct at a level → climb one level.
 *   • Floor comes from the gap profile (passageDifficultyFloor); ceiling = 3.
 *   • Nikud axis moves only on fluency items OR when decoding errors surface;
 *     for comprehension items it holds constant. Phase 1 keeps nikud fixed and
 *     drives the LEVEL axis only (fluency-format nikud stepping is Phase 3).
 *
 * Pure functions — no side effects. In-session ScaffoldState is not persisted;
 * ScaffoldMemory carries the start level/nikud across the session boundary so a
 * drop survives (math lesson: never restart at the same wall every session).
 */

import type { ReadingLevel, NikudState, ScaffoldState } from '../types';
import { CLIMB_STREAK, DROP_STREAK } from '../constants/config';

const clampLevel = (n: number): ReadingLevel =>
  (n < 1 ? 1 : n > 3 ? 3 : n) as ReadingLevel;

export function initScaffold(level: ReadingLevel, nikud: NikudState): ScaffoldState {
  return { level, nikud, consecutiveCorrect: 0, consecutiveWrong: 0 };
}

export type ScaffoldMove = 'hold' | 'climb' | 'drop';

/**
 * Apply one first-attempt outcome to the scaffold state.
 *
 * @param floor  Lowest level allowed (from the gap profile). The state never
 *               drops below it.
 * @returns the next state plus the move taken (for the banner: climb → "מוכנה
 *          לאתגר?", drop → "משהו קצת יותר קצר").
 */
export function applyOutcome(
  state: ScaffoldState,
  correct: boolean,
  floor: ReadingLevel = 1,
): { state: ScaffoldState; move: ScaffoldMove } {
  const cc = correct ? state.consecutiveCorrect + 1 : 0;
  const cw = correct ? 0 : state.consecutiveWrong + 1;

  // Aggressive climb
  if (cc >= CLIMB_STREAK && state.level < 3) {
    return {
      state: { ...state, level: clampLevel(state.level + 1), consecutiveCorrect: 0, consecutiveWrong: 0 },
      move: 'climb',
    };
  }
  // Patient drop (respecting the floor)
  if (cw >= DROP_STREAK && state.level > floor) {
    return {
      state: { ...state, level: clampLevel(state.level - 1), consecutiveCorrect: 0, consecutiveWrong: 0 },
      move: 'drop',
    };
  }
  return { state: { ...state, consecutiveCorrect: cc, consecutiveWrong: cw }, move: 'hold' };
}
