/**
 * Error-signature engine — spec Part 4 detection rules + composer recipes.
 *
 * Primary 2×2 zone (silent rate × comp accuracy) over the last 10 Format-1
 * first attempts. A zone candidate needs ≥6/10 attempts in the same quadrant;
 * a zone SWITCH additionally needs the candidate to repeat on 3 consecutive
 * updates (sticky — one bad session must not flip the whole session recipe).
 *
 * Secondary signatures detected here:
 *   ERR_NIKUD_DEPENDENT       — full-nikud rate ÷ light-nikud rate > 1.5 (≥5 each);
 *                               falls back to the diagnostic measurement until
 *                               practice provides both samples.
 *   ERR_FATIGUE               — accuracy drop >20% first-3 vs last-3 items in
 *                               ≥3 of the last 5 substantial sessions.
 *   ERR_VOCAB_BREAKDOWN       — T1-passage accuracy exceeds T2/T3 accuracy by
 *                               >25% (≥5 samples each).
 *   ERR_LITERAL_OK_INFERENCE_FAIL — literal ≥80% while inference+character ≤50%.
 *
 * Not detectable yet (honestly stubbed inactive, revisit in Phase 3):
 *   ERR_NO_REREAD     — needs look-back telemetry the UI doesn't emit.
 *   ERR_LETTER_CONFUSE — needs Format 5 confusable-pair distractor metadata.
 *
 * Recipes: resolveRecipes() flattens the active set into concrete composer
 * mods. Conflict rule (spec): FATIGUE wins — kid wellbeing first.
 */

import type {
  ErrorSignatureCode,
  GapProfile,
  NikudState,
  PracticeAttempt,
  ReadingLevel,
  SessionRecord,
  SkillCode,
} from '../types';
import { ItemFormat } from '../types';
import { LS_PREFIX } from './supabase';
import { getPassage } from './passages';

// ─── State ────────────────────────────────────────────────────────────────────

export type Zone = 'healthy' | 'fast_inaccurate' | 'slow_accurate' | 'general_struggle';

export interface SignatureState {
  isActive:       boolean;
  firstDetectedAt: string | null;
  lastObservedAt:  string | null;
  sampleSize:     number;
}

export interface SignatureMap {
  zone:         Zone;
  /** Zone stickiness: a candidate zone must repeat on 3 consecutive updates. */
  pendingZone:  Zone | null;
  pendingCount: number;
  signatures:   Partial<Record<ErrorSignatureCode, SignatureState>>;
  updatedAt:    string | null;
}

export const EMPTY_SIGNATURES: SignatureMap = {
  zone: 'healthy', pendingZone: null, pendingCount: 0, signatures: {}, updatedAt: null,
};

const KEY = (profileId: string) => `${LS_PREFIX}signatures::${profileId}`;

export function loadSignatures(profileId: string): SignatureMap {
  try {
    const raw = localStorage.getItem(KEY(profileId));
    return raw ? { ...EMPTY_SIGNATURES, ...(JSON.parse(raw) as SignatureMap) } : EMPTY_SIGNATURES;
  } catch {
    return EMPTY_SIGNATURES;
  }
}

export function saveSignatures(profileId: string, map: SignatureMap): void {
  try {
    localStorage.setItem(KEY(profileId), JSON.stringify(map));
  } catch { /* non-fatal */ }
}

/** Seed signature state from the diagnostic's coarse measurements. */
export function seedSignaturesFromDiagnostic(profileId: string, gap: GapProfile): SignatureMap {
  const now = new Date().toISOString();
  const sigs: SignatureMap['signatures'] = {};
  for (const code of gap.activeErrorSignatures) {
    if (code === 'ERR_GENERAL_STRUGGLE' || code === 'ERR_SLOW_ACCURATE') continue; // zone, below
    sigs[code] = { isActive: true, firstDetectedAt: now, lastObservedAt: now, sampleSize: 1 };
  }
  const zone: Zone =
    gap.activeErrorSignatures.includes('ERR_GENERAL_STRUGGLE') ? 'general_struggle' :
    gap.activeErrorSignatures.includes('ERR_SLOW_ACCURATE')    ? 'slow_accurate' :
    'healthy';
  const map: SignatureMap = { zone, pendingZone: null, pendingCount: 0, signatures: sigs, updatedAt: now };
  saveSignatures(profileId, map);
  return map;
}

