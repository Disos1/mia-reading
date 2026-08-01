// ============================================================================
// Mia Reading — domain types
//
// Mirrors the Mia Math type architecture (proven) but for the reading domain.
// Spec: Mia_Learning_v1_spec.md Parts 3-9 + Mia_Reading_Stage3_Build_Plan.md.
//
// Single-source-of-truth discipline (math lesson B7): the wire shapes written
// by sync.ts must mirror the reading.* migration columns exactly. When a field
// is added here, it must land in the migration AND every Edge Function query.
// ============================================================================

// ─── Identity ─────────────────────────────────────────────────────────────────

export type Gender = 'f' | 'm';

export type AvatarId = 'fox' | 'cat' | 'unicorn' | 'dragon' | 'owl' | 'whale';

export interface Avatar {
  id:      AvatarId;
  emoji:   string;
  nameKey: string; // i18n key → t(nameKey, {gender})
  color:   string; // background hex
}

// ─── Reading scaffolding axes ─────────────────────────────────────────────────
//
// Two INDEPENDENT axes (spec Part 3). Reading Level packages length + vocab +
// syntax + question depth; Nikud state is the pointed→unpointed weaning axis
// that is the heart of the grade-3 transition (Share & Bar-On triplex model).

/**
 * רמת קריאה — 1 (basic) · 2 (intermediate) · 3 (challenging) · 4 (4th grade:
 * multi-paragraph, 150–300 words, informational as well as narrative).
 *
 * Level 4 was added ahead of the content scale-up rather than after it: Mia
 * starts 4th grade in a month, and generating a bank against a 3-level
 * template would mean regenerating all of it.
 */
export type ReadingLevel = 1 | 2 | 3 | 4;

/** Text type. 4th grade introduces non-narrative reading explicitly. */
export type Genre = 'narrative' | 'informational' | 'instructional' | 'diagnostic' | 'format';

/** ניקוד — full (מלא) · partial (חלקי) · none (ללא). */
export type NikudState = 'full' | 'partial' | 'none';

// ─── Skill taxonomy (25 skills across 4 strands) ──────────────────────────────
//
// 24 from spec Part 3 + COMP_QGEN (question generation — strongest single-
// strategy NRP evidence, added in the Stage 3 plan, C3).

export type StrandCode = 'DECODING' | 'WORD_RECOGNITION' | 'FLUENCY' | 'COMPREHENSION';

export type SkillCode =
  // פענוח / Decoding (maintenance)
  | 'DEC_NIKUD_COMPLEX'
  | 'DEC_SHIN_SIN'
  | 'DEC_BKP'
  | 'DEC_NO_NIKUD_FAMILIAR'
  | 'DEC_NO_NIKUD_INFER'
  // זיהוי מילים / Word Recognition (maintenance, elevated when nikud-dependent)
  | 'WR_HF_T1'
  | 'WR_HF_T2'
  | 'WR_HF_T3'
  | 'WR_AFFIX'
  | 'WR_INFLECTION'
  // שטף / Fluency (active)
  | 'FLU_SILENT_RATE'
  | 'FLU_NO_NIKUD_RATE'
  | 'FLU_ACCURACY_INFERRED'
  | 'FLU_REREAD_GAIN'
  | 'FLU_CONNECTED_TEXT'
  // הבנת הנקרא / Comprehension (dominant — 10 skills incl. COMP_QGEN)
  | 'COMP_LITERAL'
  | 'COMP_VOCAB'
  | 'COMP_SEQUENCE'
  | 'COMP_CAUSE'
  | 'COMP_INFERENCE'
  | 'COMP_CHARACTER'
  | 'COMP_PREDICT'
  | 'COMP_MAIN_IDEA'
  | 'COMP_TITLE'
  | 'COMP_QGEN'
  // 4th-grade additions (curriculum introduces these explicitly)
  | 'COMP_SUMMARY'       // תמצות — say the whole text in one sentence
  | 'COMP_FACT_OPINION'  // עובדה מול דעה
  | 'COMP_COMPARE'       // השוואה בין דמויות / טקסטים
  | 'COMP_GENRE';        // סוג הטקסט — סיפור / מידע / הוראות

