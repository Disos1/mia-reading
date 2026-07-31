/**
 * Keeping Mia's progress alive on her own device.
 *
 * The threat is specific and already cost us once in the math app: Safari
 * evicts script-writable storage (localStorage included) after roughly seven
 * days without a visit. A holiday abroad — exactly when she can't load the
 * site — is long enough to wipe every star and the whole mastery history.
 *
 * Two defences, in order of strength:
 *   1. Add to Home Screen. An installed iOS web app is exempt from the 7-day
 *      rule. This is the real fix, which is why the hint exists in the UI.
 *   2. navigator.storage.persist(). Where supported it asks the browser to
 *      mark the origin as persistent. Chrome grants it on engagement; Safari's
 *      support is partial. Free to ask, so we ask.
 *
 * Neither replaces a backup — see lib/backup.ts.
 */

/** Is the app running as an installed/standalone app rather than a browser tab? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS uses a non-standard navigator flag; everyone else has the media query.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/** iOS Safari specifically — the only browser where Add to Home Screen must be
 *  done by hand (no install prompt is available to us). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

export type StorageState = 'persisted' | 'not-persisted' | 'unsupported';

/** Ask the browser to keep this origin's storage. Safe to call on every load. */
export async function requestPersistentStorage(): Promise<StorageState> {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    if (await navigator.storage.persisted?.()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

/** Current state without requesting anything (for the parent panel). */
export async function storageState(): Promise<StorageState> {
  try {
    if (!navigator.storage?.persisted) return 'unsupported';
    return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}
