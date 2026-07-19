/**
 * Shared contract between the format components and Session.
 *
 * Every format reports attempts through the same shape; the optional override
 * fields let multi-question formats (reread) and non-passage formats (flash,
 * ordering) refine what Session records without special-casing the runtime.
 */

import type { ErrorSignatureCode, Gender, PracticeItem, SkillCode } from '../../types';

export interface FormatAttempt {
  correct:      boolean;
  firstAttempt: boolean;
  usedHint:     boolean;
  /** Chosen option index; for ordering: count of misplaced cards. */
  chosenOption: number;
  responseMs:   number;
  readMs:       number;
  /** Overrides (default: the item's own skill / question). */
  skillCode?:   SkillCode;
  questionId?:  string;
  /** Set by Flash when a confusable distractor was tapped. */
  signatureHit?: ErrorSignatureCode | null;
  /** Set by Reread: which pass this probe belongs to. */
  rereadPass?:  1 | 2;
}

export interface FormatProps {
  item:       PracticeItem;
  gender:     Gender;
  /** Read-floor inflation from the fast-inaccurate recipe (default 1). */
  readFloorMultiplier?: number;
  /** Called on every answer submission (first attempt AND retry). */
  onAttempt:  (r: FormatAttempt) => void;
  /** Called once when the item is finished. */
  onComplete: (summary: { firstAttemptCorrect: boolean; readMs: number }) => void;
}

/** Fisher-Yates over indices — shared by the formats that shuffle options. */
export function shuffledIndices(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
