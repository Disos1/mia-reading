/**
 * Diagnostic engine — spec Part 4. Pure functions; the DiagnosticFlow route
 * drives the sequence and persists the output.
 *
 * Signals:
 *   • nikud-dependence ratio = with-nikud wpm ÷ no-nikud wpm (E2 vs E3 on the
 *     SAME passage). > 1.5 → dependent.
 *   • reread gain = (pass1 readMs − pass2 readMs) / pass1 readMs (E2 vs E12).
 *   • per-skill correctness across entry + verification.
 *
 * Verification: only for comp skills the entry phase got WRONG — up to 4
 * skills × 2 items (cap 8), in pedagogical priority order.
 *
 * Honesty rule (math false-mastery lesson): the diagnostic never grants
 * שליטה — single items can't prove mastery. It seeds בתהליך everywhere it
 * probed, and orders the composer's priorities.
 */

import type {
  GapProfile,
  MasteryStatus,
  SkillCode,
  StrandCode,
} from '../types';
import { ENTRY_ITEMS, VERIFICATION_POOL, type DiagItem } from '../content/diagnosticItems';
import { COMP_SKILLS } from '../constants/skills';

export interface DiagAnswer {
  itemId:     string;
  skillCode:  SkillCode;
  secondarySkillCode?: SkillCode;
  correct:    boolean;
  /** Passage dwell before "finished reading" (0 when skipReading). */
  readMs:     number;
  responseMs: number;
  wordCount:  number;
  rereadPass?: 1 | 2;
  noNikudTimed?: boolean;
}

export function entryItems(): DiagItem[] {
  return ENTRY_ITEMS;
}

// ─── Verification selection ───────────────────────────────────────────────────

const VERIFICATION_PRIORITY: SkillCode[] = [
  'COMP_LITERAL', 'COMP_VOCAB', 'COMP_SEQUENCE', 'COMP_CAUSE',
  'COMP_INFERENCE', 'COMP_MAIN_IDEA', 'COMP_TITLE', 'COMP_PREDICT',
];
const MAX_VERIFICATION_SKILLS = 4;

/** Comp skills whose entry probe was wrong → their 2 verification items. */
export function verificationItemsFor(entryAnswers: DiagAnswer[]): DiagItem[] {
  const wrongSkills = new Set(
    entryAnswers.filter(a => !a.correct).flatMap(a => {
      const s: SkillCode[] = [];
      if ((COMP_SKILLS as string[]).includes(a.skillCode)) s.push(a.skillCode);
      if (a.secondarySkillCode && (COMP_SKILLS as string[]).includes(a.secondarySkillCode)) {
        s.push(a.secondarySkillCode);
      }
      return s;
    }),
  );
  const targets = VERIFICATION_PRIORITY
    .filter(s => wrongSkills.has(s))
    .slice(0, MAX_VERIFICATION_SKILLS);
  return VERIFICATION_POOL.filter(item => targets.includes(item.skillCode));
}

// ─── Signal computation ───────────────────────────────────────────────────────

const NIKUD_DEPENDENCE_THRESHOLD = 1.5;
const GRADE_NORM_WPM = 60;         // Israeli 3rd-grade silent-rate norm
const GRADE_NORM_COMP_ACC = 0.7;

function wpm(wordCount: number, readMs: number): number | null {
  if (!readMs || readMs <= 0) return null;
  return (wordCount / readMs) * 60000;
}

export interface DiagSignals {
  withNikudWpm:  number | null;
  noNikudWpm:    number | null;
  nikudRatio:    number | null;
  nikudDependent: boolean;
  rereadGainPct: number | null;
  compAccuracy:  number;
  /** attempts/correct per skill (primary + secondary evidence). */
  perSkill: Partial<Record<SkillCode, { attempts: number; correct: number }>>;
}

export function computeSignals(answers: DiagAnswer[]): DiagSignals {
  const pass1 = answers.find(a => a.rereadPass === 1);
  const pass2 = answers.find(a => a.rereadPass === 2);
  const noNik = answers.find(a => a.noNikudTimed);

  const withNikudWpm = pass1 ? wpm(pass1.wordCount, pass1.readMs) : null;
  const noNikudWpm   = noNik ? wpm(noNik.wordCount, noNik.readMs) : null;
  const nikudRatio   = withNikudWpm !== null && noNikudWpm !== null && noNikudWpm > 0
    ? withNikudWpm / noNikudWpm
    : null;

  const rereadGainPct = pass1 && pass2 && pass1.readMs > 0
    ? (pass1.readMs - pass2.readMs) / pass1.readMs
    : null;

  const perSkill: DiagSignals['perSkill'] = {};
  const add = (skill: SkillCode, correct: boolean) => {
    const cur = perSkill[skill] ?? { attempts: 0, correct: 0 };
    perSkill[skill] = { attempts: cur.attempts + 1, correct: cur.correct + (correct ? 1 : 0) };
  };
  for (const a of answers) {
    add(a.skillCode, a.correct);
    if (a.secondarySkillCode) add(a.secondarySkillCode, a.correct);
  }

  const compEntries = Object.entries(perSkill)
    .filter(([k]) => (COMP_SKILLS as string[]).includes(k))
    .map(([, v]) => v);
  const compAttempts = compEntries.reduce((s, v) => s + v.attempts, 0);
  const compCorrect  = compEntries.reduce((s, v) => s + v.correct, 0);

  return {
    withNikudWpm,
    noNikudWpm,
    nikudRatio,
    nikudDependent: nikudRatio !== null && nikudRatio > NIKUD_DEPENDENCE_THRESHOLD,
    rereadGainPct,
    compAccuracy: compAttempts > 0 ? compCorrect / compAttempts : 0,
    perSkill,
  };
}

