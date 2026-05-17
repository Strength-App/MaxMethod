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
