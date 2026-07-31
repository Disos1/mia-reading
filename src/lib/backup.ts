/**
 * Progress backup — export/import of everything the app knows about a child.
 *
 * The no-dependency safety net. Cloud sync is the eventual answer but it is
 * blocked on creating the `reading` schema in the mia-math Supabase project
 * (build plan D1), and a trip abroad shouldn't wait for that. A dated JSON
 * file in Dima's cloud drive survives a wiped tablet, a lost tablet, and
 * Safari's storage eviction alike.
 *
 * The payload is every `mia_reading_*` key, so it captures the profile, the
 * gap profile, mastery, ledger, sessions, attempts, scaffold memory,
 * signatures and the no-repeat buffers — not just the visible stars.
 */

import { LS_PREFIX } from './supabase';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app:       'mia-reading';
  version:   number;
  createdAt: string;
  /** Display name at backup time, so a file can be identified without opening it. */
  child:     string | null;
  data:      Record<string, string>;
}

function collect(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(LS_PREFIX)) continue;
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

export function buildBackup(): BackupFile {
  const data = collect();
  let child: string | null = null;
  try {
    child = JSON.parse(data[`${LS_PREFIX}profile`] ?? 'null')?.displayName ?? null;
  } catch { /* a corrupt profile must not block the backup */ }
  return { app: 'mia-reading', version: BACKUP_VERSION, createdAt: new Date().toISOString(), child, data };
}

/** Trigger a download of the backup file. Returns the filename used. */
export function downloadBackup(): string {
  const backup = buildBackup();
  const date = backup.createdAt.slice(0, 10);
  const name = `mia-reading-backup-${date}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

export interface RestoreResult {
  ok:      boolean;
  keys?:   number;
  child?:  string | null;
  error?:  string;
}

/**
 * Restore from a backup file's text. Validates before writing anything, so a
 * wrong file can't half-overwrite a working profile. Replaces all
 * `mia_reading_*` keys — the caller should confirm with the parent first.
 */
export function restoreBackup(text: string): RestoreResult {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(text) as BackupFile;
  } catch {
    return { ok: false, error: 'not-json' };
  }
  if (parsed?.app !== 'mia-reading' || typeof parsed.data !== 'object' || parsed.data === null) {
    return { ok: false, error: 'wrong-file' };
  }
  const entries = Object.entries(parsed.data).filter(
    ([k, v]) => k.startsWith(LS_PREFIX) && typeof v === 'string',
  );
  if (entries.length === 0) return { ok: false, error: 'empty' };

  try {
    // Clear current state first so a restore is a true replacement rather than
    // a merge (a merge could leave a stale session pointing at a fresh profile).
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(LS_PREFIX)) localStorage.removeItem(k);
    }
    for (const [k, v] of entries) localStorage.setItem(k, v);
    return { ok: true, keys: entries.length, child: parsed.child ?? null };
  } catch {
    return { ok: false, error: 'write-failed' };
  }
}