// ─── Mastery ──────────────────────────────────────────────────────────────────

export type MasteryStatus = 'שליטה' | 'בתהליך' | 'טרם נלמד';

export interface MasteryRecord {
  profileId:            string;
  skillCode:            SkillCode;
  status:               MasteryStatus;
  firstAttemptAccuracy: number;   // 0.0–1.0, rolling window of last 10 first attempts
  itemCount:            number;   // total first-attempt items recorded
  sessionCount:         number;   // distinct sessions in which the skill appeared
  lastPracticedAt:      string;
  needsRetentionProbe:  boolean;
  retentionProbeDueAt:  string | null;
  /** Retention probes passed since graduation (0 → next is 7-day, 1 → next is
   *  30-day, 2 → confirmed). Local-only. */
  probesPassed?:        number;
}

export type MasteryMap = Record<string, MasteryRecord>;

// ─── Error signatures (8, spec Part 4) ────────────────────────────────────────

export type ErrorSignatureCode =
  | 'ERR_FAST_INACCURATE'          // high rate × low accuracy (primary 2×2)
  | 'ERR_SLOW_ACCURATE'            // low rate × high accuracy (primary 2×2)
  | 'ERR_GENERAL_STRUGGLE'         // low rate × low accuracy (primary 2×2)
  | 'ERR_NIKUD_DEPENDENT'          // with-nikud rate ÷ no-nikud rate > 1.5×
  | 'ERR_NO_REREAD'                // comp <70% with zero look-back events
  | 'ERR_LITERAL_OK_INFERENCE_FAIL'// literal fine, inference/character fails
  | 'ERR_VOCAB_BREAKDOWN'          // comp gap on top-500 vs 501-1000 vocab
  | 'ERR_FATIGUE'                  // accuracy drop first-3 vs last-3 items
  | 'ERR_LETTER_CONFUSE';          // wrong distractors differ by confusable pair

export type SignatureConfidence = 'confirmed' | 'suspected' | 'ruled_out';

export interface ErrorSignature {
  profileId:         string;
  signatureCode:     ErrorSignatureCode;
  confidence:        SignatureConfidence;
  firstDetectedAt:   string;
  lastVerifiedAt:    string;
  detectionEvidence: string[]; // item / passage / question IDs
}

// ─── Passages + comp questions (spec Part 9, mirrors reading.* migration) ──────

export type VocabTier = 'T1' | 'T2' | 'T3' | 'MIXED';

export interface Passage {
  id:            string;
  level:         ReadingLevel;
  vocabTier:     VocabTier;
  wordCount:     number;
  /** The three nikud variants. `full` is always present; the scaffold engine
   *  falls back to `full` when a lighter variant is missing. */
  textFullNikud:    string;
  textPartialNikud: string | null;
  textNoNikud:      string | null;
  characterNames: string[];
  genre:          string | null;
  /** Level-1 passages may carry a picture emoji/asset key for concrete support. */
  picture?:       string | null;
}

export interface PassageQuestion {
  id:           string;
  passageId:    string;
  skillCode:    SkillCode;
  questionText: string;
  /** 4 option strings. Order is authored; the renderer may shuffle per-render. */
  options:      string[];
  correctOption: number;   // index into options
  hintText:     string | null;
  /**
   * WHY the correct answer is correct, shown after any miss. For comprehension
   * this is the actual lesson — flashing a green answer with no reasoning
   * teaches nothing (build plan H1). Required in practice; the content test
   * asserts every authored question has one.
   */
  explanation:  string | null;
  questionLevel: ReadingLevel;
}

// ─── Session modes + phases ────────────────────────────────────────────────────

export type SessionMode = 'time' | 'quantity' | 'open';

export type SessionPhase =
  | 'warmup'
  | 'blocked_practice'
  | 'spaced_retrieval'
  | 'interleaved';

// ─── Item formats (spec Part 5) ────────────────────────────────────────────────
//
// Numeric ids mirror the reading.attempts.item_format check constraint (1-5).

