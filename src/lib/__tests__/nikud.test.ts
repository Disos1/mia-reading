import { describe, it, expect } from 'vitest';
import { toNoNikud, toPartialNikud, stripPoints, textForNikud } from '../nikud';
import type { Passage } from '../../types';

/**
 * The unpointed variant is the pedagogical heart of this app (the grade-3/4
 * transition off nikud). These cases are the contract: each expectation is the
 * spelling Mia would meet in an Israeli book or worksheet (כתיב מלא).
 */
describe('toNoNikud — כתיב מלא re-spelling', () => {
  const cases: Array<[string, string, string]> = [
    // [pointed, expected unpointed, rule being exercised]
    ['בַּבֹּקֶר',     'בבוקר',   'holam haser → ו'],
    ['הַכֹּל',        'הכול',    'holam haser → ו'],
    ['שְׁלֹשָׁה',      'שלושה',   'holam haser → ו'],
    ['גָּדוֹל',       'גדול',    'holam male → keep single ו'],
    ['שָׁלוֹם',       'שלום',    'holam male → keep single ו'],
    ['חַלּוֹן',       'חלון',    'holam male after dagesh'],
    ['שֻׁלְחָן',       'שולחן',   'qubuts → ו'],
    ['סִפּוּר',       'סיפור',   'hiriq → י and shuruk → ו'],
    ['צִפּוֹר',       'ציפור',   'hiriq → י in an open syllable'],
    ['אִמָּא',        'אימא',    'hiriq → י before a doubled consonant'],
    ['כִּסֵּא',        'כיסא',    'hiriq → י, tsere adds nothing'],
    ['מִשְׁפָּחָה',    'משפחה',   'hiriq stays bare in a closed syllable'],
    ['הִתְלַבְּשָׁה',   'התלבשה',  'hiriq stays bare before a plain shva'],
    ['קִבְּלָה',      'קיבלה',   'hiriq keeps its yod before a DOUBLED consonant'],
    ['בִּקְּשָׁה',      'ביקשה',   'hiriq keeps its yod before a doubled consonant'],
    ['עִם',          'עם',      'hiriq stays bare in a word-final closed syllable'],
    ['הִגִּיעָה',      'הגיעה',   'the hif\'il הִ־ prefix never takes a yod'],
    ['הִסְתַּכֵּל',     'הסתכל',   'the hitpa\'el הִ־ prefix never takes a yod'],
    ['רִאשׁוֹן',      'ראשון',   'a silent alef closes the syllable'],
    ['עַגְבָנִיּוֹת',   'עגבניות', 'hiriq before a mater yod adds nothing'],
    ['שִׁנַּיִם',      'שיניים',  'the dual ־ַיִם doubles the yod'],
    ['יָדַיִם',       'ידיים',   'the dual ־ַיִם doubles the yod'],
    ['סֵפֶר',        'ספר',     'tsere/segol add nothing'],
    ['יֶלֶד',        'ילד',     'segol adds nothing; initial yod stays single'],
    ['תִּקְוָה',       'תקווה',   'consonantal vav doubles word-medially'],
  ];

  for (const [pointed, expected, rule] of cases) {
    it(`${pointed} → ${expected}  (${rule})`, () => {
      expect(toNoNikud(pointed)).toBe(expected);
    });
  }

  it('keeps the conjunctive ו־ single at the start of a word', () => {
    expect(toNoNikud('וְיֶלֶד')).toBe('וילד');
  });

  it('uses the exceptions table for the doubled-yod class the rules cannot derive', () => {
    expect(toNoNikud('חִיְּכָה')).toBe('חייכה');
    // …while the regular case stays single-yod, which is why it is a table.
    expect(toNoNikud('הָיָה')).toBe('היה');
  });

  it('re-spells a full sentence, preserving punctuation and spacing', () => {
    const pointed = 'בַּבֹּקֶר הָלְכָה נוֹעָה לַגַּן עִם אַבָּא שֶׁלָּהּ.';
    expect(toNoNikud(pointed)).toBe('בבוקר הלכה נועה לגן עם אבא שלה.');
  });

  it('leaves already-unpointed text untouched (idempotent)', () => {
    const plain = 'בבוקר הלכה נועה לגן';
    expect(toNoNikud(plain)).toBe(plain);
  });

  it('differs from a naive point-strip — the bug this module exists to fix', () => {
    const pointed = 'בַּבֹּקֶר';
    expect(stripPoints(pointed)).toBe('בבקר');   // כתיב חסר — what she never sees
    expect(toNoNikud(pointed)).toBe('בבוקר');    // כתיב מלא — what she reads
  });
});

describe('toPartialNikud', () => {
  it('removes the שווא family and nothing else', () => {
    expect(toPartialNikud('הָלְכָה')).toBe('הָלכָה');
  });

  it('keeps כתיב חסר spelling — pointed text is never spelled מלא', () => {
    // No ו inserted for the holam: this variant is still pointed.
    expect(toPartialNikud('בַּבֹּקֶר')).toBe('בַּבֹּקֶר');
  });
});

describe('textForNikud', () => {
  const base: Passage = {
    id: 'p_test', level: 1, vocabTier: 'T1', wordCount: 1,
    textFullNikud: 'בַּבֹּקֶר',
    textPartialNikud: null, textNoNikud: null,
    characterNames: [], genre: null, picture: null,
  };

  it('derives when no explicit variant is authored', () => {
    expect(textForNikud(base, 'full')).toBe('בַּבֹּקֶר');
    expect(textForNikud(base, 'none')).toBe('בבוקר');
  });

  it('prefers an explicit override — the escape hatch for irregular spelling', () => {
    const withOverride: Passage = { ...base, textNoNikud: 'בבקר' };
    expect(textForNikud(withOverride, 'none')).toBe('בבקר');
  });
});
