import { useMemo } from 'react';
import type { Gender, SessionRecord } from '../types';
import { t } from '../i18n/t';
import { BigButton } from '../components/primitives/BigButton';
import { starsForSession, computeTrophyState } from '../lib/trophies';
import { loadSessionRecords } from '../lib/sessionStore';

interface Props {
  record:        SessionRecord;
  gender:        Gender;
  name:          string;
  masteredCount: number;
  storiesRead?:  number;
  onHome:        () => void;
  onTrophyRoom:  () => void;
}

/**
 * End-of-session card — fixed order (spec Part 6): summary → stars → best combo
 * → comp accuracy → streak → buttons. Stars use the accuracy-floor + combo rule
 * (guessing earns nothing).
 */
export function EndSession({ record, gender, name, masteredCount, storiesRead, onHome, onTrophyRoom }: Props) {
  const g = { gender };
  const stars = starsForSession(record);
  const pct = record.itemsAttempted > 0
    ? Math.round((record.itemsCorrect / record.itemsAttempted) * 100)
    : 0;

  // Streak comes from all persisted sessions (this one is already saved).
  const streak = useMemo(
    () => computeTrophyState(loadSessionRecords(record.profileId), { masteredCount, noNikudPassages: 0, level3Passages: 0 }).currentStreak,
    [record.sessionId],
  );

  const stories = storiesRead ?? record.itemsAttempted;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in">
      <div className="bg-white card-shadow rounded-4xl p-8 max-w-md w-full">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="text-3xl font-bold text-brand-navy mb-2">
          {t('end_session.title', { ...g, name })}
        </h1>
        <p className="text-gray-500 mb-5">
          {t('end_session.summary', { ...g, stories, words: record.wordsRead })}
        </p>

        {/* Stars */}
        <div className="text-4xl mb-1">
          {stars > 0 ? '⭐'.repeat(stars) : '🌱'}
        </div>
        <p className="text-lg font-bold text-brand-navy mb-4">
          {stars > 0
            ? t('end_session.stars_added', { ...g, count: stars })
            : t('end_session.no_stars', g)}
        </p>

        {(record.maxCombo ?? 0) >= 2 && (
          <p className="text-brand-coral font-bold mb-2">
            {t('end_session.best_combo', { ...g, count: record.maxCombo ?? 0 })}
          </p>
        )}

        <p className="text-brand-navy mb-1">{t('end_session.comp_accuracy', { ...g, pct })}</p>
        {streak > 0 && <p className="text-brand-navy mb-5">{t('end_session.streak', { ...g, count: streak })}</p>}

        <div className="flex flex-col gap-3 mt-4">
          <BigButton onClick={onTrophyRoom} color="#FFD166">{t('end_session.trophy_room', g)}</BigButton>
          <button onClick={onHome} className="text-brand-navy underline text-lg">
            {t('end_session.home', g)}
          </button>
        </div>
      </div>
    </div>
  );
}
