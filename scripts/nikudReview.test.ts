/**
 * Not a test — a generator. Run `npm test` (or `npx vitest run scripts/`) and it
 * writes a Hebrew review sheet of every authored passage next to its DERIVED
 * partial-nikud and unpointed forms, for a native speaker to check.
 *
 * Lives as a .test.ts so it runs on the existing vitest setup with no extra
 * tooling. It asserts nothing about correctness — that judgement is Dima's.
 */
import { it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PASSAGE_SEED } from '../src/content/passages';
import { ENTRY_ITEMS, VERIFICATION_POOL } from '../src/content/diagnosticItems';
import { WIC_BANK, ORDERING_BANK } from '../src/content/formatBank';
import { toNoNikud, toPartialNikud } from '../src/lib/nikud';

const OUT = resolve(
  '/Users/dima/Documents/Claude/Projects/Education/Mia_Reading_Nikud_Review.md',
);

function block(label: string, full: string): string {
  return [
    `**${label}**`,
    '',
    `| | |`,
    `|---|---|`,
    `| ניקוד מלא (נכתב) | ${full} |`,
    `| ניקוד חלקי (נגזר) | ${toPartialNikud(full)} |`,
    `| ללא ניקוד (נגזר) | ${toNoNikud(full)} |`,
    '',
  ].join('\n');
}

it('writes the nikud review sheet', () => {
  const out: string[] = [
    '# מיה — בדיקת ניקוד',
    '',
    '**מה צריך לבדוק (שתי שאלות בלבד):**',
    '',
    '1. **הניקוד** בשורה "ניקוד מלא" — נכון?',
    '2. **הכתיב חסר הניקוד** בשורה "ללא ניקוד" — זה בדיוק מה שמיה רואה בספר?',
    '   (למשל: "בבוקר" ולא "בבקר", "ציפור" ולא "צפור")',
    '',
    'אם משהו לא נכון — מספיק לסמן את השורה ולכתוב את הצורה הנכונה.',
    '',
    '---',
    '',
    '## קטעי תרגול',
    '',
  ];

  for (const s of PASSAGE_SEED) {
    out.push(block(`${s.passage.id} · רמה ${s.passage.level}`, s.passage.textFullNikud));
  }

  out.push('## קטעי אבחון', '');
  const seenDiag = new Set<string>();
  for (const item of [...ENTRY_ITEMS, ...VERIFICATION_POOL]) {
    if (seenDiag.has(item.passage.id)) continue;
    seenDiag.add(item.passage.id);
    out.push(block(item.id, item.passage.textFullNikud));
  }

  out.push('## משפטים — מילה בהקשר', '');
  for (const w of WIC_BANK) out.push(block(`${w.id} · המילה: ${w.targetWord}`, w.sentence));

  out.push('## סיפורים — סדר אירועים', '');
  for (const o of ORDERING_BANK) out.push(block(o.id, o.story));

  out.push(
    '## מילות בזק (ללא ניקוד במקור — רק לוודא שהמילה תקינה)',
    '',
    '```',
    'בית · חבר · ילד · סוס · רחוב · חלון · תמונה · כתובת · הרפתקה · זיכרון · תזמורת · עיפרון',
    '```',
    '',
  );

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, out.join('\n'), 'utf8');
});
