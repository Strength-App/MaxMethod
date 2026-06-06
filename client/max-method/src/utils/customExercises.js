/**
 * Custom-exercise persistence helpers.
 *
 * **I/O-touching utility.** Per `docs/decisions.md#utils-purity`, `utils/`
 * may hold side-effectful helpers; this is the first one. Specifically:
 *   - `getCustomExerciseNames` reads `window.localStorage`.
 *   - `addToCustomExercises` writes `window.localStorage` AND fires a
 *     best-effort `fetch` POST (rejection swallowed).
 *
 * Lifted verbatim from three byte-identical inline copies discovered in
 * Phase B of Batch 3 (`pages/customDay.jsx`, `pages/history.jsx`,
 * `pages/logger.jsx`). The original sites still inline their copies;
 * Batch 4+ migrates them to consume this module.
 *
 * **Completed in Batch 12.** The Batch 3 plan also named `getAllExerciseNames`
 * and `isValidExercise`, deferred because both depend on the catalog name list
 * (`ALL_EXERCISE_NAMES`) that then lived in `pages/exerciseLibrary.jsx` —
 * importing it from `utils/` would have been an upside-down `utils/ → pages/`
 * dependency. Batch 12 relocated the catalog into `config/exercises.js`, so the
 * two helpers now compose cleanly and are added below. customDay and logger
 * still carry byte-identical inline copies; their own batches migrate them onto
 * these. See `docs/follow-ups.md#customExercises-batch-12-completion`.
 */

import { API_URL } from '../config/api.js';
import { ALL_EXERCISE_NAMES } from '../config/exercises.js';

/**
 * Read the user's custom-exercise name list from localStorage.
 *
 * @returns {string[]} The stored array, or `[]` when the key is absent
 *   or the stored value isn't valid JSON. The try/catch swallow is
 *   deliberate — a corrupted localStorage entry (partial write, cross-
 *   tab race, hand-edited storage) returns the empty list rather than
 *   crashing every consumer of this helper.
 *
 * @example
 * // localStorage has customExercises: '["Pendlay Row","Zercher Squat"]'
 * getCustomExerciseNames()  // ['Pendlay Row', 'Zercher Squat']
 *
 * // localStorage has no customExercises key
 * getCustomExerciseNames()  // []
 *
 * // localStorage.customExercises is corrupt JSON like '{not json'
 * getCustomExerciseNames()  // []  (caught, defensive fallback)
 */
export const getCustomExerciseNames = () => {
  try { return JSON.parse(localStorage.getItem('customExercises') || '[]'); }
  catch { return []; }
};

/**
 * Add a name to the user's custom-exercise list.
 *
 * **Side effects.**
 *   1. Reads `localStorage.customExercises` via {@link getCustomExerciseNames}.
 *   2. Reads `localStorage.userId` (direct read — see CLAUDE.md's
 *      "Surprising things" entry on why module-level helpers don't go
 *      through `useUser()`).
 *   3. Writes `localStorage.customExercises` with the appended name
 *      (skipped on idempotent no-op).
 *   4. Fires a best-effort `fetch` POST to
 *      `${API_URL}/api/users/${userId}/custom-exercises` (only when
 *      `userId` is present). Rejection is swallowed via `.catch(() => {})`
 *      — localStorage is source-of-truth for the current device's UX;
 *      backend sync is best-effort cross-device.
 *
 * **Idempotency.** Case-insensitive name match against the existing
 * list. If the name is already present (under any casing), the
 * function returns immediately — neither localStorage nor fetch is
 * touched. The stored value's original casing is preserved.
 *
 * @param {string} name  The exercise name to add. Passed through
 *   unchanged (no trim, no normalization, no validation); callers are
 *   expected to have already cleaned the input.
 *
 * @returns {void}
 *
 * @example
 * // localStorage.customExercises = '["Pendlay Row"]', no userId
 * addToCustomExercises('Zercher Squat');
 * // → localStorage.customExercises = '["Pendlay Row","Zercher Squat"]'
 * // → no fetch (no userId)
 *
 * // localStorage.customExercises = '["Pendlay Row"]', userId = 'u42'
 * addToCustomExercises('pendlay row');
 * // → no-op (case-insensitive match); localStorage unchanged, no fetch
 */
export const addToCustomExercises = (name) => {
  const existing = getCustomExerciseNames();
  if (existing.some(n => n.toLowerCase() === name.toLowerCase())) return;
  localStorage.setItem('customExercises', JSON.stringify([...existing, name]));
  const userId = localStorage.getItem('userId');
  if (userId) {
    fetch(`${API_URL}/api/users/${userId}/custom-exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }
};

/**
 * The full set of exercise names the user can pick from: every name in the
 * built-in catalog plus every name the user has added to their custom list.
 *
 * Recomputed on each call so a custom exercise added during the session is
 * immediately pickable (the catalog half is a stable module-load constant; the
 * custom half is read fresh from localStorage each time).
 *
 * @returns {string[]} Catalog names first, then the user's custom names. Not
 *   de-duplicated against each other — a custom name that happens to match a
 *   catalog name appears in both halves (matches the pre-existing inline
 *   behavior this helper consolidates).
 *
 * @example
 * // localStorage.customExercises = '["Sled Push"]'
 * getAllExerciseNames()  // ['Bench Press', ..., 'Ski Erg', 'Sled Push']
 */
export const getAllExerciseNames = () => [...ALL_EXERCISE_NAMES, ...getCustomExerciseNames()];

/**
 * Whether a typed name is a recognized exercise — i.e. it matches a catalog or
 * custom name, case-insensitively. Used to flag free-typed entries that won't
 * resolve to a known movement.
 *
 * @param {string} name  The name to check. Compared case-insensitively; no
 *   trimming (callers clean their own input).
 *
 * @returns {boolean} True if some known exercise name matches (ignoring case).
 *
 * @example
 * isValidExercise('bench press')  // true  (matches 'Bench Press')
 * isValidExercise('Made Up Lift') // false (unless in the custom list)
 */
export const isValidExercise = (name) =>
  getAllExerciseNames().some(n => n.toLowerCase() === name.toLowerCase());
