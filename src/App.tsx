import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './lib/supabase';
import { loadLocalProfile, createProfile, type Profile } from './lib/profile';
import { initSync, clearSync } from './lib/sync';
import type { AvatarId, Gender, SessionMode } from './types';
import { SignIn } from './routes/SignIn';
import { Welcome } from './routes/Welcome';
import { AvatarPicker } from './routes/AvatarPicker';
import { ChildSetup } from './routes/ChildSetup';
import { Home } from './routes/Home';
import { ModePicker } from './routes/ModePicker';
import { Session } from './routes/Session';
import { TrophyRoom } from './routes/TrophyRoom';
import { Diagnostic } from './routes/Diagnostic';
import { DiagnosticIntro } from './routes/DiagnosticIntro';
import { DiagnosticResults } from './routes/DiagnosticResults';

/**
 * Screen state machine — no React Router (same pattern as mia-math).
 *
 * Auth gate first (when Supabase is configured), then the reading app machine
 * runs off the local profile. Offline (no .env.local) skips the gate entirely —
 * the whole Phase 1 flow is exercisable without a backend.
 */
type Screen =
  | 'loading' | 'signin'
  | 'welcome' | 'avatar' | 'childsetup'
  | 'diag_intro' | 'diag' | 'diag_results'
  | 'home' | 'mode' | 'session' | 'trophy';

/** Where to land once we're past the auth gate. */
function homeOrWelcome(): Screen {
  return loadLocalProfile()?.onboardingComplete ? 'home' : 'welcome';
}

export default function App() {
  const [authed, setAuthed] = useState(!SUPABASE_CONFIGURED);
  const [screen, setScreen] = useState<Screen>(SUPABASE_CONFIGURED ? 'loading' : homeOrWelcome());
  const [profile, setProfile] = useState<Profile | null>(loadLocalProfile());

  // Onboarding scratch (avatar + gender chosen before the profile exists).
  const [draftAvatar, setDraftAvatar] = useState<AvatarId>('fox');
  const [draftGender, setDraftGender] = useState<Gender>('f');
  const [mode, setMode] = useState<SessionMode>('time');

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { initSync(session.user.id); setAuthed(true); setProfile(loadLocalProfile()); setScreen(homeOrWelcome()); }
      else setScreen('signin');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { initSync(session.user.id); setAuthed(true); setProfile(loadLocalProfile()); setScreen(homeOrWelcome()); }
      else { clearSync(); setAuthed(false); setScreen('signin'); }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth gate ───────────────────────────────────────────────────────────────
  if (SUPABASE_CONFIGURED && !authed) {
    if (screen === 'loading') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-5xl animate-pulse">📖</div>
        </div>
      );
    }
    return <SignIn gender={profile?.gender ?? 'f'} />;
  }

  // ── Onboarding ────────────────────────────────────────────────────────────────
  if (screen === 'welcome') return <Welcome onStart={() => setScreen('avatar')} />;
  if (screen === 'avatar') {
    return (
      <AvatarPicker
        gender={draftGender}
        onPick={id => { setDraftAvatar(id); setScreen('childsetup'); }}
      />
    );
  }
  if (screen === 'childsetup') {
    return (
      <ChildSetup
        onDone={(name, gender) => {
          setDraftGender(gender);
          const p = createProfile(name, gender, draftAvatar);
          setProfile(p);
          setScreen('diag_intro'); // onboarding flows straight into the diagnostic
        }}
      />
    );
  }

  // From here on we need a profile.
  if (!profile) return <Welcome onStart={() => setScreen('avatar')} />;

  // ── Diagnostic ──────────────────────────────────────────────────────────────
  if (screen === 'diag_intro') {
    return (
      <DiagnosticIntro
        gender={profile.gender}
        name={profile.displayName}
        onStart={() => setScreen('diag')}
      />
    );
  }
  if (screen === 'diag') {
    return (
      <Diagnostic
        profile={profile}
        onDone={p => { setProfile(p); setScreen('diag_results'); }}
      />
    );
  }
  if (screen === 'diag_results' && profile.gapProfileJson) {
    return (
      <DiagnosticResults
        gender={profile.gender}
        gap={profile.gapProfileJson}
        onDone={() => setScreen('home')}
      />
    );
  }

  // ── App machine ─────────────────────────────────────────────────────────────
  if (screen === 'mode') {
    // Practice before a diagnostic would run blind — route into it instead.
    if (!profile.diagnosticCompletedAt) {
      return (
        <DiagnosticIntro
          gender={profile.gender}
          name={profile.displayName}
          onStart={() => setScreen('diag')}
        />
      );
    }
    return (
      <ModePicker
        gender={profile.gender}
        onPick={m => { setMode(m); setScreen('session'); }}
        onTrophyRoom={() => setScreen('trophy')}
      />
    );
  }
  if (screen === 'session') {
    return (
      <Session
        profile={profile}
        mode={mode}
        onExit={p => { setProfile(p); setScreen('home'); }}
        onTrophyRoom={p => { setProfile(p); setScreen('trophy'); }}
      />
    );
  }
  if (screen === 'trophy') {
    return <TrophyRoom profileId={profile.profileId} gender={profile.gender} onBack={() => setScreen('home')} />;
  }

  // Default: home.
  return (
    <Home
      profile={profile}
      onBegin={() => setScreen('mode')}
      onTrophyRoom={() => setScreen('trophy')}
      onSignOut={SUPABASE_CONFIGURED ? () => supabase.auth.signOut() : undefined}
    />
  );
}
