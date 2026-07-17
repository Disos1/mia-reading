/**
 * Diagnostic item bank — spec Part 4.
 *
 * Entry phase: 12 items (E1–E12).
 *   E1        decoding gate (read sentence → pick matching picture)
 *   E2/E3/E12 fluency baseline: ONE ~34-word passage read three ways —
 *             with nikud (E2), without nikud (E3, derived), reread (E12).
 *             Paired timings give the nikud-dependence ratio + reread gain.
 *   E4–E11    one probe per comprehension skill (E9+E10 share a passage).
 *
 * Verification pool: 2 short items per comp skill, served only for skills the
 * entry phase got wrong (engine caps at 4 skills / 8 items).
 *
 * Substitution note (documented deviation): spec's E6 uses tap-to-order; that
 * interaction is Format 3 (Phase 3), so the diagnostic probes sequence with a
 * "what happened first / next" multiple choice instead.
 *
 * ⚠️ NIKUD REVIEW: Dima proofs vocalization before Mia's first real diagnostic.
 * Diverse Israeli names on purpose (Hebrew/Arabic/Russian).
 */

import type { NikudState, Passage, ReadingLevel, SkillCode, VocabTier } from '../types';

export type DiagPhase = 'entry' | 'verification';

export interface DiagItem {
  id:            string;
  phase:         DiagPhase;
  kind:          'picture' | 'passage';
  skillCode:     SkillCode;
  /** Some probes evidence two skills (E8: inference + character). */
  secondarySkillCode?: SkillCode;
  passage:       Passage;
  nikud:         NikudState;
  /** The question (options are text, or emoji for kind: 'picture'). */
  questionText:  string;
  options:       string[];
  correctOption: number;
  /** E10 reuses E9's passage — skip the timed reading phase. */
  skipReading?:  boolean;
  /** Fluency pairing: 1 = first pass (E2), 2 = reread (E12). */
  rereadPass?:   1 | 2;
  /** True when this timing feeds the no-nikud rate (E3). */
  noNikudTimed?: boolean;
}

let seq = 0;
function pass(args: {
  id: string; level: ReadingLevel; tier: VocabTier; full: string; picture?: string;
}): Passage {
  return {
    id:               `diag_${args.id}_${seq++}`,
    level:            args.level,
    vocabTier:        args.tier,
    wordCount:        args.full.trim().split(/\s+/).filter(Boolean).length,
    textFullNikud:    args.full,
    textPartialNikud: null,
    textNoNikud:      null,
    characterNames:   [],
    genre:            'diagnostic',
    picture:          args.picture ?? null,
  };
}

// ─── The shared fluency-baseline passage (~34 words, T1/T2 vocab) ─────────────

const FLUENCY_PASSAGE = pass({
  id: 'fluency', level: 2, tier: 'T2',
  full: 'בַּבֹּקֶר הָלְכָה נוֹעָה לַגַּן עִם אַבָּא שֶׁלָּהּ. בַּדֶּרֶךְ הֵם רָאוּ כֶּלֶב קָטָן, חָתוּל לָבָן וְצִפּוֹר עַל עֵץ. נוֹעָה סָפְרָה אֶת הַפְּרָחִים בַּגִּנָּה: אֶחָד, שְׁנַיִם, שְׁלֹשָׁה. אַחַר כָּךְ הִיא שִׂחֲקָה עִם הַחֲבֵרִים שֶׁלָּהּ עַד הָעֶרֶב.',
});

// ─── Entry items ──────────────────────────────────────────────────────────────