// ─── Detection ────────────────────────────────────────────────────────────────

const ZONE_WINDOW        = 10;
const ZONE_QUORUM        = 6;
const ZONE_STICKY        = 3;
const RATE_BASELINE_FRAC = 0.8;   // "slow" = below 80% of her diagnostic baseline
const RATE_MIN_WPM       = 30;    // floor so a null/low baseline can't mark everything slow
const FATIGUE_DROP       = 0.2;
const FATIGUE_SESSIONS   = 3;     // of the last 5
const FATIGUE_MIN_ITEMS  = 6;
const VOCAB_GAP          = 0.25;
const VOCAB_MIN_SAMPLES  = 5;
const NIKUD_RATIO        = 1.5;
const NIKUD_MIN_SAMPLES  = 5;

function rateOf(a: PracticeAttempt): number | null {
  if (!a.readMs || a.readMs <= 0) return null;
  const wc = getPassage(a.passageId)?.wordCount;
  if (!wc) return null;
  return (wc / a.readMs) * 60000;
}

function firstAttemptsF1(attempts: PracticeAttempt[]): PracticeAttempt[] {
  return attempts.filter(a => a.firstAttempt && a.itemFormat === ItemFormat.PassageComp);
}

function computeZoneCandidate(recent: PracticeAttempt[], baselineWpm: number | null): Zone | null {
  const window = recent.slice(-ZONE_WINDOW);
  if (window.length < ZONE_WINDOW) return null;
  const rateThreshold = Math.max(RATE_MIN_WPM, (baselineWpm ?? GRADE_WPM) * RATE_BASELINE_FRAC);
  const counts: Record<Zone, number> = {
    healthy: 0, fast_inaccurate: 0, slow_accurate: 0, general_struggle: 0,
  };
  for (const a of window) {
    const rate = rateOf(a);
    const fast = rate === null ? true : rate >= rateThreshold; // unknown rate → don't call it slow
    const q: Zone = fast
      ? (a.correct ? 'healthy' : 'fast_inaccurate')
      : (a.correct ? 'slow_accurate' : 'general_struggle');
    counts[q]++;
  }
  const [top, n] = (Object.entries(counts) as [Zone, number][])
    .sort((x, y) => y[1] - x[1])[0];
  return n >= ZONE_QUORUM ? top : null;
}

const GRADE_WPM = 60;

function setSig(
  sigs: SignatureMap['signatures'],
  code: ErrorSignatureCode,
  active: boolean,
  sampleSize: number,
  now: string,
): void {
  const prior = sigs[code];
  if (active) {
    sigs[code] = {
      isActive: true,
      firstDetectedAt: prior?.firstDetectedAt ?? now,
      lastObservedAt: now,
      sampleSize,
    };
  } else if (prior?.isActive) {
    sigs[code] = { ...prior, isActive: false, sampleSize };
  }
}

/**
 * Recompute the signature map after a session. Pure — caller persists.
 *
 * @param allAttempts   Full stored attempt history (incl. this session).
 * @param sessions      All session records (incl. this session's final record).
 * @param gap           The diagnostic gap profile (baselines), if any.
 */
