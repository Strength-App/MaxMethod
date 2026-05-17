// Characterization tests for src/utils/epley.js.
//
// These tests pin CURRENT behavior — they're not aspirational. The
// utility is mirrored with Backend_structure/src/utils/epley.js; any
// behavior change here is a parity violation requiring coordinated
// backend updates (see docs/decisions.md#mirrored-utils).
//
// Risk register entry #2: Epley invariants — reps===1 returns weight;
// reps capped at 15 (default); non-finite/negative inputs → null;
// topSetEpley selects highest e1RM, not heaviest weight.

import { describe, it, expect } from 'vitest';
import { estimateOneRepMax, floorTo5, topSetEpley } from './epley.js';

describe('estimateOneRepMax', () => {
  describe('happy path — Epley formula: weight × (1 + reps/30)', () => {
    it.each([
      // [weight, reps, expectedE1RM]
      [100, 5, 100 * (1 + 5 / 30)],   // 116.666...
      [100, 10, 100 * (1 + 10 / 30)], // 133.333...
      [200, 8, 200 * (1 + 8 / 30)],   // 253.333...
      [225, 5, 225 * (1 + 5 / 30)],   // 262.5
      [185, 12, 185 * (1 + 12 / 30)], // 259
      [315, 3, 315 * (1 + 3 / 30)],   // 346.5
    ])('estimateOneRepMax(%i, %i) = %f', (weight, reps, expected) => {
      expect(estimateOneRepMax(weight, reps)).toBeCloseTo(expected, 10);
    });
  });

  describe('reps === 1 special case', () => {
    it('returns weight unchanged for a true 1RM (no formula inflation)', () => {
      expect(estimateOneRepMax(225, 1)).toBe(225);
    });

    it('returns weight exactly even at the formula-would-inflate-1.033× boundary', () => {
      // Without the special case: 225 × (1 + 1/30) = 232.5 (1.033× artifact).
      // With the special case: 225 — a 1-rep set IS the 1RM.
      expect(estimateOneRepMax(225, 1)).toBe(225);
      expect(estimateOneRepMax(225, 1)).not.toBe(225 * (1 + 1 / 30));
    });

    it('returns weight for fractional weights too', () => {
      expect(estimateOneRepMax(225.5, 1)).toBe(225.5);
    });
  });

  describe('reps boundary [1, 15] with default options', () => {
    it('reps === 1 works (lower boundary, special-cased to weight)', () => {
      expect(estimateOneRepMax(100, 1)).toBe(100);
    });

    it('reps === 15 works (upper boundary, applies formula)', () => {
      expect(estimateOneRepMax(100, 15)).toBeCloseTo(100 * (1 + 15 / 30), 10);
    });

    it('reps === 16 returns null (just above default cap)', () => {
      expect(estimateOneRepMax(100, 16)).toBeNull();
    });

    it('reps === 0 returns null (below lower boundary)', () => {
      expect(estimateOneRepMax(100, 0)).toBeNull();
    });

    it('reps === -1 returns null', () => {
      expect(estimateOneRepMax(100, -1)).toBeNull();
    });

    it('reps === 1.5 returns null (not integer)', () => {
      expect(estimateOneRepMax(100, 1.5)).toBeNull();
    });

    it('reps === 5.7 returns null (not integer)', () => {
      expect(estimateOneRepMax(100, 5.7)).toBeNull();
    });
  });

  describe('allowHighReps option', () => {
    it('reps === 16 with allowHighReps:true returns the formula result', () => {
      expect(estimateOneRepMax(100, 16, { allowHighReps: true }))
        .toBeCloseTo(100 * (1 + 16 / 30), 10);
    });

    it('reps === 30 with allowHighReps:true works (2× weight)', () => {
      expect(estimateOneRepMax(100, 30, { allowHighReps: true })).toBeCloseTo(200, 10);
    });

    it('allowHighReps:false (default behavior) still caps at 15', () => {
      expect(estimateOneRepMax(100, 16, { allowHighReps: false })).toBeNull();
    });

    it('allowHighReps does NOT bypass the lower-bound / not-integer / non-positive-weight checks', () => {
      expect(estimateOneRepMax(100, 0, { allowHighReps: true })).toBeNull();
      expect(estimateOneRepMax(100, 1.5, { allowHighReps: true })).toBeNull();
      expect(estimateOneRepMax(0, 5, { allowHighReps: true })).toBeNull();
    });
  });

  describe('weight validation', () => {
    it('weight === 0 returns null (must be > 0)', () => {
      expect(estimateOneRepMax(0, 5)).toBeNull();
    });

    it('weight === -10 returns null', () => {
      expect(estimateOneRepMax(-10, 5)).toBeNull();
    });

    it('weight === NaN returns null (not finite)', () => {
      expect(estimateOneRepMax(NaN, 5)).toBeNull();
    });

    it('weight === Infinity returns null (not finite)', () => {
      expect(estimateOneRepMax(Infinity, 5)).toBeNull();
    });

    it('weight === -Infinity returns null', () => {
      expect(estimateOneRepMax(-Infinity, 5)).toBeNull();
    });
  });

  describe('type coercion via Number(...)', () => {
    it('weight as string "100" coerces and works', () => {
      expect(estimateOneRepMax('100', 5)).toBeCloseTo(100 * (1 + 5 / 30), 10);
    });

    it('reps as string "5" coerces and works (5 is integer post-coercion)', () => {
      expect(estimateOneRepMax(100, '5')).toBeCloseTo(100 * (1 + 5 / 30), 10);
    });

    it('weight as non-numeric string returns null (Number("abc") is NaN)', () => {
      expect(estimateOneRepMax('abc', 5)).toBeNull();
    });

    it('reps as non-numeric string returns null', () => {
      expect(estimateOneRepMax(100, 'abc')).toBeNull();
    });

    it('weight === null returns null (Number(null) === 0, fails ≤0 check)', () => {
      expect(estimateOneRepMax(null, 5)).toBeNull();
    });

    it('weight === undefined returns null (Number(undefined) === NaN)', () => {
      expect(estimateOneRepMax(undefined, 5)).toBeNull();
    });

    it('reps === null returns null (Number(null) === 0, fails <1 check)', () => {
      expect(estimateOneRepMax(100, null)).toBeNull();
    });

    it('reps === undefined returns null', () => {
      expect(estimateOneRepMax(100, undefined)).toBeNull();
    });

    it('reps as float-string "5.5" returns null (not integer)', () => {
      expect(estimateOneRepMax(100, '5.5')).toBeNull();
    });
  });
});

