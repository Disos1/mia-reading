/**
 * TTS wrapper — browser-native Web Speech API (spec Part 7: TTS yes, STT no).
 *
 * Free, zero infra. iOS/macOS ship the Hebrew "Carmit" voice which handles
 * pointed text reasonably. Upgrade path (Google Cloud TTS + Storage caching)
 * stays in V2 unless device testing with Mia fails.
 *
 * Callers must treat TTS as optional: `ttsSupported()` gates every UI surface,
 * so a device with no Hebrew voice simply never shows the button.
 *
 * ANDROID: unlike iOS (which ships Carmit), Chrome on Android reports NO voices
 * on the first getVoices() call and fills the list asynchronously, and it has a
 * Hebrew voice only if the Google TTS Hebrew pack is installed. Reading support
 * once during render therefore answered "no" on a device that could speak fine
 * a moment later, and nothing re-rendered afterwards — so the read-aloud button
 * stayed hidden forever. Support is a SUBSCRIPTION now, not a one-shot read.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickHebrewVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  if (typeof speechSynthesis === 'undefined') { cachedVoice = null; return null; }
  const voices = speechSynthesis.getVoices();
  cachedVoice =
    voices.find(v => v.lang === 'he-IL') ??
    voices.find(v => v.lang.startsWith('he')) ??
    null;
  return cachedVoice;
}

const listeners = new Set<() => void>();

// Voice lists load asynchronously in some browsers — refresh the cache AND tell
// anyone who already asked, so a late-arriving Hebrew voice reveals the button.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = undefined;
    for (const fn of listeners) fn();
  });
}

/** Subscribe to voice-availability changes. Returns an unsubscribe function. */
export function subscribeVoices(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Name of the Hebrew voice in use, for the parent diagnostics panel. */
export function hebrewVoiceName(): string | null {
  return pickHebrewVoice()?.name ?? null;
}

/** How many voices the device exposes at all — distinguishes "TTS engine has
 *  not loaded yet" from "TTS works but has no Hebrew". */
export function voiceCount(): number {
  return typeof speechSynthesis === 'undefined' ? 0 : speechSynthesis.getVoices().length;
}

/** True when the browser can speak Hebrew. */
export function ttsSupported(): boolean {
  return typeof speechSynthesis !== 'undefined' && pickHebrewVoice() !== null;
}

/** Speak Hebrew text (cancels anything already playing). Slightly slowed for
 *  an 8-year-old listener. No-op when unsupported. */
export function speak(text: string): void {
  if (typeof speechSynthesis === 'undefined') return;
  const voice = pickHebrewVoice();
  if (!voice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

/** Stop any current speech (call on item advance / unmount). */
export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
