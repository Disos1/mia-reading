import { t } from '../../i18n/t';
import type { Gender } from '../../types';

interface Props {
  onOpen: () => void;
  gender?: Gender;
}

/**
 * Persistent parent-access entry point (ported from mia-math).
 * Visible on non-item screens; never during an active session item — it would
 * distract and could let Mia fish for answers. PIN gate is V1.5.
 */
export function ParentGate({ onOpen, gender = 'f' }: Props) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 start-4 bg-white/90 hover:bg-white rounded-full px-4 py-2
        text-sm font-medium text-gray-700 card-shadow z-50"
      aria-label="פתח מסך הורים"
    >
      {t('parent_gate.button', { gender })}
    </button>
  );
}
