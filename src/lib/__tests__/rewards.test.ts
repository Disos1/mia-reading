import { describe, it, expect } from 'vitest';
import { starsForSession, computeTrophyState, MIN_ITEMS_FOR_STARS } from '../trophies';
import { resolveRecipes, EMPTY_SIGNATURES, type SignatureMap } from '../errorSignatures';
import type { SessionRecord } from '../../types';

function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    sessionId: Math.random().toString(36).slice(2),
    profileId: 'p1', mode: 'time',
    startedAt: '2026-07-01T10:00:00.000Z',
    completedAt: '2026-07-01T10:15:00.000Z',
    itemsAttempted: 10, itemsCorrect: 9,
    primarySkillCode: 'COMP_LITERAL', wordsRead: 100, maxCombo: 0,
    ...over,
  };
}

describe('stars — rewarding care, not volume', () => {
  it('pays nothing for a guessed session', () => {
    expect(starsForSession(session({ itemsAttempted: 20, itemsCorrect: 10 }))).toBe(0); // 50%
  });

  it('pays 1 star in the middle band and 2 for high accuracy', () => {
    expect(starsForSession(session({ itemsAttempted: 10, itemsCorrect: 7 }))).toBe(1);  // 70%
    expect(starsForSession(session({ itemsAttempted: 10, itemsCorrect: 9 }))).toBe(2);  // 90%
  });

  it('adds a combo bonus only on top of a session that cleared the floor', () => {
    expect(starsForSession(session({ itemsAttempted: 10, itemsCorrect: 9, maxCombo: 5 }))).toBe(3);
    expect(starsForSession(session({ itemsAttempted: 10, itemsCorrect: 9, maxCombo: 10 }))).toBe(4);
    // A lucky streak cannot rescue a guessed session.
    expect(starsForSession(session({ itemsAttempted: 20, itemsCorrect: 8, maxCombo: 12 }))).toBe(0);
  });

  it('caps at 4 stars per session', () => {
    expect(starsForSession(session({ itemsAttempted: 30, itemsCorrect: 30, maxCombo: 30 }))).toBe(4);
  });

  it('pays nothing for a session below the substance floor', () => {
    // Closes session-farming: many tiny perfect sessions must not mint stars.
    const tiny = session({ itemsAttempted: MIN_ITEMS_FOR_STARS - 1, itemsCorrect: MIN_ITEMS_FOR_STARS - 1 });
    expect(starsForSession(tiny)).toBe(0);
  });
});

describe('trophy display order — the "badges reshuffle every run" fix', () => {
  it('lists earned badges before locked ones, and keeps a stable order', () => {
    const records = [session({ completedAt: '2026-07-01T10:15:00.000Z' })];
    const first = computeTrophyState(records);
    const second = computeTrophyState(records);
    expect(first.trophies.map(t => t.id)).toEqual(second.trophies.map(t => t.id));

    const earnedCount = first.trophies.filter(t => t.earned).length;
    const ids = first.trophies.map(t => t.earned);
    // every earned badge precedes every locked one
    expect(ids.slice(0, earnedCount).every(Boolean)).toBe(true);
    expect(ids.slice(earnedCount).some(Boolean)).toBe(false);
  });

  it('orders earned badges as a timeline of when they were won', () => {
    const records = [
      session({ completedAt: '2026-07-01T10:15:00.000Z' }),
      session({ completedAt: '2026-07-02T10:15:00.000Z' }),
      session({ completedAt: '2026-07-03T10:15:00.000Z' }),
    ];
    const earned = computeTrophyState(records).trophies
      .filter(t => t.earned && t.earnedAt)
      .map(t => t.earnedAt!);
    const sorted = [...earned].sort();
    expect(earned).toEqual(sorted);
  });

  it('ignores abandoned sessions', () => {
    const state = computeTrophyState([session({ completedAt: null })]);
    expect(state.totalStars).toBe(0);
    expect(state.trophies.find(t => t.id === 'first_session')!.earned).toBe(false);
  });
});

describe('composer recipes — conflict resolution', () => {
  const withSigs = (over: Partial<SignatureMap>): SignatureMap => ({
    ...EMPTY_SIGNATURES, ...over,
  });
  const active = { isActive: true, firstDetectedAt: null, lastObservedAt: null, sampleSize: 10 };

  it('drops to the easiest scaffold under general struggle', () => {
    const r = resolveRecipes(withSigs({ zone: 'general_struggle' }));
    expect(r.forceLevel).toBe(1);
    expect(r.forceNikud).toBe('full');
  });

  it('lengthens the read floor when she is fast and inaccurate', () => {
    expect(resolveRecipes(withSigs({ zone: 'fast_inaccurate' })).readFloorMultiplier).toBeGreaterThan(1);
  });

  it('lets fatigue override the read-floor inflation — wellbeing wins', () => {
    const r = resolveRecipes(withSigs({
      zone: 'fast_inaccurate',
      signatures: { ERR_FATIGUE: active },
    }));
    expect(r.targetMultiplier).toBeLessThan(1);   // shorter session
    expect(r.readFloorMultiplier).toBe(1);        // no extra pressure on top
  });

  it('redirects blocked practice to inference when literal is fine but inference fails', () => {
    const r = resolveRecipes(withSigs({ signatures: { ERR_LITERAL_OK_INFERENCE_FAIL: active } }));
    expect(r.blockedSkillOverride).toBe('COMP_INFERENCE');
  });

  it('is a no-op when nothing is active', () => {
    const r = resolveRecipes(EMPTY_SIGNATURES);
    expect(r.targetMultiplier).toBe(1);
    expect(r.forceLevel).toBeNull();
    expect(r.blockedSkillOverride).toBeNull();
  });
});
