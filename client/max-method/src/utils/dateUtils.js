/**
 * Date-handling utilities for the client.
 *
 * **Local utility, not mirrored.** No backend twin (see
 * `docs/decisions.md#mirrored-utils` for the three utils that ARE mirrored —
 * epley, classification, exerciseNameNormalize). The functions here are
 * client-side calendar-display concerns.
 *
 * Currently a single helper, lifted verbatim from inline duplicates at
 * `hooks/useWorkoutStats.js:61` and `pages/history.jsx:29` per the
 * "extract on third consumer" convention's relaxed two-site form
 * (the captured comment in `useWorkoutStats.js:59-60` explicitly
 * anticipated this dedup). The original call sites still inline their
 * own copies in Batch 3 — call-site migration happens in Batch 4.
 */

/**
 * Format a Date as a local-calendar-day key string `YYYY-M-D`.
 *
 * **Local-time semantics.** Uses `Date.prototype.getFullYear`,
 * `getMonth`, and `getDate` — **not** the UTC equivalents. This is
 * load-bearing for downstream callers:
 *   - `hooks/useWorkoutStats.js` uses dateKey to dedupe sessions per
 *     calendar day inside a Sunday-start week-boundary check; users
 *     in non-UTC timezones logging a workout around midnight need
 *     "today" to mean their local today, not UTC today.
 *   - `pages/history.jsx` uses dateKey to bucket sessions onto the
 *     calendar grid (`sessionMap` keying); the grid cells are local
 *     dates, so the keys must be local too.
 *
 * A future "tidy" to `toISOString().slice(0, 10)` (UTC-based) would
 * silently break both of those for any user not on UTC. Test suite
 * pins this — see `dateUtils.test.js` and the TZ override in
 * `vitest.config.js`.
 *
 * **No zero-padding.** Single-digit months and days emit single
 * digits (Jan 5 → `"2026-1-5"`, not `"2026-01-05"`). This is
 * deliberately distinct from `history.jsx`'s sibling `isoDate`
 * function, which DOES zero-pad for `<time dateTime>` attributes.
 * Same family, different purpose: `dateKey` is an equality key for
 * local-day deduplication; `isoDate` is a wire-format string for
 * machine-readable HTML. If you need ISO formatting, use `isoDate`;
 * don't change `dateKey`'s output shape.
 *
 * @param {Date} d  A Date instance. Must respond to `getFullYear`,
 *   `getMonth`, and `getDate` — no defensive handling for null/
 *   undefined/non-Date input (matches the inline originals; callers
 *   are expected to ensure they have a Date).
 *
 * @returns {string} `` `${year}-${month}-${day}` `` where month is
 *   1-indexed (the `getMonth() + 1` offset) and neither component
 *   is zero-padded.
 *
 * @example
 * dateKey(new Date(2026, 0, 5))                  // "2026-1-5"
 * dateKey(new Date(2026, 9, 15))                 // "2026-10-15"
 * dateKey(new Date(2026, 11, 31))                // "2026-12-31"
 * // In TZ=America/Denver (MST, UTC-7):
 * dateKey(new Date(Date.UTC(2026, 0, 5, 5, 0, 0))) // "2026-1-4" (Jan 4 22:00 local)
 */
export function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
