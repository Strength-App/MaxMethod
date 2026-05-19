// Characterization tests for src/hooks/useWorkoutStats.js.
//
// Pure derivation from a sessions array — no fetching, no context. The hook
// only uses React's useMemo to memoize the result against the sessions
// reference, so renderHook is the natural test fixture (no provider tree
// needed). File extension is .test.js because no JSX is rendered, per
// docs/decisions.md#test-file-extension-convention.
//
// Date determinism: vi.setSystemTime pins `new Date()` to Wed Mar 18 2026
// in local time (America/Denver per vitest.config.js#env.TZ). The hook
// derives `today`, `monthStart`, and `weekStart` from `new Date()` and
// Date's local-time methods (setHours, getDay, etc.), so the pin is what
// makes the week/month boundaries reproducible.
//
// March 18 2026 chosen because:
//   - It's a Wednesday — exercises the typical "today is mid-week" case.
//   - It's after the 2026 DST transition (Mar 8), so the offset is stable
//     MDT (UTC-6) throughout the test boundaries we care about.
//   - The week's Sunday (Mar 15) is also post-DST, so weekStart falls on
//     a normal day with no DST-edge ambiguity.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkoutStats } from './useWorkoutStats.js';

// Helpers -------------------------------------------------------------------

const TEST_TODAY = new Date(2026, 2, 18); // Wed Mar 18 2026 00:00 MDT

// Construct a session matching the hook's expected input shape.
//   - date: local-midnight Date (caller's responsibility per JSDoc)
//   - programTitle / weekNumber: per-session bucket key components
function makeSession(year, month0Indexed, dayOfMonth, opts = {}) {
  const d = new Date(year, month0Indexed, dayOfMonth);
  d.setHours(0, 0, 0, 0);
  return {
    date: d,
    programTitle: 'programTitle' in opts ? opts.programTitle : null,
    weekNumber: 'weekNumber' in opts ? opts.weekNumber : null,
  };
}

function runStats(sessions) {
  const { result } = renderHook(() => useWorkoutStats(sessions));
  return result.current;
}

// Tests ---------------------------------------------------------------------

