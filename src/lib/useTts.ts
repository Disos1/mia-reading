import { useEffect, useState } from 'react';
import { subscribeVoices, ttsSupported } from './tts';

/**
 * Reactive `ttsSupported()`.
 *
 * Android fills its voice list after first paint, so a plain call during render
 * answers "no" and never gets corrected. This re-renders when the voice list
 * arrives, which is the difference between the read-aloud button appearing on
 * her tablet and never appearing at all.
 */
export function useTtsSupported(): boolean {
  const [supported, setSupported] = useState(ttsSupported);
  useEffect(() => {
    setSupported(ttsSupported());          // voices may have landed pre-mount
    return subscribeVoices(() => setSupported(ttsSupported()));
  }, []);
  return supported;
}
