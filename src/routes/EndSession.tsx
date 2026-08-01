import { useMemo } from 'react';
import type { Gender, SessionRecord } from '../types';
import { t } from '../i18n/t';
import { BigButton } from '../components/primitives/BigButton';
import {
  starsForSession, computeTrophyState, deriveTrophyExtras, MIN_ITEMS_FOR_STARS,
} from '../lib/trophies';
import { loadSessionRecords, loadAttempts } from '../lib/sessionStore';

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

  // Trophy state comes from all persisted sessions (this one is already saved).
  // Recomputing it WITHOUT this session gives us the before/after diff, which is
  // the only honest way to say "new badge" — the badge list itself carries no
  // earned-at timestamp for the derived counters.
  const { streak, newBadges } = useMemo(() => {
    const sessions = loadSessionRecords(record.profileId);
    const attempts = loadAttempts(record.profileId);
    const after  = computeTrophyState(sessions, deriveTrophyExtras(attempts, masteredCount));
    const before = computeTrophyState(
      sessions.filter(s => s.sessionId !== record.sessionId),
      deriveTrophyExtras(attempts.filter(a => a.sessionId !== record.sessionId), masteredCount),
    );
    const had = new Set(before.trophies.filter(tr => tr.earned).map(tr => tr.id));
    return {
      streak: after.currentStreak,
      newBadges: after.trophies.filter(tr => tr.earned && !had.has(tr.id)),
    };
  }, [record.sessionId]);

  const stories = storiesRead ?? record.itemsAttempted;

  // Why there are no stars. "Read more carefully" is the right nudge for
  // guessing and the WRONG one for a session that was simply too short — that
  // one is the app's fault (a thin bank or an early exit), not hers.
  const tooShort  = record.itemsAttempted < MIN_ITEMS_FOR_STARS;
  const itemsToGo = MIN_ITEMS_FOR_STARS - record.itemsAttempted;

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
        <p className="text-lg font-bold text-brand-navy mb-2">
          {stars > 0        ? t('end_session.stars_added', { ...g, count: stars })
           : tooShort       ? t('end_session.no_stars_short', { ...g, count: itemsToGo })
           :                  t('end_session.no_stars_accuracy', g)}
        </p>

        {/* Progress-to-stars meter — visible only when the bar was not met, so
            "how close was I?" has an answer instead of a shrug. */}
        {stars === 0 && tooShort && (
          <div className="mb-4">
            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-teal rounded-full transition-all"
                style={{ width: `${Math.round((record.itemsAttempted / MIN_ITEMS_FOR_STARS) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('end_session.stars_meter', { ...g, min: MIN_ITEMS_FOR_STARS })}
            </p>
          </div>
        )}

        {newBadges.length > 0 && (
          <div className="bg-brand-sun/20 rounded-2xl p-3 mb-4 reveal-in">
            <div className="text-sm font-bold text-brand-navy mb-1">
              {t('end_session.new_badges', g)}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {newBadges.map(b => (
                <span key={b.id} className="bg-white rounded-xl px-3 py-1 text-sm font-medium text-brand-navy">
                  {b.emoji} {t(b.labelKey as Parameters<typeof t>[0], g)}
                </span>
              ))}
            </div>
          </div>
        )}

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