export function updateSignatures(args: {
  prev:        SignatureMap;
  allAttempts: PracticeAttempt[];
  sessions:    SessionRecord[];
  gap:         GapProfile | null;
}): SignatureMap {
  const now = new Date().toISOString();
  const { prev, gap } = args;
  const f1 = firstAttemptsF1(args.allAttempts);
  const sigs: SignatureMap['signatures'] = { ...prev.signatures };

  // ── Primary zone (sticky) ──
  const candidate = computeZoneCandidate(f1, gap?.baselineMetrics.silentRateWithNikudWpm ?? null);
  let zone = prev.zone;
  let pendingZone = prev.pendingZone;
  let pendingCount = prev.pendingCount;
  if (candidate === null || candidate === prev.zone) {
    pendingZone = null; pendingCount = 0;
  } else if (candidate === prev.pendingZone) {
    pendingCount += 1;
    if (pendingCount >= ZONE_STICKY) { zone = candidate; pendingZone = null; pendingCount = 0; }
  } else {
    pendingZone = candidate; pendingCount = 1;
  }
  setSig(sigs, 'ERR_FAST_INACCURATE',  zone === 'fast_inaccurate',  Math.min(f1.length, ZONE_WINDOW), now);
  setSig(sigs, 'ERR_SLOW_ACCURATE',    zone === 'slow_accurate',    Math.min(f1.length, ZONE_WINDOW), now);
  setSig(sigs, 'ERR_GENERAL_STRUGGLE', zone === 'general_struggle', Math.min(f1.length, ZONE_WINDOW), now);

  // ── ERR_FATIGUE — first-3 vs last-3 accuracy in ≥3 of last 5 sessions ──
  {
    const completed = args.sessions
      .filter(r => r.completedAt)
      .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
      .slice(-5);
    let fatigued = 0, evaluated = 0;
    for (const rec of completed) {
      const sess = f1
        .filter(a => a.sessionId === rec.sessionId)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      if (sess.length < FATIGUE_MIN_ITEMS) continue;
      evaluated++;
      const acc = (xs: PracticeAttempt[]) => xs.filter(a => a.correct).length / xs.length;
      if (acc(sess.slice(0, 3)) - acc(sess.slice(-3)) > FATIGUE_DROP) fatigued++;
    }
    setSig(sigs, 'ERR_FATIGUE', evaluated >= 3 && fatigued >= FATIGUE_SESSIONS, evaluated, now);
  }

  // ── ERR_VOCAB_BREAKDOWN — T1 vs T2/T3 accuracy gap ──
  {
    const recent = f1.slice(-30);
    const t1  = recent.filter(a => getPassage(a.passageId)?.vocabTier === 'T1');
    const t23 = recent.filter(a => {
      const t = getPassage(a.passageId)?.vocabTier;
      return t === 'T2' || t === 'T3' || t === 'MIXED';
    });
    if (t1.length >= VOCAB_MIN_SAMPLES && t23.length >= VOCAB_MIN_SAMPLES) {
      const acc = (xs: PracticeAttempt[]) => xs.filter(a => a.correct).length / xs.length;
      setSig(sigs, 'ERR_VOCAB_BREAKDOWN', acc(t1) - acc(t23) > VOCAB_GAP, t1.length + t23.length, now);
    }
  }

  // ── ERR_LITERAL_OK_INFERENCE_FAIL ──
  {
    const lit = f1.filter(a => a.skillCode === 'COMP_LITERAL').slice(-10);
    const inf = f1.filter(a => a.skillCode === 'COMP_INFERENCE' || a.skillCode === 'COMP_CHARACTER').slice(-10);
    if (lit.length >= 4 && inf.length >= 4) {
      const acc = (xs: PracticeAttempt[]) => xs.filter(a => a.correct).length / xs.length;
      setSig(sigs, 'ERR_LITERAL_OK_INFERENCE_FAIL', acc(lit) >= 0.8 && acc(inf) <= 0.5, lit.length + inf.length, now);
    }
  }

  // ── ERR_NIKUD_DEPENDENT — practice rates when both samples exist, else keep
  //    the diagnostic's measurement as-is ──
  {
    const withRates  = f1.filter(a => a.nikud === 'full').map(rateOf).filter((r): r is number => r !== null);
    const lightRates = f1.filter(a => a.nikud !== 'full').map(rateOf).filter((r): r is number => r !== null);
    if (withRates.length >= NIKUD_MIN_SAMPLES && lightRates.length >= NIKUD_MIN_SAMPLES) {
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const ratio = mean(lightRates) > 0 ? mean(withRates) / mean(lightRates) : null;
      if (ratio !== null) {
        setSig(sigs, 'ERR_NIKUD_DEPENDENT', ratio > NIKUD_RATIO, withRates.length + lightRates.length, now);
      }
    }
  }

  // ERR_NO_REREAD / ERR_LETTER_CONFUSE: telemetry arrives with Phase 3 formats.

  return { zone, pendingZone, pendingCount, signatures: sigs, updatedAt: now };
}

