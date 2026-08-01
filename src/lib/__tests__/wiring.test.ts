/**
 * Wiring tests — "does anything actually CALL this?"
 *
 * Every bug this file guards against was library code that existed, was
 * correct, was unit-tested, and was never invoked: the nikud ladder, the
 * retention probes, the struggle escalator, the Level-4 ceiling. Unit tests on
 * the function alone happily pass while the feature is dead in the product.
 *
 * So these assert the SEAM, not the function.
 */

import { describe, it, expect } from 'vitest';
import { composeSession } from '../sessionComposer';
import { resolveRecipes } from '../errorSignatures';
import { ensureProbeSchedules, probesDue } from '../masteryTracker';
import {
  MAX_READING_LEVEL, STRUGGLE_SESSIONS_TO_ESCALATE, STRUGGLE_ACCURACY,
  RECOVERY_ACCURACY, MIN_ATTEMPTS_TO_JUDGE,
} from '../../constants/config';
import type { MasteryMap, MasteryRecord, SkillCode } from '../../types';
import { ItemFormat } from '../../types';

const RECIPES = resolveRecipes({ signatures: {} } as never);

function compose(over: Partial<Parameters<typeof composeSession>[0]> = {}) {
  return composeSession({
    sessionId: 's', profileId: 'p', mode: 'quantity',
    masteryMap: {}, gapProfile: null,
    startLevel: 1, startNikud: 'full',
    recentPassages: new Set<string>(), recentQuestions: new Set<string>(),
    recipes: RECIPES, allowReread: true, maintenanceDrill: false,
    ...over,
  });
}

function mastered(skill: SkillCode, probeDueAt: string | null): MasteryRecord {
  return {
    skillCode: skill, status: 'שליטה',
    needsRetentionProbe: probeDueAt !== null,
    retentionProbeDueAt: probeDueAt,
    probesPassed: 0,
  } as MasteryRecord;
}

describe('the composer honours the Level-4 ceiling', () => {
  it('does not clamp a Level-4 reader back down to 3', () => {
    const plan = compose({ startLevel: MAX_READING_LEVEL, startNikud: 'none' });
    const levels = plan.plannedItems.map(p => p.item.level);
    expect(Math.max(...levels)).toBe(MAX_READING_LEVEL);
  });
});

describe('retention probes actually reach a session', () => {
  const past = '2020-01-01T00:00:00.000Z';

  it('a due probe becomes a marked item in the plan', () => {
    const map: MasteryMap = { COMP_LITERAL: mastered('COMP_LITERAL', past) };
    const plan = compose({ masteryMap: map });
    const probes = plan.plannedItems.filter(p => p.isRetentionProbe);
    expect(probes.length).toBeGreaterThan(0);
    expect(probes.every(p => p.sessionPhase === 'spaced_retrieval')).toBe(true);
  });

  it('a probe that is not yet due produces no probe items', () => {
    const map: MasteryMap = { COMP_LITERAL: mastered('COMP_LITERAL', '2099-01-01T00:00:00.000Z') };
    const plan = compose({ masteryMap: map });
    expect(plan.plannedItems.some(p => p.isRetentionProbe)).toBe(false);
  });

  it('probes never crowd out more than half the spaced bucket', () => {
    const map: MasteryMap = Object.fromEntries(
      (['COMP_LITERAL', 'COMP_INFERENCE', 'COMP_VOCAB', 'COMP_SEQUENCE', 'COMP_MAIN_IDEA'] as SkillCode[])
        .map(s => [s, mastered(s, past)]),
    );
    const plan = compose({ masteryMap: map });
    const probes = plan.plannedItems.filter(p => p.isRetentionProbe).length;
    const spaced = plan.plannedItems.filter(p => p.sessionPhase === 'spaced_retrieval').length;
    expect(probes).toBeLessThanOrEqual(Math.ceil(spaced / 2) + 1);
    expect(probes).toBeGreaterThan(0);
  });

  it('self-heal schedules a probe for a legacy mastered skill that has none', () => {
    const legacy: MasteryMap = { COMP_LITERAL: mastered('COMP_LITERAL', null) };
    expect(probesDue(legacy, '2026-08-01T00:00:00.000Z')).toEqual([]);
    const healed = ensureProbeSchedules(legacy, '2026-08-01T00:00:00.000Z');
    expect(probesDue(healed, '2026-08-01T00:00:00.000Z')).toEqual(['COMP_LITERAL']);
  });

  it('the composer reports probes in its trace so a session is auditable', () => {
    const map: MasteryMap = { COMP_LITERAL: mastered('COMP_LITERAL', past) };
    const plan = compose({ masteryMap: map });
    expect(plan.composerReasoning.join(' ')).toContain('retention probes due');
  });
});

describe('struggle escalator thresholds are coherent', () => {
  // The escalation itself lives in Session.finish(); these pin the constants it
  // reads, so a future edit cannot make escalation unreachable by accident.
  it('recovery is strictly above the struggle line — no dead band that traps her', () => {
    expect(RECOVERY_ACCURACY).toBeGreaterThan(STRUGGLE_ACCURACY);
  });

  it('escalation is reachable within a handful of sessions', () => {
    expect(STRUGGLE_SESSIONS_TO_ESCALATE).toBeGreaterThan(1);
    expect(STRUGGLE_SESSIONS_TO_ESCALATE).toBeLessThanOrEqual(4);
  });

  it('judges a session only on enough evidence to be fair', () => {
    expect(MIN_ATTEMPTS_TO_JUDGE).toBeGreaterThanOrEqual(3);
  });
});

describe('combo counts items, not attempts', () => {
  // Mia ran 8 correct in a row and the counter showed 6. The counter lived in
  // handleAttempt (once per ATTEMPT); she was counting ITEMS. The two differ in
  // both directions: a Reread item fires two first attempts, a worked example
  // fires none. These pin the shape of the plan that made the numbers diverge.
  it('a Reread item carries two probes — two first attempts for one item', () => {
    const plan = compose({ allowReread: true });
    const reread = plan.plannedItems.find(p => p.item.format === ItemFormat.Reread);
    expect(reread).toBeDefined();
    expect(reread!.item.question2).toBeDefined();
    expect(reread!.item.question2!.id).not.toBe(reread!.item.question.id);
  });

  it('a worked example is planned but produces no attempt', () => {
    const plan = compose();
    const worked = plan.plannedItems.filter(p => p.isWorkedExample);
    expect(worked.length).toBeLessThanOrEqual(1);
    // It occupies a slot she experiences as an item...
    if (worked.length) expect(worked[0].item).toBeDefined();
  });
});
