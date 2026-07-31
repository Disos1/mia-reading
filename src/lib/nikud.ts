/**
 * Nikud derivation — full → partial → none.
 *
 * We author each passage ONCE with full nikud and derive the lighter variants
 * programmatically, so the three variants can never drift out of sync (a wrong
 * vowel teaches a wrong reading).
 *
 * ── Why this file is more than a regex ──────────────────────────────────────
 * Naively stripping the points from pointed text yields כתיב חסר (בבקר, צפור,
 * שלשה). Israeli unpointed text — everything Mia meets in a book or a worksheet
 * — is כתיב מלא (בבוקר, ציפור, שלושה): it inserts ו/י as mater lectionis where
 * the pointed spelling relied on a vowel sign. Since the whole point of this app
 * is the grade-3/4 transition OFF nikud, showing her a spelling she never
 * encounters would undermine the core mechanic. So `toNoNikud` re-spells.
 *
 * Rules implemented (Academy of the Hebrew Language, כללי הכתיב המלא):
 *   • holam haser on any consonant  → insert ו   (בֹּקֶר → בוקר)
 *   • holam male (holam on a vav)   → keep the ו (גָּדוֹל → גדול)
 *   • qubuts                        → insert ו   (שֻׁלְחָן → שולחן)
 *   • shuruk (vav + dagesh alone)   → keep the ו (סִפּוּר → סיפור)
 *   • hiriq                         → insert י, UNLESS the syllable is closed
 *                                     (next consonant carries a shva) or a
 *                                     mater yod already follows
 *                                     (צִפּוֹר → ציפור, but מִשְׁפָּחָה → משפחה)
 *   • consonantal vav, word-medial  → double it  (תִּקְוָה → תקווה)
 *   • tsere / segol / patah / qamats → no insertion (סֵפֶר → ספר)
 *
 * Deliberately NOT implemented: doubling of consonantal yod. The Academy's rule
 * has too many lexical exceptions to guess safely (בִּנְיָן → בניין but הָיָה →
 * היה). Single yod is emitted; a passage whose unpointed form needs יי sets
 * `textNoNikud` explicitly.
 *
 * ESCAPE HATCH: every rule here is a default. `Passage.textNoNikud` (and
 * `textPartialNikud`) override the derivation whenever a word doesn't follow it.
 *
 * Partial nikud keeps כתיב חסר on purpose: partially-pointed text is still
 * pointed text, and pointed Hebrew is written חסר. Only the fully-unpointed
 * variant is re-spelled מלא.
 */

import type { Passage, NikudState } from '../types';

// ─── Unicode ──────────────────────────────────────────────────────────────────

const SHVA        = 'ְ';
const HATAF_SEGOL = 'ֱ';
const HATAF_QAMATS= 'ֳ';
const HIRIQ       = 'ִ';
const HOLAM       = 'ֹ';
const HOLAM_VAV   = 'ֺ';   // holam haser for vav (rare)
const QUBUTS      = 'ֻ';
const DAGESH      = 'ּ';   // also mapiq / shuruk dot
const QAMATS_QATAN= 'ׇ';

const VAV = 'ו';
const YOD = 'י';

/** Any Hebrew consonant (including final forms). */
const IS_LETTER = (c: string) => c >= 'א' && c <= 'ת';
/** Any combining point we may see attached to a consonant. */
const IS_MARK = (c: string) =>
  (c >= 'ְ' && c <= 'ֽ') || c === 'ֿ' ||
  c === 'ׁ' || c === 'ׂ' || c === 'ׇ';

/** Vowel signs proper (excludes shva/hatafs, dagesh, shin-sin dots, meteg). */
const IS_VOWEL = (c: string) =>
  (c >= HIRIQ && c <= HOLAM_VAV) || c === QUBUTS || c === QAMATS_QATAN;

// The שווא family, for the partial-nikud variant.
const SHEVA_FAMILY = new RegExp(`[${SHVA}${HATAF_SEGOL}-${HATAF_QAMATS}]`, 'g');
// Every point, for the raw strip.
const ALL_POINTS = /[ְ-ׇֽֿׁׂ]/g;

// ─── Cluster parsing ──────────────────────────────────────────────────────────

