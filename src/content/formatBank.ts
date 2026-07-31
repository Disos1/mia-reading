/**
 * Format content bank — Formats 3 (event ordering), 4 (word in context),
 * 5 (flash) draw from here. Format 2 (reread) reuses the passage bank.
 *
 * ⚠️ NIKUD REVIEW: Dima proofs vocalization (stories + sentences) before real
 * use, same as the passage bank.
 *
 * Flash design (spec Part 5 + Part 4 ERR_LETTER_CONFUSE): each distractor
 * differs from the target by exactly ONE letter drawn from a confusable pair
 * (ב/כ, ר/ד, ה/ח, ס/ם, ו/י, ת/ח, ז/ן) and is tagged with that pair, so a wrong
 * tap tells us WHICH confusion fired. Pseudowords are deliberate — forcing
 * orthographic precision is the point. Untagged fillers (pair: null) appear
 * only where a word offers fewer than three natural confusions.
 * Flash words + options are unpointed: WR_HF_* is instant recognition of the
 * unpointed form (the grade-3 default script), not decoding.
 */

import type { ConfusablePair, ReadingLevel, SkillCode } from '../types';

// ─── Format 5 — Flash (בזק) ───────────────────────────────────────────────────

export interface FlashEntry {
  id:    string;
  tier:  'T1' | 'T2' | 'T3';
  skill: SkillCode;          // WR_HF_T1 / T2 / T3
  word:  string;             // the real word (unpointed)
  distractors: Array<{ text: string; pair: ConfusablePair | null }>;
}

/** Flash duration by tier (spec Part 5): harder words flash SHORTER. */
export const FLASH_DURATION_MS: Record<FlashEntry['tier'], number> = {
  T1: 1500, T2: 1000, T3: 600,
};

export const FLASH_BANK: FlashEntry[] = [
  // T1 — top-100 words
  { id: 'FL_1', tier: 'T1', skill: 'WR_HF_T1', word: 'בית',
    distractors: [{ text: 'כית', pair: 'ב/כ' }, { text: 'בות', pair: 'ו/י' }, { text: 'ביח', pair: 'ת/ח' }] },
  { id: 'FL_2', tier: 'T1', skill: 'WR_HF_T1', word: 'חבר',
    distractors: [{ text: 'הבר', pair: 'ה/ח' }, { text: 'חכר', pair: 'ב/כ' }, { text: 'חבד', pair: 'ר/ד' }] },
  { id: 'FL_3', tier: 'T1', skill: 'WR_HF_T1', word: 'ילד',
    distractors: [{ text: 'ולד', pair: 'ו/י' }, { text: 'ילר', pair: 'ר/ד' }, { text: 'ילב', pair: null }] },
  { id: 'FL_4', tier: 'T1', skill: 'WR_HF_T1', word: 'סוס',
    distractors: [{ text: 'סום', pair: 'ס/ם' }, { text: 'סיס', pair: 'ו/י' }, { text: 'שוס', pair: null }] },
  // T2 — words 101–500
  { id: 'FL_5', tier: 'T2', skill: 'WR_HF_T2', word: 'רחוב',
    distractors: [{ text: 'דחוב', pair: 'ר/ד' }, { text: 'רהוב', pair: 'ה/ח' }, { text: 'רחוכ', pair: 'ב/כ' }] },
  { id: 'FL_6', tier: 'T2', skill: 'WR_HF_T2', word: 'חלון',
    distractors: [{ text: 'הלון', pair: 'ה/ח' }, { text: 'חלין', pair: 'ו/י' }, { text: 'חלוז', pair: 'ז/ן' }] },
  { id: 'FL_7', tier: 'T2', skill: 'WR_HF_T2', word: 'תמונה',
    distractors: [{ text: 'חמונה', pair: 'ת/ח' }, { text: 'תמינה', pair: 'ו/י' }, { text: 'תמונח', pair: 'ה/ח' }] },
  { id: 'FL_8', tier: 'T2', skill: 'WR_HF_T2', word: 'כתובת',
    distractors: [{ text: 'בתובת', pair: 'ב/כ' }, { text: 'כחובת', pair: 'ת/ח' }, { text: 'כתיבת', pair: 'ו/י' }] },
  // T3 — words 501–1000
  { id: 'FL_9', tier: 'T3', skill: 'WR_HF_T3', word: 'הרפתקה',
    distractors: [{ text: 'חרפתקה', pair: 'ה/ח' }, { text: 'הדפתקה', pair: 'ר/ד' }, { text: 'הרפחקה', pair: 'ת/ח' }] },
  { id: 'FL_10', tier: 'T3', skill: 'WR_HF_T3', word: 'זיכרון',
    distractors: [{ text: 'זיברון', pair: 'ב/כ' }, { text: 'זיכדון', pair: 'ר/ד' }, { text: 'ויכרון', pair: 'ו/י' }] },
  { id: 'FL_11', tier: 'T3', skill: 'WR_HF_T3', word: 'תזמורת',
    distractors: [{ text: 'חזמורת', pair: 'ת/ח' }, { text: 'תזמודת', pair: 'ר/ד' }, { text: 'תזמירת', pair: 'ו/י' }] },
  { id: 'FL_12', tier: 'T3', skill: 'WR_HF_T3', word: 'עיפרון',
    distractors: [{ text: 'עיפדון', pair: 'ר/ד' }, { text: 'עופרון', pair: 'ו/י' }, { text: 'עיפרוז', pair: 'ז/ן' }] },
];

