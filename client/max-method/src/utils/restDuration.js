/**
 * How long the rest timer should run between sets, based on which exercise the
 * user just finished.
 *
 * The app gives the big compound lifts — bench press, squat, deadlift — a
 * longer rest (two minutes) because they are the most taxing and need more
 * recovery before the next heavy set. Everything else gets a shorter rest
 * (a minute and a half).
 *
 * This used to live as a byte-identical copy inside both the program-workout
 * screen (`pages/day.jsx`) and the quick-log screen (`pages/logger.jsx`).
 * It is shared here so the rest-duration policy has a single home: change the
 * tiers once and both screens follow.
 */

// The three "big lifts" that earn the longer rest. Kept private to this module
// on purpose: it is the rest-duration flavor of the big-three list, matched by
// loose substring (so "Barbell Bench Press" still counts). Other places in the
// app that care about the big three — e.g. personal-record detection — have
// their own, stricter notion of what counts, so they deliberately do NOT share
// this list.
const BIG_THREE = ['bench', 'squat', 'deadlift'];

/**
 * Pick the rest-timer length (in seconds) for the exercise just performed.
 *
 * @param {string} name - The exercise's name (e.g. "Barbell Bench Press").
 *   A missing or empty name is treated as "not a big lift". Matching is
 *   case-insensitive and by substring, so any name containing "bench",
 *   "squat", or "deadlift" counts as a big lift.
 * @returns {number} 120 (two minutes) for a big-three lift, otherwise 90
 *   (a minute and a half).
 *
 * @example
 * getRestSeconds('Barbell Bench Press') // 120
 * getRestSeconds('Lateral Raise')       // 90
 * getRestSeconds('')                    // 90
 */
export function getRestSeconds(name) {
  const lower = (name || '').toLowerCase();
  return BIG_THREE.some(n => lower.includes(n)) ? 120 : 90;
}
