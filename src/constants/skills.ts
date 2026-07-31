/**
 * Skill catalog — the 25 reading skills across 4 strands (spec Part 3 + the
 * plan's COMP_QGEN addition). Each entry carries its strand and i18n key.
 *
 * Hebrew labels live in he_f.json / he_m.json under `skill.<CODE>` so they can
 * be gender-switched; never hardcode Hebrew here.
 */

import type { SkillCode, StrandCode } from '../types';

export interface SkillDef {
  code:      SkillCode;
  strand:    StrandCode;
  /** Maintenance strands are diagnosed lightly and surfaced only when they
   *  block an active strand. Active strands get ~80% of session time. */
  active:    boolean;
  hebrewKey: string; // i18n key → t(hebrewKey, {gender})
}

export const SKILLS: SkillDef[] = [
  // ── פענוח / Decoding (maintenance) ──
  { code: 'DEC_NIKUD_COMPLEX',     strand: 'DECODING', active: false, hebrewKey: 'skill.DEC_NIKUD_COMPLEX' },
  { code: 'DEC_SHIN_SIN',          strand: 'DECODING', active: false, hebrewKey: 'skill.DEC_SHIN_SIN' },
  { code: 'DEC_BKP',               strand: 'DECODING', active: false, hebrewKey: 'skill.DEC_BKP' },
  { code: 'DEC_NO_NIKUD_FAMILIAR', strand: 'DECODING', active: false, hebrewKey: 'skill.DEC_NO_NIKUD_FAMILIAR' },
  { code: 'DEC_NO_NIKUD_INFER',    strand: 'DECODING', active: false, hebrewKey: 'skill.DEC_NO_NIKUD_INFER' },

  // ── זיהוי מילים / Word Recognition (maintenance; elevated when nikud-dependent) ──
  { code: 'WR_HF_T1',       strand: 'WORD_RECOGNITION', active: false, hebrewKey: 'skill.WR_HF_T1' },
  { code: 'WR_HF_T2',       strand: 'WORD_RECOGNITION', active: false, hebrewKey: 'skill.WR_HF_T2' },
  { code: 'WR_HF_T3',       strand: 'WORD_RECOGNITION', active: false, hebrewKey: 'skill.WR_HF_T3' },
  { code: 'WR_AFFIX',       strand: 'WORD_RECOGNITION', active: false, hebrewKey: 'skill.WR_AFFIX' },
  { code: 'WR_INFLECTION',  strand: 'WORD_RECOGNITION', active: false, hebrewKey: 'skill.WR_INFLECTION' },

  // ── שטף / Fluency (active) ──
  { code: 'FLU_SILENT_RATE',       strand: 'FLUENCY', active: true, hebrewKey: 'skill.FLU_SILENT_RATE' },
  { code: 'FLU_NO_NIKUD_RATE',     strand: 'FLUENCY', active: true, hebrewKey: 'skill.FLU_NO_NIKUD_RATE' },
  { code: 'FLU_ACCURACY_INFERRED', strand: 'FLUENCY', active: true, hebrewKey: 'skill.FLU_ACCURACY_INFERRED' },
  { code: 'FLU_REREAD_GAIN',       strand: 'FLUENCY', active: true, hebrewKey: 'skill.FLU_REREAD_GAIN' },
  { code: 'FLU_CONNECTED_TEXT',    strand: 'FLUENCY', active: true, hebrewKey: 'skill.FLU_CONNECTED_TEXT' },

  // ── הבנת הנקרא / Comprehension (dominant, active) ──
  { code: 'COMP_LITERAL',   strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_LITERAL' },
  { code: 'COMP_VOCAB',     strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_VOCAB' },
  { code: 'COMP_SEQUENCE',  strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_SEQUENCE' },
  { code: 'COMP_CAUSE',     strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_CAUSE' },
  { code: 'COMP_INFERENCE', strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_INFERENCE' },
  { code: 'COMP_CHARACTER', strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_CHARACTER' },
  { code: 'COMP_PREDICT',   strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_PREDICT' },
  { code: 'COMP_MAIN_IDEA', strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_MAIN_IDEA' },
  { code: 'COMP_TITLE',     strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_TITLE' },
  { code: 'COMP_QGEN',         strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_QGEN' },
  // 4th grade
  { code: 'COMP_SUMMARY',      strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_SUMMARY' },
  { code: 'COMP_FACT_OPINION', strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_FACT_OPINION' },
  { code: 'COMP_COMPARE',      strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_COMPARE' },
  { code: 'COMP_GENRE',        strand: 'COMPREHENSION', active: true, hebrewKey: 'skill.COMP_GENRE' },
];

const BY_CODE: Record<string, SkillDef> = Object.fromEntries(SKILLS.map(s => [s.code, s]));

export function skillDef(code: SkillCode): SkillDef {
  return BY_CODE[code];
}

export function strandOf(code: SkillCode): StrandCode {
  return BY_CODE[code].strand;
}

export function skillHebrewKey(code: SkillCode): string {
  return BY_CODE[code]?.hebrewKey ?? `skill.${code}`;
}

/** Comprehension skills only — the dominant strand the composer favours. */
export const COMP_SKILLS: SkillCode[] = SKILLS
  .filter(s => s.strand === 'COMPREHENSION')
  .map(s => s.code);

/** Every skill code, in catalog order. */
export const ALL_SKILL_CODES: SkillCode[] = SKILLS.map(s => s.code);
