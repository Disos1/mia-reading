/**
 * Session persistence — localStorage primary, Supabase write-through.
 * Ported from mia-math with `mia_reading_` keys and reading types.
 *
 * Stores MasteryMap + per-skill attempt ledger + scaffold memory + the last N
 * session records + attempts in localStorage. Profile-keyed so multi-profile
 * is additive. MasteryMap / session records / attempts also push to Supabase
 * (fire-and-forget) so progress survives a device swap.
 */

import type {
  MasteryMap,
  SessionRecord,
  PracticeAttempt,
  ScaffoldMemory,
} from '../types';
import type { AttemptLedger } from './masteryTracker';
import { LS_PREFIX } from './supabase';
import { MAX_SESSIONS, MAX_ATTEMPTS } from '../constants/config';
import { syncMasteryMap, syncSessionRecord, syncSessionAttempts } from './sync';

const KEY_MASTERY  = (p: string) => `${LS_PREFIX}mastery::${p}`;
const KEY_LEDGER   = (p: string) => `${LS_PREFIX}ledger::${p}`;
const KEY_SESSIONS = (p: string) => `${LS_PREFIX}sessions::${p}`;
const KEY_ATTEMPTS = (p: string) => `${LS_PREFIX}attempts::${p}`;
const KEY_SCAFFOLD = (p: string) => `${LS_PREFIX}scaffold::${p}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or disabled — silent, no crash
  }
}

// ─── Mastery ────────────────────────────────────────────────────────────────

export function loadMasteryMap(profileId: string): MasteryMap {
  return read<MasteryMap>(KEY_MASTERY(profileId), {});
}

export function saveMasteryMap(profileId: string, map: MasteryMap): void {
  write(KEY_MASTERY(profileId), map);
  syncMasteryMap(map);
}

// ─── Attempt ledger (rolling-window per skill) ──────────────────────────────

export function loadLedger(profileId: string): AttemptLedger {
  return read<AttemptLedger>(KEY_LEDGER(profileId), {});
}

export function saveLedger(profileId: string, ledger: AttemptLedger): void {
  write(KEY_LEDGER(profileId), ledger);
}

// ─── Scaffold memory (cross-session start level/nikud) ──────────────────────

export function loadScaffoldMemory(profileId: string): Record<string, ScaffoldMemory> {
  return read<Record<string, ScaffoldMemory>>(KEY_SCAFFOLD(profileId), {});
}

export function saveScaffoldMemory(profileId: string, mem: Record<string, ScaffoldMemory>): void {
  write(KEY_SCAFFOLD(profileId), mem);
}

// ─── Session records ────────────────────────────────────────────────────────

export function loadSessionRecords(profileId: string): SessionRecord[] {
  return read<SessionRecord[]>(KEY_SESSIONS(profileId), []);
}

export function appendSessionRecord(profileId: string, record: SessionRecord): void {
  const next = [...loadSessionRecords(profileId), record].slice(-MAX_SESSIONS);
  write(KEY_SESSIONS(profileId), next);
  syncSessionRecord(record);
}

/** Upsert by sessionId — for partial drafts (completedAt: null) and finish(). */
export function upsertSessionRecord(profileId: string, record: SessionRecord): void {
  const cur = loadSessionRecords(profileId);
  const idx = cur.findIndex(r => r.sessionId === record.sessionId);
  const next = idx >= 0
    ? cur.map((r, i) => (i === idx ? record : r))
    : [...cur, record].slice(-MAX_SESSIONS);
  write(KEY_SESSIONS(profileId), next);
  syncSessionRecord(record);
}

export function hydrateSessionRecords(profileId: string, records: SessionRecord[]): void {
  write(KEY_SESSIONS(profileId), records.slice(-MAX_SESSIONS));
}

// ─── Attempts (analytics / parent report) ────────────────────────────────────

export function loadAttempts(profileId: string): PracticeAttempt[] {
  return read<PracticeAttempt[]>(KEY_ATTEMPTS(profileId), []);
}

export function appendAttempts(profileId: string, newAttempts: PracticeAttempt[]): void {
  const next = [...loadAttempts(profileId), ...newAttempts].slice(-MAX_ATTEMPTS);
  write(KEY_ATTEMPTS(profileId), next);
  syncSessionAttempts(newAttempts);
}

// ─── Bulk clear (parent reset) ───────────────────────────────────────────────

export function clearAllSessionData(profileId: string): void {
  for (const k of [
    KEY_MASTERY(profileId),
    KEY_LEDGER(profileId),
    KEY_SESSIONS(profileId),
    KEY_ATTEMPTS(profileId),
    KEY_SCAFFOLD(profileId),
  ]) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}
