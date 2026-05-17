/**
 * Pure 1RM estimation utilities (Epley formula).
 *
 * **Mirror constraint.** Twin of `Backend_structure/src/utils/epley.js`.
 * The two files MUST match — they back the same feature on opposite
 * sides of the network boundary (server uses it for the post-log
 * estimate, client uses it for the OneRMCalc tool). Behavior changes
 * here require coordinated backend updates; this discipline is
 * locked in `docs/decisions.md#mirrored-utils`.
 *
 * The Epley formula is `1RM ≈ weight × (1 + reps / 30)`. A true 1-rep
 * set IS the 1RM, so reps===1 is special-cased to return the weight
 * directly instead of letting the formula's 1.033× artifact inflate it.
 * Sets outside the [1, 15] rep range are skipped (see `allowHighReps`).
 */

/**
 * Estimate a one-rep max from a working set via the Epley formula.
 *
 * @param {number|string} weight  Working weight. Coerced via `Number()`;
 *   non-finite or ≤0 values produce `null`.
 * @param {number|string} reps    Reps completed. Coerced via `Number()`;
 *   must be an integer in [1, 15] (or [1, ∞) with `allowHighReps: true`).
 *   Non-integer (including float-strings like `"5.5"`), <1, or — by
 *   default — >15 produces `null`.
 * @param {object} [options]
 * @param {boolean} [options.allowHighReps=false]
 *   Bypass the upper rep cap of 15. The lower-bound and integer checks
 *   still apply. Used by the OneRMCalc tool when the user explicitly
 *   wants extrapolation from high-rep sets.
 *
 * @returns {number|null} The estimated 1RM (or `null` for invalid input).
 *   For `reps === 1`, returns `weight` exactly (no formula).
 *
 * @example
 * estimateOneRepMax(100, 5)   // 116.666... (= 100 × (1 + 5/30))
 * estimateOneRepMax(225, 1)   // 225 (special case — no 1.033× inflation)
 * estimateOneRepMax(100, 16)  // null (default rep cap)
 * estimateOneRepMax(100, 16, { allowHighReps: true })  // 153.333...
 * estimateOneRepMax(0, 5)     // null (weight ≤ 0)
 * estimateOneRepMax(100, 1.5) // null (reps not integer)
 * estimateOneRepMax('100', 5) // 116.666... (Number-coerced)
 */
export function estimateOneRepMax(weight, reps, { allowHighReps = false } = {}) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (!Number.isInteger(r) || r < 1) return null;
  if (!allowHighReps && r > 15) return null;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/**
 * Floor a number to the nearest multiple of 5, rounding toward
 * negative infinity for negatives.
 *
 * Note: unlike `estimateOneRepMax`, this does NOT coerce via `Number()`.
 * It uses `Number.isFinite` directly, which rejects strings — so
 * `floorTo5('100')` returns `null` while `estimateOneRepMax('100', 5)`
 * works. This asymmetry is intentional and pinned by the test suite.
 *
 * @param {number} n  Value to floor. Must be a finite number (no
 *   string coercion).
 *
 * @returns {number|null} The largest multiple of 5 ≤ `n`, or `null`
 *   if `n` is not a finite number.
 *
 * @example
 * floorTo5(117)    // 115
 * floorTo5(116.25) // 115
 * floorTo5(-1)     // -5  (Math.floor(-0.2) = -1, × 5 = -5)
 * floorTo5(NaN)    // null
 * floorTo5('100')  // null  (no string coercion — see note above)
 */
export function floorTo5(n) {
  if (!Number.isFinite(n)) return null;
  return Math.floor(n / 5) * 5;
}

/**
 * Find the set with the highest estimated 1RM in an array of sets.
 *
 * Selects by **e1RM**, not by heaviest weight — a 5×200 set (e1RM ≈233)
 * beats a 1×215 set (e1RM 215). Ties on e1RM are won by the FIRST set
 * (strict `>` comparison, not `≥`).
 *
 * Internally calls {@link estimateOneRepMax} with default options; sets
 * with reps > 15 are silently dropped (no `allowHighReps` pass-through).
 * Sets where `estimateOneRepMax` returns `null` (invalid weight/reps,
 * missing fields, null entries in the array) are skipped, not failed on.
 *
 * @param {Array<{weight: number|string, reps: number|string}> | null | undefined} sets
 *   Array of sets to evaluate. Null/undefined accepted (treated as
 *   empty). Each set is read via optional chaining, so missing fields
 *   or null entries don't throw — they're skipped.
 *
 * @returns {{weight: number, reps: number, e1RM: number} | null}
 *   The winning set with `weight` and `reps` Number-coerced, plus the
 *   computed `e1RM`. `null` if no valid set exists (empty array, all
 *   invalid, null/undefined input).
 *
 * @example
 * topSetEpley([
 *   { weight: 215, reps: 1 },   // e1RM 215
 *   { weight: 200, reps: 5 },   // e1RM 233.33 — wins
 * ])
 * // { weight: 200, reps: 5, e1RM: 233.333... }
 *
 * topSetEpley([])           // null
 * topSetEpley(null)         // null
 * topSetEpley([{ weight: 0, reps: 5 }])  // null (no valid sets)
 */
export function topSetEpley(sets) {
  let best = null;
  for (const set of sets ?? []) {
    const e = estimateOneRepMax(set?.weight, set?.reps);
    if (e == null) continue;
    if (best == null || e > best.e1RM) {
      best = { weight: Number(set.weight), reps: Number(set.reps), e1RM: e };
    }
  }
  return best;
}
