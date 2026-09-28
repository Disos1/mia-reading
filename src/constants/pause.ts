/**
 * Temporary pause switch for the reading app.
 *
 * Set by Dima (Sept 28 2026) so Mia works only in the math app for now.
 *
 * WHY A SHIPPED FLAG RATHER THAN TAKING THE SITE DOWN:
 * the app is an installed PWA with a precaching service worker. Deleting the
 * deployment would NOT stop her — the cached shell keeps launching offline and
 * she would carry on reading while we believed it was off. The only thing that
 * actually reaches her tablet is a new build, which the service worker picks up
 * on the next launch with a network (registerType: 'autoUpdate' + skipWaiting).
 *
 * WHAT IT DOES NOT DO: it never clears, migrates or rewrites storage. Her
 * profile, stars, mastery, scaffold position and attempt ledger all sit exactly
 * where they are. The parent panel stays reachable from the paused screen so a
 * backup can still be exported while the app is off.
 *
 * TO RESUME: set this to false, commit, push. Nothing else to undo.
 */
export const READING_PAUSED = true;

/** Where she should be practising instead while this is paused. */
export const MATH_APP_URL = 'https://disos1.github.io/mia-math/';
