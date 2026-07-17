/**
 * Dev-only switches. DEV_FAST shrinks the read-time floors and the stepwise
 * reveal so automated/browser testing doesn't wait out real reading time.
 *
 * Guarded by import.meta.env.DEV — production builds compile this to `false`
 * and the ?devfast=1 query param does nothing for Mia.
 */
export const DEV_FAST: boolean =
  import.meta.env.DEV &&
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('devfast');

export const DEV_FAST_FLOOR_MS   = 400;
export const DEV_FAST_REVEAL_MS  = 300;
