import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? '';

/**
 * True when real Supabase credentials are present in .env.local.
 * When false, the auth gate is skipped and the app runs in pure
 * localStorage mode (dev / offline).
 */
export const SUPABASE_CONFIGURED = Boolean(url && !url.includes('your-project'));

/**
 * Supabase client for the shared `mia-learning` project.
 *
 * Auth note: sign-in is email OTP code only (verifyOtp) — never magic links,
 * they break on shared kids' devices.
 *
 * Session sharing: all three apps (hub, math, reading) live on the same
 * origin (disos1.github.io) and point at the same Supabase project, so the
 * DEFAULT auth storage key (sb-<project-ref>-auth-token) is identical across
 * them and the session propagates automatically via shared localStorage.
 * Do NOT set a custom storageKey here — that would break cross-app auth.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
);

/** localStorage prefix for all reading-app state. Anything outside this
 *  prefix is shared-origin territory (hub/math can see it). */
export const LS_PREFIX = 'mia_reading_';