export const ItemFormat = {
  PassageComp:   1, // Format 1 — קריאה + הבנה (workhorse)
  Reread:        2, // Format 2 — שתי קריאות
  EventOrdering: 3, // Format 3 — סדר אירועים
  WordInContext: 4, // Format 4 — מילה בהקשר
  Flash:         5, // Format 5 — בזק
  Ambiguity:     6, // Format 6 — מה המילה אומרת כאן? (unpointed homographs)
} as const;
export type ItemFormat = typeof ItemFormat[keyof typeof ItemFormat];

/** The visually-confusable Hebrew letter pairs (spec Part 4, ERR_LETTER_CONFUSE). */
export type ConfusablePair = 'ב/כ' | 'ר/ד' | 'ה/ח' | 'ס/ם' | 'ו/י' | 'ת/ח' | 'ז/ן';

/** One answer option in a Flash item. `pair` names the confusable letter pair
 *  the distractor exploits (null = plain filler, wrong but not confusable). */
export interface FlashOption {
  text: string;
  pair: ConfusablePair | null;
}

/** Format 5 payload: the word flashes for `durationMs`, then options appear. */
export interface FlashSpec {
  word:       string;        // shown unpointed — recognition, not decoding
  durationMs: number;        // 1500 T1 · 1000 T2 · 600 T3 (spec Part 5)
  options:    FlashOption[]; // options[0] is the correct word
}

/** One practice item. The base shape (passage + question) serves Format 1;
 *  the optional payloads below carry the other formats' extras. */
export interface PracticeItem {
  itemId:        string;
  format:        ItemFormat;
  skillCode:     SkillCode;
  skillHebrewKey: string;        // i18n key → t(skillHebrewKey, {gender})
  passage:       Passage;
  question:      PassageQuestion;
  level:         ReadingLevel;
  nikud:         NikudState;
  /** Format 2: the second pass's comp probe (question = pass 1's probe). */
  question2?:    PassageQuestion;
  /** Format 3: event-card texts in CORRECT order (renderer shuffles). */
  ordering?:     string[];
  /** Format 4: the word visually highlighted inside the sentence. */
  targetWord?:   string;
  /** Format 5: flash payload (word, duration, confusable-tagged options). */
  flash?:        FlashSpec;
  /** Format 6: the unpointed homograph whose meaning the sentence decides. */
  ambiguity?:    AmbiguitySpec;
}

/**
 * Format 6 payload. The same unpointed spelling can be several words (ספר =
 * sefer / safar / sapar); only the sentence decides which. Resolving that is
 * the actual skill of reading unpointed Hebrew, and no other format trains it
 * (build plan H-U2).
 */
export interface AmbiguitySpec {
  /** The homograph as it appears unpointed in the sentence. */
  word:       string;
  /** The reading that fits THIS sentence, pointed (shown in the answer). */
  pointedForm: string;
}

export interface SessionPlanItem {
  item:         PracticeItem;
  sessionPhase: SessionPhase;
  position:     number;          // 0-indexed
  /** 7/30-day retention probe: a re-test of a skill already at שליטה. The
   *  first-attempt outcome goes through applyProbeResult, not ordinary mastery —
   *  a miss demotes the skill back to בתהליך. */
  isRetentionProbe?: boolean;
  /**
   * Teaching slot: walked through with the answer shown, never answered or
   * scored. Leads a blocked-practice run so the strategy is modelled before
   * she is asked to use it (gradual release — build plan H1). Produces no
   * PracticeAttempt, so it stays out of tally, mastery and combo by design.
   */
  isWorkedExample?:  boolean;
}

export interface SessionPlan {
  sessionId:         string;
  profileId:         string;
  mode:              SessionMode;
  /** Ordered items. For 'open' mode this is an initial batch; the composer
   *  extends on demand. */
  plannedItems:      SessionPlanItem[];
  targetItems:       number | null;   // null for open mode
  primarySkillCode:  SkillCode;
  startedAt:         string;
  composerReasoning: string[];        // debug/analytics trace
}

// ─── Attempts + session records ────────────────────────────────────────────────