describe('useWorkoutStats', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(TEST_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('empty input', () => {
    it('returns zeros for all four fields', () => {
      expect(runStats([])).toEqual({
        totalSessions: 0,
        weeksLogged: 0,
        thisMonth: 0,
        daysThisWeek: 0,
      });
    });
  });

  describe('totalSessions', () => {
    it('counts every session in the array regardless of date', () => {
      const sessions = [
        makeSession(2020, 0, 1),  // years ago
        makeSession(2026, 1, 15), // last month (Feb 15)
        makeSession(2026, 2, 18), // today
      ];
      expect(runStats(sessions).totalSessions).toBe(3);
    });
  });

  describe('thisMonth', () => {
    it('counts sessions on or after the 1st of the current month', () => {
      const sessions = [
        makeSession(2026, 2, 1),  // Mar 1 (monthStart)
        makeSession(2026, 2, 10),
        makeSession(2026, 2, 18), // today
      ];
      expect(runStats(sessions).thisMonth).toBe(3);
    });

    it('treats the month start as inclusive (>=)', () => {
      const sessions = [makeSession(2026, 2, 1)]; // exactly monthStart
      expect(runStats(sessions).thisMonth).toBe(1);
    });

    it('excludes sessions from prior months', () => {
      const sessions = [
        makeSession(2026, 1, 28), // Feb 28 — last day of last month
        makeSession(2026, 0, 31), // Jan 31 — earlier
      ];
      expect(runStats(sessions).thisMonth).toBe(0);
    });
  });

  describe('daysThisWeek', () => {
    it('counts sessions on or after the previous Sunday (Sunday-start week)', () => {
      // Today is Wed Mar 18; weekStart is Sun Mar 15.
      const sessions = [
        makeSession(2026, 2, 15), // Sun (weekStart)
        makeSession(2026, 2, 16), // Mon
        makeSession(2026, 2, 18), // today (Wed)
      ];
      expect(runStats(sessions).daysThisWeek).toBe(3);
    });

    it('dedupes multiple sessions on the same calendar day via dateKey', () => {
      const sessions = [
        makeSession(2026, 2, 18),
        makeSession(2026, 2, 18),
        makeSession(2026, 2, 18),
      ];
      expect(runStats(sessions).daysThisWeek).toBe(1);
    });

    it('excludes sessions from before this week (Saturday or earlier)', () => {
      const sessions = [
        makeSession(2026, 2, 14), // Sat Mar 14 — one day before weekStart
        makeSession(2026, 2, 8),  // Sun Mar 8 — last week's Sunday
      ];
      expect(runStats(sessions).daysThisWeek).toBe(0);
    });

    it('counts sessions on weekStart itself (inclusive boundary)', () => {
      const sessions = [makeSession(2026, 2, 15)]; // exactly weekStart (Sun)
      expect(runStats(sessions).daysThisWeek).toBe(1);
    });

    it('when today is Sunday, weekStart equals today (no shift back)', () => {
      vi.setSystemTime(new Date(2026, 2, 15)); // Sun Mar 15 — override
      const sessions = [
        makeSession(2026, 2, 14), // Sat — before weekStart=today
        makeSession(2026, 2, 15), // Sun — equals weekStart=today
      ];
      expect(runStats(sessions).daysThisWeek).toBe(1);
    });
  });

  describe('weeksLogged', () => {
    it('counts unique programTitle-weekNumber combinations', () => {
      const sessions = [
        makeSession(2020, 0, 1, { programTitle: 'A', weekNumber: 1 }),
        makeSession(2020, 0, 8, { programTitle: 'A', weekNumber: 2 }),
        makeSession(2020, 0, 15, { programTitle: 'B', weekNumber: 1 }),
      ];
      expect(runStats(sessions).weeksLogged).toBe(3);
    });

    it('collapses repeats of the same combo into a single bucket', () => {
      const sessions = [
        makeSession(2020, 0, 1, { programTitle: 'A', weekNumber: 1 }),
        makeSession(2020, 0, 2, { programTitle: 'A', weekNumber: 1 }),
        makeSession(2020, 0, 3, { programTitle: 'A', weekNumber: 1 }),
      ];
      expect(runStats(sessions).weeksLogged).toBe(1);
    });

    it('buckets programTitle=null and programTitle=undefined together via ??', () => {
      // The hook uses `s.programTitle ?? 'default'`, and nullish coalescing
      // treats null and undefined identically — both collapse to 'default'.
      // So a mixed-source render (null from API + undefined from synthetic)
      // unifies on the programTitle component of the key.
      const sessions = [
        makeSession(2020, 0, 1, { programTitle: null, weekNumber: 1 }),
        makeSession(2020, 0, 2, { programTitle: undefined, weekNumber: 1 }),
      ];
      expect(runStats(sessions).weeksLogged).toBe(1);
    });

    it('treats weekNumber=null and weekNumber=undefined as DISTINCT buckets', () => {
      // Asymmetry acknowledged in the source JSDoc: the hook does NOT use
      // nullish coalescing on weekNumber. The template literal
      // `${s.weekNumber}` stringifies null as "null" and undefined as
      // "undefined", producing distinct keys ("default-null" vs
      // "default-undefined"). Each value buckets cleanly when alone in a
      // render; mixed renders separate. Pins current behavior; the JSDoc
      // calls this out explicitly so it's intentional, not a bug.
      const sessions = [
        makeSession(2020, 0, 1, { programTitle: 'A', weekNumber: null }),
        makeSession(2020, 0, 2, { programTitle: 'A', weekNumber: undefined }),
      ];
      expect(runStats(sessions).weeksLogged).toBe(2);
    });

    it('counts independently of in-week-or-not — every session contributes', () => {
      // weeksLogged counts across the FULL sessions array, not just this week.
      // Pinned so a future "rebrand weeksLogged as a recent-window metric"
      // refactor would have to surface this assumption explicitly.
      const sessions = [
        makeSession(2020, 0, 1, { programTitle: 'A', weekNumber: 1 }),
        makeSession(2026, 2, 18, { programTitle: 'B', weekNumber: 1 }), // today
      ];
      expect(runStats(sessions).weeksLogged).toBe(2);
    });
  });
});