// ─── Format 4 — Word in Context (מילה בהקשר) ─────────────────────────────────

export interface WICEntry {
  id:         string;
  level:      ReadingLevel;
  skill:      SkillCode;      // COMP_VOCAB
  /** Full-nikud sentence containing the target word. */
  sentence:   string;
  /** The exact form of the target word as it appears in the sentence. */
  targetWord: string;
  /** options[0] = correct meaning; options[3] = the most-obviously-wrong
   *  distractor (the hint crosses IT out — authoring convention). */
  options:    string[];
  /** Why that meaning fits — shown after a miss (build plan H1). */
  explanation: string;
}

export const WIC_BANK: WICEntry[] = [
  { id: 'WIC_1', level: 1, skill: 'COMP_VOCAB',
    sentence: 'אַחֲרֵי הַגֶּשֶׁם הַדֶּשֶׁא הָיָה רָטֹב.', targetWord: 'רָטֹב',
    explanation: 'אַחֲרֵי גֶּשֶׁם הַדֶּשֶׁא סוֹפֵג מַיִם — וְזֶה בְּדִיּוּק "רָטֹב".',
    options: ['מָלֵא מַיִם', 'חַם מְאוֹד', 'גָּבוֹהַּ', 'צָהֹב'] },
  { id: 'WIC_2', level: 1, skill: 'COMP_VOCAB',
    sentence: 'בַּגַּן הַחַיּוֹת רָאִינוּ פִּיל עָצוּם.', targetWord: 'עָצוּם',
    explanation: 'פִּיל הוּא חַיָּה עֲנָקִית. "עָצוּם" מְתָאֵר מַשֶּׁהוּ גָּדוֹל מְאוֹד.',
    options: ['גָּדוֹל מְאוֹד', 'קָטָן', 'רָזֶה', 'וָרֹד'] },
  { id: 'WIC_3', level: 1, skill: 'COMP_VOCAB',
    sentence: 'הַחֶדֶר הָיָה שָׁקֵט כְּשֶׁכֻּלָּם יָשְׁנוּ.', targetWord: 'שָׁקֵט',
    explanation: 'כֻּלָּם יָשְׁנוּ, אָז לֹא הָיָה רַעַשׁ. "שָׁקֵט" הוּא בְּלִי רַעַשׁ.',
    options: ['בְּלִי רַעַשׁ', 'מָלֵא אֲנָשִׁים', 'מוּאָר', 'מָתוֹק'] },
  { id: 'WIC_4', level: 1, skill: 'COMP_VOCAB',
    sentence: 'דָּן מִהֵר לַתַּחֲנָה כְּדֵי לֹא לְאַחֵר.', targetWord: 'מִהֵר',
    explanation: 'הוּא לֹא רָצָה לְאַחֵר, אָז נָסַע מַהֵר. "מִהֵר" זֶה לַעֲשׂוֹת מַשֶּׁהוּ מַהֵר.',
    options: ['הָלַךְ מַהֵר', 'יָשַׁן', 'צִיֵּר', 'שָׁתָה מַיִם'] },
  { id: 'WIC_5', level: 2, skill: 'COMP_VOCAB',
    sentence: 'הַכַּבַּאי הָאַמִּיץ נִכְנַס לַבַּיִת הַבּוֹעֵר.', targetWord: 'הָאַמִּיץ',
    explanation: 'הוּא נִכְנַס לְבַיִת בּוֹעֵר. מִי שֶׁעוֹשֶׂה דָּבָר מְסֻכָּן כָּזֶה — לֹא מְפַחֵד.',
    options: ['שֶׁלֹּא מְפַחֵד', 'שֶׁעָיֵף מְאוֹד', 'שֶׁנָּמוּךְ', 'שֶׁרָעֵב'] },
  { id: 'WIC_6', level: 2, skill: 'COMP_VOCAB',
    sentence: 'הַסְּנָאִי הַזָּרִיז טִפֵּס עַל הָעֵץ בִּן־רֶגַע.', targetWord: 'הַזָּרִיז',
    explanation: 'הוּא טִפֵּס "בִּן־רֶגַע" — כְּלוֹמַר מַהֵר מְאוֹד וּבְקַלּוּת.',
    options: ['מָהִיר וְקַל תְּנוּעָה', 'אִטִּי וְכָבֵד', 'יָשֵׁן', 'רָטֹב'] },
  { id: 'WIC_7', level: 2, skill: 'COMP_VOCAB',
    sentence: 'בָּעֶרֶב הָיָה קָרִיר וְלָבַשְׁנוּ סְוֶדֶר.', targetWord: 'קָרִיר',
    explanation: 'לָבְשׁוּ סְוֶדֶר, אָז הָיָה קְצָת קַר — אֲבָל לֹא קַר מְאוֹד.',
    options: ['קְצָת קַר', 'חַם מְאוֹד', 'רוֹעֵשׁ', 'טָעִים'] },
  { id: 'WIC_8', level: 2, skill: 'COMP_VOCAB',
    sentence: 'בַּמּוּזֵאוֹן יֵשׁ כַּד עַתִּיק מִלִּפְנֵי מֵאוֹת שָׁנִים.', targetWord: 'עַתִּיק',
    explanation: 'כָּתוּב "מִלִּפְנֵי מֵאוֹת שָׁנִים" — אָז זֶה מַשֶּׁהוּ יָשָׁן מְאוֹד.',
    options: ['יָשָׁן מְאוֹד', 'חָדָשׁ לְגַמְרֵי', 'שָׁבוּר', 'כָּחֹל'] },
  { id: 'WIC_9', level: 2, skill: 'COMP_VOCAB',
    sentence: 'הָיָה לָנוּ יוֹם נֶהְדָּר בַּחוֹף.', targetWord: 'נֶהְדָּר',
    explanation: 'יוֹם בַּחוֹף שֶׁהָיָה "נֶהְדָּר" — כְּלוֹמַר יָפֶה וּמְהַנֶּה מְאוֹד.',
    options: ['יָפֶה וּמְהַנֶּה מְאוֹד', 'מְשַׁעֲמֵם', 'קָצָר', 'קַר וְרָטֹב'] },
  { id: 'WIC_10', level: 3, skill: 'COMP_VOCAB',
    sentence: 'הַשַּׁחְקָנִית קִבְּלָה תְּשׁוּאוֹת בְּסוֹף הַהוֹפָעָה.', targetWord: 'תְּשׁוּאוֹת',
    explanation: 'בְּסוֹף הוֹפָעָה הַקָּהָל מוֹחֵא כַּפַּיִם — זֶה מָה שֶׁהִיא קִבְּלָה.',
    options: ['מְחִיאוֹת כַּפַּיִם רָמוֹת', 'מִכְתָּבִים', 'פְּרָחִים לְבָנִים', 'כּוֹס מַיִם'] },
];

