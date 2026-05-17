// Characterization tests for src/utils/exerciseNameNormalize.js.
//
// These tests pin CURRENT behavior — they're not aspirational. The
// utility is mirrored with Backend_structure/src/utils/exerciseNameNormalize.js
// for canonicalExerciseName + ALIASES (getPersonalBest is client-only).
// Behavior change here = parity violation requiring coordinated backend
// updates (see docs/decisions.md#mirrored-utils).
//
// Currently only one alias: "back squat" → "Squat". The lookup is
// trim+lowercase on the input but the OUTPUT is the alias value
// verbatim ("Squat" preserves casing).

import { describe, it, expect } from 'vitest';
import { canonicalExerciseName, getPersonalBest } from './exerciseNameNormalize.js';

describe('canonicalExerciseName', () => {
  describe('"back squat" alias (the only entry today)', () => {
    it('exact "back squat" → "Squat"', () => {
      expect(canonicalExerciseName('back squat')).toBe('Squat');
    });

    it('"Back Squat" (titlecase) → "Squat" (lowercase lookup)', () => {
      expect(canonicalExerciseName('Back Squat')).toBe('Squat');
    });

    it('"BACK SQUAT" (upper) → "Squat"', () => {
      expect(canonicalExerciseName('BACK SQUAT')).toBe('Squat');
    });

    it('"  Back Squat  " (whitespace) → "Squat" (trimmed)', () => {
      expect(canonicalExerciseName('  Back Squat  ')).toBe('Squat');
    });

    it('"BaCk SqUaT" (mixed case) → "Squat"', () => {
      expect(canonicalExerciseName('BaCk SqUaT')).toBe('Squat');
    });
  });

  describe('non-aliased inputs returned unchanged', () => {
    it('"Squat" returns "Squat" (already canonical, no double-map)', () => {
      expect(canonicalExerciseName('Squat')).toBe('Squat');
    });

    it('"Bench Press" returns "Bench Press" (no alias defined)', () => {
      expect(canonicalExerciseName('Bench Press')).toBe('Bench Press');
    });

    it('"Deadlift" returns "Deadlift"', () => {
      expect(canonicalExerciseName('Deadlift')).toBe('Deadlift');
    });

    it('empty string returns empty string (no alias for "")', () => {
      expect(canonicalExerciseName('')).toBe('');
    });

    it('whitespace-only returns the original string unchanged', () => {
      // The fallback is `aliased ?? name` — so even though the trim-
      // lowercase lookup misses, the original (with whitespace) is
      // returned, not the trimmed form.
      expect(canonicalExerciseName('   ')).toBe('   ');
    });

    it('preserves original casing/whitespace when no alias hits', () => {
      expect(canonicalExerciseName('  Bench Press  ')).toBe('  Bench Press  ');
    });
  });

  describe('non-string inputs returned as-is', () => {
    it('null returns null', () => {
      expect(canonicalExerciseName(null)).toBeNull();
    });

    it('undefined returns undefined', () => {
      expect(canonicalExerciseName(undefined)).toBeUndefined();
    });

    it('number returns the number unchanged', () => {
      expect(canonicalExerciseName(42)).toBe(42);
    });

    it('object returns the object unchanged (same reference)', () => {
      const obj = { name: 'Squat' };
      expect(canonicalExerciseName(obj)).toBe(obj);
    });

    it('array returns the array unchanged (same reference)', () => {
      const arr = ['Squat'];
      expect(canonicalExerciseName(arr)).toBe(arr);
    });
  });
});

describe('getPersonalBest', () => {
  const personalBests = {
    Squat: 405,
    'Bench Press': 245,
    Deadlift: 500,
  };

  describe('happy path', () => {
    it('looks up by canonical name', () => {
      expect(getPersonalBest(personalBests, 'Squat')).toBe(405);
    });

    it('canonicalizes "Back Squat" alias to "Squat" before lookup', () => {
      expect(getPersonalBest(personalBests, 'Back Squat')).toBe(405);
    });

    it('canonicalizes case + whitespace before lookup', () => {
      expect(getPersonalBest(personalBests, '  BACK SQUAT  ')).toBe(405);
    });

    it('returns the exact stored value (including zero)', () => {
      const pbs = { Bench: 0 };
      expect(getPersonalBest(pbs, 'Bench')).toBe(0);
    });
  });

  describe('fallback parameter', () => {
    it('default fallback is 0 when key missing', () => {
      expect(getPersonalBest(personalBests, 'OHP')).toBe(0);
    });

    it('explicit fallback === 0 returned when key missing', () => {
      expect(getPersonalBest(personalBests, 'OHP', 0)).toBe(0);
    });

    it('explicit fallback === null returned when key missing', () => {
      expect(getPersonalBest(personalBests, 'OHP', null)).toBeNull();
    });

    it('arbitrary fallback returned when key missing', () => {
      expect(getPersonalBest(personalBests, 'OHP', 'unknown')).toBe('unknown');
    });

    it('fallback NOT used when stored value is 0 (?? semantics — explicit 0 preserved)', () => {
      const pbs = { Bench: 0 };
      expect(getPersonalBest(pbs, 'Bench', 999)).toBe(0);
    });

    it('fallback IS used when stored value is null (?? semantics)', () => {
      const pbs = { Bench: null };
      expect(getPersonalBest(pbs, 'Bench', 999)).toBe(999);
    });

    it('fallback IS used when stored value is undefined', () => {
      const pbs = { Bench: undefined };
      expect(getPersonalBest(pbs, 'Bench', 999)).toBe(999);
    });
  });

  describe('defensive against null/undefined personalBests', () => {
    it('null personalBests returns fallback', () => {
      expect(getPersonalBest(null, 'Squat')).toBe(0);
    });

    it('undefined personalBests returns fallback', () => {
      expect(getPersonalBest(undefined, 'Squat')).toBe(0);
    });

    it('empty personalBests returns fallback', () => {
      expect(getPersonalBest({}, 'Squat')).toBe(0);
    });

    it('null personalBests with explicit fallback returns the explicit fallback', () => {
      expect(getPersonalBest(null, 'Squat', null)).toBeNull();
    });
  });

  describe('non-string exerciseName passes through to canonicalExerciseName unchanged', () => {
    it('numeric key — undefined index, returns fallback', () => {
      // canonicalExerciseName(42) returns 42; personalBests[42] is undefined.
      expect(getPersonalBest(personalBests, 42)).toBe(0);
    });

    it('numeric key that exists as a string key', () => {
      const pbs = { 42: 'forty-two' };
      // canonicalExerciseName(42) returns 42; pbs[42] = "forty-two" (JS objects coerce keys to string).
      expect(getPersonalBest(pbs, 42)).toBe('forty-two');
    });

    it('null exerciseName: canonicalExerciseName returns null; pbs[null] is undefined; fallback used', () => {
      expect(getPersonalBest(personalBests, null)).toBe(0);
    });
  });
});
