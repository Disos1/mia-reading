import { useMemo } from 'react';
import { t } from '../i18n/t';
import type { Profile } from '../types';
import { BigButton } from '../components/primitives/BigButton';
import { computeTrophyState } from '../lib/trophies';
import { AddToHomeHint } from '../components/layout/AddToHomeHint';
import { loadSessionRecords, loadMasteryMap } from '../lib/sessionStore';

interface Props {
  profile:      Profile;
  onBegin:      () => void;
  onTrophyRoom: () => void;
  onParent:     () => void;
  onSignOut?:   () => void;
}

/**
 * Reading home base (spec Part 6). Primary CTA + persistent destinations, with
 * streak + weekly stars up top. Library/Dictionary tiles are placeholders in
 * Phase 1 (their full screens arrive in the engagement phase).
 */
export function Home({ profile, onBegin, onTrophyRoom, onParent, onSignOut }: Props) {
  const g = { gender: profile.gender };

  const { streak, weekStars } = useMemo(() => {
    const records = loadSessionRecords(profile.profileId);
    const mastery = loadMasteryMap(profile.profileId);
    const masteredCount = Object.values(mastery).filter(r => r.status === 'שליטה').length;
    const state = computeTrophyState(records, { masteredCount, noNikudPassages: 0, level3Passages: 0 });
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekStars = state.sessionStars
      .filter(s => s.date && new Date(s.date).getTime() >= weekAgo)
      .reduce((sum, s) => sum + s.stars, 0);
    return { streak: state.currentStreak, weekStars };
  }, [profile.profileId]);

  const greeting = profile.displayName
    ? t('home.greeting', { ...g, name: profile.displayName })
    : t('home.greeting.noname', g);

  return (
    <div className="min-h-screen flex flex-col p-6 fade-in">
      <header className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-400">{t('app.title', g)}</span>
        {onSignOut && (
          <button onClick={onSignOut} className="text-sm text-gray-400 underline">{t('home.signout', g)}</button>
        )}
      </header>

      <AddToHomeHint gender={profile.gender} />

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full">
        <div className="text-6xl mb-3">📖</div>
        <h1 className="text-3xl font-bold text-brand-navy mb-2">{greeting}</h1>

        <div className="flex gap-4 text-brand-navy mb-8">
          <span>{t('home.streak', { ...g, count: streak })}</span>
          <span>{t('home.stars_week', { ...g, count: weekStars })}</span>
        </div>

        <div className="w-full mb-6">
          <BigButton onClick={onBegin} color="#7DD3B0" className="w-full">{t('home.begin', g)}</BigButton>
        </div>

        <button
          onClick={onTrophyRoom}
          className="btn-shadow bg-white rounded-3xl p-4 w-full text-right flex items-center gap-3
            hover:scale-[1.02] transition-all"
        >
          <span className="text-3xl">🏆</span>
          <span className="text-lg font-bold text-brand-navy">{t('home.achievements', g)}</span>
        </button>

        <button onClick={onParent} className="mt-4 text-sm text-gray-400 underline">
          {t('home.parent', g)}
        </button>
      </div>
    </div>
  );
}
