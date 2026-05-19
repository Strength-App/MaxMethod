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
 * **Two-helper subset of the Batch 3 plan's named scope.** The plan
 * additionally named `getAllExerciseNames` and `isValidExercise`, both
 * deferred to Batch 12 — both depend on a module-load constant derived
 * from `ALL_EXERCISES`, currently in `pages/exerciseLibrary.jsx`, and
 * extracting them now would create an upside-down `utils/ → pages/`
 * import. See `docs/follow-ups.md#customExercises-batch-12-completion`.
 */

import { API_URL } from '../config/api.js';

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
