import { useEffect, useState } from 'react';
import { t } from '../../i18n/t';
import type { Gender } from '../../types';
import { isIOS, isStandalone } from '../../lib/storageDurability';
import { LS_PREFIX } from '../../lib/supabase';

const DISMISS_KEY = `${LS_PREFIX}a2hs_dismissed`;

/** The Chrome install event, which TypeScript's DOM lib doesn't declare. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props { gender: Gender }

/**
 * Invites installing the app to the home screen.
 *
 * Not a growth prompt — a durability one. An installed app keeps working with
 * no network and makes the browser treat its storage as worth keeping, so this
 * is what stands between a holiday abroad and a wiped star history.
 *
 * The two platforms need opposite treatments:
 *
 *   • Android/Chrome fires `beforeinstallprompt`, so we can offer a real
 *     one-tap install button. We intercept the event (preventDefault) and fire
 *     it on her tap instead, which is the only way to place it somewhere a
 *     nine-year-old will actually see.
 *   • iOS gives no install API at all, so the share-sheet steps have to be
 *     spelled out in words.
 *
 * Shown only in a browser tab (never inside the installed app) and only until
 * dismissed or installed.
 */
export function AddToHomeHint({ gender }: Props) {
  const [show, setShow] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const g = { gender };

  useEffect(() => {
    if (isStandalone()) return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch { /* ignore */ }

    // Android / desktop Chrome: capture the install opportunity.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();                    // suppress Chrome's own mini-infobar
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => { setShow(false); dismissForever(); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS has no event — show the manual steps instead.
    if (isIOS()) setShow(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismissForever() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  function dismiss() {
    dismissForever();
    setShow(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') dismissForever();
    setInstallEvent(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="w-full max-w-md mx-auto mb-4 bg-brand-sky/15 border-2 border-brand-sky
      rounded-3xl p-4 text-center reveal-in" dir="rtl">
      <div className="font-bold text-brand-navy mb-1">📲 {t('a2hs.title', g)}</div>
      <div className="text-sm text-brand-navy leading-relaxed mb-3">
        {installEvent ? t('a2hs.body_install', g) : t('a2hs.body', g)}
      </div>

      {installEvent ? (
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={install}
            className="btn-shadow bg-brand-teal text-white rounded-2xl px-6 py-2 font-bold
              hover:scale-[1.02] transition-all"
          >
            {t('a2hs.install_cta', g)}
          </button>
          <button onClick={dismiss} className="text-sm text-gray-500 underline">
            {t('a2hs.dismiss', g)}
          </button>
        </div>
      ) : (
        <button onClick={dismiss} className="text-sm text-gray-500 underline">
          {t('a2hs.dismiss', g)}
        </button>
      )}
    </div>
  );
}
