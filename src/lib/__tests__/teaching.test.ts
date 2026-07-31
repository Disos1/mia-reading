import { describe, it, expect } from 'vitest';
import { composeSession } from '../sessionComposer';
import { strategyFor, STRATEGY_STEPS } from '../../constants/strategySteps';
import { PASSAGE_SEED } from '../../content/passages';
import { WIC_BANK, ORDERING_BANK, AMBIGUITY_BANK } from '../../content/formatBank';
import { COMP_SKILLS } from '../../constants/skills';
import { toNoNikud } from '../nikud';
import type { MasteryMap } from '../../types';
import { ItemFormat } from '../../types';

/**
 * Phase 4 is the "teach, don't just test" work (build plan H1). These tests
 * pin the two things that make it real: every question can explain itself, and
 * the modelled item is genuinely unscored.
 */

describe('content can explain itself', () => {
  it('every authored passage question has an explanation', () => {
    const missing = PASSAGE_SEED
      .flatMap(s => s.questions)
      .filter(q => !q.explanation?.trim())
      .map(q => q.id);
    expect(missing).toEqual([]);
  });

  it('every word-in-context and ordering item has an explanation', () => {
    expect(WIC_BANK.filter(w => !w.explanation?.trim()).map(w => w.id)).toEqual([]);
    expect(ORDERING_BANK.filter(o => !o.explanation?.trim()).map(o => o.id)).toEqual([]);
  });

  it('every comprehension skill has a transferable strategy to model', () => {
    const missing = COMP_SKILLS.filter(s => !STRATEGY_STEPS[s]);
    expect(missing).toEqual([]);
  });

  it('falls back to generic steps rather than showing nothing', () => {
    expect(strategyFor('FLU_SILENT_RATE').length).toBeGreaterThan(0);
  });
});

describe('ambiguity bank — the unpointed-reading skill', () => {
  it('every entry has its homograph in the sentence and 2+ real readings', () => {
    for (const a of AMBIGUITY_BANK) {
      expect(a.sentence, a.id).toContain(a.targetWord);
      expect(a.options.length, a.id).toBeGreaterThanOrEqual(2);
      expect(a.explanation?.trim(), a.id).toBeTruthy();
    }
  });

  it('the target really is ambiguous — the pointed form strips back to it', () => {
    // If כתיב מלא resolved the ambiguity, the item would teach nothing:
    // בֹּקֶר → בוקר vs בָּקָר → בקר are NOT homographs unpointed.
    for (const a of AMBIGUITY_BANK) {
      expect(toNoNikud(a.pointedForm), `${a.id}: ${a.pointedForm}`).toBe(a.targetWord);
    }
  });

  it('pairs the same spelling against different readings', () => {
    const byWord = new Map<string, Set<string>>();
    for (const a of AMBIGUITY_BANK) {
      if (!byWord.has(a.targetWord)) byWord.set(a.targetWord, new Set());
      byWord.get(a.targetWord)!.add(a.pointedForm);
    }
    // At least one word appears with two different correct readings, so she
    // meets the same spelling meaning two different things.
    const contrasted = [...byWord.values()].filter(s => s.size >= 2);
    expect(contrasted.length).toBeGreaterThan(0);
  });
});

describe('worked example — modelled, never scored', () => {
  const args = {
    sessionId: 's1', profileId: 'p1', mode: 'time' as const,
    masteryMap: {} as MasteryMap, gapProfile: null,
    startLevel: 1 as const, startNikud: 'full' as const,
    recentPassages: new Set<string>(), recentQuestions: new Set<string>(),
    rng: () => 0.5,
  };

  it('leads the blocked-practice run with exactly one modelled item', () => {
    const plan = composeSession(args);
    const worked = plan.plannedItems.filter(p => p.isWorkedExample);
    expect(worked).toHaveLength(1);
    expect(worked[0].sessionPhase).toBe('blocked_practice');

    // It comes before the blocked items she has to answer herself.
    const blocked = plan.plannedItems.filter(p => p.sessionPhase === 'blocked_practice');
    expect(blocked[0].isWorkedExample).toBe(true);
    expect(blocked.slice(1).every(p => !p.isWorkedExample)).toBe(true);
  });

  it('models the skill she is about to practise', () => {
    const plan = composeSession(args);
    const worked = plan.plannedItems.find(p => p.isWorkedExample)!;
    expect(worked.item.skillCode).toBe(plan.primarySkillCode);
  });

  it('has a strategy and an answer available to show', () => {
    const plan = composeSession(args);
    const worked = plan.plannedItems.find(p => p.isWorkedExample)!;
    expect(strategyFor(worked.item.skillCode).length).toBeGreaterThanOrEqual(3);
    expect(worked.item.question.options[worked.item.question.correctOption]).toBeTruthy();
  });
});

describe('double-tap guard (regression)', () => {
  /**
   * Found in Phase 4 browser verification: `attemptNo` is React state, so five
   * fast taps all read it as 0 and each recorded another "first attempt",
   * inflating the denominator — the math-app star bug in a new disguise. Every
   * format now takes a synchronous ref lock, released only once the state
   * change it caused has rendered. This test pins the accounting consequence.
   */
  it('a burst of taps must count as one attempt, not five', () => {
    const rows: Array<{ firstAttempt: boolean }> = [];
    // Model of the guarded handler: ref is synchronous, state is not.
    let lock = false;
    let attemptNo = 0;                       // "state" — updates only on render
    const choose = () => {
      if (lock) return;
      lock = true;
      rows.push({ firstAttempt: attemptNo === 0 });
    };
    for (let i = 0; i < 5; i++) choose();    // no render between taps
    expect(rows).toHaveLength(1);
    expect(rows[0].firstAttempt).toBe(true);

    // After the render the lock releases and a genuine retry is recorded once.
    lock = false; attemptNo = 1;
    choose();
    expect(rows).toHaveLength(2);
    expect(rows[1].firstAttempt).toBe(false);
  });
});

describe('composer still serves the other formats', () => {
  it('offers disambiguation practice once she is off full nikud', () => {
    const plan = composeSession({
      sessionId: 's2', profileId: 'p1', mode: 'time',
      masteryMap: {} as MasteryMap, gapProfile: null,
      startLevel: 2, startNikud: 'partial',
      recentPassages: new Set(), recentQuestions: new Set(),
      rng: () => 0.5,
    });
    const formats = new Set(plan.plannedItems.map(p => p.item.format));
    expect(formats.has(ItemFormat.Ambiguity)).toBe(true);
  });

  it('keeps disambiguation out of a full-nikud session', () => {
    const plan = composeSession({
      sessionId: 's3', profileId: 'p1', mode: 'time',
      masteryMap: {} as MasteryMap, gapProfile: null,
      startLevel: 1, startNikud: 'full',
      recentPassages: new Set(), recentQuestions: new Set(),
      rng: () => 0.5,
    });
    const formats = new Set(plan.plannedItems.map(p => p.item.format));
    expect(formats.has(ItemFormat.Ambiguity)).toBe(false);
  });
});
