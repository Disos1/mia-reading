/**
 * Session composer — reading (spec Part 3 four-bucket model).
 *
 * Buckets (target ≈ 16 items in a 15-min session):
 *   • חימום  / Warmup       ~15%  — easy items at the floor level, confidence.
 *   • תרגול מכוון / Blocked  ~20%  — same skill, different passages.
 *   • חזרה מרווחת / Spaced   ~20%  — other in-progress skills (revisits SKILLS,
 *                                     not items — the no-repeat rule forces it).
 *   • תרגול מעורב / Interleaved ~45% — mixed skills/levels.
 *
 * Phase 1 emits Format 1 (Passage + Comp) items only; later formats slot into
 * the same buckets without changing this file's shape.
 *
 * MASTERED-SET CROSS-CHECK (math lesson B4 — the frozen-gap-profile trap):
 * the gap profile is frozen at diagnostic time but mastery is live. Every skill
 * the composer promotes into warmup/blocked/spaced is filtered through the live
 * mastery map first, so a mastered skill can never come back into core practice.
 * Mastered skills still surface in the interleaved bucket for retention.
 *
 * The runtime (Session.tsx) calls `pickItem` again for scaffold-driven level
 * changes and open-mode extension, so item selection lives in ONE place.
 */

import type {
  GapProfile,
  MasteryMap,
  NikudState,
  PracticeItem,
  ReadingLevel,
  SessionMode,
  SessionPhase,
  SessionPlan,
  SessionPlanItem,
  SkillCode,
} from '../types';
import { ItemFormat } from '../types';
import { masteredSkills, skillsInProgress } from './masteryTracker';
import { eligiblePairs, rereadCandidates, type PassageQuestionPair } from './passages';
import { skillHebrewKey, COMP_SKILLS } from '../constants/skills';
import { SESSION_QUANTITY_ITEMS } from '../constants/config';
import { NEUTRAL_RECIPES, type RecipeMods } from './errorSignatures';
import {
  FLASH_BANK, FLASH_DURATION_MS, ORDERING_BANK, WIC_BANK,
} from '../content/formatBank';
import type { Passage } from '../types';

// ─── Item picking (single source of truth) ─────────────────────────────────────

export interface PickArgs {
  skill?:            SkillCode;
  level:             ReadingLevel;
  nikud:             NikudState;
  excludePassages:   Set<string>;
  excludeQuestions:  Set<string>;
  rng?:              () => number;
}

function buildItem(pair: PassageQuestionPair, nikud: NikudState): PracticeItem {
  const { passage, question } = pair;
  return {
    itemId:         `${ItemFormat.PassageComp}_${passage.id}_${question.id}`,
    format:         ItemFormat.PassageComp,
    skillCode:      question.skillCode,
    skillHebrewKey: skillHebrewKey(question.skillCode),
    passage,
    question,
    level:          passage.level,
    nikud,
  };
}

/**
 * Pick one Format 1 item for a (skill, level) slot, honouring no-repeat.
 * Relaxes filters progressively so a session never stalls for lack of an exact
 * match: exact skill+level → skill any-level → any-skill exact-level → any.
 * Returns null only when the entire bank is exhausted by the exclusions.
 */
export function pickItem(args: PickArgs): PracticeItem | null {
  const rng = args.rng ?? Math.random;
  const base = { excludePassages: args.excludePassages, excludeQuestions: args.excludeQuestions };

  const attempts: Array<Parameters<typeof eligiblePairs>[0]> = [
    { skill: args.skill, level: args.level, ...base },
    { skill: args.skill,                    ...base },
    {                    level: args.level, ...base },
    {                                       ...base },
  ];

  for (const filter of attempts) {
    const pairs = eligiblePairs(filter);
    if (pairs.length > 0) {
      const pick = pairs[Math.floor(rng() * pairs.length)];
      return buildItem(pick, args.nikud);
    }
  }
  return null;
}

// ─── Format 2–5 item builders ─────────────────────────────────────────────────
//
// Each returns null when its bank is exhausted (exclusions); the composer then
// falls back to a Format 1 pick, so a session never stalls on a format.

/** Synthesise a Passage record for bank entries that aren't real passages. */
function pseudoPassage(id: string, text: string, level: ReadingLevel): Passage {
  return {
    id, level, vocabTier: 'T2',
    wordCount: text.trim().split(/\s+/).filter(Boolean).length,
    textFullNikud: text, textPartialNikud: null, textNoNikud: null,
    characterNames: [], genre: 'format', picture: null,
  };
}

