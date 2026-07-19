/**
 * TTS wrapper — browser-native Web Speech API (spec Part 7: TTS yes, STT no).
 *
 * Free, zero infra. iOS/macOS ship the Hebrew "Carmit" voice which handles
 * pointed text reasonably. Upgrade path (Google Cloud TTS + Storage caching)
 * stays in V2 unless device testing with Mia fails.
 *
 * Callers must treat TTS as optional: `ttsSupported()` gates every UI surface,
 * so a device with no Hebrew voice simply never shows the button.
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

// Voice lists load asynchronously in some browsers — refresh the cache.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => { cachedVoice = undefined; };
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
