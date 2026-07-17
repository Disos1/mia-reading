/**
 * Supabase sync layer — write-through, localStorage is the read cache.
 * Ported from mia-math; targets the reading.* schema.
 *
 *   • Writes go to localStorage first (fast, offline-safe).
 *   • Then fire-and-forget to Supabase (no await on the hot path).
 *   • Hydration pulls happen at sign-in on a fresh device.
 *
 * Tables (reading.* unless noted):
 *   - mastery_records  (migration 002)
 *   - session_records  (migration 002)
 *   - attempts         (migration 001)
 *   - user_passage_history (migration 001) — no-repeat tracking
 *
 * Everything is a no-op until initSync() sets the auth uid, and every push is
 * fire-and-forget: a missing table (002 not yet applied) just logs a warning,
 * never crashes the session. Schema ↔ this file parity is a P1 rule.
 */

import { supabase, SUPABASE_CONFIGURED } from './supabase';
import type {
  MasteryMap,
  SessionRecord,
  PracticeAttempt,
} from '../types';

let _authUserId: string | null = null;

/** Call once when the Supabase auth session is established. */
export function initSync(authUserId: string): void {
  _authUserId = authUserId;
}

export function clearSync(): void {
  _authUserId = null;
}

function fire(label: string, p: Promise<unknown>): void {
  p.catch(err => console.warn(`[sync] ${label} failed:`, err));
}

// ─── Mastery map ──────────────────────────────────────────────────────────────

async function _pushMasteryMap(map: MasteryMap, userId: string): Promise<void> {
  const rows = Object.values(map).map(r => ({
    user_id:                userId,
    profile_id:             r.profileId,
    skill_code:             r.skillCode,
    status:                 r.status,
    first_attempt_accuracy: r.firstAttemptAccuracy,
    item_count:             r.itemCount,
    session_count:          r.sessionCount,
    last_practiced_at:      r.lastPracticedAt,
    needs_retention_probe:  r.needsRetentionProbe,
    retention_probe_due_at: r.retentionProbeDueAt,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('mastery_records')
    .upsert(rows, { onConflict: 'user_id,skill_code' });
  if (error) throw error;
}

export function syncMasteryMap(map: MasteryMap): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushMasteryMap', _pushMasteryMap(map, _authUserId));
}

export async function pullMasteryMap(profileId: string): Promise<MasteryMap | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('mastery_records')
    .select('*')
    .eq('profile_id', profileId);
  if (error) { console.warn('[sync] pullMasteryMap error:', error.message); return null; }
  if (!data || data.length === 0) return null;

  const map: MasteryMap = {};
  for (const r of data) {
    map[r.skill_code] = {
      profileId:            r.profile_id,
      skillCode:            r.skill_code,
      status:               r.status,
      firstAttemptAccuracy: r.first_attempt_accuracy,
      itemCount:            r.item_count,
      sessionCount:         r.session_count,
      lastPracticedAt:      r.last_practiced_at,
      needsRetentionProbe:  r.needs_retention_probe,
      retentionProbeDueAt:  r.retention_probe_due_at,
    };
  }
  return map;
}

// ─── Session records ──────────────────────────────────────────────────────────

async function _pushSessionRecord(record: SessionRecord, userId: string): Promise<void> {
  const { error } = await supabase
    .from('session_records')
    .upsert({
      session_id:         record.sessionId,
      user_id:            userId,
      profile_id:         record.profileId,
      mode:               record.mode,
      started_at:         record.startedAt,
      completed_at:       record.completedAt,
      items_attempted:    record.itemsAttempted,
      items_correct:      record.itemsCorrect,
      primary_skill_code: record.primarySkillCode,
      words_read:         record.wordsRead,
      max_combo:          record.maxCombo ?? null,
    }, { onConflict: 'session_id' });
  if (error) throw error;
}

export function syncSessionRecord(record: SessionRecord): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushSessionRecord', _pushSessionRecord(record, _authUserId));
}

export async function pullSessionRecords(profileId: string): Promise<SessionRecord[] | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('session_records')
    .select('*')
    .eq('profile_id', profileId)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) { console.warn('[sync] pullSessionRecords error:', error.message); return null; }
  if (!data || data.length === 0) return null;

  return data.map(r => ({
    sessionId:        r.session_id,
    profileId:        r.profile_id,
    mode:             r.mode,
    startedAt:        r.started_at,
    completedAt:      r.completed_at,
    itemsAttempted:   r.items_attempted ?? 0,
    itemsCorrect:     r.items_correct   ?? 0,
    primarySkillCode: r.primary_skill_code ?? '',
    wordsRead:        r.words_read ?? 0,
    maxCombo:         r.max_combo  ?? undefined,
  }));
}

// ─── Session attempts (per-item telemetry → reading.attempts) ─────────────────

async function _pushSessionAttempts(attempts: PracticeAttempt[], userId: string): Promise<void> {
  const rows = attempts.map(a => ({
    id:                a.id,
    user_id:           userId,
    skill_code:        a.skillCode,
    passage_id:        a.passageId,
    question_id:       a.questionId,
    item_format:       a.itemFormat,
    is_correct:        a.correct,
    used_hint:         a.usedHint,
    response_ms:       a.responseMs,
    session_id:        a.sessionId,
    reading_level:     a.level,
    nikud_state:       a.nikud,
    created_at:        a.createdAt,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('attempts')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export function syncSessionAttempts(attempts: PracticeAttempt[]): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushSessionAttempts', _pushSessionAttempts(attempts, _authUserId));
}

// ─── Passage history (10-day no-repeat → reading.user_passage_history) ─────────
//
// last_shown_at is upserted the moment a passage renders (spec Part 9), so the
// no-repeat filter holds even if the session is abandoned mid-passage.

async function _pushPassageShown(userId: string, passageId: string): Promise<void> {
  const { error } = await supabase
    .from('user_passage_history')
    .upsert(
      { user_id: userId, passage_id: passageId, last_shown_at: new Date().toISOString() },
      { onConflict: 'user_id,passage_id' },
    );
  if (error) throw error;
}

export function syncPassageShown(passageId: string): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushPassageShown', _pushPassageShown(_authUserId, passageId));
}
