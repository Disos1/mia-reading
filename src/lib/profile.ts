import { supabase, SUPABASE_CONFIGURED } from './supabase';
import type { Gender } from '../i18n/t';

export interface Profile {
  name: string | null;
  gender: Gender;
}

/** Default when no profile row exists yet (hub onboarding not done). */
export const DEFAULT_PROFILE: Profile = { name: null, gender: 'f' };

/**
 * Loads the shared profile from public.profiles (written by the hub's
 * ChildSetup). The reading app never writes this table in Week 1 — it only
 * greets by name and picks the gendered locale. Missing row is a normal
 * state, not an error: the hub may not have onboarded yet.
 */
export async function loadProfile(authUserId: string): Promise<Profile> {
  if (!SUPABASE_CONFIGURED) return DEFAULT_PROFILE;

  const { data, error } = await supabase
    .from('profiles')
    .select('name, gender')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn('[profile] load failed:', error.message);
    return DEFAULT_PROFILE;
  }

  return {
    name: data.name ?? null,
    gender: data.gender === 'm' ? 'm' : 'f',
  };
}
