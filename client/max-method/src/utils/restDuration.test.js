// Tests for src/utils/restDuration.js.
//
// getRestSeconds is extracted in Batch 14 from byte-identical inline copies in
// pages/day.jsx and pages/logger.jsx. These tests pin the 120/90 rest-duration
// mapping so the shared util provably matches what both pages did inline, and so
// any future tweak to the policy is a deliberate, test-visible change.
//
// .test.js (no JSX) per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect } from 'vitest';
import { getRestSeconds } from './restDuration.js';

describe('getRestSeconds', () => {
  // The big-three lifts get the longer two-minute rest, matched loosely so a
  // fully-qualified name like "Barbell Bench Press" still counts.
  it.each([
    'bench',
    'Bench Press',
    'Barbell Bench Press',
    'squat',
    'Back Squat',
    'deadlift',
    'Romanian Deadlift',
  ])('returns 120 for a big-three lift: %s', (name) => {
    expect(getRestSeconds(name)).toBe(120);
  });

  // Everything else gets the shorter ninety-second rest.
  it.each([
    'Lateral Raise',
    'Bicep Curl',
    'Leg Press',
    'Pull Up',
  ])('returns 90 for an accessory lift: %s', (name) => {
    expect(getRestSeconds(name)).toBe(90);
  });

  // Matching is case-insensitive.
  it('matches the big three regardless of case', () => {
    expect(getRestSeconds('BENCH PRESS')).toBe(120);
    expect(getRestSeconds('DeAdLiFt')).toBe(120);
  });

  // Missing / empty names are treated as "not a big lift" (90s), the same
  // defensive default the inline copies had via `(name || '')`.
  it.each([undefined, null, ''])('returns 90 for a missing name: %s', (name) => {
    expect(getRestSeconds(name)).toBe(90);
  });
});
