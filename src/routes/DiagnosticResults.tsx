import type { GapProfile, Gender, SkillCode } from '../types';
import { t } from '../i18n/t';
import { BigButton } from '../components/primitives/BigButton';
import { skillHebrewKey, COMP_SKILLS } from '../constants/skills';

interface Props {
  gender:  Gender;
  gap:     GapProfile;
  onDone:  () => void;
}

/** Post-diagnostic summary: strengths + what we'll work on, then into the app. */
export function DiagnosticResults({ gender, gap, onDone }: Props) {
  const g = { gender };

  const compEntries = (Object.entries(gap.skillAccuracy) as [SkillCode, { attempts: number; correct: number }][])
    .filter(([code, rec]) => (COMP_SKILLS as string[]).includes(code) && rec.attempts > 0);

  const strengths = compEntries
    .filter(([, rec]) => rec.correct / rec.attempts >= 2 / 3)
    .map(([code]) => code);
  const workOn = gap.composerNotes.blockedPracticePriority
    .filter(code => !strengths.includes(code))
    .slice(0, 3);

  const label = (code: SkillCode) => t(skillHebrewKey(code) as Parameters<typeof t>[0], g);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="bg-white card-shadow rounded-4xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-3">🌟</div>
        <h1 className="text-3xl font-bold text-brand-navy mb-2">{t('diag_results.title', g)}</h1>
        <p className="text-gray-500 mb-6">{t('diag_results.subtitle', g)}</p>

        {strengths.length > 0 && (
          <div className="mb-5 text-right">
            <div className="font-bold text-brand-navy mb-2">{t('diag_results.strengths', g)}</div>
            <div className="flex flex-wrap gap-2 justify-end">
              {strengths.map(code => (
                <span key={code} className="bg-green-50 text-green-800 rounded-full px-3 py-1 text-sm font-medium">
                  ✓ {label(code)}
                </span>
              ))}
            </div>
          </div>
        )}

        {workOn.length > 0 ? (
          <div className="mb-7 text-right">
            <div className="font-bold text-brand-navy mb-2">{t('diag_results.work_on', g)}</div>
            <div className="flex flex-wrap gap-2 justify-end">
              {workOn.map(code => (
                <span key={code} className="bg-brand-yellow/30 text-brand-navy rounded-full px-3 py-1 text-sm font-medium">
                  🎯 {label(code)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mb-7 text-brand-navy">{t('diag_results.all_clear', g)}</p>
        )}

        <BigButton onClick={onDone} color="#7DD3B0">{t('diag_results.cta', g)}</BigButton>
      </div>
    </div>
  );
}
