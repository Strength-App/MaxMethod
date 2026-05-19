// Tests for src/utils/dateUtils.js.
//
// New helper (not characterization-of-existing-source — this file
// didn't exist before Batch 3) extracted verbatim from two prior
// inline copies at useWorkoutStats.js:61 and history.jsx:29. Behavior
// is byte-identical to those copies; tests pin the public contract
// the extracted helper is expected to honor.
//
// Time-domain contract pinned here:
//   - Output format is `YYYY-M-D` with NO zero-padding (different
//     from history.jsx's sibling `isoDate` which DOES zero-pad for
//     <time dateTime> attributes).
//   - Uses Date's LOCAL getters (getFullYear/getMonth/getDate), not
//     UTC equivalents. Calendar-day-local semantics are load-bearing
//     for useWorkoutStats's Sunday-start week boundaries and
//     history.jsx's calendar-grid sessionMap.
//
// The local-vs-UTC distinction depends on TZ being set away from UTC
// in the test environment — pinned to 'America/Denver' in
// vitest.config.js. Without that pin, the local-shift tests below
// would silently pass under a UTC-drifted implementation in UTC CI.

import { describe, it, expect } from 'vitest';
import { dateKey } from './dateUtils.js';

describe('dateKey', () => {
  describe('format — local-calendar-day YYYY-M-D, no zero-padding', () => {
    it('single-digit month and single-digit day stay single-digit', () => {
      // new Date(year, monthIndex, day) uses local-time fields, so this
      // is unambiguously local Jan 5 at midnight regardless of TZ.
      const d = new Date(2026, 0, 5);
      expect(dateKey(d)).toBe('2026-1-5');
    });

    it('double-digit month and double-digit day are emitted verbatim', () => {
      const d = new Date(2026, 9, 15);   // Oct 15 local
      expect(dateKey(d)).toBe('2026-10-15');
    });

    it('pins getMonth()+1 offset at the low end — January (monthIndex 0) outputs "1"', () => {
      const d = new Date(2026, 0, 1);
      expect(dateKey(d)).toBe('2026-1-1');
    });

    it('pins getMonth()+1 offset at the high end — December (monthIndex 11) outputs "12"', () => {
      const d = new Date(2026, 11, 31);
      expect(dateKey(d)).toBe('2026-12-31');
    });
  });

  describe('local-time semantics — uses local getters, not UTC', () => {
    // These three tests rely on TZ=America/Denver pinned in
    // vitest.config.js. Without that pin (UTC CI default), every
    // midnight-aligned UTC instant has the same local-day as UTC-day
    // and the tests would NOT distinguish a local→UTC drift.

    it('shifts to the previous local day when UTC instant is in early-UTC-morning (MST winter)', () => {
      // Jan 5 05:00 UTC = Jan 4 22:00 MST (Denver, UTC-7 in winter).
      // Local day: Jan 4 → "2026-1-4".
      // A UTC-drifted implementation would return "2026-1-5" → test fails.
      const d = new Date(Date.UTC(2026, 0, 5, 5, 0, 0));
      expect(dateKey(d)).toBe('2026-1-4');
    });

    it('shifts under MDT (UTC-6 summer) as well — different offset, same direction', () => {
      // Jun 5 05:00 UTC = Jun 4 23:00 MDT (Denver, UTC-6 in summer).
      // Pins that the shift isn't an accident of one particular DST offset.
      const d = new Date(Date.UTC(2026, 5, 5, 5, 0, 0));
      expect(dateKey(d)).toBe('2026-6-4');
    });

    it('does not shift when the UTC instant lands in midday Denver', () => {
      // Jul 4 18:00 UTC = Jul 4 12:00 MDT — same calendar day either way.
      // Counter-case: proves that the shifts above aren't from the
      // function always-decrementing, but from the actual local-day math.
      const d = new Date(Date.UTC(2026, 6, 4, 18, 0, 0));
      expect(dateKey(d)).toBe('2026-7-4');
    });
  });
});
