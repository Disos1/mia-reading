import { supabase } from '../lib/supabase';
import { t } from '../i18n/t';
import type { Profile } from '../lib/profile';

interface HomeProps {
  profile: Profile;
}

/**
 * Week 1 shell: authenticated empty home screen.
 * Session UI, library, dictionary and trophy room arrive in later weeks —
 * the trophy room will be reachable from here (never end-of-session-gated).
 */
export function Home({ profile }: HomeProps) {
  const g = { gender: profile.gender };

  const greeting = profile.name
    ? t('home.greeting', { ...g, name: profile.name })
    : t('home.greeting.noname', g);

  return (
    <div className="min-h-screen flex flex-col fade-in">
      <header className="flex items-center justify-between p-4">
        <span className="text-sm text-gray-400">{t('app.title', g)}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 underline"
        >
          {t('home.signout', g)}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-7xl mb-6">📖</div>
        <h1 className="text-3xl font-bold text-brand-navy mb-3">{greeting}</h1>
        <p className="text-xl text-brand-navy mb-2">{t('home.welcome', g)}</p>
        <p className="text-gray-500">{t('home.comingsoon', g)}</p>
      </main>
    </div>
  );
}
