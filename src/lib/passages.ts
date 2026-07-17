/**
 * Passage bank access — offline-first over the seed (content/passages.ts).
 *
 * Phase 1 reads the in-repo seed. A later phase swaps the source for the
 * reading.passages Supabase table without changing this interface: the
 * composer only calls the query functions below.
 *
 * The no-repeat rule (spec Part 9) is enforced here by excluding passage AND
 * question ids the profile has recently seen (recentItems.ts) — a passage may
 * return with a different question, but never the same question (plan B2.2).
 */

import type { Passage, PassageQuestion, ReadingLevel, SkillCode } from '../types';
import { ALL_PASSAGES, ALL_QUESTIONS } from '../content/passages';

const QUESTIONS_BY_PASSAGE: Record<string, PassageQuestion[]> = (() => {
  const m: Record<string, PassageQuestion[]> = {};
  for (const q of ALL_QUESTIONS) (m[q.passageId] ??= []).push(q);
  return m;
})();

const PASSAGE_BY_ID: Record<string, Passage> = Object.fromEntries(
  ALL_PASSAGES.map(p => [p.id, p]),
);

export function getPassage(id: string): Passage | undefined {
  return PASSAGE_BY_ID[id];
}

export function questionsFor(passageId: string): PassageQuestion[] {
  return QUESTIONS_BY_PASSAGE[passageId] ?? [];
}

/** Every (passage, question) pair whose question targets `skill`. */
export interface PassageQuestionPair {
  passage:  Passage;
  question: PassageQuestion;
}

export interface PickOpts {
  skill?:        SkillCode;
  level?:        ReadingLevel;
  /** Passage ids to avoid (10-day no-repeat). */
  excludePassages?: Set<string>;
  /** Question ids to avoid (never repeat a served question). */
  excludeQuestions?: Set<string>;
}

/**
 * All eligible (passage, question) pairs for the given filters, honouring the
 * no-repeat exclusions. Falls back gracefully: if the exclusions leave nothing,
 * the caller can retry with looser exclusions (composer cold-start ladder).
 */
export function eligiblePairs(opts: PickOpts): PassageQuestionPair[] {
  const { skill, level, excludePassages, excludeQuestions } = opts;
  const out: PassageQuestionPair[] = [];
  for (const q of ALL_QUESTIONS) {
    if (skill && q.skillCode !== skill) continue;
    if (excludeQuestions?.has(q.id)) continue;
    const passage = PASSAGE_BY_ID[q.passageId];
    if (!passage) continue;
    if (level && passage.level !== level) continue;
    if (excludePassages?.has(passage.id)) continue;
    out.push({ passage, question: q });
  }
  return out;
}

/** Levels present in the bank, ascending. */
export function availableLevels(): ReadingLevel[] {
  return Array.from(new Set(ALL_PASSAGES.map(p => p.level))).sort() as ReadingLevel[];
}
