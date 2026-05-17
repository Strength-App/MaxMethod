/**
 * Exercise-name canonicalization for the PB write/read path.
 *
 * **Mirror constraint.** The `ALIASES` map and `canonicalExerciseName`
 * signature MUST match `Backend_structure/src/utils/exerciseNameNormalize.js`.
 * Both files back the same write/read canonicalization on opposite
 * sides of the network boundary: drift would mean a "Back Squat"
 * workout's PB write lands on `Squat` (server canonicalizes at write)
 * but reads continue to miss it (client doesn't canonicalize lookups).
 * Adding/removing an alias requires editing BOTH files. This
 * discipline is locked in `docs/decisions.md#mirrored-utils`.
 *
 * `getPersonalBest` below is **client-only** — the server reads from
 * `personal_bests` inside the same file as the normalizer and applies
 * the lookup directly, so no server twin is needed for that helper.
 *
 * **Today's only alias.** `"back squat" → "Squat"`. The lookup is
 * trim+lowercase, but the output is the alias value verbatim
 * (preserves casing). Non-string inputs pass through unchanged
 * (callers may pass null/undefined defensively).
 */

const ALIASES = {
  "back squat": "Squat",
};

/**
 * Canonicalize an exercise name to its PB-storage key.
 *
 * Lookup is trim+lowercase on the input; output is the alias value
 * verbatim. Non-aliased inputs are returned unchanged (including
 * casing and whitespace — only mapped keys are normalized).
 *
 * @param {string|null|undefined|any} name  Typically a string from a
 *   workout slot or user-typed entry. Non-string inputs (null,
 *   undefined, numbers, objects) are returned as-is via early return.
 *
 * @returns {string|any} The canonical PB key when a mapping exists;
 *   otherwise the input unchanged (same reference for non-strings).
 *
 * @example
 * canonicalExerciseName('Back Squat')     // 'Squat'
 * canonicalExerciseName('  BACK SQUAT  ') // 'Squat' (trim + lower)
 * canonicalExerciseName('Squat')          // 'Squat' (already canonical)
 * canonicalExerciseName('Bench Press')    // 'Bench Press' (no alias)
 * canonicalExerciseName(null)             // null (non-string pass-through)
 */
export function canonicalExerciseName(name) {
  if (typeof name !== "string") return name;
  const aliased = ALIASES[name.trim().toLowerCase()];
  return aliased ?? name;
}

/**
 * Read a personal-best value by exercise name, canonicalizing the
 * lookup key first. Centralizes the alias-aware read so adding a
 * future alias benefits every call site automatically.
 *
 * **Fallback semantics use `??`** (nullish coalescing): an explicitly
 * stored `0` is preserved; only `null`/`undefined` triggers the
 * fallback. This matches the convention at each call site
 * (`?? 0` for PR-detection sites, `?? null` for display sites).
 *
 * @param {object|null|undefined} personalBests  PB object keyed by
 *   canonical exercise name (e.g. `{ Squat: 405, 'Bench Press': 245 }`).
 *   Defensive against null/undefined.
 * @param {string|null|undefined|any} exerciseName  The exercise to
 *   look up. Canonicalized via `canonicalExerciseName` before indexing.
 * @param {*} [fallback=0]  Returned when the canonical key is absent
 *   or its stored value is null/undefined. Default `0` matches the
 *   PR-detection call sites.
 *
 * @returns {*} The stored PB value (including `0`) or the fallback.
 *
 * @example
 * const pbs = { Squat: 405, 'Bench Press': 245 };
 * getPersonalBest(pbs, 'Back Squat')          // 405 (alias resolves)
 * getPersonalBest(pbs, 'OHP')                 // 0 (default fallback)
 * getPersonalBest(pbs, 'OHP', null)           // null (explicit fallback)
 * getPersonalBest({ Bench: 0 }, 'Bench', 999) // 0 (stored 0 preserved)
 * getPersonalBest(null, 'Squat')              // 0 (defensive)
 */
export function getPersonalBest(personalBests, exerciseName, fallback = 0) {
  return personalBests?.[canonicalExerciseName(exerciseName)] ?? fallback;
}
