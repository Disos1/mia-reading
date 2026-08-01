import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/t';
import type { Gender } from '../types';
import { BigButton } from '../components/primitives/BigButton';
import { downloadBackup, restoreBackup } from '../lib/backup';
import { storageState, isStandalone, type StorageState } from '../lib/storageDurability';
import { hebrewVoiceName, voiceCount } from '../lib/tts';
import { useTtsSupported } from '../lib/useTts';

interface Props {
  gender: Gender;
  onBack: () => void;
  /** Called after a successful restore so the app reloads the new profile. */
  onRestored: () => void;
}

/**
 * Minimal parent surface for Phase 7: back up her progress, restore it, and
 * see whether this device is storing it durably. The full dashboard (activity,
 * accuracy trends, reading minutes) is Phase 9 — this exists now because a
 * trip abroad shouldn't be the thing that loses a year of stars.
 */
export function ParentPanel({ gender, onBack, onRestored }: Props) {
  // Re-reads on voiceschanged, so this reflects the tablet's real state rather
  // than whatever was true at first paint.
  const ttsReady  = useTtsSupported();
  const voiceName = ttsReady ? hebrewVoiceName() : null;
  const voices    = voiceCount();
  const g = { gender };
  const [storage, setStorage] = useState<StorageState>('unsupported');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { storageState().then(setStorage); }, []);

  function onExport() {
    try {
      const name = downloadBackup();
      setMsg({ kind: 'ok', text: t('parent.backup_done', { ...g, file: name }) });
    } catch {
      setMsg({ kind: 'err', text: t('parent.backup_failed', g) });
    }
  }

  async function onImportFile(file: File) {
    const text = await file.text();
    const res = restoreBackup(text);
    if (!res.ok) {
      setMsg({ kind: 'err', text: t('parent.restore_failed', g) });
      return;
    }
    setMsg({ kind: 'ok', text: t('parent.restore_done', { ...g, count: res.keys ?? 0 }) });
    setTimeout(onRestored, 900);
  }

  const storageLabel =
    storage === 'persisted'     ? t('parent.storage_persisted', g)
    : storage === 'not-persisted' ? t('parent.storage_not_persisted', g)
    :                               t('parent.storage_unknown', g);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 fade-in" dir="rtl">
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">{t('parent.title', g)}</h1>
        <button onClick={onBack} className="text-2xl text-gray-400">←</button>
      </div>

      {/* Where her progress lives right now */}
      <div className="bg-white card-shadow rounded-4xl p-5 w-full max-w-md mb-4">
        <div className="font-bold text-brand-navy mb-2">{t('parent.storage_title', g)}</div>
        <div className="text-sm text-brand-navy leading-relaxed mb-1">
          {storage === 'persisted' ? '🔒 ' : '⚠️ '}{storageLabel}
        </div>
        <div className="text-sm text-gray-500 leading-relaxed">
          {isStandalone() ? t('parent.installed_yes', g) : t('parent.installed_no', g)}
        </div>
      </div>

      {/* Diagnostics — version + read-aloud. Both were previously invisible:
          you could not tell whether her tablet had the latest build, and a
          missing read-aloud button looked identical whether TTS was broken,
          still loading, or simply lacking a Hebrew voice. */}
      <div className="bg-white card-shadow rounded-4xl p-5 w-full max-w-md mb-4">
        <div className="font-bold text-brand-navy mb-2">{t('parent.diag_title', g)}</div>
        <div className="text-sm text-gray-500 mb-1">
          {t('parent.diag_version', { ...g, id: __BUILD_ID__ })}
        </div>
        <div className="text-sm text-brand-navy leading-relaxed">
          {voiceName
            ? `🔊 ${t('parent.diag_tts_ok', { ...g, voice: voiceName })}`
            : voices === 0
              ? `⏳ ${t('parent.diag_tts_loading', g)}`
              : `🔇 ${t('parent.diag_tts_none', g)}`}
        </div>
        {!voiceName && voices > 0 && (
          <div className="text-xs text-gray-500 leading-relaxed mt-2">
            {t('parent.diag_tts_fix', g)}
          </div>
        )}
      </div>

      {/* Backup / restore */}
      <div className="bg-white card-shadow rounded-4xl p-5 w-full max-w-md">
        <div className="font-bold text-brand-navy mb-1">{t('parent.backup_title', g)}</div>
        <div className="text-sm text-gray-500 leading-relaxed mb-4">{t('parent.backup_why', g)}</div>

        <div className="flex flex-col gap-3">
          <BigButton onClick={onExport} color="#7DD3B0" className="w-full">
            {t('parent.backup_cta', g)}
          </BigButton>

          <button
            onClick={() => fileRef.current?.click()}
            className="btn-shadow bg-white border-2 border-gray-200 rounded-3xl px-6 py-3
              text-lg font-bold text-brand-navy hover:scale-[1.01] transition-all"
          >
            {t('parent.restore_cta', g)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {msg && (
          <div
            className="mt-4 rounded-2xl p-3 text-sm text-center reveal-in"
            style={msg.kind === 'ok'
              ? { background: '#DCFCE7', color: '#166534' }
              : { background: '#FEE2E2', color: '#9B1C1C' }}
          >
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
