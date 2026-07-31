import { describe, it, expect } from 'vitest';
import { readFloorMs, baselineWpm } from '../readFloor';
import { READ_FLOOR_MIN_MS } from '../../constants/config';
import type { GapProfile } from '../../types';

/**
 * The floor protects the fluency measurement, but a floor calibrated to the
 * wrong reader is worse than none: Dima hit this immediately as an adult, and
 * a 4th grader reading 110 wpm would meet the same locked button. Once she has
 * been measured, the wait should come from HER rate.
 */

function gap(wpm: number | null): GapProfile {
  return {
    version: 1, userId: 'p1', completedAt: '', diagnosticSessionId: 'd1',
    strandStatus: {}, skillAccuracy: {}, activeErrorSignatures: [],
    composerNotes: {
      firstNewMaterial: null, blockedPracticePriority: [],
      passageDifficultyFloor: 1, nikudDependence: false, nikudDependenceRatio: null,
    },
    baselineMetrics: {
      silentRateWithNikudWpm: wpm, silentRateNoNikudWpm: null,
      rereadGainPct: null, compAccuracyPct: null,
    },
  };
}

describe('read floor', () => {
  it('falls back to the conservative fixed rate before she is measured', () => {
    // 30 words × 1000ms — the pre-diagnostic default.
    expect(readFloorMs(30, null)).toBe(30_000);
  });

  it('shortens markedly for a fast reader once measured', () => {
    const slow = readFloorMs(30, null);          // undiagnosed default
    const fast = readFloorMs(30, gap(110));      // a real 4th-grade rate
    expect(fast).toBeLessThan(slow / 2);
  });

  it('still asks a fast reader to spend real time on the passage', () => {
    // 110 wpm → ~545ms/word of actual reading; the floor is 60% of that.
    const ms = readFloorMs(30, gap(110));
    expect(ms).toBeGreaterThan(8_000);
    expect(ms).toBeLessThan(12_000);
  });

  it('keeps a slow reader on the generous end rather than rushing her', () => {
    // 40 wpm → 1500ms/word of reading; 60% of that is 900ms/word, just under
    // the 1000ms cap. A struggling reader is never hurried by the calibration.
    const slowReader = readFloorMs(30, gap(40));
    expect(slowReader).toBe(30 * 900);
    expect(slowReader).toBeGreaterThan(readFloorMs(30, gap(110)) * 2);
  });

  it('never drops below the absolute minimum on a one-word passage', () => {
    expect(readFloorMs(1, gap(200))).toBe(READ_FLOOR_MIN_MS);
  });

  it('applies the fast-inaccurate recipe on top', () => {
    const base = readFloorMs(20, gap(100));
    expect(readFloorMs(20, gap(100), 1.3)).toBeCloseTo(base * 1.3, 5);
  });

  it('ignores an implausible baseline rather than removing the floor', () => {
    // A mis-tapped diagnostic can yield nonsense; 900 wpm must not unlock
    // the button instantly.
    expect(baselineWpm(gap(900))).toBeNull();
    expect(readFloorMs(30, gap(900))).toBe(30_000);
    expect(baselineWpm(gap(5))).toBeNull();
  });
});
