/**
 * Cross-session no-repeat tracking — passages AND questions.
 *
 * Math lesson B2: content is memorised 5-10× faster than projected. The spec's
 * 10-day passage no-repeat isn't enough on its own — a passage that returns
 * with the SAME question is a memorization leak, while the same passage with a
 * DIFFERENT question is legitimate re-reading. So we track both id spaces.
 *
 * Pure-localStorage; reconstructable from reading.attempts if a fresh device
 * ever needs hydration.
 */

import { LS_PREFIX } from './supabase';
import { RECENT_BUFFER_MAX } from '../constants/config';

const PASSAGE_KEY  = (profileId: string) => `${LS_PREFIX}recent_passages::${profileId}`;
const QUESTION_KEY = (profileId: string) => `${LS_PREFIX}recent_questions::${profileId}`;

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function append(key: string, ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const raw = localStorage.getItem(key);
    const cur = raw ? (JSON.parse(raw) as string[]) : [];
    const seen = new Set<string>();
    const merged: string[] = [];
    // Walk from the end so the most-recent occurrence wins on dedupe.
    for (const id of [...cur, ...ids].reverse()) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.unshift(id);
    }
    localStorage.setItem(key, JSON.stringify(merged.slice(-RECENT_BUFFER_MAX)));
  } catch {
    // quota / disabled — non-fatal
  }
}

export function loadRecentPassageIds(profileId: string): Set<string> {
  return loadSet(PASSAGE_KEY(profileId));
}

export function loadRecentQuestionIds(profileId: string): Set<string> {
  return loadSet(QUESTION_KEY(profileId));
}

export function appendRecentPassageIds(profileId: string, ids: string[]): void {
  append(PASSAGE_KEY(profileId), ids);
}

export function appendRecentQuestionIds(profileId: string, ids: string[]): void {
  append(QUESTION_KEY(profileId), ids);
}