interface Cluster {
  /** The base character (a Hebrew letter, or any non-letter passed through). */
  base:    string;
  /** Combining marks attached to it, in source order. */
  marks:   string;
  /** False for punctuation, spaces, digits — those pass through untouched. */
  isLetter: boolean;
}

function toClusters(text: string): Cluster[] {
  const out: Cluster[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (IS_MARK(ch)) continue;                  // stray mark with no base — drop
    let marks = '';
    while (i + 1 < text.length && IS_MARK(text[i + 1])) marks += text[++i];
    out.push({ base: ch, marks, isLetter: IS_LETTER(ch) });
  }
  return out;
}

const has = (c: Cluster, mark: string) => c.marks.includes(mark);
const hasVowel = (c: Cluster) => [...c.marks].some(IS_VOWEL);

// ─── כתיב מלא derivation ──────────────────────────────────────────────────────

/**
 * No nikud: strip the points AND re-spell as כתיב מלא, so the output matches
 * the unpointed Hebrew Mia actually reads.
 *
 * Works word by word. A word carrying no points at all is passed through
 * untouched — the function is safe to call on text that is already unpointed,
 * and on mixed content (an unpointed name inside a pointed sentence).
 */
export function toNoNikud(fullNikud: string): string {
  const cl = toClusters(fullNikud);
  let out = '';
  let i = 0;
  while (i < cl.length) {
    if (!cl[i].isLetter) { out += cl[i].base; i++; continue; }
    const start = i;
    while (i < cl.length && cl[i].isLetter) i++;
    out += respellWord(cl.slice(start, i));
  }
  return out;
}

/**
 * Words whose unpointed spelling the rules can't derive — almost all of them
 * the doubled-yod class the Academy governs lexically (חִיְּכָה → חייכה, but
 * הָיָה → היה). Small on purpose: add a word here only after checking the
 * standard spelling, and prefer a passage-level `textNoNikud` override for
 * one-offs. Keyed by the pointed form exactly as authored.
 */
/**
 * Keys are the NAIVELY-stripped form (points removed, no re-spelling); values
 * are the correct כתיב מלא. Keying this way makes the lookup insensitive to
 * the dagesh a prefix induces (הַשָּׁמַיִם and שָׁמַיִם both reduce to שמים).
 */
const WORD_EXCEPTIONS: Record<string, string> = {
  // Doubled consonantal yod — governed lexically, not phonologically.
  'חיכה':   'חייכה',
  'חיך':    'חייך',
  'מצירת':  'מציירת',
  'לטיל':   'לטייל',
  'סימה':   'סיימה',
  'דיסה':   'דייסה',
  'היתה':   'הייתה',
  'בנין':   'בניין',
  'ענין':   'עניין',
  'שניה':   'שנייה',
  'ספריה':  'ספרייה',
  'מטריה':  'מטרייה',
  'עיפים':  'עייפים',
  'קוביות': 'קובייות',
  // Holam haser conventionally left bare.
  'לא':     'לא',
  'ראש':    'ראש',
  'זאת':    'זאת',
  // מִן־ prefixed function words: the prefix hiriq takes no yod, unlike the
  // noun stems that look identical (מִטָּה → מיטה).
  'מתחת':   'מתחת',
  'ממנה':   'ממנה',
  'מלפני':  'מלפני',
  'מקביות': 'מקוביות',
  // Names and high-frequency duals written with a single yod.
  'דוד':    'דוד',
  'לוי':    'לוי',
  'טליה':   'טליה',
  'מים':    'מים',
  'שמים':   'שמים',
};

/** Prefix letters that can attach in front of a word (ו,ה,ב,כ,ל,מ,ש). */
const PREFIX_LETTERS = new Set(['ו', 'ה', 'ב', 'כ', 'ל', 'מ', 'ש']);

/**
 * Look a word up in the exception table, allowing up to three attached
 * prefixes (בְּמַיִם → ב + מים, כְּשֶׁסִּיְּמָה → כש + סיימה).
 */
function lookupException(word: Cluster[]): string | null {
  for (let cut = 0; cut <= Math.min(3, word.length - 1); cut++) {
    if (cut > 0 && !PREFIX_LETTERS.has(word[cut - 1].base)) break;
    const stem = word.slice(cut).map(c => c.base).join('');
    const hit = WORD_EXCEPTIONS[stem];
    if (hit) return word.slice(0, cut).map(c => c.base).join('') + hit;
  }
  return null;
}