function buildRereadItem(args: {
  nikud: NikudState;
  excludePassages: Set<string>; excludeQuestions: Set<string>; rng: () => number;
}): PracticeItem | null {
  const candidates = rereadCandidates(args);
  if (candidates.length === 0) return null;
  const c = candidates[Math.floor(args.rng() * candidates.length)];
  return {
    itemId:         `${ItemFormat.Reread}_${c.passage.id}_${c.q1.id}`,
    format:         ItemFormat.Reread,
    skillCode:      'FLU_REREAD_GAIN',
    skillHebrewKey: skillHebrewKey('FLU_REREAD_GAIN'),
    passage:        c.passage,
    question:       c.q1,
    question2:      c.q2,
    level:          c.passage.level,
    nikud:          args.nikud,
  };
}

function buildOrderingItem(args: {
  level: ReadingLevel; excludeQuestions: Set<string>; rng: () => number;
}): PracticeItem | null {
  const pool = ORDERING_BANK.filter(o => !args.excludeQuestions.has(o.id));
  if (pool.length === 0) return null;
  const near = pool.filter(o => o.level === args.level);
  const o = (near.length > 0 ? near : pool)[Math.floor(args.rng() * (near.length > 0 ? near : pool).length)];
  const passage = pseudoPassage(`p_${o.id}`, o.story, o.level);
  return {
    itemId:         `${ItemFormat.EventOrdering}_${o.id}`,
    format:         ItemFormat.EventOrdering,
    skillCode:      o.skill,
    skillHebrewKey: skillHebrewKey(o.skill),
    passage,
    // Pseudo-question so attempts have a stable question id; correctOption unused.
    question: {
      id: o.id, passageId: passage.id, skillCode: o.skill,
      questionText: '', options: o.events, correctOption: 0,
      hintText: null, questionLevel: o.level,
    },
    level:    o.level,
    nikud:    'full',   // stories render full nikud in V1
    ordering: o.events,
  };
}

function buildWICItem(args: {
  level: ReadingLevel; excludeQuestions: Set<string>; rng: () => number;
}): PracticeItem | null {
  const pool = WIC_BANK.filter(w => !args.excludeQuestions.has(w.id));
  if (pool.length === 0) return null;
  const near = pool.filter(w => w.level === args.level);
  const w = (near.length > 0 ? near : pool)[Math.floor(args.rng() * (near.length > 0 ? near : pool).length)];
  const passage = pseudoPassage(`p_${w.id}`, w.sentence, w.level);
  return {
    itemId:         `${ItemFormat.WordInContext}_${w.id}`,
    format:         ItemFormat.WordInContext,
    skillCode:      w.skill,
    skillHebrewKey: skillHebrewKey(w.skill),
    passage,
    question: {
      id: w.id, passageId: passage.id, skillCode: w.skill,
      questionText: '', options: w.options, correctOption: 0,
      hintText: null, questionLevel: w.level,
    },
    level:      w.level,
    nikud:      'full',   // vocab probe — decoding load stays out of the way
    targetWord: w.targetWord,
  };
}

function buildFlashItem(args: {
  excludeQuestions: Set<string>; rng: () => number;
}): PracticeItem | null {
  const pool = FLASH_BANK.filter(f => !args.excludeQuestions.has(f.id));
  if (pool.length === 0) return null;
  const f = pool[Math.floor(args.rng() * pool.length)];
  const passage = pseudoPassage(`p_${f.id}`, f.word, 1);
  return {
    itemId:         `${ItemFormat.Flash}_${f.id}`,
    format:         ItemFormat.Flash,
    skillCode:      f.skill,
    skillHebrewKey: skillHebrewKey(f.skill),
    passage,
    question: {
      id: f.id, passageId: passage.id, skillCode: f.skill,
      questionText: '', options: [f.word, ...f.distractors.map(d => d.text)],
      correctOption: 0, hintText: null, questionLevel: 1,
    },
    level: 1,
    nikud: 'none',   // flash words are unpointed by design
    flash: {
      word: f.word,
      durationMs: FLASH_DURATION_MS[f.tier],
      options: [{ text: f.word, pair: null }, ...f.distractors],
    },
  };
}

// ─── Focus-skill resolution (with the mastered-set cross-check) ─────────────────

interface Focus {
  blockedSkill: SkillCode;
  spacedSkills: SkillCode[];
  floor:        ReadingLevel;
  reasoning:    string[];
}