export interface PracticeAttempt {
  id:             string;
  profileId:      string;
  sessionId:      string;
  itemId:         string;
  passageId:      string;
  questionId:     string;
  skillCode:      SkillCode;
  itemFormat:     ItemFormat;
  sessionPhase:   SessionPhase;
  level:          ReadingLevel;
  nikud:          NikudState;
  answer:         number;   // chosen option index
  correct:        boolean;
  /** First-attempt = no prior attempt on this item in this session. Every
   *  aggregate (stars, mastery, accuracy, dashboard) counts first attempts
   *  only (math lesson B3). */
  firstAttempt:   boolean;
  usedHint:       boolean;
  signatureHit:   ErrorSignatureCode | null;
  /** Time from question-shown to answer, ms. Feeds fluency rate + fatigue. */
  responseMs:     number;
  /** Time spent on the passage before pressing "סיימתי לקרוא", ms. Feeds
   *  silent reading rate (wpm). */
  readMs:         number;
  /** Format 2 only: which pass this probe belongs to. Reread gain is derived
   *  from the two passes' readMs on the same item. */
  rereadPass?:    1 | 2;
  sequenceNumber: number;
  createdAt:      string;
}

export interface SessionRecord {
  sessionId:        string;
  profileId:        string;
  mode:             SessionMode;
  startedAt:        string;
  completedAt:      string | null;
  itemsAttempted:   number;   // first-attempt count (see tally.ts)
  itemsCorrect:     number;   // first-attempt correct
  primarySkillCode: SkillCode | '';
  /** Total words in passages read this session — feeds the words-read badges
   *  and the parent "words this week" headline. */
  wordsRead:        number;
  /** Longest run of consecutive first-attempt-correct answers (combo). */
  maxCombo?:        number;
}

// ─── Gap profile (spec Part 4) ─────────────────────────────────────────────────

export interface SkillAccuracy {
  attempts: number;
  correct:  number;
  status:   MasteryStatus;
}

export interface GapProfile {
  version:      number;
  userId:       string;
  completedAt:  string;
  diagnosticSessionId: string;
  strandStatus: Partial<Record<StrandCode, MasteryStatus>>;
  skillAccuracy: Partial<Record<SkillCode, SkillAccuracy>>;
  activeErrorSignatures: ErrorSignatureCode[];
  composerNotes: {
    firstNewMaterial:        SkillCode | null;
    blockedPracticePriority: SkillCode[];
    passageDifficultyFloor:  ReadingLevel;
    nikudDependence:         boolean;
    nikudDependenceRatio:    number | null;
  };
  baselineMetrics: {
    silentRateWithNikudWpm: number | null;
    silentRateNoNikudWpm:   number | null;
    rereadGainPct:          number | null;
    compAccuracyPct:        number | null;
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────
//
// Reading-app profile. In the shared mia-learning project the identity fields
// (avatar/name/gender/age) live in public.profiles, written by the hub. Until
// the hub exists, the reading app owns onboarding and stores the profile in
// localStorage (offline-first), keyed by profileId.

export interface Profile {
  profileId:             string;
  avatarId:              AvatarId;
  gender:                Gender;
  displayName:           string;
  onboardingComplete:    boolean;
  diagnosticCompletedAt: string | null;
  diagnosticVersion:     number | null;
  gapProfileJson:        GapProfile | null;
  sessionsCompleted:     number;
  createdAt:             string;
}

// ─── Scaffold state (in-session, not persisted) ────────────────────────────────
//
// The 2-axis analog of math's CPAState. Tracks the current reading level +
// nikud and the consecutive-correct / consecutive-wrong counters that drive
// aggressive-climb / patient-drop.

export interface ScaffoldState {
  level:              ReadingLevel;
  nikud:              NikudState;
  consecutiveCorrect: number;
  consecutiveWrong:   number;
  /** Which axis the last climb moved, so climbs alternate level ↔ nikud. */
  lastClimbAxis:      'level' | 'nikud';
}

// ─── Scaffold memory (cross-session) ───────────────────────────────────────────
//
// Persisted so a level/nikud drop survives the session boundary (math lesson:
// the 68-sessions-at-45% failure mode — never restart at the same wall).

export interface ScaffoldMemory {
  /** Level/nikud to start the next session at. */
  level: ReadingLevel;
  nikud: NikudState;
  /** Consecutive sessions with first-attempt accuracy < 55%. At 3 the composer
   *  escalates (drops the floor). */
  struggleSessions: number;
}
