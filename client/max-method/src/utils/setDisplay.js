/**
 * Display helpers for collapsing and rendering completed sets.
 *
 * **Local utility, not mirrored.** Unlike `epley`, `classification`, and
 * `exerciseNameNormalize` (which are twinned with `Backend_structure/src/utils/*`
 * — see `docs/decisions.md#mirrored-utils`), this file is purely client-side
 * presentation logic with no backend counterpart. Behavior is still frozen
 * for the duration of the refactor (D-classification per the Batch 3 plan);
 * changes go through deliberate decision the same as any other util.
 *
 * Used by workout-summary surfaces (e.g. set-list rendering in `day.jsx`
 * and `logger.jsx`) to turn a flat array of completed sets into a
 * grouped, human-readable summary like "3x8 @ 150 lbs".
 */

/**
 * Collapse a flat array of completed sets into groups of identical
 * (reps, weight) entries.
 *
 * Two sets are considered "identical" when they hash to the same
 * `` `${reps}|${weight}` `` key. Template-literal interpolation means
 * that, for example, `{ reps: 5, weight: 100 }` and
 * `{ reps: 5, weight: '100' }` collide and collapse together — the
 * first occurrence's reps/weight values win and stay in the output;
 * subsequent same-key entries only bump `count`. Grouping is
 * order-insensitive in the input; output order preserves first
 * occurrence (not most recent, not most frequent).
 *
 * Bodyweight sets (`weight === 0`) group like any other weight.
 *
 * @param {Array<{reps: number|string, weight: number|string}>} setDetails
 *   Sets to group. Each entry is accessed via `s.reps` / `s.weight` —
 *   null/undefined entries in the array will throw (not handled here;
 *   callers are expected to filter beforehand if needed).
 *
 * @returns {Array<{count: number, reps: number|string, weight: number|string}>}
 *   One entry per unique (reps, weight) pair, with `count` equal to
 *   the number of occurrences. `reps` and `weight` are echoed verbatim
 *   from the first occurrence — no Number-coercion.
 *
 * @example
 * collapseSetDetails([
 *   { reps: 5, weight: 100 },
 *   { reps: 8, weight: 150 },
 *   { reps: 5, weight: 100 },
 * ])
 * // [
 * //   { count: 2, reps: 5, weight: 100 },
 * //   { count: 1, reps: 8, weight: 150 },
 * // ]
 */
export function collapseSetDetails(setDetails) {
  const order = [];
  const map = new Map();
  for (const s of setDetails) {
    const key = `${s.reps}|${s.weight}`;
    if (!map.has(key)) {
      map.set(key, { count: 0, reps: s.reps, weight: s.weight });
      order.push(key);
    }
    map.get(key).count += 1;
  }
  return order.map(k => map.get(k));
}

/**
 * Render a single grouped set as a display line.
 *
 * Format is `` `${count}x${reps} @ ${load}` `` where `load` is either
 * the literal string `"BW"` (for bodyweight sets) or
 * `` `${weight.toLocaleString()} lbs` ``. The bodyweight branch is
 * gated on **strict equality with the number `0`** — string `"0"`
 * falls through to the lbs branch (where `String.prototype.toLocaleString`
 * returns the string unchanged: `"1x5 @ 0 lbs"`).
 *
 * `count === 1` is rendered verbatim as `"1x8 @ 150 lbs"`, not collapsed
 * to `"8 @ 150 lbs"`. This preserves visual rhythm in mixed-set
 * displays where some groups have count > 1 and some don't.
 *
 * `weight.toLocaleString()` with no argument uses the runtime's default
 * locale for thousands separators (e.g. `1500` → `"1,500"` in en-US).
 *
 * @param {{count: number, reps: number|string, weight: number|string}} group
 *   A grouped set, typically produced by {@link collapseSetDetails}.
 *
 * @returns {string} The formatted display line.
 *
 * @example
 * formatSetLine({ count: 3, reps: 8, weight: 150 })  // "3x8 @ 150 lbs"
 * formatSetLine({ count: 3, reps: 10, weight: 0 })   // "3x10 @ BW"
 * formatSetLine({ count: 1, reps: 8, weight: 150 })  // "1x8 @ 150 lbs"
 * formatSetLine({ count: 1, reps: 1, weight: 1500 }) // "1x1 @ 1,500 lbs" (en-US locale)
 */
export function formatSetLine({ count, reps, weight }) {
  const load = weight === 0 ? 'BW' : `${weight.toLocaleString()} lbs`;
  return `${count}x${reps} @ ${load}`;
}
