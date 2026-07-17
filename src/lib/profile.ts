/**
 * Profile store — localStorage-primary (offline-first).
 *
 * The hub is deferred to V1.5, so the reading app owns onboarding and stores
 * the full Profile locally, keyed by profileId. When auth + the shared
 * public.profiles land, this becomes a write-through cache; the shape already
 * matches what the hub will hold.
 */

import type { Profile, Gender, AvatarId } from '../types';
import { LS_PREFIX } from './supabase';

export type { Profile } from '../types';

const KEY = `${LS_PREFIX}profile`;

export const DEFAULT_PROFILE: Profile = {
  profileId:             '',
  avatarId:              'fox',
  gender:                'f',
  displayName:           '',
  onboardingComplete:    false,
  diagnosticCompletedAt: null,
  diagnosticVersion:     null,
  gapProfileJson:        null,
  sessionsCompleted:     0,
  createdAt:             '',
};

export function loadLocalProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // quota / disabled — non-fatal
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

/** Create + persist a fresh profile at the end of onboarding. */
export function createProfile(name: string, gender: Gender, avatarId: AvatarId): Profile {
  const profile: Profile = {
    ...DEFAULT_PROFILE,
    profileId:          newId(),
    avatarId,
    gender,
    displayName:        name,
    onboardingComplete: true,
    createdAt:          new Date().toISOString(),
  };
  saveLocalProfile(profile);
  return profile;
}

/** Increment the completed-session counter (drives re-diagnostic timing). */
export function bumpSessionsCompleted(profile: Profile): Profile {
  const next = { ...profile, sessionsCompleted: profile.sessionsCompleted + 1 };
  saveLocalProfile(next);
  return next;
}
