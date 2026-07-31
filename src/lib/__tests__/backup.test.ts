import { describe, it, expect, beforeEach } from 'vitest';
import { buildBackup, restoreBackup } from '../backup';
import { LS_PREFIX } from '../supabase';

/**
 * The backup is the only thing standing between a wiped tablet and a lost year
 * of stars until cloud sync exists (build plan Phase 7 / D1). It has to be
 * complete, and it has to refuse the wrong file rather than half-restore.
 */

// jsdom isn't configured for this project, so provide the minimum surface.
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

function seed() {
  localStorage.setItem(`${LS_PREFIX}profile`, JSON.stringify({ displayName: 'מיה' }));
  localStorage.setItem(`${LS_PREFIX}mastery::p1`, JSON.stringify({ COMP_LITERAL: { status: 'שליטה' } }));
  localStorage.setItem(`${LS_PREFIX}sessions::p1`, JSON.stringify([{ sessionId: 's1' }]));
  localStorage.setItem('unrelated_other_app', 'leave me alone');
}

describe('backup', () => {
  it('captures every reading key and nothing else', () => {
    seed();
    const b = buildBackup();
    expect(Object.keys(b.data)).toHaveLength(3);
    expect(Object.keys(b.data).every(k => k.startsWith(LS_PREFIX))).toBe(true);
    expect(b.data['unrelated_other_app']).toBeUndefined();
  });

  it('labels the file with the child so it can be told apart', () => {
    seed();
    expect(buildBackup().child).toBe('מיה');
  });

  it('survives a corrupt profile rather than refusing to back up', () => {
    localStorage.setItem(`${LS_PREFIX}profile`, '{not json');
    localStorage.setItem(`${LS_PREFIX}mastery::p1`, '{}');
    const b = buildBackup();
    expect(b.child).toBeNull();
    expect(Object.keys(b.data)).toHaveLength(2);
  });

  it('round-trips: restore onto an empty device reproduces the state', () => {
    seed();
    const file = JSON.stringify(buildBackup());
    localStorage.clear();
    const res = restoreBackup(file);
    expect(res.ok).toBe(true);
    expect(res.keys).toBe(3);
    expect(localStorage.getItem(`${LS_PREFIX}sessions::p1`)).toContain('s1');
  });

  it('replaces rather than merges, so no stale state survives a restore', () => {
    seed();
    const file = JSON.stringify(buildBackup());
    localStorage.setItem(`${LS_PREFIX}scaffold::p1`, 'stale');
    restoreBackup(file);
    expect(localStorage.getItem(`${LS_PREFIX}scaffold::p1`)).toBeNull();
  });

  it('refuses a foreign or malformed file without touching current progress', () => {
    seed();
    for (const bad of ['not json at all', '{"app":"some-other-app","data":{}}', '{"app":"mia-reading","data":{}}']) {
      const res = restoreBackup(bad);
      expect(res.ok).toBe(false);
    }
    // progress intact
    expect(localStorage.getItem(`${LS_PREFIX}sessions::p1`)).toContain('s1');
  });
});