describe('floorTo5', () => {
  describe('positive numbers', () => {
    it.each([
      [100, 100],
      [99, 95],
      [95, 95],
      [94, 90],
      [5, 5],
      [4, 0],
      [0, 0],
      [117, 115],
      [116.25, 115],
      [262.5, 260],
    ])('floorTo5(%f) === %i', (input, expected) => {
      expect(floorTo5(input)).toBe(expected);
    });
  });

  describe('negative numbers (floor rounds toward -Infinity)', () => {
    it.each([
      [-1, -5],   // Math.floor(-0.2) = -1, × 5 = -5
      [-5, -5],
      [-6, -10],
      [-95, -95],
    ])('floorTo5(%i) === %i', (input, expected) => {
      expect(floorTo5(input)).toBe(expected);
    });
  });

  describe('non-finite inputs', () => {
    it('NaN returns null', () => {
      expect(floorTo5(NaN)).toBeNull();
    });

    it('Infinity returns null', () => {
      expect(floorTo5(Infinity)).toBeNull();
    });

    it('-Infinity returns null', () => {
      expect(floorTo5(-Infinity)).toBeNull();
    });

    // CRITICAL: floorTo5 does NOT coerce via Number() — it uses
    // Number.isFinite which returns false for strings. This is an
    // asymmetry with estimateOneRepMax (which DOES coerce). Both
    // behaviors are pinned by these tests.
    it('string "100" returns null (NO type coercion — unlike estimateOneRepMax)', () => {
      expect(floorTo5('100')).toBeNull();
    });

    it('null returns null', () => {
      expect(floorTo5(null)).toBeNull();
    });

    it('undefined returns null', () => {
      expect(floorTo5(undefined)).toBeNull();
    });
  });
});

