import { useMemo } from 'react';
import type { Gender } from '../types';
import { t } from '../i18n/t';
import { computeTrophyState, deriveTrophyExtras } from '../lib/trophies';
import { loadSessionRecords, loadMasteryMap, loadAttempts } from '../lib/sessionStore';

interface Props {
  profileId: string;
  gender:    Gender;
  onBack:    () => void;
}

/** Trophy room — always reachable (not end-of-session-gated). Badges render in
 *  a stable earned-timeline order (fixes the math "reshuffle" feedback). */
export function TrophyRoom({ profileId, gender, onBack }: Props) {
  const g = { gender };

  const state = useMemo(() => {
    const mastery = loadMasteryMap(profileId);
    const masteredCount = Object.values(mastery).filter(r => r.status === 'שליטה').length;
    return computeTrophyState(
      loadSessionRecords(profileId),
      deriveTrophyExtras(loadAttempts(profileId), masteredCount),
    );
  }, [profileId]);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 fade-in">
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">{t('trophy_room.title', g)}</h1>
        <button onClick={onBack} className="text-2xl text-gray-400">{t('trophy_room.back', g)}</button>
      </div>

      {/* Stars + streak */}
      <div className="bg-white card-shadow rounded-4xl p-6 w-full max-w-md mb-6 text-center">
        <div className="text-5xl mb-1">⭐</div>
        <div className="text-3xl font-bold text-brand-navy">{state.totalStars}</div>
        <div className="text-gray-500">{t('trophy_room.total_stars', g)}</div>
        <div className="mt-3 text-brand-coral font-medium">
          {state.currentStreak > 0
            ? t('trophy_room.streak_active', { ...g, count: state.currentStreak })
            : t('trophy_room.streak_zero', g)}
        </div>
      </div>

      {/* Badges */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-brand-navy">{t('trophy_room.badges', g)}</span>
          <span className="text-sm text-gray-500">
            {t('trophy_room.badges_count', { ...g, earned: state.earnedCount, total: state.totalTrophies })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {state.trophies.map(tr => (
            <div
              key={tr.id}
              className="bg-white rounded-3xl p-3 flex flex-col items-center gap-1 text-center transition-all"
              style={{ opacity: tr.earned ? 1 : 0.4, filter: tr.earned ? 'none' : 'grayscale(1)' }}
            >
              <span className="text-3xl">{tr.emoji}</span>
              <span className="text-xs font-bold text-brand-navy leading-tight">
                {t(tr.labelKey as Parameters<typeof t>[0], g)}
              </span>
              {!tr.earned && tr.target > 1 && (
                <span className="text-[10px] text-gray-400">{tr.progress}/{tr.target}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