// ─── Composer recipes ─────────────────────────────────────────────────────────

export interface RecipeMods {
  /** Multiply the session item target (fatigue → 0.75). */
  targetMultiplier:    number;
  /** Force every item to this level (general struggle → 1). */
  forceLevel:          ReadingLevel | null;
  /** Force the session nikud state (struggle → full; slow-accurate → partial). */
  forceNikud:          NikudState | null;
  /** Multiply the read-time floor (fast-inaccurate → 1.3). */
  readFloorMultiplier: number;
  /** Override the blocked-practice skill (literal-ok-inference-fail → inference). */
  blockedSkillOverride: SkillCode | null;
  /** Push COMP_VOCAB to the front of the spaced pool (vocab breakdown). */
  prioritizeVocab:     boolean;
  /** Serve part of the session at partial nikud (nikud-dependent bridging). */
  partialNikudBridge:  boolean;
  notes:               string[];
}

export const NEUTRAL_RECIPES: RecipeMods = {
  targetMultiplier: 1, forceLevel: null, forceNikud: null, readFloorMultiplier: 1,
  blockedSkillOverride: null, prioritizeVocab: false, partialNikudBridge: false, notes: [],
};

export function resolveRecipes(map: SignatureMap): RecipeMods {
  const mods: RecipeMods = { ...NEUTRAL_RECIPES, notes: [] };
  const active = (c: ErrorSignatureCode) => map.signatures[c]?.isActive === true;

  // Primary zone first.
  switch (map.zone) {
    case 'general_struggle':
      mods.forceLevel = 1;
      mods.forceNikud = 'full';
      mods.notes.push('zone=general_struggle → level 1, full nikud');
      break;
    case 'fast_inaccurate':
      mods.readFloorMultiplier = 1.3;
      mods.notes.push('zone=fast_inaccurate → read floor ×1.3');
      break;
    case 'slow_accurate':
      mods.forceNikud = 'partial';
      mods.notes.push('zone=slow_accurate → partial-nikud bridging');
      break;
    case 'healthy':
      break;
  }

  // Secondaries layered on top.
  if (active('ERR_NIKUD_DEPENDENT') && map.zone !== 'general_struggle') {
    mods.partialNikudBridge = true;
    mods.notes.push('ERR_NIKUD_DEPENDENT → partial-nikud bridge items');
  }
  if (active('ERR_VOCAB_BREAKDOWN')) {
    mods.prioritizeVocab = true;
    mods.notes.push('ERR_VOCAB_BREAKDOWN → COMP_VOCAB prioritized');
  }
  if (active('ERR_LITERAL_OK_INFERENCE_FAIL')) {
    mods.blockedSkillOverride = 'COMP_INFERENCE';
    mods.notes.push('ERR_LITERAL_OK_INFERENCE_FAIL → blocked practice = inference');
  }

  // FATIGUE wins conflicts (kid wellbeing first): shorter session, no floor
  // inflation on top of tiredness.
  if (active('ERR_FATIGUE')) {
    mods.targetMultiplier = 0.75;
    mods.readFloorMultiplier = 1;
    mods.notes.push('ERR_FATIGUE → target ×0.75 (overrides floor inflation)');
  }

  return mods;
}
