import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './lib/supabase';
import { loadProfile, DEFAULT_PROFILE, type Profile } from './lib/profile';
import { SignIn } from './routes/SignIn';
import { Home } from './routes/Home';

/**
 * No React Router — a screen state machine, same pattern as mia-math.
 * Week 1 has exactly three states; session/diagnostic screens join later.
 */
type Screen = 'loading' | 'signin' | 'home';

export default function App() {
  // Dev/offline mode (no backend credentials): skip the auth gate entirely
  const [screen,  setScreen]  = useState<Screen>(SUPABASE_CONFIGURED ? 'loading' : 'home');
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    // Picks up an existing session from shared-origin localStorage (signed in
    // at the hub or math) — this is the cross-app auth propagation path.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user.id).then(setProfile);
        setScreen('home');
      } else {
        setScreen('signin');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadProfile(session.user.id).then(setProfile);
          setScreen('home');
        } else {
          setProfile(DEFAULT_PROFILE);
          setScreen('signin');
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-5xl animate-pulse">📖</div>
      </div>
    );
  }

  if (screen === 'signin') {
    return <SignIn gender={profile.gender} />;
  }

  return <Home profile={profile} />;
}