// ─── Format 3 — Event Ordering (סדר אירועים) ─────────────────────────────────

export interface OrderingEntry {
  id:     string;
  level:  ReadingLevel;
  skill:  SkillCode;       // COMP_SEQUENCE
  /** Full-nikud narrative (3–5 sentences). */
  story:  string;
  /** Event-card texts in CORRECT order (3–4 cards; renderer shuffles). */
  events: string[];
  /** The time-word reasoning behind the order — shown after a miss. */
  explanation: string;
}

export const ORDERING_BANK: OrderingEntry[] = [
  { id: 'ORD_1', level: 1, skill: 'COMP_SEQUENCE',
    story: 'הַכֶּלֶב רָאָה כַּדּוּר. הוּא רָץ אַחֲרָיו וְתָפַס אוֹתוֹ. אַחַר כָּךְ הוּא הֵבִיא אֶת הַכַּדּוּר לַיֶּלֶד.',
    explanation: 'הַסֵּדֶר בַּסִּפּוּר: רָאָה ← רָץ וְתָפַס ← הֵבִיא לַיֶּלֶד.',
    events: ['רָאָה כַּדּוּר', 'רָץ וְתָפַס אוֹתוֹ', 'הֵבִיא אוֹתוֹ לַיֶּלֶד'] },
  { id: 'ORD_2', level: 2, skill: 'COMP_SEQUENCE',
    story: 'רוּת קָמָה בַּבֹּקֶר. הִיא הִתְלַבְּשָׁה וְאָכְלָה דַּיְסָה חַמָּה. אַחַר כָּךְ הִיא לָקְחָה אֶת הַתִּיק וְיָצְאָה לְבֵית הַסֵּפֶר.',
    explanation: 'מִלּוֹת הַזְּמַן מַנְחוֹת: קָמָה, אַחַר כָּךְ הִתְלַבְּשָׁה וְאָכְלָה, וּבַסּוֹף יָצְאָה.',
    events: ['קָמָה מֵהַמִּטָּה', 'הִתְלַבְּשָׁה וְאָכְלָה', 'יָצְאָה לְבֵית הַסֵּפֶר'] },
  { id: 'ORD_3', level: 2, skill: 'COMP_SEQUENCE',
    story: 'יוֹאָב זָרַע גַּרְעִין בָּאֲדָמָה. הוּא הִשְׁקָה אוֹתוֹ כָּל יוֹם. אַחֲרֵי שָׁבוּעַ צָמַח נֶבֶט קָטָן, וּבַסּוֹף פָּרַח פֶּרַח צָהֹב.',
    explanation: 'קֹדֶם זוֹרְעִים, אַחַר כָּךְ מַשְׁקִים, וְרַק אָז צוֹמֵחַ נֶבֶט וּפוֹרֵחַ פֶּרַח.',
    events: ['זָרַע גַּרְעִין', 'הִשְׁקָה כָּל יוֹם', 'צָמַח נֶבֶט', 'פָּרַח פֶּרַח'] },
  { id: 'ORD_4', level: 2, skill: 'COMP_SEQUENCE',
    story: 'סַבְתָּא וְנוּר הֵכִינוּ בָּצֵק לְעוּגָה. הֵן שָׁפְכוּ אוֹתוֹ לַתַּבְנִית וְאָפוּ בַּתַּנּוּר. כְּשֶׁהָעוּגָה הִתְקָרְרָה, כֻּלָּם טָעֲמוּ מִמֶּנָּה.',
    explanation: 'קֹדֶם מְכִינִים בָּצֵק, שׁוֹפְכִים לַתַּבְנִית, אוֹפִים — וְרַק בַּסּוֹף טוֹעֲמִים.',
    events: ['הֵכִינוּ בָּצֵק', 'שָׁפְכוּ לַתַּבְנִית', 'אָפוּ בַּתַּנּוּר', 'טָעֲמוּ מֵהָעוּגָה'] },
  { id: 'ORD_5', level: 2, skill: 'COMP_SEQUENCE',
    story: 'מִשְׁפַּחַת לֵוִי נָסְעָה לַיָּם. הַיְּלָדִים בָּנוּ אַרְמוֹן חוֹל וְשָׂחוּ בַּמַּיִם הַקְּרִירִים. בָּעֶרֶב כֻּלָּם חָזְרוּ הַבַּיְתָה עֲיֵפִים וּשְׂמֵחִים.',
    explanation: 'קֹדֶם נָסְעוּ, אַחַר כָּךְ בָּנוּ וְשָׂחוּ, וּבָעֶרֶב חָזְרוּ הַבַּיְתָה.',
    events: ['נָסְעוּ לַיָּם', 'בָּנוּ אַרְמוֹן חוֹל', 'שָׂחוּ בַּמַּיִם', 'חָזְרוּ הַבַּיְתָה'] },
  { id: 'ORD_6', level: 2, skill: 'COMP_SEQUENCE',
    story: 'בַּבֹּקֶר הַשָּׁמַיִם הִתְכַּסּוּ בַּעֲנָנִים אֲפֹרִים. אַחַר כָּךְ יָרַד גֶּשֶׁם חָזָק. כְּשֶׁהַגֶּשֶׁם נִגְמַר, הוֹפִיעָה בַּשָּׁמַיִם קֶשֶׁת צִבְעוֹנִית.',
    explanation: 'קֹדֶם עֲנָנִים, אַחַר כָּךְ גֶּשֶׁם, וְרַק כְּשֶׁהוּא נִגְמַר — קֶשֶׁת.',
    events: ['הִתְכַּסּוּ עֲנָנִים', 'יָרַד גֶּשֶׁם', 'הוֹפִיעָה קֶשֶׁת'] },
  { id: 'ORD_7', level: 3, skill: 'COMP_SEQUENCE',
    story: 'צִפּוֹר קְטַנָּה בָּנְתָה קֵן עַל הָעֵץ. הִיא הֵטִילָה בּוֹ שָׁלוֹשׁ בֵּיצִים. אַחֲרֵי זְמַן־מָה בָּקְעוּ מֵהַבֵּיצִים גּוֹזָלִים רְעֵבִים, וְהָאֵם הֵבִיאָה לָהֶם אֹכֶל בַּמַּקּוֹר.',
    explanation: 'קֹדֶם בּוֹנִים קֵן, אַחַר כָּךְ מְטִילִים בֵּיצִים, מֵהֶן בּוֹקְעִים גּוֹזָלִים — וְאָז מַאֲכִילִים.',
    events: ['בָּנְתָה קֵן', 'הֵטִילָה בֵּיצִים', 'בָּקְעוּ גּוֹזָלִים', 'הֵבִיאָה אֹכֶל'] },
  { id: 'ORD_8', level: 3, skill: 'COMP_SEQUENCE',
    story: 'טָלִיָה שָׁאֲלָה סֵפֶר חָדָשׁ מֵהַסִּפְרִיָּה. הִיא קָרְאָה בּוֹ כָּל עֶרֶב לִפְנֵי הַשֵּׁנָה. כְּשֶׁסִּיְּמָה אֶת הַסִּפּוּר, הִיא הֶחְזִירָה אֶת הַסֵּפֶר וּבָחֲרָה לָהּ סֵפֶר אַחֵר.',
    explanation: 'קֹדֶם שָׁאֲלָה סֵפֶר, קָרְאָה בּוֹ, הֶחְזִירָה אוֹתוֹ — וְרַק אָז בָּחֲרָה חָדָשׁ.',
    events: ['שָׁאֲלָה סֵפֶר', 'קָרְאָה כָּל עֶרֶב', 'הֶחְזִירָה אֶת הַסֵּפֶר', 'בָּחֲרָה סֵפֶר חָדָשׁ'] },
];

