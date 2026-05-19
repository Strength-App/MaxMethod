import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Coverage targets — INFORMATIONAL, NOT enforced thresholds.
// Per docs/decisions.md#coverage-philosophy: coverage is a diagnostic,
// not a metric. No CI gate. Targets guide per-batch reporting in PR
// summaries; they're not gates that fail merges.
//
//   src/utils/**                : aim 100%  — pure functions, no excuse for gaps
//   src/hooks/**, src/context/**: aim ~80%  — branch coverage on logic
//   src/components/**           : aim ~50%  — critical interaction flows
//
// Run `npm run test:coverage` to generate the report. Open
// coverage/index.html for the per-file breakdown.

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Pin TZ for deterministic local-time semantics in tests.
    //
    // Some functions in this codebase (starting with `utils/dateUtils.js`'s
    // `dateKey`) use Date's local-time methods (`getFullYear/getMonth/getDate`)
    // and the local-calendar-day semantics are load-bearing — `useWorkoutStats`'s
    // Sunday-start week boundaries, `history.jsx`'s calendar grid, and any
    // downstream callers depend on "this calendar day in the user's locale,"
    // not "this calendar day in UTC."
    //
    // Default CI Node runs in UTC, which makes local-day and UTC-day equal at
    // every midnight-aligned instant — so a test like `dateKey(new Date(2026, 0, 5))`
    // produces the same output whether the function uses local or UTC methods.
    // The test would format-pin the output but NOT pin local-vs-UTC.
    //
    // Pinning a real, non-UTC timezone here makes those tests actually test
    // what they claim to: a Date constructed at a UTC instant whose local day
    // differs (e.g. `Date.UTC(2026, 0, 5, 5, 0, 0)` = Jan 5 05:00 UTC =
    // Jan 4 22:00 in MST) will produce different output under local vs UTC
    // methods, so the test fails if the function ever drifts.
    //
    // Denver (MST/MDT, UTC-7/-6) chosen for: real human timezone, has DST so
    // both offsets get exercised across the year, broadly available in the
    // tz database that ships with full-icu Node 20.
    env: {
      TZ: 'America/Denver',
    },
    // CSS is not parsed during tests — RTL queries by accessible roles
    // and labels, not by computed style. Skipping CSS keeps tests fast
    // and prevents jsdom-vs-real-browser style discrepancies from
    // leaking into assertions.
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'src/main.jsx',
      ],
    },
  },
});
