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
}

export const WIC_BANK: WICEntry[] = [
  { id: 'WIC_1', level: 1, skill: 'COMP_VOCAB',
    sentence: 'אַחֲרֵי הַגֶּשֶׁם הַדֶּשֶׁא הָיָה רָטֹב.', targetWord: 'רָטֹב',
    options: ['מָלֵא מַיִם', 'חַם מְאוֹד', 'גָּבוֹהַּ', 'צָהֹב'] },
  { id: 'WIC_2', level: 1, skill: 'COMP_VOCAB',
    sentence: 'בַּגַּן הַחַיּוֹת רָאִינוּ פִּיל עָצוּם.', targetWord: 'עָצוּם',
    options: ['גָּדוֹל מְאוֹד', 'קָטָן', 'רָזֶה', 'וָרֹד'] },
  { id: 'WIC_3', level: 1, skill: 'COMP_VOCAB',
    sentence: 'הַחֶדֶר הָיָה שָׁקֵט כְּשֶׁכֻּלָּם יָשְׁנוּ.', targetWord: 'שָׁקֵט',
    options: ['בְּלִי רַעַשׁ', 'מָלֵא אֲנָשִׁים', 'מוּאָר', 'מָתוֹק'] },
  { id: 'WIC_4', level: 1, skill: 'COMP_VOCAB',
    sentence: 'דָּן מִהֵר לַתַּחֲנָה כְּדֵי לֹא לְאַחֵר.', targetWord: 'מִהֵר',
    options: ['הָלַךְ מַהֵר', 'יָשַׁן', 'צִיֵּר', 'שָׁתָה מַיִם'] },
  { id: 'WIC_5', level: 2, skill: 'COMP_VOCAB',
    sentence: 'הַכַּבַּאי הָאַמִּיץ נִכְנַס לַבַּיִת הַבּוֹעֵר.', targetWord: 'הָאַמִּיץ',
    options: ['שֶׁלֹּא מְפַחֵד', 'שֶׁעָיֵף מְאוֹד', 'שֶׁנָּמוּךְ', 'שֶׁרָעֵב'] },
  { id: 'WIC_6', level: 2, skill: 'COMP_VOCAB',
    sentence: 'הַסְּנָאִי הַזָּרִיז טִפֵּס עַל הָעֵץ בִּן־רֶגַע.', targetWord: 'הַזָּרִיז',
    options: ['מָהִיר וְקַל תְּנוּעָה', 'אִטִּי וְכָבֵד', 'יָשֵׁן', 'רָטֹב'] },
  { id: 'WIC_7', level: 2, skill: 'COMP_VOCAB',
    sentence: 'בָּעֶרֶב הָיָה קָרִיר וְלָבַשְׁנוּ סְוֶדֶר.', targetWord: 'קָרִיר',
    options: ['קְצָת קַר', 'חַם מְאוֹד', 'רוֹעֵשׁ', 'טָעִים'] },
  { id: 'WIC_8', level: 2, skill: 'COMP_VOCAB',
    sentence: 'בַּמּוּזֵאוֹן יֵשׁ כַּד עַתִּיק מִלִּפְנֵי מֵאוֹת שָׁנִים.', targetWord: 'עַתִּיק',
    options: ['יָשָׁן מְאוֹד', 'חָדָשׁ לְגַמְרֵי', 'שָׁבוּר', 'כָּחֹל'] },
  { id: 'WIC_9', level: 2, skill: 'COMP_VOCAB',
    sentence: 'הָיָה לָנוּ יוֹם נֶהְדָּר בַּחוֹף.', targetWord: 'נֶהְדָּר',
    options: ['יָפֶה וּמְהַנֶּה מְאוֹד', 'מְשַׁעֲמֵם', 'קָצָר', 'קַר וְרָטֹב'] },
  { id: 'WIC_10', level: 3, skill: 'COMP_VOCAB',
    sentence: 'הַשַּׁחְקָנִית קִבְּלָה תְּשׁוּאוֹת בְּסוֹף הַהוֹפָעָה.', targetWord: 'תְּשׁוּאוֹת',
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
}

export const ORDERING_BANK: OrderingEntry[] = [
  { id: 'ORD_1', level: 1, skill: 'COMP_SEQUENCE',
    story: 'הַכֶּלֶב רָאָה כַּדּוּר. הוּא רָץ אַחֲרָיו וְתָפַס אוֹתוֹ. אַחַר כָּךְ הוּא הֵבִיא אֶת הַכַּדּוּר לַיֶּלֶד.',
    events: ['רָאָה כַּדּוּר', 'רָץ וְתָפַס אוֹתוֹ', 'הֵבִיא אוֹתוֹ לַיֶּלֶד'] },
  { id: 'ORD_2', level: 2, skill: 'COMP_SEQUENCE',
    story: 'רוּת קָמָה בַּבֹּקֶר. הִיא הִתְלַבְּשָׁה וְאָכְלָה דַּיְסָה חַמָּה. אַחַר כָּךְ הִיא לָקְחָה אֶת הַתִּיק וְיָצְאָה לְבֵית הַסֵּפֶר.',
    events: ['קָמָה מֵהַמִּטָּה', 'הִתְלַבְּשָׁה וְאָכְלָה', 'יָצְאָה לְבֵית הַסֵּפֶר'] },
  { id: 'ORD_3', level: 2, skill: 'COMP_SEQUENCE',
    story: 'יוֹאָב זָרַע גַּרְעִין בָּאֲדָמָה. הוּא הִשְׁקָה אוֹתוֹ כָּל יוֹם. אַחֲרֵי שָׁבוּעַ צָמַח נֶבֶט קָטָן, וּבַסּוֹף פָּרַח פֶּרַח צָהֹב.',
    events: ['זָרַע גַּרְעִין', 'הִשְׁקָה כָּל יוֹם', 'צָמַח נֶבֶט', 'פָּרַח פֶּרַח'] },
  { id: 'ORD_4', level: 2, skill: 'COMP_SEQUENCE',
    story: 'סַבְתָּא וְנוּר הֵכִינוּ בָּצֵק לְעוּגָה. הֵן שָׁפְכוּ אוֹתוֹ לַתַּבְנִית וְאָפוּ בַּתַּנּוּר. כְּשֶׁהָעוּגָה הִתְקָרְרָה, כֻּלָּם טָעֲמוּ מִמֶּנָּה.',
    events: ['הֵכִינוּ בָּצֵק', 'שָׁפְכוּ לַתַּבְנִית', 'אָפוּ בַּתַּנּוּר', 'טָעֲמוּ מֵהָעוּגָה'] },
  { id: 'ORD_5', level: 2, skill: 'COMP_SEQUENCE',
    story: 'מִשְׁפַּחַת לֵוִי נָסְעָה לַיָּם. הַיְּלָדִים בָּנוּ אַרְמוֹן חוֹל וְשָׂחוּ בַּמַּיִם הַקְּרִירִים. בָּעֶרֶב כֻּלָּם חָזְרוּ הַבַּיְתָה עֲיֵפִים וּשְׂמֵחִים.',
    events: ['נָסְעוּ לַיָּם', 'בָּנוּ אַרְמוֹן חוֹל', 'שָׂחוּ בַּמַּיִם', 'חָזְרוּ הַבַּיְתָה'] },
  { id: 'ORD_6', level: 2, skill: 'COMP_SEQUENCE',
    story: 'בַּבֹּקֶר הַשָּׁמַיִם הִתְכַּסּוּ בַּעֲנָנִים אֲפֹרִים. אַחַר כָּךְ יָרַד גֶּשֶׁם חָזָק. כְּשֶׁהַגֶּשֶׁם נִגְמַר, הוֹפִיעָה בַּשָּׁמַיִם קֶשֶׁת צִבְעוֹנִית.',
    events: ['הִתְכַּסּוּ עֲנָנִים', 'יָרַד גֶּשֶׁם', 'הוֹפִיעָה קֶשֶׁת'] },
  { id: 'ORD_7', level: 3, skill: 'COMP_SEQUENCE',
    story: 'צִפּוֹר קְטַנָּה בָּנְתָה קֵן עַל הָעֵץ. הִיא הֵטִילָה בּוֹ שָׁלוֹשׁ בֵּיצִים. אַחֲרֵי זְמַן־מָה בָּקְעוּ מֵהַבֵּיצִים גּוֹזָלִים רְעֵבִים, וְהָאֵם הֵבִיאָה לָהֶם אֹכֶל בַּמַּקּוֹר.',
    events: ['בָּנְתָה קֵן', 'הֵטִילָה בֵּיצִים', 'בָּקְעוּ גּוֹזָלִים', 'הֵבִיאָה אֹכֶל'] },
  { id: 'ORD_8', level: 3, skill: 'COMP_SEQUENCE',
    story: 'טָלִיָה שָׁאֲלָה סֵפֶר חָדָשׁ מֵהַסִּפְרִיָּה. הִיא קָרְאָה בּוֹ כָּל עֶרֶב לִפְנֵי הַשֵּׁנָה. כְּשֶׁסִּיְּמָה אֶת הַסִּפּוּר, הִיא הֶחְזִירָה אֶת הַסֵּפֶר וּבָחֲרָה לָהּ סֵפֶר אַחֵר.',
    events: ['שָׁאֲלָה סֵפֶר', 'קָרְאָה כָּל עֶרֶב', 'הֶחְזִירָה אֶת הַסֵּפֶר', 'בָּחֲרָה סֵפֶר חָדָשׁ'] },
];
