/**
 * Per-skill reading strategies, in the child's voice.
 *
 * A worked example has two halves: the *transferable* strategy (these steps —
 * "how do I attack a question like this?") and the *specific* reasoning (the
 * question's own `explanation`). Authoring the strategy per SKILL rather than
 * per question is what makes modelling scale: 100 new passages need 100
 * explanations but zero new strategies, and Mia meets the same three steps
 * every time the skill comes round, which is how a strategy becomes hers.
 *
 * Deliberately three steps, second person, no jargon. These are read aloud in
 * her head, not graded.
 */

import type { SkillCode } from '../types';

export const STRATEGY_STEPS: Partial<Record<SkillCode, string[]>> = {
  COMP_LITERAL: [
    'קראי את השאלה — מה בדיוק שואלים?',
    'חזרי לקטע וחפשי את המילים מהשאלה.',
    'התשובה כתובה שם — רק צריך למצוא אותה.',
  ],
  COMP_VOCAB: [
    'מצאי את המילה במשפט.',
    'קראי את כל המשפט — מה קורה בו?',
    'שאלי: איזו תשובה מתאימה למה שקורה?',
  ],
  COMP_SEQUENCE: [
    'חפשי מילים של זמן: קודם, אחר כך, בסוף.',
    'סמני בראש מה קרה ראשון.',
    'עקבי אחרי הסיפור לפי הסדר.',
  ],
  COMP_CAUSE: [
    'חפשי מילים כמו "כי", "לכן", "בגלל".',
    'מה שכתוב לפני המילה — זו הסיבה.',
    'מה שכתוב אחריה — זו התוצאה.',
  ],
  COMP_INFERENCE: [
    'מה כתוב בקטע? (רק מה שבאמת כתוב)',
    'מה זה מלמד אותנו שלא כתוב?',
    'איזו תשובה הכי הגיונית לפי מה שקראת?',
  ],
  COMP_CHARACTER: [
    'מה הדמות עשתה או אמרה?',
    'מתי את מרגישה ככה?',
    'בחרי את הרגש שמתאים למה שקרה.',
  ],
  COMP_PREDICT: [
    'מה קרה עד עכשיו בסיפור?',
    'חשבי: מה הכי הגיוני שיקרה אחר כך?',
    'בחרי את מה שמתאים לסיפור — לא מה שהכי מצחיק.',
  ],
  COMP_MAIN_IDEA: [
    'על מי או על מה רוב הקטע מדבר?',
    'שאלי: מה הדבר החשוב שרצו לספר לי?',
    'בחרי תשובה שמתאימה לכל הקטע, לא רק למשפט אחד.',
  ],
  COMP_TITLE: [
    'על מה רוב הסיפור?',
    'כותרת טובה מספרת על כל הסיפור.',
    'ותרי על כותרת שמתאימה רק למשפט אחד.',
  ],
  COMP_QGEN: [
    'קראי שוב מה קרה בקטע.',
    'שאלי: על מה הקטע באמת עונה?',
    'בחרי את השאלה שהקטע יודע לענות עליה.',
  ],
  COMP_SUMMARY: [
    'מי הדמות המרכזית, ומה היא רצתה?',
    'מה הדבר הכי חשוב שקרה?',
    'ספרי את כל הסיפור במשפט אחד.',
  ],
  COMP_FACT_OPINION: [
    'עובדה אפשר לבדוק — היא נכונה לכולם.',
    'דעה היא מה שמישהו חושב או אוהב.',
    'שאלי: אפשר לבדוק את זה, או שזו הרגשה?',
  ],
  COMP_COMPARE: [
    'מה קורה אצל הראשון?',
    'מה קורה אצל השני?',
    'חפשי את ההבדל — או את מה שמשותף.',
  ],
  COMP_GENRE: [
    'סיפור מספר מה קרה למישהו.',
    'טקסט מידע מלמד עובדות על נושא.',
    'הוראות מסבירות איך לעשות משהו — שלב אחרי שלב.',
  ],
  DEC_NO_NIKUD_INFER: [
    'המילה יכולה להיקרא בכמה דרכים.',
    'קראי את כל המשפט — על מה מדברים?',
    'בחרי את הקריאה שמתאימה למשפט.',
  ],
};

/** Steps for a skill, with a generic fallback so a worked example always has something to model. */
export function strategyFor(skill: SkillCode): string[] {
  return STRATEGY_STEPS[skill] ?? [
    'קראי את השאלה לאט.',
    'חזרי לקטע וחפשי את התשובה.',
    'בדקי שהתשובה מתאימה למה שקראת.',
  ];
}
