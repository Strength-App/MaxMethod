import { useMemo } from 'react';

/**
 * Derive the four headline workout-history stats from a sessions array.
 *
 * Pure with respect to `sessions` — no fetching, no API knowledge. Callers
 * fetch their own sessions and pass them in. This keeps it trivial to feed
 * synthetic / pending sessions (e.g. a just-finished workout that hasn't
 * been persisted yet) into the math without coupling the hook to any flow.
 *
 * Each session is expected to carry:
 *   - date          : Date normalized to local midnight (caller's job)
 *   - programTitle  : string | null   (quick sessions return null from the
 *                                      all-history endpoint; synthetic
 *                                      pending sessions may pass undefined)
 *   - weekNumber    : number | null   (same — null from the API, undefined
 *                                      acceptable for synthetic sessions)
 *
 * Conventions:
 *   - Week boundary is Sunday-start (matches the history-page calendar grid).
 *   - daysThisWeek dedupes by calendar day via dateKey() — a user logging two
 *     workouts on the same day still counts as one day toward the 7.
 *   - weeksLogged buckets by `${programTitle ?? 'default'}-${weekNumber}`,
 *     so all program-less quick sessions collapse into one bucket
 *     (`default-null` from the API, `default-undefined` from a synthetic
 *     pending session — both bucket cleanly as a single key per render).
 *     This matches the existing history-page behavior; not changed here.
 *
 * Usage:
 *   const { totalSessions, weeksLogged, thisMonth, daysThisWeek } =
 *     useWorkoutStats(sessions);
 */
export function useWorkoutStats(sessions) {
  return useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 0 = Sunday → no shift

    const weekKeySet = new Set();
    const dayKeySet = new Set();
    let thisMonth = 0;

    sessions.forEach(s => {
      weekKeySet.add(`${s.programTitle ?? 'default'}-${s.weekNumber}`);
      if (s.date >= monthStart) thisMonth += 1;
      if (s.date >= weekStart) dayKeySet.add(dateKey(s.date));
    });

    return {
      totalSessions: sessions.length,
      weeksLogged: weekKeySet.size,
      thisMonth,
      daysThisWeek: dayKeySet.size,
    };
  }, [sessions]);
}

// Local copy — history.jsx has its own for the calendar grid / sessionMap.
// Deferred dedup of the primitive is tracked in the change summary.
function dateKey(d) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
