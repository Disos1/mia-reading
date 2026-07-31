import { useEffect, useState } from 'react';
import { t } from '../../i18n/t';
import type { Gender } from '../../types';
import { isIOS, isStandalone } from '../../lib/storageDurability';
import { LS_PREFIX } from '../../lib/supabase';

const DISMISS_KEY = `${LS_PREFIX}a2hs_dismissed`;

interface Props { gender: Gender }

/**
 * Nudges installing to the Home Screen on iOS.
 *
 * Not a growth prompt — a data-safety one. Safari drops script-writable
 * storage after ~7 idle days, and an installed web app is exempt, so this
 * banner is what stands between a two-week holiday and a wiped star history.
 * iOS gives us no install API, so the steps have to be spelled out.
 *
 * Shown only on iOS, only in a browser tab, and only until dismissed.
 */
export function AddToHomeHint({ gender }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone()) return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch { /* ignore */ }
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <div className="w-full max-w-md mx-auto mb-4 bg-brand-sky/15 border-2 border-brand-sky
      rounded-3xl p-4 text-center reveal-in" dir="rtl">
      <div className="font-bold text-brand-navy mb-1">📲 {t('a2hs.title', { gender })}</div>
      <div className="text-sm text-brand-navy leading-relaxed mb-3">
        {t('a2hs.body', { gender })}
      </div>
      <button onClick={dismiss} className="text-sm text-gray-500 underline">
        {t('a2hs.dismiss', { gender })}
      </button>
    </div>
  );
}