function resolveFocus(masteryMap: MasteryMap, gap: GapProfile | null): Focus {
  const reasoning: string[] = [];
  const masteredSet = new Set<string>(masteredSkills(masteryMap));
  const isActive = (s: string | null | undefined): s is SkillCode =>
    !!s && !masteredSet.has(s);

  // Gap-profile priorities, filtered through LIVE mastery (frozen-profile trap).
  const gapsOrdered = (gap?.composerNotes.blockedPracticePriority ?? []).filter(isActive);
  const inProgress  = skillsInProgress(masteryMap).filter(s => !masteredSet.has(s));

  // Default pool leans on comprehension (the dominant strand) when there's no
  // diagnostic yet — so a first-time offline session still has real content.
  const focusPool = [...new Set<SkillCode>([
    ...gapsOrdered,
    ...inProgress,
    ...COMP_SKILLS,
  ])].filter(s => !masteredSet.has(s));

  const firstNew = gap?.composerNotes.firstNewMaterial;
  const blockedSkill = (isActive(firstNew) ? firstNew : null) ?? focusPool[0] ?? COMP_SKILLS[0];
  const spacedSkills = focusPool.filter(s => s !== blockedSkill).slice(0, 4);

  const floor = gap?.composerNotes.passageDifficultyFloor ?? 1;

  if (masteredSet.size > 0) reasoning.push(`excluded ${masteredSet.size} mastered skill(s) from core buckets`);
  reasoning.push(`blocked skill: ${blockedSkill}`);
  reasoning.push(`spaced pool: ${spacedSkills.join(', ') || '(none)'}`);
  reasoning.push(`floor level: ${floor}`);

  return { blockedSkill, spacedSkills, floor, reasoning };
}

// ─── Bucket sizing ──────────────────────────────────────────────────────────────

function targetFor(mode: SessionMode): number {
  switch (mode) {
    case 'quantity': return SESSION_QUANTITY_ITEMS; // 15
    case 'time':     return 16;                     // ~15 min average
    case 'open':     return 8;                       // initial batch; extended on demand
  }
}

interface BucketPlan { phase: SessionPhase; skill?: SkillCode; level: ReadingLevel; }

// ─── Compose ─────────────────────────────────────────────────────────────────

export interface ComposeArgs {
  sessionId:        string;
  profileId:        string;
  mode:             SessionMode;
  masteryMap:       MasteryMap;
  gapProfile:       GapProfile | null;
  /** Scaffold start (from ScaffoldMemory), clamped to the floor. */
  startLevel:       ReadingLevel;
  startNikud:       NikudState;
  recentPassages:   Set<string>;
  recentQuestions:  Set<string>;
  /** Active error-signature recipes (resolveRecipes). Neutral when absent. */
  recipes?:         RecipeMods;
  /** Reread Challenge eligibility (1/session is structural; the 4/week cap is
   *  computed by the caller from stored attempts). */
  allowReread?:     boolean;
  /** Maintenance signatures active (letter-confuse / nikud-dependent) →
   *  Format 5 joins the mix; otherwise its slot falls back to Format 4/1. */
  maintenanceDrill?: boolean;
  rng?:             () => number;
}