describe('topSetEpley', () => {
  describe('happy path — selects highest e1RM, not heaviest weight', () => {
    it('5×200 (e1RM ≈233) beats 1×215 (e1RM 215)', () => {
      const result = topSetEpley([
        { weight: 215, reps: 1 },
        { weight: 200, reps: 5 },
      ]);
      expect(result).toEqual({
        weight: 200,
        reps: 5,
        e1RM: 200 * (1 + 5 / 30), // 233.333...
      });
    });

    it('returns the FIRST set on e1RM tie (strict > comparison)', () => {
      // Both produce e1RM = 100; first one wins because `e > best.e1RM` is
      // strict-greater-than, not >=.
      const result = topSetEpley([
        { weight: 100, reps: 1 },
        { weight: 100, reps: 1 },
      ]);
      expect(result).toEqual({ weight: 100, reps: 1, e1RM: 100 });
    });

    it('selects the single-rep set when it dominates a higher-rep one', () => {
      const result = topSetEpley([
        { weight: 100, reps: 5 }, // e1RM ≈ 116.67
        { weight: 225, reps: 1 }, // e1RM = 225
      ]);
      expect(result.weight).toBe(225);
      expect(result.reps).toBe(1);
      expect(result.e1RM).toBe(225);
    });
  });

  describe('skipping invalid sets', () => {
    it('skips sets where estimateOneRepMax returns null and uses the remaining valid set', () => {
      const result = topSetEpley([
        { weight: 0, reps: 5 },       // invalid weight
        { weight: 100, reps: 0 },     // invalid reps
        { weight: 100, reps: 1.5 },   // invalid reps (not integer)
        { weight: 100, reps: 5 },     // valid
        { weight: 100, reps: 16 },    // invalid reps (default cap)
      ]);
      expect(result).toEqual({
        weight: 100,
        reps: 5,
        e1RM: 100 * (1 + 5 / 30),
      });
    });

    it('skips entries with missing weight or reps (optional chaining)', () => {
      const result = topSetEpley([
        { reps: 5 },               // no weight
        { weight: 100 },           // no reps
        { weight: 100, reps: 5 },  // valid
      ]);
      expect(result.weight).toBe(100);
      expect(result.reps).toBe(5);
    });

    it('skips null entries in the array', () => {
      const result = topSetEpley([
        null,
        { weight: 100, reps: 5 },
      ]);
      expect(result.weight).toBe(100);
    });

    it('skips undefined entries in the array', () => {
      const result = topSetEpley([
        undefined,
        { weight: 100, reps: 5 },
      ]);
      expect(result.weight).toBe(100);
    });
  });

  describe('null-result cases', () => {
    it('returns null for empty array', () => {
      expect(topSetEpley([])).toBeNull();
    });

    it('returns null for null input (uses ?? [])', () => {
      expect(topSetEpley(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(topSetEpley(undefined)).toBeNull();
    });

    it('returns null when all sets are invalid', () => {
      const result = topSetEpley([
        { weight: 0, reps: 5 },
        { weight: 100, reps: 16 },
        { weight: -50, reps: 3 },
      ]);
      expect(result).toBeNull();
    });
  });

  describe('return shape', () => {
    it('Number-coerces weight and reps in the result', () => {
      const result = topSetEpley([{ weight: '100', reps: '5' }]);
      expect(result.weight).toBe(100);
      expect(result.reps).toBe(5);
      expect(typeof result.weight).toBe('number');
      expect(typeof result.reps).toBe('number');
    });

    it('returns the exact { weight, reps, e1RM } shape', () => {
      const result = topSetEpley([{ weight: 100, reps: 5 }]);
      expect(Object.keys(result).sort()).toEqual(['e1RM', 'reps', 'weight']);
    });
  });

  describe('default rep-cap behavior is the underlying estimateOneRepMax cap', () => {
    it('topSetEpley does NOT pass allowHighReps — sets with reps > 15 are silently dropped', () => {
      const result = topSetEpley([
        { weight: 100, reps: 16 }, // skipped by default cap
        { weight: 200, reps: 1 },  // valid; should win
      ]);
      expect(result.weight).toBe(200);
      expect(result.reps).toBe(1);
    });
  });
});