function respellWord(word: Cluster[]): string {
  // Untouched if the word was never pointed (idempotency + mixed content).
  if (!word.some(c => c.marks.length > 0)) return word.map(c => c.base).join('');

  const exception = lookupException(word);
  if (exception) return exception;

  let out = '';
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    const next = word[i + 1];

    if (c.base === VAV) {
      // holam male (וֹ) or shuruk (וּ) → the vav IS the vowel: keep one.
      const isHolamMale = has(c, HOLAM) || has(c, HOLAM_VAV);
      const isShuruk    = has(c, DAGESH) && !hasVowel(c);
      if (isHolamMale || isShuruk) { out += VAV; continue; }
      // Otherwise consonantal. Word-medial doubles (תִּקְוָה → תקווה); the
      // word-initial conjunctive ו־ and the word-final ־יו suffix never do.
      const atEdge = i === 0 || i === word.length - 1;
      out += atEdge ? VAV : VAV + VAV;
      continue;
    }

    // Dual ending ־ַיִם (שִׁנַּיִם, עֵינַיִם, יָדַיִם) doubles the yod: ־יים.
    // High-frequency singles like מים / שמים are in the exceptions table.
    const prev = word[i - 1];
    const isDualYod =
      c.base === YOD && has(c, HIRIQ) &&
      next && next.base === 'ם' && i + 1 === word.length - 1 &&
      prev && has(prev, 'ַ');
    if (isDualYod) { out += YOD + YOD; continue; }

    out += c.base;

    const hasHolam = has(c, HOLAM) || has(c, HOLAM_VAV);

    // Alternative encoding: holam typed on the consonant with the mater vav
    // following as a bare letter. Consume that vav rather than adding a second.
    if (hasHolam && next && next.base === VAV && next.marks === '') {
      out += VAV; i++; continue;
    }

    // holam haser / qubuts on a normal consonant → the vowel becomes a vav.
    if (hasHolam || has(c, QUBUTS)) { out += VAV; continue; }

    // hiriq → yod, unless a mater yod already follows or the syllable is closed.
    // Closed means the next consonant carries a plain shva (מִשְׁפָּחָה) *or* is a
    // bare word-final consonant (עִם) — both leave the hiriq short, so no yod.
    //
    // The dagesh exception matters: a shva'd consonant that ALSO carries a
    // dagesh is doubled (dagesh hazak), and modern spelling keeps the yod —
    // קִבְּלָה → קיבלה, בִּקְּשָׁה → ביקשה — unlike plain-shva הִתְלַבְּשָׁה → התלבשה.
    if (has(c, HIRIQ)) {
      // A yod already stands there — never write a second one, whatever it
      // carries (עַגְבָנִיּוֹת → עגבניות, צִבְעוֹנִיִּים → צבעוניים).
      const followedByMaterYod = next && next.base === YOD;
      const closedByShva       = next && has(next, SHVA) && !has(next, DAGESH);
      const closedAtWordEnd    = next && i + 1 === word.length - 1
                                      && !hasVowel(next) && !has(next, SHVA);
      // A silent alef closes the syllable the same way: רִאשׁוֹן → ראשון.
      const closedByAlef       = next && next.base === 'א' && !hasVowel(next);
      // Morphology: the הִ־ prefix of hif'il / hitpa'el never takes a yod
      // (הִגִּיעָה → הגיעה, הִסְתַּכְּלָה → הסתכלה), unlike pi'el stems (סיפר, קיבל).
      const isVerbPrefixHe     = i === 0 && c.base === 'ה';
      if (!followedByMaterYod && !closedByShva && !closedAtWordEnd &&
          !closedByAlef && !isVerbPrefixHe) out += YOD;
    }
  }
  return out;
}

/** Partial nikud: remove only the שווא family; spelling stays חסר (see header). */
export function toPartialNikud(fullNikud: string): string {
  return fullNikud.replace(SHEVA_FAMILY, '');
}

/** Raw strip with no re-spelling — kept for diagnostics/tooling comparisons. */
export function stripPoints(text: string): string {
  return text.replace(ALL_POINTS, '');
}

/** Resolve the text a passage should show at a given nikud state, preferring
 *  an explicit authored variant and falling back to derivation. */
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