export function composeSession(args: ComposeArgs): SessionPlan {
  const rng = args.rng ?? Math.random;
  const recipes = args.recipes ?? NEUTRAL_RECIPES;
  const focus = resolveFocus(args.masteryMap, args.gapProfile);

  // Recipe overrides (spec Part 4 composer recipes).
  const blockedSkill = recipes.blockedSkillOverride ?? focus.blockedSkill;
  const spacedSkills = recipes.prioritizeVocab
    ? ['COMP_VOCAB' as SkillCode, ...focus.spacedSkills.filter(s => s !== 'COMP_VOCAB')]
    : focus.spacedSkills;
  const floor      = recipes.forceLevel ?? focus.floor;
  const startLevel = recipes.forceLevel ?? clamp(args.startLevel, focus.floor, 3);
  const nikud      = recipes.forceNikud ?? args.startNikud;
  const target     = Math.max(6, Math.round(targetFor(args.mode) * recipes.targetMultiplier));

  const nWarm  = Math.max(2, Math.round(target * 0.15));
  const nBlock = Math.round(target * 0.20);
  const nSpace = Math.round(target * 0.20);
  const nInter = Math.max(0, target - nWarm - nBlock - nSpace);

  // Ordered slots: warmup → blocked → spaced → interleaved.
  const slots: BucketPlan[] = [];
  for (let i = 0; i < nWarm; i++)  slots.push({ phase: 'warmup', level: floor });
  for (let i = 0; i < nBlock; i++) slots.push({ phase: 'blocked_practice', skill: blockedSkill, level: startLevel });
  for (let i = 0; i < nSpace; i++) slots.push({ phase: 'spaced_retrieval', skill: spacedSkills[i % Math.max(1, spacedSkills.length)], level: startLevel });
  for (let i = 0; i < nInter; i++) {
    // Interleaved mixes levels a little for variety (spec: avoid same-format
    // streaks; here we vary level since Phase 1 is single-format).
    const level = clamp(startLevel + (i % 3 === 2 ? 1 : 0), floor, 3);
    slots.push({ phase: 'interleaved', level });
  }

  // Format assignment (spec Part 5 mix, single-cap aware):
  //   warmup: F1 short + one F4 · interleaved: one F2 (when allowed), one F3,
  //   one F5 (maintenance only, else F4), rest F1. Blocked/spaced stay F1 —
  //   comp skills need the passage+probe workhorse.
  let warmupSeen = 0, interSeen = 0;
  const formatFor = (slot: BucketPlan): ItemFormat => {
    if (slot.phase === 'warmup') {
      warmupSeen++;
      return warmupSeen === 2 ? ItemFormat.WordInContext : ItemFormat.PassageComp;
    }
    if (slot.phase === 'interleaved') {
      interSeen++;
      if (interSeen === 1 && (args.allowReread ?? true)) return ItemFormat.Reread;
      if (interSeen === 2) return ItemFormat.EventOrdering;
      if (interSeen === 3) return args.maintenanceDrill ? ItemFormat.Flash : ItemFormat.WordInContext;
      return ItemFormat.PassageComp;
    }
    return ItemFormat.PassageComp;
  };

  // Concretise each slot, tracking within-session exclusions so a session never
  // repeats a passage or question internally.
  const usedPassages = new Set<string>(args.recentPassages);
  const usedQuestions = new Set<string>(args.recentQuestions);
  const plannedItems: SessionPlanItem[] = [];
  let rereadPlaced = false;

  slots.forEach((slot, slotIdx) => {
    // Nikud-dependent bridging: alternate interleaved items at partial nikud.
    const slotNikud: NikudState =
      recipes.partialNikudBridge && slot.phase === 'interleaved' && slotIdx % 2 === 0
        ? 'partial'
        : nikud;

    let format = formatFor(slot);
    if (format === ItemFormat.Reread && rereadPlaced) format = ItemFormat.PassageComp;

    let item: PracticeItem | null = null;
    switch (format) {
      case ItemFormat.Reread:
        item = buildRereadItem({ nikud: slotNikud, excludePassages: usedPassages, excludeQuestions: usedQuestions, rng });
        if (item) rereadPlaced = true;
        break;
      case ItemFormat.EventOrdering:
        item = buildOrderingItem({ level: slot.level, excludeQuestions: usedQuestions, rng });
        break;
      case ItemFormat.WordInContext:
        item = buildWICItem({ level: slot.level, excludeQuestions: usedQuestions, rng });
        break;
      case ItemFormat.Flash:
        item = buildFlashItem({ excludeQuestions: usedQuestions, rng });
        break;
      default:
        break;
    }
    // Fall back to the Format 1 workhorse when the format's bank ran dry.
    item ??= pickItem({
      skill:            slot.skill,
      level:            slot.level,
      nikud:            slotNikud,
      excludePassages:  usedPassages,
      excludeQuestions: usedQuestions,
      rng,
    });
    if (!item) return; // every bank exhausted — plan is shorter, session still valid

    usedQuestions.add(item.question.id);
    if (item.question2) usedQuestions.add(item.question2.id);
    usedPassages.add(item.passage.id);
    plannedItems.push({ item, sessionPhase: slot.phase, position: plannedItems.length });
  });

  return {
    sessionId:         args.sessionId,
    profileId:         args.profileId,
    mode:              args.mode,
    plannedItems,
    targetItems:       args.mode === 'open' ? null : target,
    primarySkillCode:  blockedSkill,
    startedAt:         new Date().toISOString(),
    composerReasoning: [
      `mode: ${args.mode}, target: ${target}`,
      `buckets — warmup:${nWarm} blocked:${nBlock} spaced:${nSpace} interleaved:${nInter}`,
      `planned ${plannedItems.length} items`,
      ...focus.reasoning,
      ...recipes.notes.map(n => `recipe: ${n}`),
    ],
  };
}

function clamp(n: number, lo: number, hi: number): ReadingLevel {
  return (n < lo ? lo : n > hi ? hi : n) as ReadingLevel;
}
