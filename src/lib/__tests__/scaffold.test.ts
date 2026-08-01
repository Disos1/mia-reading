/**
 * Scaffold axis tests.
 *
 * These exist because the two most damaging bugs in the app so far were both
 * silent CEILINGS, not crashes: the level axis stopped at 3 after Level 4
 * shipped, and the nikud axis never moved at all, so the whole כתיב מלא engine
 * was dead code from the reader's point of view. Nothing failed — she just
 * never advanced. Assert the ladders actually reach their tops.
 */

import { describe, it, expect } from 'vitest';
import { initScaffold, applyOutcome, type ScaffoldMove } from '../scaffold';
import { CLIMB_STREAK, DROP_STREAK, MAX_READING_LEVEL } from '../../constants/config';
import type { NikudState, ReadingLevel, ScaffoldState } from '../../types';

/** Feed n consecutive outcomes, collecting the moves. */
function run(
  state: ScaffoldState,
  outcomes: boolean[],
  opts: Parameters<typeof applyOutcome>[2] = {},
): { state: ScaffoldState; moves: ScaffoldMove[] } {
  const moves: ScaffoldMove[] = [];
  let s = state;
  for (const correct of outcomes) {
    const r = applyOutcome(s, correct, opts);
    s = r.state;
    moves.push(r.move);
  }
  return { state: s, moves };
}

const allCorrect = (n: number) => Array<boolean>(n).fill(true);
const allWrong   = (n: number) => Array<boolean>(n).fill(false);

describe('scaffold — climb ladder', () => {
  it('reaches Level 4, not the old ceiling of 3', () => {
    const { state } = run(initScaffold(1, 'none'), allCorrect(CLIMB_STREAK * 10));
    expect(state.level).toBe(MAX_READING_LEVEL);
    expect(MAX_READING_LEVEL).toBe(4);
  });

  it('reaches unpointed text — the nikud axis actually moves', () => {
    const { state, moves } = run(initScaffold(1, 'full'), allCorrect(CLIMB_STREAK * 10));
    expect(state.nikud).toBe<NikudState>('none');
    expect(moves).toContain('nikud_forward');
  });

  it('alternates axes so neither runs far ahead of the other', () => {
    // Six climbs from the bottom: level, nikud, level, nikud, level, (nikud).
    const { moves } = run(initScaffold(1, 'full'), allCorrect(CLIMB_STREAK * 6));
    const climbs = moves.filter(m => m === 'climb' || m === 'nikud_forward');
    expect(climbs.slice(0, 4)).toEqual(['climb', 'nikud_forward', 'climb', 'nikud_forward']);
  });

  it('holds quietly once both axes are maxed — no banner spam', () => {
    const top = { ...initScaffold(MAX_READING_LEVEL, 'none'), lastClimbAxis: 'nikud' as const };
    const { moves, state } = run(top, allCorrect(CLIMB_STREAK * 4));
    expect(moves.every(m => m === 'hold')).toBe(true);
    expect(state.level).toBe(MAX_READING_LEVEL);
    expect(state.nikud).toBe<NikudState>('none');
  });

  it('never advances nikud while she is nikud-dependent', () => {
    const { state } = run(initScaffold(1, 'full'), allCorrect(CLIMB_STREAK * 10),
      { allowNikudAdvance: false });
    expect(state.nikud).toBe<NikudState>('full');
    expect(state.level).toBe(MAX_READING_LEVEL);
  });
});

describe('scaffold — drop ladder restores support before reducing demand', () => {
  it('gives the vowels back before it shortens the passage', () => {
    const start = initScaffold(4, 'none');
    const { state, moves } = run(start, allWrong(DROP_STREAK));
    expect(moves.at(-1)).toBe<ScaffoldMove>('nikud_back');
    expect(state.nikud).toBe<NikudState>('partial');
    expect(state.level).toBe<ReadingLevel>(4);   // level untouched on the first drop
  });

  it('only drops level once she is already fully supported', () => {
    const { state } = run(initScaffold(4, 'none'), allWrong(DROP_STREAK * 3));
    expect(state.nikud).toBe<NikudState>('full');
    expect(state.level).toBe<ReadingLevel>(3);
  });

  it('respects the gap-profile floor', () => {
    const { state } = run(initScaffold(2, 'full'), allWrong(DROP_STREAK * 5), { floor: 2 });
    expect(state.level).toBe<ReadingLevel>(2);
  });

  it('still accepts a positional floor argument (old call sites)', () => {
    const { state } = applyOutcome(initScaffold(3, 'full'), false, 1);
    expect(state.consecutiveWrong).toBe(1);
  });
});

describe('scaffold — streak accounting', () => {
  it('resets both counters on a move so a banner cannot re-fire immediately', () => {
    const { state } = run(initScaffold(1, 'full'), allCorrect(CLIMB_STREAK));
    expect(state.consecutiveCorrect).toBe(0);
    expect(state.consecutiveWrong).toBe(0);
  });

  it('a wrong answer clears the climb streak', () => {
    const { moves } = run(initScaffold(1, 'full'), [true, false, true]);
    expect(moves.every(m => m === 'hold')).toBe(true);
  });
});
