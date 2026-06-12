import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { t, type Gender } from '../i18n/t';

interface SignInProps {
  /** No profile exists before sign-in; the shell passes the default ('f'). */
  gender: Gender;
}

/**
 * Parent-facing auth gate — email OTP code ONLY.
 *
 * No emailRedirectTo is passed and no link is ever rendered: magic links
 * break on shared kids' devices (the link opens in the wrong browser
 * context). The parent types the 6-digit code from the email instead.
 */
export function SignIn({ gender }: SignInProps) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const g = { gender };

  // ── Step 1: send the OTP email ────────────────────────────────────────────

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email:   email.trim(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (err) {
      setError(t('signin.error.send', g));
      console.error('[SignIn] send:', err.message);
    } else {
      setSent(true);
      setCode('');
    }
  };

  // ── Step 2: verify the 6-digit code ───────────────────────────────────────

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, '');
    if (token.length < 6) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type:  'email',
    });

    setLoading(false);
    if (err) {
      setError(t('signin.error.verify', g));
      console.error('[SignIn] verify:', err.message);
    }
    // On success onAuthStateChange in App.tsx fires automatically.
  };

  // ── Waiting-for-code screen ───────────────────────────────────────────────

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in">
        <div className="text-7xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-brand-navy mb-2">
          {t('signin.sent.title', g)}
        </h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-xs mb-6 break-all">
          {t('signin.sent.body', { ...g, email })}
        </p>

        <form onSubmit={handleVerify} className="w-full max-w-xs flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">
            {t('signin.code.label', g)}
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
            placeholder="_ _ _ _ _ _"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3
              text-2xl text-center tracking-[0.3em] font-bold outline-none
              focus:border-brand-purple transition-colors"
            autoFocus
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-brand-purple text-white font-bold text-lg rounded-2xl py-3
              disabled:opacity-50 transition-opacity active:scale-95"
          >
            {loading ? t('signin.verifying', g) : t('signin.verify', g)}
          </button>
        </form>

        <button
          onClick={() => { setSent(false); setError(null); }}
          className="mt-8 text-sm text-gray-400 underline"
        >
          {t('signin.resend', g)}
        </button>
      </div>
    );
  }

  // ── Email entry screen ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-7xl mb-4">📖</div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            {t('signin.title', g)}
          </h1>
          <p className="text-gray-500 leading-relaxed">
            {t('signin.subtitle', g)}
          </p>
        </div>

        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('signin.email.placeholder', g)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3
              text-lg text-left outline-none focus:border-brand-purple transition-colors"
            dir="ltr"
            autoComplete="email"
            autoFocus
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-brand-purple text-white font-bold text-lg rounded-2xl py-4
              disabled:opacity-50 transition-opacity active:scale-95"
          >
            {loading ? t('signin.sending', g) : t('signin.send', g)}
          </button>
        </form>

        <p className="text-center text-xs text-gray-300 mt-8">
          {t('signin.code.validity', g)}
        </p>
      </div>
    </div>
  );
}