export const ENTRY_ITEMS: DiagItem[] = [
  // E1 — decoding gate: read the sentence, pick the matching picture.
  {
    id: 'E1', phase: 'entry', kind: 'picture', skillCode: 'DEC_NIKUD_COMPLEX',
    passage: pass({ id: 'gate', level: 1, tier: 'T1', full: 'הַיַּלְדָּה מְצַיֶּרֶת פַּרְפָּר גָּדוֹל.' }),
    nikud: 'full',
    questionText: 'אֵיזוֹ תְּמוּנָה מַתְאִימָה לַמִּשְׁפָּט?',
    options: ['🦋', '🐟', '🌳', '🚗'],
    correctOption: 0,
  },
  // E2 — fluency baseline, WITH nikud (pass 1).
  {
    id: 'E2', phase: 'entry', kind: 'passage', skillCode: 'FLU_SILENT_RATE',
    secondarySkillCode: 'COMP_LITERAL',
    passage: FLUENCY_PASSAGE, nikud: 'full', rereadPass: 1,
    questionText: 'עִם מִי הָלְכָה נוֹעָה לַגַּן?',
    options: ['אַבָּא שֶׁלָּהּ', 'אִמָּא שֶׁלָּהּ', 'סַבְתָּא', 'הֶחָבֵר שֶׁלָּהּ'],
    correctOption: 0,
  },
  // E3 — same passage, NO nikud (derived), different literal probe.
  {
    id: 'E3', phase: 'entry', kind: 'passage', skillCode: 'FLU_NO_NIKUD_RATE',
    secondarySkillCode: 'COMP_LITERAL',
    passage: FLUENCY_PASSAGE, nikud: 'none', noNikudTimed: true,
    questionText: 'מָה הֵם רָאוּ בַּדֶּרֶךְ?',
    options: ['כֶּלֶב, חָתוּל וְצִפּוֹר', 'רַק פָּרוֹת', 'אוֹטוֹבּוּס גָּדוֹל', 'שְׁלֹשָׁה יְלָדִים'],
    correctOption: 0,
  },
  // E4 — literal.
  {
    id: 'E4', phase: 'entry', kind: 'passage', skillCode: 'COMP_LITERAL',
    passage: pass({ id: 'lit', level: 1, tier: 'T1', full: 'אָדָם בָּנָה סֻכָּה בֶּחָצֵר. אַחְמַד, הֶחָבֵר שֶׁלּוֹ, הֵבִיא כִּסְּאוֹת.' }),
    nikud: 'full',
    questionText: 'מִי הֵבִיא כִּסְּאוֹת?',
    options: ['אַחְמַד', 'אָדָם', 'אַבָּא', 'הַשָּׁכֵן'],
    correctOption: 0,
  },
  // E5 — vocab in context.
  {
    id: 'E5', phase: 'entry', kind: 'passage', skillCode: 'COMP_VOCAB',
    passage: pass({ id: 'voc', level: 2, tier: 'T2', full: 'הַחֶדֶר הָיָה מְבֻלְגָּן מְאוֹד אַחֲרֵי הַמְּסִבָּה.' }),
    nikud: 'full',
    questionText: 'מָה הַפֵּרוּשׁ שֶׁל "מְבֻלְגָּן"?',
    options: ['לֹא מְסֻדָּר', 'נָקִי מְאוֹד', 'רֵיק', 'חָשׁוּךְ'],
    correctOption: 0,
  },
  // E6 — sequence (MC substitution for tap-to-order).
  {
    id: 'E6', phase: 'entry', kind: 'passage', skillCode: 'COMP_SEQUENCE',
    passage: pass({ id: 'seq', level: 2, tier: 'T2', full: 'מִיכָאֵל קָנָה בָּצֵק בַּחֲנוּת. הוּא הֵכִין פִּיצָה יַחַד עִם אִמָּא. הֵם אָפוּ אוֹתָהּ בַּתַּנּוּר. בַּסּוֹף כֻּלָּם אָכְלוּ יַחַד.' }),
    nikud: 'full',
    questionText: 'מָה קָרָה רִאשׁוֹן?',
    options: ['מִיכָאֵל קָנָה בָּצֵק', 'הֵם אָפוּ בַּתַּנּוּר', 'כֻּלָּם אָכְלוּ', 'הֵכִינוּ פִּיצָה'],
    correctOption: 0,
  },
  // E7 — cause.
  {
    id: 'E7', phase: 'entry', kind: 'passage', skillCode: 'COMP_CAUSE',
    passage: pass({ id: 'cau', level: 2, tier: 'T2', full: 'הַחַלּוֹן הָיָה פָּתוּחַ כָּל הַלַּיְלָה, לָכֵן דָּנִי הִצְטַנֵּן.' }),
    nikud: 'full',
    questionText: 'לָמָּה דָּנִי הִצְטַנֵּן?',
    options: ['כִּי הַחַלּוֹן הָיָה פָּתוּחַ', 'כִּי הוּא אָכַל גְּלִידָה', 'כִּי הוּא רָץ מַהֵר', 'כִּי הָיָה קַיִץ'],
    correctOption: 0,
  },
  // E8 — inference + character (emotion never stated).
  {
    id: 'E8', phase: 'entry', kind: 'passage', skillCode: 'COMP_INFERENCE',
    secondarySkillCode: 'COMP_CHARACTER',
    passage: pass({ id: 'inf', level: 2, tier: 'T2', full: 'יַסְמִין הִסְתַּכְּלָה עַל הַגְּלִידָה שֶׁנָּפְלָה לָהּ עַל הָרִצְפָּה. הָעֵינַיִם שֶׁלָּהּ הִתְמַלְּאוּ דְּמָעוֹת.' }),
    nikud: 'full',
    questionText: 'מָה יַסְמִין הִרְגִּישָׁה?',
    options: ['עֶצֶב', 'שִׂמְחָה', 'כַּעַס עַל חָבֵר', 'גַּאֲוָה'],
    correctOption: 0,
  },
  // E9 — main idea (~45-word paragraph).
  {
    id: 'E9', phase: 'entry', kind: 'passage', skillCode: 'COMP_MAIN_IDEA',
    passage: pass({
      id: 'main', level: 3, tier: 'MIXED',
      full: 'לְרוֹן יֵשׁ גִּנָּה קְטַנָּה מֵאֲחוֹרֵי הַבַּיִת. כָּל בֹּקֶר הוּא מַשְׁקֶה אֶת הַצְּמָחִים וּבוֹדֵק אִם צָמְחוּ עַגְבָנִיּוֹת חֲדָשׁוֹת. בַּקַּיִץ הוּא קוֹטֵף אֶת הָעַגְבָנִיּוֹת הָאֲדֻמּוֹת וּמֵבִיא אוֹתָן לַמִּטְבָּח. אִמָּא מְכִינָה מֵהֶן סָלָט טָעִים, וְרוֹן גֵּאֶה מְאוֹד שֶׁהַיְּרָקוֹת שֶׁלּוֹ עַל הַשֻּׁלְחָן.',
    }),
    nikud: 'full',
    questionText: 'עַל מָה הַקֶּטַע מְסַפֵּר?',
    options: ['עַל הַגִּנָּה שֶׁל רוֹן', 'עַל מִטְבָּח חָדָשׁ', 'עַל חֲנוּת יְרָקוֹת', 'עַל אֲרוּחַת בֹּקֶר'],
    correctOption: 0,
  },
  // E10 — title, SAME passage as E9 (no re-read).
  {
    id: 'E10', phase: 'entry', kind: 'passage', skillCode: 'COMP_TITLE',
    passage: null as unknown as Passage, // filled below — shares E9's passage
    nikud: 'full', skipReading: true,
    questionText: 'אֵיזוֹ כּוֹתֶרֶת הֲכִי מַתְאִימָה לַקֶּטַע?',
    options: ['הַגַּנָּן הַקָּטָן', 'יוֹם בַּיָּם', 'הַמְּסִבָּה', 'חֹרֶף קַר'],
    correctOption: 0,
  },
  // E11 — predict (last event missing).
  {
    id: 'E11', phase: 'entry', kind: 'passage', skillCode: 'COMP_PREDICT',
    passage: pass({ id: 'pre', level: 2, tier: 'T2', full: 'טַל לָקְחָה מִטְרִיָּה וְיָצְאָה הַחוּצָה. הַשָּׁמַיִם הָיוּ אֲפֹרִים וְהָרוּחַ הִתְחַזְּקָה.' }),
    nikud: 'full',
    questionText: 'מָה כְּנִרְאֶה יִקְרֶה עַכְשָׁו?',
    options: ['יֵרֵד גֶּשֶׁם', 'תִּזְרַח שֶׁמֶשׁ חַמָּה', 'יֵרֵד שֶׁלֶג כָּבֵד', 'טַל תֵּלֵךְ לִישֹׁן'],
    correctOption: 0,
  },
  // E12 — reread-gain probe: E2's passage again, new literal question.
  {
    id: 'E12', phase: 'entry', kind: 'passage', skillCode: 'FLU_REREAD_GAIN',
    secondarySkillCode: 'COMP_LITERAL',
    passage: FLUENCY_PASSAGE, nikud: 'full', rereadPass: 2,
    questionText: 'כַּמָּה פְּרָחִים סָפְרָה נוֹעָה?',
    options: ['שְׁלֹשָׁה', 'חֲמִשָּׁה', 'עֲשָׂרָה', 'שְׁנַיִם'],
    correctOption: 0,
  },
];

