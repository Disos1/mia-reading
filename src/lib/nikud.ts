/**
 * Nikud derivation — full → partial → none.
 *
 * We author each passage ONCE with full nikud and derive the lighter variants
 * programmatically, so the three variants can never drift out of sync (a real
 * risk if hand-authored — a wrong vowel teaches the wrong reading). This also
 * matches the spec's partial-nikud definition ("only שווא marks removed").
 *
 * Unicode note: Hebrew points sit in U+05B0–U+05C7. We strip vowel points and
 * dagesh/shin-sin dots; base consonants are untouched.
 *
 * Caveat (documented for the Phase 5 generation pipeline): stripping points
 * from vocalized text yields כתיב חסר, whereas Israeli unpointed text is כתיב
 * מלא (adds ו/י as mater lectionis). For very common words the difference is
 * cosmetic and readable; a passage may override `textNoNikud` explicitly when
 * proper כתיב מלא matters.
 */

// Sheva (U+05B0) + the three hatafs (U+05B1–U+05B3) — the "שווא family".
const SHEVA_FAMILY = /[ְ-ֳ]/g;

// All vowel points + dagesh/mapiq/meteg/rafe + shin/sin dots + qamats-qatan.
const ALL_POINTS = /[ְ-ׇֽֿׁׂ]/g;

/** Partial nikud: remove only the שווא family (sheva + hatafs). */
export function toPartialNikud(fullNikud: string): string {
  return fullNikud.replace(SHEVA_FAMILY, '');
}

/** No nikud: strip every vowel point and dot. */
export function toNoNikud(fullNikud: string): string {
  return fullNikud.replace(ALL_POINTS, '');
}

/** Resolve the text a passage should show at a given nikud state, preferring
 *  an explicit authored variant and falling back to derivation. */
import type { Passage, NikudState } from '../types';

export function textForNikud(passage: Passage, nikud: NikudState): string {
  switch (nikud) {
    case 'full':
      return passage.textFullNikud;
    case 'partial':
      return passage.textPartialNikud ?? toPartialNikud(passage.textFullNikud);
    case 'none':
      return passage.textNoNikud ?? toNoNikud(passage.textFullNikud);
  }
}