// ─── Gap profile assembly ─────────────────────────────────────────────────────

export function assembleGapProfile(args: {
  profileId: string;
  sessionId: string;
  answers:   DiagAnswer[];
}): GapProfile {
  const s = computeSignals(args.answers);

  // Comp skills ordered weakest-first (the composer's blocked-practice queue).
  const compByAccuracy = COMP_SKILLS
    .map(code => {
      const rec = s.perSkill[code];
      return { code, acc: rec && rec.attempts > 0 ? rec.correct / rec.attempts : null };
    })
    .filter((x): x is { code: SkillCode; acc: number } => x.acc !== null)
    .sort((a, b) => a.acc - b.acc);

  const weak = compByAccuracy.filter(x => x.acc < 1);
  const blockedPracticePriority = (weak.length > 0 ? weak : compByAccuracy).map(x => x.code);

  const gateAnswer = args.answers.find(a => a.itemId === 'E1');
  const slowRate = s.withNikudWpm !== null && s.withNikudWpm < GRADE_NORM_WPM;

  const strandStatus: Partial<Record<StrandCode, MasteryStatus>> = {
    DECODING:         'בתהליך',
    WORD_RECOGNITION: 'טרם נלמד',   // not probed in the V1 diagnostic
    FLUENCY:          'בתהליך',
    COMPREHENSION:    'בתהליך',
  };

  const skillAccuracy: GapProfile['skillAccuracy'] = {};
  for (const [code, rec] of Object.entries(s.perSkill)) {
    skillAccuracy[code as SkillCode] = {
      attempts: rec.attempts,
      correct:  rec.correct,
      status:   'בתהליך',
    };
  }

  const activeErrorSignatures: GapProfile['activeErrorSignatures'] = [];
  if (s.nikudDependent) activeErrorSignatures.push('ERR_NIKUD_DEPENDENT');
  {
    const lit = s.perSkill.COMP_LITERAL;
    const inf = s.perSkill.COMP_INFERENCE;
    const cha = s.perSkill.COMP_CHARACTER;
    const infAtt = (inf?.attempts ?? 0) + (cha?.attempts ?? 0);
    const infCor = (inf?.correct ?? 0) + (cha?.correct ?? 0);
    if (lit && lit.attempts > 0 && lit.correct / lit.attempts >= 0.8 &&
        infAtt > 0 && infCor / infAtt <= 0.5) {
      activeErrorSignatures.push('ERR_LITERAL_OK_INFERENCE_FAIL');
    }
  }
  if (slowRate && s.compAccuracy < GRADE_NORM_COMP_ACC) {
    activeErrorSignatures.push('ERR_GENERAL_STRUGGLE');
  } else if (slowRate && s.compAccuracy >= GRADE_NORM_COMP_ACC) {
    activeErrorSignatures.push('ERR_SLOW_ACCURATE');
  }

  // Floor: struggling readers start at Level 1; solid comp starts at 2.
  const passageDifficultyFloor =
    s.compAccuracy >= 0.75 && !activeErrorSignatures.includes('ERR_GENERAL_STRUGGLE') ? 2 : 1;

  // Decoding-gate failure forces the floor down regardless of comp.
  const floor = gateAnswer && !gateAnswer.correct ? 1 : passageDifficultyFloor;

  return {
    version:      1,
    userId:       args.profileId,
    completedAt:  new Date().toISOString(),
    diagnosticSessionId: args.sessionId,
    strandStatus,
    skillAccuracy,
    activeErrorSignatures,
    composerNotes: {
      firstNewMaterial:        blockedPracticePriority[0] ?? 'COMP_INFERENCE',
      blockedPracticePriority,
      passageDifficultyFloor:  floor as GapProfile['composerNotes']['passageDifficultyFloor'],
      nikudDependence:         s.nikudDependent,
      nikudDependenceRatio:    s.nikudRatio,
    },
    baselineMetrics: {
      silentRateWithNikudWpm: s.withNikudWpm !== null ? Math.round(s.withNikudWpm) : null,
      silentRateNoNikudWpm:   s.noNikudWpm   !== null ? Math.round(s.noNikudWpm)   : null,
      rereadGainPct:          s.rereadGainPct,
      compAccuracyPct:        s.compAccuracy,
    },
  };
}

// ─── Mastery seeding inputs ───────────────────────────────────────────────────

/** Split probed skills into gaps (<2/3 accuracy) and strengths for seeding. */
export function gapsAndStrengths(profile: GapProfile): { gaps: SkillCode[]; strengths: SkillCode[] } {
  const gaps: SkillCode[] = [];
  const strengths: SkillCode[] = [];
  for (const [code, rec] of Object.entries(profile.skillAccuracy)) {
    if (!rec || rec.attempts === 0) continue;
    (rec.correct / rec.attempts >= 2 / 3 ? strengths : gaps).push(code as SkillCode);
  }
  return { gaps, strengths };
}