// E10 shares E9's passage object (same id → engine knows not to re-time it).
ENTRY_ITEMS[9].passage = ENTRY_ITEMS[8].passage;

// ─── Verification pool (2 per comp skill; engine serves ≤8) ───────────────────

function v(
  id: string, skill: SkillCode, full: string, q: string, options: string[],
  level: ReadingLevel = 1,
): DiagItem {
  return {
    id, phase: 'verification', kind: 'passage', skillCode: skill,
    passage: pass({ id: id.toLowerCase(), level, tier: 'T1', full }),
    nikud: 'full', questionText: q, options, correctOption: 0,
  };
}

export const VERIFICATION_POOL: DiagItem[] = [
  v('V_LIT_1', 'COMP_LITERAL',
    'בַּצָּהֳרַיִם אָכַל אֵיתָן מָרָק חַם עִם לֶחֶם.',
    'מָה אָכַל אֵיתָן?',
    ['מָרָק וְלֶחֶם', 'פִּיצָה', 'סָלָט', 'עוּגָה']),
  v('V_LIT_2', 'COMP_LITERAL',
    'סַבָּא קָרָא סִפּוּר לְנִיקוֹל לִפְנֵי הַשֵּׁנָה.',
    'מִי קָרָא אֶת הַסִּפּוּר?',
    ['סַבָּא', 'אִמָּא', 'נִיקוֹל', 'הַמּוֹרָה']),
  v('V_VOC_1', 'COMP_VOCAB',
    'הַדֶּרֶךְ אֶל רֹאשׁ הָהָר הָיְתָה תְּלוּלָה מְאוֹד.',
    'מָה הַפֵּרוּשׁ שֶׁל "תְּלוּלָה"?',
    ['עוֹלָה בְּחָדוּת', 'יְשָׁרָה לְגַמְרֵי', 'רְטֻבָּה', 'קְצָרָה מְאוֹד'], 2),
  v('V_VOC_2', 'COMP_VOCAB',
    'הַזַּמֶּרֶת הָיְתָה מְפֻרְסֶמֶת בְּכָל הָאָרֶץ.',
    'מָה הַפֵּרוּשׁ שֶׁל "מְפֻרְסֶמֶת"?',
    ['שֶׁכֻּלָּם מַכִּירִים אוֹתָהּ', 'שֶׁאַף אֶחָד לֹא שָׁמַע עָלֶיהָ', 'שֶׁהִיא עֲצוּבָה', 'שֶׁהִיא גָּרָה רָחוֹק'], 2),
  v('V_SEQ_1', 'COMP_SEQUENCE',
    'רוֹנִי לָבְשָׁה מְעִיל. אַחַר כָּךְ הִיא נָעֲלָה מַגָּפַיִם. בַּסּוֹף הִיא יָצְאָה אֶל הַגֶּשֶׁם.',
    'מָה עָשְׂתָה רוֹנִי אַחֲרֵי שֶׁלָּבְשָׁה מְעִיל?',
    ['נָעֲלָה מַגָּפַיִם', 'יָצְאָה אֶל הַגֶּשֶׁם', 'הָלְכָה לִישֹׁן', 'אָכְלָה אֲרוּחַת בֹּקֶר']),
  v('V_SEQ_2', 'COMP_SEQUENCE',
    'קֹדֶם שָׁטַף אָבִיב אֶת הַיָּדַיִם. אַחַר כָּךְ הוּא עָזַר לְאַבָּא לְקַלֵּף תַּפּוּחֵי אֲדָמָה. בַּסּוֹף הֵם בִּשְּׁלוּ מָרָק.',
    'מָה אָבִיב עָשָׂה רִאשׁוֹן?',
    ['שָׁטַף יָדַיִם', 'קִלֵּף תַּפּוּחֵי אֲדָמָה', 'בִּשֵּׁל מָרָק', 'עָרַךְ שֻׁלְחָן']),
  v('V_CAU_1', 'COMP_CAUSE',
    'הַכְּבִישׁ הָיָה חָלָק מֵהַגֶּשֶׁם, לָכֵן הַמְּכוֹנִיּוֹת נָסְעוּ לְאַט.',
    'לָמָּה הַמְּכוֹנִיּוֹת נָסְעוּ לְאַט?',
    ['כִּי הַכְּבִישׁ הָיָה חָלָק', 'כִּי הָיָה פְּקָק גָּדוֹל', 'כִּי הָיָה חֹשֶׁךְ', 'כִּי הַדֶּרֶךְ הָיְתָה אֲרֻכָּה'], 2),
  v('V_CAU_2', 'COMP_CAUSE',
    'אֶמִילִי שָׁכְחָה אֶת הַכָּרִיךְ בַּבַּיִת, לָכֵן הִיא הָיְתָה רְעֵבָה בַּהַפְסָקָה.',
    'לָמָּה אֶמִילִי הָיְתָה רְעֵבָה?',
    ['כִּי הִיא שָׁכְחָה אֶת הַכָּרִיךְ', 'כִּי הִיא קָמָה מְאֻחָר', 'כִּי הַהַפְסָקָה הָיְתָה קְצָרָה', 'כִּי הִיא רָצְתָה גְּלִידָה'], 2),
  v('V_INF_1', 'COMP_INFERENCE',
    'עִידוֹ נִכְנַס הַבַּיְתָה עִם מַגָּפַיִם רְטֻבּוֹת וּמְעִיל נוֹטֵף מַיִם.',
    'מָה כְּנִרְאֶה הָיָה בַּחוּץ?',
    ['גֶּשֶׁם', 'שֶׁמֶשׁ חֲזָקָה', 'רוּחַ יְבֵשָׁה', 'שֶׁלֶג'], 2),
  v('V_INF_2', 'COMP_INFERENCE',
    'לְיַד הַדֶּלֶת עָמְדוּ מִזְוָדוֹת גְּדוֹלוֹת, וְאַבָּא הֶחֱזִיק כַּרְטִיסֵי טִיסָה.',
    'מָה הַמִּשְׁפָּחָה עוֹמֶדֶת לַעֲשׂוֹת?',
    ['לִנְסֹעַ לְחֻפְשָׁה', 'לֶאֱכֹל אֲרוּחַת עֶרֶב', 'לְסַדֵּר אֶת הַבַּיִת', 'לִקְנוֹת רָהִיטִים'], 2),
  v('V_PRE_1', 'COMP_PREDICT',
    'שִׁירָה מִלְּאָה אֶת הָאַמְבַּטְיָה בְּמַיִם חַמִּים וְהֵבִיאָה מַגֶּבֶת.',
    'מָה שִׁירָה תַּעֲשֶׂה עַכְשָׁו?',
    ['תִּתְרַחֵץ', 'תֵּצֵא לְטִיּוּל', 'תָּכִין שִׁעוּרִים', 'תְּבַשֵּׁל מָרָק']),
  v('V_PRE_2', 'COMP_PREDICT',
    'דָּוִד שָׂם אֶת הָעוּגָה בַּתַּנּוּר וְהִפְעִיל שָׁעוֹן מְעוֹרֵר.',
    'מָה יִקְרֶה כְּשֶׁהַשָּׁעוֹן יְצַלְצֵל?',
    ['הָעוּגָה תִּהְיֶה מוּכָנָה', 'דָּוִד יֵלֵךְ לִישֹׁן', 'הַתַּנּוּר יִתְקַלְקֵל', 'יַתְחִיל לָרֶדֶת גֶּשֶׁם']),
  v('V_MAIN_1', 'COMP_MAIN_IDEA',
    'אוֹרִי אוֹהֵב לְטַיֵּל עִם הַמִּשְׁפָּחָה בַּחֹרֶף. הֵם הוֹלְכִים לִרְאוֹת אֶת הַנַּחַל שֶׁמִּתְמַלֵּא מַיִם, וְאוֹסְפִים עָלִים צִבְעוֹנִיִּים. בְּסוֹף כָּל טִיּוּל הֵם שׁוֹתִים שׁוֹקוֹ חַם.',
    'עַל מָה הַקֶּטַע מְסַפֵּר?',
    ['עַל טִיּוּלֵי הַחֹרֶף שֶׁל אוֹרִי', 'עַל שִׁעוּרֵי הַבַּיִת', 'עַל חֲנוּת הַשּׁוֹקוֹ', 'עַל הַקַּיִץ בַּיָּם'], 2),
  v('V_TIT_1', 'COMP_TITLE',
    'בַּכִּתָּה שֶׁל נוּר יֵשׁ פִּנַּת קְרִיאָה חֲדָשָׁה. יֵשׁ בָּהּ שָׁטִיחַ רַךְ, כָּרִיּוֹת גְּדוֹלוֹת וּמַדָּף מָלֵא סְפָרִים. כָּל הַיְּלָדִים רוֹצִים לָשֶׁבֶת שָׁם בַּהַפְסָקָה.',
    'אֵיזוֹ כּוֹתֶרֶת הֲכִי מַתְאִימָה?',
    ['פִּנַּת הַקְּרִיאָה שֶׁלָּנוּ', 'יוֹם סְפּוֹרְט', 'הַטִּיּוּל הַשְּׁנָתִי', 'מְסִבַּת יוֹם הֻלֶּדֶת'], 2),
];