// ─── Format 6 — Ambiguity (מה המילה אומרת כאן?) ──────────────────────────────

/**
 * The skill that unpointed Hebrew actually demands: one spelling, several
 * words, and only the sentence decides which (build plan H-U2). Nothing else
 * in the app trains it — Flash tests whole-word recognition, not disambiguation.
 *
 * Note on word choice: כתיב מלא *resolves* many pairs that are ambiguous when
 * pointed (בֹּקֶר → בוקר vs בָּקָר → בקר), so only genuine same-spelling
 * homographs qualify. Each entry below was checked for that.
 *
 * Sentences are authored UNPOINTED on purpose — that is the script she has to
 * read here, and the renderer always shows this format with `nikud: 'none'`.
 */
export interface AmbiguityEntry {
  id:         string;
  level:      ReadingLevel;
  skill:      SkillCode;      // DEC_NO_NIKUD_INFER
  /** Unpointed sentence containing the homograph. */
  sentence:   string;
  /** The homograph exactly as it appears in the sentence. */
  targetWord: string;
  /** The pointed reading that fits — shown with the answer. */
  pointedForm: string;
  /** options[0] = the reading that fits; the rest are the other real readings. */
  options:    string[];
  explanation: string;
}

export const AMBIGUITY_BANK: AmbiguityEntry[] = [
  { id: 'AMB_1', level: 2, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'דני קרא ספר מעניין לפני השינה.', targetWord: 'ספר', pointedForm: 'סֵפֶר',
    options: ['סֵפֶר — משהו שקוראים בו', 'סָפַר — מנה כמה יש', 'סַפָּר — מי שמספר שיער', 'סִפֵּר — אמר סיפור'],
    explanation: 'כָּתוּב "קָרָא ספר". קוֹרְאִים בְּסֵפֶר — אָז הַקְּרִיאָה הַמַּתְאִימָה הִיא סֵפֶר.' },
  { id: 'AMB_2', level: 2, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'הילד ספר את הכדורים ומצא עשרה.', targetWord: 'ספר', pointedForm: 'סָפַר',
    options: ['סָפַר — מנה כמה יש', 'סֵפֶר — משהו שקוראים בו', 'סַפָּר — מי שמספר שיער', 'סִפֵּר — אמר סיפור'],
    explanation: 'אוֹתָהּ מִלָּה בְּדִיּוּק! אֲבָל כָּאן כָּתוּב "ספר את הכדורים ומצא עשרה" — סוֹפְרִים כַּמָּה יֵשׁ. הַמִּשְׁפָּט הוּא שֶׁמַּחְלִיט.' },
  { id: 'AMB_3', level: 2, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'אמא שמה קצת שמן על הסלט.', targetWord: 'שמן', pointedForm: 'שֶׁמֶן',
    options: ['שֶׁמֶן — נוזל ששמים באוכל', 'שָׁמֵן — מי שלא רזה'],
    explanation: 'שָׂמִים אוֹתוֹ עַל סָלָט, אָז מְדֻבָּר בַּנּוֹזֵל — שֶׁמֶן.' },
  { id: 'AMB_4', level: 2, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'הכלב שלנו שמן כי הוא אוכל הרבה.', targetWord: 'שמן', pointedForm: 'שָׁמֵן',
    options: ['שָׁמֵן — לא רזה', 'שֶׁמֶן — נוזל ששמים באוכל'],
    explanation: 'הַמִּשְׁפָּט מְתָאֵר אֵיךְ הַכֶּלֶב נִרְאֶה, וְגַם מַסְבִּיר לָמָּה — הוּא אוֹכֵל הַרְבֵּה.' },
  { id: 'AMB_5', level: 3, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'בסיפור היה מלך טוב שאהב את העם שלו.', targetWord: 'מלך', pointedForm: 'מֶלֶךְ',
    options: ['מֶלֶךְ — מי ששולט בממלכה', 'מָלַךְ — שלט בממלכה'],
    explanation: 'כָּתוּב "הָיָה מלך טוֹב" — מְדַבְּרִים עַל אָדָם, לֹא עַל פְּעֻלָּה.' },
  { id: 'AMB_6', level: 3, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'הוא מלך על הארץ שלושים שנה.', targetWord: 'מלך', pointedForm: 'מָלַךְ',
    options: ['מָלַךְ — שלט בממלכה', 'מֶלֶךְ — מי ששולט בממלכה'],
    explanation: 'כָּאן הַמִּלָּה מְסַפֶּרֶת מָה הוּא עָשָׂה, וּלְכַמָּה זְמַן — אָז זוֹ פְּעֻלָּה.' },
  { id: 'AMB_7', level: 3, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'רציתי לבוא אבל הייתי חולה.', targetWord: 'אבל', pointedForm: 'אֲבָל',
    options: ['אֲבָל — מילה שמחברת שני חלקים', 'אָבֵל — מי שעצוב על מישהו שנפטר'],
    explanation: 'הַמִּלָּה מְחַבֶּרֶת שְׁנֵי חֲלָקִים הֲפוּכִים: רָצִיתִי לָבוֹא — וְלֹא יָכֹלְתִּי.' },
  { id: 'AMB_8', level: 3, skill: 'DEC_NO_NIKUD_INFER',
    sentence: 'בחווה יש כבש קטן עם צמר לבן.', targetWord: 'כבש', pointedForm: 'כֶּבֶשׂ',
    options: ['כֶּבֶשׂ — בעל חיים עם צמר', 'כָּבַשׁ — השתלט על מקום'],
    explanation: 'כָּתוּב שֶׁיֵּשׁ לוֹ צֶמֶר לָבָן וְשֶׁהוּא קָטָן — מְתָאֲרִים בַּעַל חַיִּים.' },
];
