/**
 * Passage bank seed — hand-curated Hebrew passages, full nikud authored once;
 * partial + no-nikud variants are DERIVED at read time (see lib/nikud.ts).
 *
 * This is the offline seed for Phase 1 (the DB-backed loader arrives in a later
 * phase). It spans Levels 1–3 and a range of COMP_* skills, enough for the
 * composer to build varied sessions with the 10-day no-repeat rule.
 *
 * ⚠️  NIKUD REVIEW: Dima (native speaker) should proof the vocalization before
 *     Mia uses this in earnest — a wrong vowel teaches a wrong reading. Content
 *     is warm/everyday with diverse Israeli names (Hebrew/Arabic/Russian).
 *
 * Scaling: the Phase 5 generation pipeline grows this to ~300. Adding a passage
 * is one PassageSeed entry; ids follow `p_L{level}_{n}` and `q_{passageId}_{n}`.
 */

import type { Passage, PassageQuestion, ReadingLevel, VocabTier } from '../types';

export interface PassageSeed {
  passage:   Passage;
  questions: PassageQuestion[];
}

function wc(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Small authoring helper — fills ids and word count so entries stay terse. */
function seed(args: {
  id: string;
  level: ReadingLevel;
  vocabTier: VocabTier;
  full: string;
  genre?: string;
  names?: string[];
  picture?: string;
  questions: Array<Omit<PassageQuestion, 'id' | 'passageId'>>;
}): PassageSeed {
  const passage: Passage = {
    id:               args.id,
    level:            args.level,
    vocabTier:        args.vocabTier,
    wordCount:        wc(args.full),
    textFullNikud:    args.full,
    textPartialNikud: null,  // derived
    textNoNikud:      null,  // derived
    characterNames:   args.names ?? [],
    genre:            args.genre ?? null,
    picture:          args.picture ?? null,
  };
  const questions: PassageQuestion[] = args.questions.map((q, i) => ({
    ...q,
    id:        `q_${args.id}_${i + 1}`,
    passageId: args.id,
  }));
  return { passage, questions };
}

export const PASSAGE_SEED: PassageSeed[] = [
  // ══════════════════════════ Level 1 ══════════════════════════
  seed({
    id: 'p_L1_1', level: 1, vocabTier: 'T1', picture: '🐱', genre: 'everyday',
    full: 'הֶחָתוּל יָשַׁב עַל הַכִּסֵּא.',
    questions: [
      { skillCode: 'COMP_LITERAL', questionLevel: 1,
        questionText: 'מִי יָשַׁב עַל הַכִּסֵּא?',
        options: ['הֶחָתוּל', 'הַכֶּלֶב', 'הַיֶּלֶד', 'הַצִּפּוֹר'], correctOption: 0,
        explanation: 'בַּמִּשְׁפָּט כָּתוּב "הֶחָתוּל יָשַׁב" — אָז הֶחָתוּל הוּא זֶה שֶׁיָּשַׁב.',
        hintText: 'הַמִּשְׁפָּט מְסַפֵּר עַל בַּעַל חַיִּים אֶחָד.' },
    ],
  }),
  seed({
    id: 'p_L1_2', level: 1, vocabTier: 'T1', picture: '🍎', genre: 'everyday', names: ['דָּנָה'],
    full: 'דָּנָה אָכְלָה תַּפּוּחַ אָדֹם.',
    questions: [
      { skillCode: 'COMP_LITERAL', questionLevel: 1,
        questionText: 'מָה אָכְלָה דָּנָה?',
        options: ['תַּפּוּחַ', 'בָּנָנָה', 'עוּגָה', 'לֶחֶם'], correctOption: 0,
        explanation: 'כָּתוּב "דָּנָה אָכְלָה תַּפּוּחַ" — הַמִּלָּה שֶׁבָּאָה אַחֲרֵי "אָכְלָה" הִיא מָה שֶׁהִיא אָכְלָה.',
        hintText: 'חַפְּשִׂי אֶת הַמִּלָּה שֶׁמְּתָאֶרֶת אֹכֶל בַּמִּשְׁפָּט.' },
      { skillCode: 'COMP_VOCAB', questionLevel: 1,
        questionText: 'מָה הַצֶּבַע שֶׁל הַתַּפּוּחַ?',
        options: ['אָדֹם', 'כָּחֹל', 'יָרֹק', 'צָהֹב'], correctOption: 0,
        explanation: 'הַמִּלָּה "אָדֹם" בָּאָה מִיָּד אַחֲרֵי "תַּפּוּחַ" וּמְתָאֶרֶת אוֹתוֹ.',
        hintText: 'הַצֶּבַע כָּתוּב מַמָּשׁ אַחֲרֵי הַמִּלָּה "תַּפּוּחַ".' },
    ],
  }),
  seed({
    id: 'p_L1_3', level: 1, vocabTier: 'T1', picture: '🏃', genre: 'everyday',
    full: 'הַיֶּלֶד רָץ מַהֵר אֶל הַגַּן.',
    questions: [
      { skillCode: 'COMP_VOCAB', questionLevel: 1,
        questionText: 'מָה הַפֵּרוּשׁ שֶׁל "מַהֵר"?',
        options: ['בִּמְהִירוּת', 'לְאַט', 'בְּשֶׁקֶט', 'בְּעֶצֶב'], correctOption: 0,
        explanation: 'הַיֶּלֶד רָץ. כְּשֶׁרָצִים — נָעִים בִּמְהִירוּת, וְזֶה בְּדִיּוּק "מַהֵר".',
        hintText: 'אֵיךְ רָצִים כְּשֶׁמְּמַהֲרִים?' },
      { skillCode: 'COMP_LITERAL', questionLevel: 1,
        questionText: 'לְאָן רָץ הַיֶּלֶד?',
        options: ['אֶל הַגַּן', 'אֶל הַבַּיִת', 'אֶל הַיָּם', 'אֶל הַחֲנוּת'], correctOption: 0,
        explanation: 'הַמִּלִּים "אֶל הַגַּן" מְסַפְּרוֹת לְאָן הוּא רָץ.',
        hintText: 'לְאָן הוּא רָץ? הַמִּלָּה הָאַחֲרוֹנָה בַּמִּשְׁפָּט.' },
    ],
  }),
  seed({
    id: 'p_L1_4', level: 1, vocabTier: 'T1', picture: '🎁', genre: 'feelings', names: ['נוֹעָה'],
    full: 'נוֹעָה קִבְּלָה מַתָּנָה וְחִיְּכָה.',
    questions: [
      { skillCode: 'COMP_CHARACTER', questionLevel: 1,
        questionText: 'אֵיךְ הִרְגִּישָׁה נוֹעָה?',
        options: ['שְׂמֵחָה', 'עֲצוּבָה', 'כּוֹעֶסֶת', 'עֲיֵפָה'], correctOption: 0,
        explanation: 'כָּתוּב שֶׁהִיא חִיְּכָה. מְחַיְּכִים כְּשֶׁמַּרְגִּישִׁים טוֹב — אָז נוֹעָה שְׂמֵחָה.',
        hintText: 'כְּשֶׁמְּחַיְּכִים — אֵיךְ מַרְגִּישִׁים?' },
    ],
  }),
  seed({
    id: 'p_L1_5', level: 1, vocabTier: 'T1', picture: '🌸', genre: 'everyday', names: ['אַמָּא'],
    full: 'אַמָּא שָׂמָה פְּרָחִים בָּאֲגַרְטָל.',
    questions: [
      { skillCode: 'COMP_LITERAL', questionLevel: 1,
        questionText: 'אֵיפֹה שָׂמָה אַמָּא אֶת הַפְּרָחִים?',
        options: ['בָּאֲגַרְטָל', 'בַּמִּטְבָּח', 'בַּגִּנָּה', 'בַּתִּיק'], correctOption: 0,
        explanation: 'כָּתוּב "שָׂמָה פְּרָחִים בָּאֲגַרְטָל" — הָאֲגַרְטָל הוּא הַמָּקוֹם.',
        hintText: 'אֵיפֹה שָׂמִים פְּרָחִים בַּבַּיִת?' },
    ],
  }),
  seed({
    id: 'p_L1_6', level: 1, vocabTier: 'T1', picture: '🐶', genre: 'everyday', names: ['סַמִּי'],
    full: 'לְסַמִּי יֵשׁ כֶּלֶב קָטָן וְלָבָן.',
    questions: [
      { skillCode: 'COMP_LITERAL', questionLevel: 1,
        questionText: 'אֵיזֶה בַּעַל חַיִּים יֵשׁ לְסַמִּי?',
        options: ['כֶּלֶב', 'חָתוּל', 'דָּג', 'אַרְנָב'], correctOption: 0,
        explanation: 'כָּתוּב "לְסַמִּי יֵשׁ כֶּלֶב" — זֶה בְּדִיּוּק מָה שֶׁשָּׁאֲלוּ.',
        hintText: 'מָה כָּתוּב שֶׁיֵּשׁ לְסַמִּי?' },
      { skillCode: 'COMP_VOCAB', questionLevel: 1,
        questionText: 'מָה הַגֹּדֶל שֶׁל הַכֶּלֶב?',
        options: ['קָטָן', 'גָּדוֹל', 'עָנָק', 'שָׁמֵן'], correctOption: 0,
        explanation: 'שְׁתֵּי מִלִּים מְתָאֲרוֹת אֶת הַכֶּלֶב: "קָטָן" (גֹּדֶל) וְ"לָבָן" (צֶבַע). הַשְּׁאֵלָה הִיא עַל הַגֹּדֶל.',
        hintText: 'שְׁתֵּי מִלִּים מְתָאֲרוֹת אֶת הַכֶּלֶב — אַחַת מֵהֶן הִיא גֹּדֶל.' },
    ],
  }),

  // ══════════════════════════ Level 2 ══════════════════════════
  seed({
    id: 'p_L2_1', level: 2, vocabTier: 'T2', genre: 'routine', names: ['יוֹסֵף'],
    full: 'יוֹסֵף קָם בַּבֹּקֶר. הוּא צִחְצֵחַ שִׁנַּיִם וְאָכַל אֲרוּחַת בֹּקֶר. אַחַר כָּךְ הוּא הָלַךְ לְבֵית הַסֵּפֶר.',
    questions: [
      { skillCode: 'COMP_SEQUENCE', questionLevel: 2,
        questionText: 'מָה עָשָׂה יוֹסֵף רִאשׁוֹן?',
        options: ['קָם בַּבֹּקֶר', 'הָלַךְ לְבֵית הַסֵּפֶר', 'אָכַל אֲרוּחַת בֹּקֶר', 'צִחְצֵחַ שִׁנַּיִם'], correctOption: 0,
        explanation: 'הַמִּשְׁפָּט הָרִאשׁוֹן מְסַפֵּר שֶׁהוּא קָם. כָּל הַשְּׁאָר קָרָה אַחֲרֵי זֶה.',
        hintText: 'מָה קָרָה בַּהַתְחָלָה שֶׁל הַסִּפּוּר?' },
      { skillCode: 'COMP_LITERAL', questionLevel: 2,
        questionText: 'לְאָן הָלַךְ יוֹסֵף בַּסּוֹף?',
        options: ['לְבֵית הַסֵּפֶר', 'לַגַּן', 'לַחֲנוּת', 'לַיָּם'], correctOption: 0,
        explanation: 'הַמִּלִּים "אַחַר כָּךְ" מְסַמְּנוֹת אֶת הַסּוֹף — וְשָׁם כָּתוּב "לְבֵית הַסֵּפֶר".',
        hintText: 'הַמָּקוֹם הָאַחֲרוֹן שֶׁמּוֹפִיעַ בַּסִּפּוּר.' },
    ],
  }),
  seed({
    id: 'p_L2_2', level: 2, vocabTier: 'T2', genre: 'weather', names: ['מַאיָה'],
    full: 'בַּבֹּקֶר יָרַד גֶּשֶׁם חָזָק. לָכֵן מַאיָה פָּתְחָה מִטְרִיָּה גְּדוֹלָה. הִיא הִגִּיעָה לְבֵית הַסֵּפֶר יְבֵשָׁה.',
    questions: [
      { skillCode: 'COMP_CAUSE', questionLevel: 2,
        questionText: 'לָמָּה מַאיָה פָּתְחָה מִטְרִיָּה?',
        options: ['כִּי יָרַד גֶּשֶׁם', 'כִּי הָיָה חַם', 'כִּי הָיְתָה שֶׁמֶשׁ', 'כִּי הָיָה לַיְלָה'], correctOption: 0,
        explanation: 'הַמִּלָּה "לָכֵן" מְחַבֶּרֶת סִבָּה לְתוֹצָאָה. לִפְנֵיהָ כָּתוּב "יָרַד גֶּשֶׁם" — זוֹ הַסִּבָּה.',
        hintText: 'חַפְּשִׂי אֶת הַמִּלָּה "לָכֵן" — מָה הָיָה לְפָנֶיהָ?' },
      { skillCode: 'COMP_INFERENCE', questionLevel: 2,
        questionText: 'לָמָּה מַאיָה הִגִּיעָה יְבֵשָׁה?',
        options: ['כִּי הַמִּטְרִיָּה שָׁמְרָה עָלֶיהָ', 'כִּי הִיא רָצָה', 'כִּי לֹא יָרַד גֶּשֶׁם', 'כִּי הָיָה לָהּ מְעִיל'], correctOption: 0,
        explanation: 'הַמִּטְרִיָּה חוֹסֶמֶת אֶת הַגֶּשֶׁם, וְלָכֵן הִיא לֹא נִרְטְבָה. זֶה לֹא כָּתוּב — הִסַּקְנוּ אֶת זֶה.',
        hintText: 'מָה עוֹשָׂה מִטְרִיָּה כְּשֶׁיּוֹרֵד גֶּשֶׁם?' },
    ],
  }),
  seed({
    id: 'p_L2_3', level: 2, vocabTier: 'T2', genre: 'play', names: ['עֹמֶר'],
    full: 'עֹמֶר חִפֵּשׂ אֶת הַכַּדּוּר בְּכָל הַחֶדֶר. הוּא הִסְתַּכֵּל מִתַּחַת לַמִּטָּה וּבְתוֹךְ הָאָרוֹן. לְבַסּוֹף הוּא מָצָא אוֹתוֹ עַל הַכִּסֵּא.',
    questions: [
      { skillCode: 'COMP_INFERENCE', questionLevel: 2,
        questionText: 'מָה עֹמֶר רָצָה לִמְצֹא?',
        options: ['אֶת הַכַּדּוּר', 'אֶת הַסֵּפֶר', 'אֶת הַנַּעַל', 'אֶת הַכֶּלֶב'], correctOption: 0,
        explanation: 'כָּתוּב שֶׁהוּא "חִפֵּשׂ אֶת הַכַּדּוּר" — מְחַפְּשִׂים אֶת מָה שֶׁרוֹצִים לִמְצֹא.',
        hintText: 'מָה עֹמֶר חִפֵּשׂ בְּכָל הַחֶדֶר?' },
      { skillCode: 'COMP_LITERAL', questionLevel: 2,
        questionText: 'אֵיפֹה עֹמֶר מָצָא אֶת הַכַּדּוּר?',
        options: ['עַל הַכִּסֵּא', 'מִתַּחַת לַמִּטָּה', 'בָּאָרוֹן', 'בַּגַּן'], correctOption: 0,
        explanation: 'הַמִּלָּה "לְבַסּוֹף" מְסַמֶּנֶת אֶת הַסּוֹף — וְשָׁם כָּתוּב "עַל הַכִּסֵּא".',
        hintText: 'אֵיפֹה הוּא מָצָא אוֹתוֹ לְבַסּוֹף?' },
    ],
  }),
  seed({
    id: 'p_L2_4', level: 2, vocabTier: 'T2', genre: 'pets', names: ['לַיְלָה', 'רֶקְס'],
    full: 'לְלַיְלָה יֵשׁ כֶּלֶב קָטָן בְּשֵׁם רֶקְס. רֶקְס אוֹהֵב לְשַׂחֵק בַּגִּנָּה וְלִרְדֹּף אַחֲרֵי פַּרְפָּרִים. בָּעֶרֶב הוּא נִרְדָּם לְיַד הַמִּטָּה שֶׁל לַיְלָה.',
    questions: [
      { skillCode: 'COMP_MAIN_IDEA', questionLevel: 2,
        questionText: 'עַל מָה הַסִּפּוּר?',
        options: ['עַל כֶּלֶב בְּשֵׁם רֶקְס', 'עַל גִּנָּה גְּדוֹלָה', 'עַל פַּרְפָּרִים צִבְעוֹנִיִּים', 'עַל מִטָּה נוֹחָה'], correctOption: 0,
        explanation: 'רֹב הַמִּשְׁפָּטִים מְסַפְּרִים עַל רֶקְס — מָה הוּא אוֹהֵב וּמָה הוּא עוֹשֶׂה. הוּא הַנּוֹשֵׂא.',
        hintText: 'מִי הַדְּמוּת הַכִּי חֲשׁוּבָה בַּסִּפּוּר?' },
      { skillCode: 'COMP_TITLE', questionLevel: 2,
        questionText: 'אֵיזוֹ כּוֹתֶרֶת מַתְאִימָה לַסִּפּוּר?',
        options: ['הַכֶּלֶב רֶקְס', 'הַיָּם הַגָּדוֹל', 'יוֹם גָּשׁוּם', 'הַמַּתָּנָה'], correctOption: 0,
        explanation: 'כּוֹתֶרֶת טוֹבָה מַתְאִימָה לְכָל הַסִּפּוּר. כָּל הַסִּפּוּר הוּא עַל הַכֶּלֶב רֶקְס.',
        hintText: 'הַכּוֹתֶרֶת צְרִיכָה לְהַתְאִים לְמָה שֶׁקּוֹרֶה בְּרֹב הַסִּפּוּר.' },
      { skillCode: 'COMP_QGEN', questionLevel: 2,
        questionText: 'אֵיזוֹ שְׁאֵלָה אֶפְשָׁר לִשְׁאֹל עַל הַסִּפּוּר?',
        options: ['אֵיךְ קוֹרְאִים לַכֶּלֶב?', 'מָה הַשָּׁעָה עַכְשָׁו?', 'כַּמָּה עוֹלֶה גְּלִידָה?', 'אֵיפֹה גָּרָה הַמּוֹרָה?'], correctOption: 0,
        explanation: 'שְׁאֵלָה טוֹבָה הִיא כָּזוֹ שֶׁהַקֶּטַע יוֹדֵעַ לַעֲנוֹת עָלֶיהָ. שֵׁם הַכֶּלֶב כָּתוּב בַּקֶּטַע.',
        hintText: 'אֵיזוֹ שְׁאֵלָה הַסִּפּוּר בֶּאֱמֶת עוֹנֶה עָלֶיהָ?' },
    ],
  }),
  seed({
    id: 'p_L2_5', level: 2, vocabTier: 'T2', genre: 'play', names: ['תָּמָר'],
    full: 'תָּמָר בָּנְתָה מִגְדָּל גָּבוֹהַּ מִקֻּבִּיּוֹת. הִיא הוֹסִיפָה עוֹד וְעוֹד קֻבִּיּוֹת לְמַעְלָה. הַמִּגְדָּל הִתְנַדְנֵד מְאוֹד.',
    questions: [
      { skillCode: 'COMP_PREDICT', questionLevel: 2,
        questionText: 'מָה כְּנִרְאֶה יִקְרֶה עַכְשָׁו?',
        options: ['הַמִּגְדָּל יִפֹּל', 'הַמִּגְדָּל יִצְבַּע', 'תָּמָר תֵּלֵךְ לִישֹׁן', 'יֵרֵד גֶּשֶׁם'], correctOption: 0,
        explanation: 'מִגְדָּל גָּבוֹהַּ שֶׁמִּתְנַדְנֵד — הַהֶמְשֵׁךְ הַהֶגְיוֹנִי הוּא שֶׁהוּא יִפֹּל.',
        hintText: 'מָה קוֹרֶה לְמִגְדָּל גָּבוֹהַּ שֶׁמִּתְנַדְנֵד?' },
      { skillCode: 'COMP_CAUSE', questionLevel: 2,
        questionText: 'לָמָּה הַמִּגְדָּל הִתְנַדְנֵד?',
        options: ['כִּי הוּא הָיָה גָּבוֹהַּ מְאוֹד', 'כִּי תָּמָר דָּחֲפָה אוֹתוֹ', 'כִּי הָיְתָה רוּחַ', 'כִּי הַקֻּבִּיּוֹת קְטַנּוֹת'], correctOption: 0,
        explanation: 'הִיא הוֹסִיפָה "עוֹד וְעוֹד" קֻבִּיּוֹת לְמַעְלָה. כָּל מַה שֶּׁגָּבוֹהַּ מְאוֹד — פָּחוֹת יַצִּיב.',
        hintText: 'מָה תָּמָר עָשְׂתָה שׁוּב וָשׁוּב לִפְנֵי שֶׁהִתְנַדְנֵד?' },
    ],
  }),

  // ══════════════════════════ Level 3 ══════════════════════════
  seed({
    id: 'p_L3_1', level: 3, vocabTier: 'MIXED', genre: 'kindness', names: ['רִינָה'],
    full: 'בַּדֶּרֶךְ הַבַּיְתָה מְצְאָה רִינָה צִפּוֹר קְטַנָּה עַל הַמִּדְרָכָה. הַצִּפּוֹר נָפְלָה מֵהַקֵּן וְלֹא יָכְלָה לָעוּף. רִינָה הֵרִימָה אוֹתָהּ בַּעֲדִינוּת, הֶחֱזִירָה אוֹתָהּ לַקֵּן שֶׁעַל הָעֵץ, וְחִכְּתָה עַד שֶׁהָאֵם חָזְרָה.',
    questions: [
      { skillCode: 'COMP_MAIN_IDEA', questionLevel: 3,
        questionText: 'מָה הָרַעְיוֹן הַמֶּרְכָּזִי שֶׁל הַסִּפּוּר?',
        options: ['רִינָה עָזְרָה לְצִפּוֹר בְּצָרָה', 'רִינָה חָזְרָה הַבַּיְתָה', 'צִפּוֹר בָּנְתָה קֵן', 'עֵץ גָּדוֹל בָּרְחוֹב'], correctOption: 0,
        explanation: 'כָּל הַמַּעֲשִׂים בַּסִּפּוּר הֵם עֲזָרָה לַצִּפּוֹר: הֵרִימָה, הֶחֱזִירָה, חִכְּתָה.',
        hintText: 'מָה הַדָּבָר הֲכִי חָשׁוּב שֶׁרִינָה עָשְׂתָה?' },
      { skillCode: 'COMP_INFERENCE', questionLevel: 3,
        questionText: 'לָמָּה רִינָה הֶחֱזִירָה אֶת הַצִּפּוֹר לַקֵּן?',
        options: ['כְּדֵי שֶׁהִיא תִּהְיֶה בְּטוּחָה', 'כְּדֵי לְשַׂחֵק אִתָּהּ', 'כְּדֵי לָקַחַת אוֹתָהּ הַבַּיְתָה', 'כְּדֵי לְצַלֵּם אוֹתָהּ'], correctOption: 0,
        explanation: 'הַצִּפּוֹר נָפְלָה וְלֹא יָכְלָה לָעוּף. בַּקֵּן הִיא מוּגֶנֶת — זֶה מָה שֶׁהִסַּקְנוּ.',
        hintText: 'הַצִּפּוֹר נָפְלָה וְלֹא יָכְלָה לָעוּף — מָה הִיא צְרִיכָה?' },
      { skillCode: 'COMP_CHARACTER', questionLevel: 3,
        questionText: 'אֵיזוֹ תְּכוּנָה מַתְאִימָה לְרִינָה?',
        options: ['אִכְפַּתִּית', 'עַצְלָנִית', 'פַּחְדָנִית', 'כַּעֲסָנִית'], correctOption: 0,
        explanation: 'הִיא עָצְרָה, עָזְרָה וְחִכְּתָה. כָּךְ מִתְנַהֵג מִישֶׁהוּ שֶׁאִכְפַּת לוֹ.',
        hintText: 'אֵיךְ מִתְנַהֵג מִישֶׁהוּ שֶׁעוֹזֵר לְבַעַל חַיִּים?' },
    ],
  }),
  seed({
    id: 'p_L3_2', level: 3, vocabTier: 'MIXED', genre: 'nature', names: ['עָדִין', 'הַכִּתָּה'],
    full: 'בְּיוֹם רִאשׁוֹן יָצְאָה הַכִּתָּה שֶׁל עָדִין לִנְטֹעַ עֵץ בֶּחָצֵר. כָּל יֶלֶד הֵבִיא כְּלִי קָטָן וְקְצָת מַיִם. הֵם חָפְרוּ בּוֹר עָמֹק, שָׂמוּ אֶת הַשֹּׁרֶשׁ בִּפְנִים וְכִסּוּ אוֹתוֹ בַּאֲדָמָה. בְּעוֹד כַּמָּה שָׁנִים הָעֵץ יִהְיֶה גָּבוֹהַּ וְיִתֵּן צֵל.',
    questions: [
      { skillCode: 'COMP_SEQUENCE', questionLevel: 3,
        questionText: 'מָה עָשׂוּ הַיְּלָדִים אַחֲרֵי שֶׁחָפְרוּ אֶת הַבּוֹר?',
        options: ['שָׂמוּ אֶת הַשֹּׁרֶשׁ בִּפְנִים', 'הֵבִיאוּ מַיִם', 'יָצְאוּ לֶחָצֵר', 'הָלְכוּ הַבַּיְתָה'], correctOption: 0,
        explanation: 'הַסֵּדֶר בַּקֶּטַע: חָפְרוּ בּוֹר ← שָׂמוּ אֶת הַשֹּׁרֶשׁ ← כִּסּוּ בַּאֲדָמָה.',
        hintText: 'מָה בָּא מִיָּד אַחֲרֵי הַחֲפִירָה בַּסִּפּוּר?' },
      { skillCode: 'COMP_PREDICT', questionLevel: 3,
        questionText: 'מָה יִקְרֶה לָעֵץ בְּעוֹד כַּמָּה שָׁנִים?',
        options: ['הוּא יִגְדַּל וְיִתֵּן צֵל', 'הוּא יִצְבַּע בְּכָחֹל', 'הוּא יֵעָלֵם', 'הוּא יֵהָפֵךְ לְפֶרַח'], correctOption: 0,
        explanation: 'הַמִּשְׁפָּט הָאַחֲרוֹן מְדַבֵּר עַל הֶעָתִיד: "יִהְיֶה גָּבוֹהַּ וְיִתֵּן צֵל".',
        hintText: 'הַמִּשְׁפָּט הָאַחֲרוֹן מְסַפֵּר עַל הֶעָתִיד.' },
      { skillCode: 'COMP_VOCAB', questionLevel: 3,
        questionText: 'מָה הַפֵּרוּשׁ שֶׁל "בּוֹר עָמֹק"?',
        options: ['חוֹר עָמֹק בָּאֲדָמָה', 'הַר גָּבוֹהַּ', 'שְׁלוּלִית מַיִם', 'אֶבֶן גְּדוֹלָה'], correctOption: 0,
        explanation: 'הֵם חָפְרוּ אוֹתוֹ בָּאֲדָמָה כְּדֵי לָשִׂים בּוֹ שֹׁרֶשׁ — אָז זֶה חוֹר בָּאֲדָמָה.',
        hintText: 'חוֹפְרִים בּוֹר בָּאֲדָמָה — מָה זֶה?' },
    ],
  }),
];

/** Flat list of every passage. */
export const ALL_PASSAGES: Passage[] = PASSAGE_SEED.map(s => s.passage);

/** Flat list of every comp question. */
export const ALL_QUESTIONS: PassageQuestion[] = PASSAGE_SEED.flatMap(s => s.questions);
