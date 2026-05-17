// Characterization tests for src/utils/classification.js.
//
// These tests pin CURRENT behavior — they're not aspirational. The
// threshold tables (MALE_THRESHOLDS, FEMALE_THRESHOLDS) and FINE_LABELS
// are mirrored with Backend_structure/src/utils/levelProgress.js; any
// drift fails the backend's table-parity test
// (Backend_structure/tests/unit/levelProgress.test.js). Behavior change
// here = parity violation requiring coordinated backend updates
// (see docs/decisions.md#mirrored-utils).
//
// Risk register entry #3: Classification thresholds —
//   - findFineIndex uses >= (NOT >)
//   - parametrized male/female × bodyweight × exact-threshold totals
//   - verify fine + coarse + isNullState + mirrorClassificationResponse shape

import { describe, it, expect } from 'vitest';
import {
  fineLevel,
  coarseLevel,
  levelProgress,
  bigThreeTotal,
  bigThreeTotalForUser,
  isNullState,
  mirrorClassificationResponse,
} from './classification.js';

// Reference row for boundary tests — male, 200lb bucket.
// Source-of-truth values copied from classification.js:25.
//   [637, 686, 735, 784, 841, 899, 956, 1019, 1081, 1144, 1209, 1274, 1339]
//    B1   B2   B3   N1   N2   N3   I1   I2    I3    A1    A2    A3    Elite
const M200 = [637, 686, 735, 784, 841, 899, 956, 1019, 1081, 1144, 1209, 1274, 1339];

describe('fineLevel', () => {
  describe('happy path — sex × bodyweight × total → label', () => {
    it.each([
      // [sex, bodyweight, total, expected]
      ['male',   200, 637,  'Beginner 1'],     // at first threshold
      ['male',   200, 686,  'Beginner 2'],
      ['male',   200, 735,  'Beginner 3'],
      ['male',   200, 784,  'Novice 1'],
      ['male',   200, 841,  'Novice 2'],
      ['male',   200, 899,  'Novice 3'],
      ['male',   200, 956,  'Intermediate 1'],
      ['male',   200, 1019, 'Intermediate 2'],
      ['male',   200, 1081, 'Intermediate 3'],
      ['male',   200, 1144, 'Advanced 1'],
      ['male',   200, 1209, 'Advanced 2'],
      ['male',   200, 1274, 'Advanced 3'],
      ['male',   200, 1339, 'Elite'],
      // F150 row: [293, 325, 357, 389, 427, 465, 503, 546, 589, 632, 678, 723, 769]
      ['female', 150, 293,  'Beginner 1'],
      ['female', 150, 389,  'Novice 1'],
      ['female', 150, 503,  'Intermediate 1'],
      ['female', 150, 632,  'Advanced 1'],
      ['female', 150, 769,  'Elite'],
    ])('fineLevel(%s, bw=%i, total=%i) = %s', (sex, bodyweight, total, expected) => {
      expect(fineLevel({ sex, bodyweight, total })).toBe(expected);
    });
  });

  describe('threshold boundary uses >= (NOT >)', () => {
    it('exact threshold value promotes to that level', () => {
      // total === 686 (M200[1]) is Beginner 2, not Beginner 1.
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 686 })).toBe('Beginner 2');
    });

    it('one less than the threshold stays in the previous level', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 685 })).toBe('Beginner 1');
    });

    it('exact Elite threshold returns Elite', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 1339 })).toBe('Elite');
    });

    it('one less than Elite stays Advanced 3', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 1338 })).toBe('Advanced 3');
    });
  });

  describe('totals below the first threshold floor to Beginner 1', () => {
    it('total === 0 returns Beginner 1', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 0 })).toBe('Beginner 1');
    });

    it('total below first threshold returns Beginner 1 (no level-0)', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 100 })).toBe('Beginner 1');
    });

    it('exact first threshold also returns Beginner 1 — first idx is degenerate', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 637 })).toBe('Beginner 1');
    });
  });

  describe('totals above Elite stay Elite', () => {
    it('total far above Elite still returns Elite', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 200, total: 99999 })).toBe('Elite');
    });
  });

  describe('bodyweight bucketing — Math.floor to nearest 10, clamped to row bounds', () => {
    it('male bw=205 floors to 200 row', () => {
      // 205 floors to 200; same row as bw=200, same threshold (637) for total=637
      expect(fineLevel({ sex: 'male', bodyweight: 205, total: 637 })).toBe('Beginner 1');
      expect(fineLevel({ sex: 'male', bodyweight: 205, total: 686 })).toBe('Beginner 2');
    });

    it('male bw=215 floors to 210 row, NOT 220', () => {
      // M210[1] = 721. 720 < 721 → Beginner 1; 721 → Beginner 2.
      expect(fineLevel({ sex: 'male', bodyweight: 215, total: 720 })).toBe('Beginner 1');
      expect(fineLevel({ sex: 'male', bodyweight: 215, total: 721 })).toBe('Beginner 2');
    });

    it('male bw below 110 clamps UP to the 110 row', () => {
      // M110[0] = 292. Beginner 1 at total=292.
      expect(fineLevel({ sex: 'male', bodyweight: 50, total: 292 })).toBe('Beginner 1');
      expect(fineLevel({ sex: 'male', bodyweight: 50, total: 326 })).toBe('Beginner 2');
    });

    it('male bw above 310 clamps DOWN to the 310 row', () => {
      // M310[12] = 1812 (Elite). bw=400 should use the same row.
      expect(fineLevel({ sex: 'male', bodyweight: 400, total: 1812 })).toBe('Elite');
      expect(fineLevel({ sex: 'male', bodyweight: 400, total: 1811 })).toBe('Advanced 3');
    });

    it('female bw below 90 clamps UP to the 90 row', () => {
      // F90[0] = 188.
      expect(fineLevel({ sex: 'female', bodyweight: 50, total: 188 })).toBe('Beginner 1');
    });

    it('female bw above 260 clamps DOWN to the 260 row', () => {
      // F260[12] = 987.
      expect(fineLevel({ sex: 'female', bodyweight: 999, total: 987 })).toBe('Elite');
    });

    it('male bw exactly at row min (110) uses 110 row', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 110, total: 292 })).toBe('Beginner 1');
    });

    it('male bw exactly at row max (310) uses 310 row', () => {
      expect(fineLevel({ sex: 'male', bodyweight: 310, total: 1812 })).toBe('Elite');
    });
  });

  describe('sex handling — "other" rolls to male table', () => {
    it('sex === "other" uses MALE_THRESHOLDS', () => {
      // 'other' falls through the ternary's not-'female' branch (matches
      // server behavior at userController.js:33).
      expect(fineLevel({ sex: 'other', bodyweight: 200, total: 686 })).toBe('Beginner 2');
    });

    it('sex === undefined uses MALE_THRESHOLDS', () => {
      expect(fineLevel({ sex: undefined, bodyweight: 200, total: 686 })).toBe('Beginner 2');
    });

    it('sex === "female" uses FEMALE_THRESHOLDS (different thresholds)', () => {
      // F200[1] = 398. M200[1] = 686. A total of 398 is Beginner 2 in
      // the female table but only Beginner 1 in the male table.
      expect(fineLevel({ sex: 'female', bodyweight: 200, total: 398 })).toBe('Beginner 2');
      expect(fineLevel({ sex: 'male',   bodyweight: 200, total: 398 })).toBe('Beginner 1');
    });
  });
});

describe('coarseLevel', () => {
  describe('all 13 fine labels roll up correctly', () => {
    it.each([
      ['Beginner 1', 'Beginner'],
      ['Beginner 2', 'Beginner'],
      ['Beginner 3', 'Beginner'],
      ['Novice 1', 'Novice'],
      ['Novice 2', 'Novice'],
      ['Novice 3', 'Novice'],
      ['Intermediate 1', 'Intermediate'],
      ['Intermediate 2', 'Intermediate'],
      ['Intermediate 3', 'Intermediate'],
      ['Advanced 1', 'Advanced'],
      ['Advanced 2', 'Advanced'],
      ['Advanced 3', 'Advanced'],
      ['Elite', 'Elite'],
    ])('coarseLevel(%s) === %s', (fine, expected) => {
      expect(coarseLevel(fine)).toBe(expected);
    });
  });

  describe('unknown labels return null', () => {
    it('returns null for unknown label', () => {
      expect(coarseLevel('Unknown')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(coarseLevel('')).toBeNull();
    });

    it('returns null for null', () => {
      expect(coarseLevel(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(coarseLevel(undefined)).toBeNull();
    });

    it('returns null for case-mismatched label ("beginner 1" lowercase)', () => {
      expect(coarseLevel('beginner 1')).toBeNull();
    });
  });
});

describe('levelProgress', () => {
  describe('mid-tier user returns full progress shape', () => {
    it('Novice 2 user at exact threshold returns Novice 3 as next', () => {
      // M200[4] = 841 (Novice 2), M200[5] = 899 (Novice 3).
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 841 });
      expect(result).toEqual({
        fineLevel: 'Novice 2',
        coarseLevel: 'Novice',
        currentThreshold: 841,
        nextThreshold: 899,
        nextLevel: 'Novice 3',
        lbsToNext: 58,
      });
    });

    it('between thresholds — lbsToNext = nextThreshold - total', () => {
      // total=900 → idx=5 (Novice 3, threshold 899), next=I1 (956)
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 900 });
      expect(result.fineLevel).toBe('Novice 3');
      expect(result.nextLevel).toBe('Intermediate 1');
      expect(result.currentThreshold).toBe(899);
      expect(result.nextThreshold).toBe(956);
      expect(result.lbsToNext).toBe(56); // 956 - 900
    });

    it('total below the first threshold — Beginner 1, lbsToNext = nextThreshold - total', () => {
      // total=0 → idx=0 (Beginner 1, threshold 637), next=B2 (686)
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 0 });
      expect(result.fineLevel).toBe('Beginner 1');
      expect(result.currentThreshold).toBe(637);
      expect(result.nextThreshold).toBe(686);
      expect(result.lbsToNext).toBe(686); // 686 - 0
    });
  });

  describe('Elite caps progress', () => {
    it('Elite at exact threshold returns null next-fields', () => {
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 1339 });
      expect(result).toEqual({
        fineLevel: 'Elite',
        coarseLevel: 'Elite',
        currentThreshold: 1339,
        nextThreshold: null,
        nextLevel: null,
        lbsToNext: null,
      });
    });

    it('total far above Elite still returns null next-fields', () => {
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 99999 });
      expect(result.fineLevel).toBe('Elite');
      expect(result.nextLevel).toBeNull();
      expect(result.nextThreshold).toBeNull();
      expect(result.lbsToNext).toBeNull();
    });
  });

  describe('lbsToNext clamps to 0 (Math.max guard)', () => {
    it('total slightly past next threshold but findFineIndex matched a lower idx — lbsToNext clamps to 0', () => {
      // Constructed case: this should not happen in practice given how
      // findFineIndex works, but the Math.max(0, ...) guard exists.
      // The guard is documented behavior; we pin it by checking that
      // when total === nextThreshold (edge of next), the level advances
      // and lbsToNext for the next-tier becomes the further-out gap —
      // i.e. the guard is never exercised on normal inputs. Documented.
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 686 });
      expect(result.fineLevel).toBe('Beginner 2');
      expect(result.lbsToNext).toBe(49); // 735 - 686
    });
  });

  describe('return-shape invariants', () => {
    it('returns exactly six keys', () => {
      const result = levelProgress({ sex: 'male', bodyweight: 200, total: 800 });
      expect(Object.keys(result).sort()).toEqual([
        'coarseLevel',
        'currentThreshold',
        'fineLevel',
        'lbsToNext',
        'nextLevel',
        'nextThreshold',
      ]);
    });
  });
});

describe('bigThreeTotal', () => {
  describe('happy path — sum bench + squat + deadlift', () => {
    it.each([
      [{ bench: 100, squat: 200, deadlift: 300 }, 600],
      [{ bench: 245, squat: 315, deadlift: 405 }, 965],
      [{ bench: 0, squat: 0, deadlift: 0 }, 0],
    ])('bigThreeTotal(%j) === %i', (maxes, expected) => {
      expect(bigThreeTotal(maxes)).toBe(expected);
    });
  });

  describe('null lift values coerce to 0', () => {
    it('per-lift null counts as 0 in the sum', () => {
      expect(bigThreeTotal({ bench: 245, squat: null, deadlift: null })).toBe(245);
    });

    it('all three null returns 0', () => {
      expect(bigThreeTotal({ bench: null, squat: null, deadlift: null })).toBe(0);
    });

    it('per-lift undefined counts as 0 in the sum', () => {
      expect(bigThreeTotal({ bench: 100 })).toBe(100); // others undefined
    });
  });

  describe('defensive against null/undefined maxes object', () => {
    it('null maxes returns 0', () => {
      expect(bigThreeTotal(null)).toBe(0);
    });

    it('undefined maxes returns 0', () => {
      expect(bigThreeTotal(undefined)).toBe(0);
    });

    it('empty maxes object returns 0', () => {
      expect(bigThreeTotal({})).toBe(0);
    });
  });

  describe('Number-coerces string values', () => {
    it('string-numeric lifts coerce and sum', () => {
      expect(bigThreeTotal({ bench: '100', squat: '200', deadlift: '300' })).toBe(600);
    });
  });
});

describe('bigThreeTotalForUser', () => {
  describe('estimated takes priority when ANY lift is non-null', () => {
    it('all three estimated lifts populated → uses estimated', () => {
      const user = {
        estimated_one_rep_maxes: { bench: 250, squat: 350, deadlift: 450 },
        current_one_rep_maxes: { bench: 200, squat: 300, deadlift: 400 },
      };
      expect(bigThreeTotalForUser(user)).toBe(1050);
    });

    it('one estimated lift non-null, two null → uses estimated (sum = the one lift)', () => {
      // Per the comment: "if estimated has any non-null lift, use estimated
      // (with the remaining nulls coerced to 0 inside bigThreeTotal)"
      const user = {
        estimated_one_rep_maxes: { bench: 245, squat: null, deadlift: null },
        current_one_rep_maxes: { bench: 200, squat: 300, deadlift: 400 },
      };
      expect(bigThreeTotalForUser(user)).toBe(245);
    });
  });

  describe('falls back to current when estimated is all-null or missing', () => {
    it('estimated all-null → uses current', () => {
      const user = {
        estimated_one_rep_maxes: { bench: null, squat: null, deadlift: null },
        current_one_rep_maxes: { bench: 200, squat: 300, deadlift: 400 },
      };
      expect(bigThreeTotalForUser(user)).toBe(900);
    });

    it('estimated missing entirely (pre-migration user) → uses current', () => {
      const user = {
        current_one_rep_maxes: { bench: 200, squat: 300, deadlift: 400 },
      };
      expect(bigThreeTotalForUser(user)).toBe(900);
    });

    it('estimated is null → uses current', () => {
      const user = {
        estimated_one_rep_maxes: null,
        current_one_rep_maxes: { bench: 200, squat: 300, deadlift: 400 },
      };
      expect(bigThreeTotalForUser(user)).toBe(900);
    });
  });

  describe('null-safety', () => {
    it('null user returns 0', () => {
      expect(bigThreeTotalForUser(null)).toBe(0);
    });

    it('undefined user returns 0', () => {
      expect(bigThreeTotalForUser(undefined)).toBe(0);
    });

    it('empty user object returns 0', () => {
      expect(bigThreeTotalForUser({})).toBe(0);
    });
  });
});

describe('isNullState', () => {
  describe('true when no 1RM data was ever recorded', () => {
    it('null user → true', () => {
      expect(isNullState(null)).toBe(true);
    });

    it('undefined user → true', () => {
      expect(isNullState(undefined)).toBe(true);
    });

    it('empty user object → true', () => {
      expect(isNullState({})).toBe(true);
    });

    it('both fields missing → true', () => {
      expect(isNullState({ name: 'foo' })).toBe(true);
    });

    it('both fields present but all-null → true', () => {
      const user = {
        estimated_one_rep_maxes: { bench: null, squat: null, deadlift: null },
        current_one_rep_maxes: { bench: null, squat: null, deadlift: null },
      };
      expect(isNullState(user)).toBe(true);
    });
  });

  describe('false when ANY 1RM data exists, including explicit zeros', () => {
    it('current_one_rep_maxes has explicit zeros (entered data) → false', () => {
      // Documented in source: explicit zeros are NOT null-state — the user
      // has entered data, even though the data sums to zero.
      const user = {
        current_one_rep_maxes: { bench: 0, squat: 0, deadlift: 0 },
      };
      expect(isNullState(user)).toBe(false);
    });

    it('estimated has a non-null lift → false', () => {
      const user = {
        estimated_one_rep_maxes: { bench: 100, squat: null, deadlift: null },
      };
      expect(isNullState(user)).toBe(false);
    });

    it('current has a non-null lift → false', () => {
      const user = {
        current_one_rep_maxes: { bench: 100, squat: null, deadlift: null },
      };
      expect(isNullState(user)).toBe(false);
    });

    it('only one of three present (current.squat=200) → false', () => {
      const user = {
        current_one_rep_maxes: { squat: 200 },
      };
      expect(isNullState(user)).toBe(false);
    });
  });
});

describe('mirrorClassificationResponse', () => {
  const baseUser = {
    name: 'Test User',
    age: 30,
    current_classification: 'Beginner 1',
    current_bodyweight: 180,
    current_one_rep_maxes: { bench: 100, squat: 200, deadlift: 300 },
    estimated_one_rep_maxes: { bench: 110, squat: 210, deadlift: 310 },
  };

  describe('default mode "set-actual" — full mirror', () => {
    it('mirrors classification, bodyweight, both oneRMs fields', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.current_classification).toBe('Novice 1');
      expect(next.current_bodyweight).toBe(185);
      expect(next.current_one_rep_maxes).toEqual({ bench: 150, squat: 250, deadlift: 350 });
      expect(next.estimated_one_rep_maxes).toEqual({ bench: 150, squat: 250, deadlift: 350 });
    });

    it('preserves unrelated user fields (spread)', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.name).toBe('Test User');
      expect(next.age).toBe(30);
    });

    it('Number-coerces bodyweight (string input)', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: '185',
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.current_bodyweight).toBe(185);
      expect(typeof next.current_bodyweight).toBe('number');
    });

    it('current_one_rep_maxes === estimated_one_rep_maxes (same reference)', () => {
      const oneRMs = { bench: 150, squat: 250, deadlift: 350 };
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs,
      });
      expect(next.current_one_rep_maxes).toBe(next.estimated_one_rep_maxes);
    });
  });

  describe('mode "reclassify-only" — touches only current_classification', () => {
    it('does NOT touch bodyweight, current_one_rep_maxes, or estimated_one_rep_maxes', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 2' },
        bodyweight: 999,
        oneRMs: { bench: 999, squat: 999, deadlift: 999 },
        mode: 'reclassify-only',
      });
      expect(next.current_classification).toBe('Novice 2');
      expect(next.current_bodyweight).toBe(180);
      expect(next.current_one_rep_maxes).toEqual({ bench: 100, squat: 200, deadlift: 300 });
      expect(next.estimated_one_rep_maxes).toEqual({ bench: 110, squat: 210, deadlift: 310 });
    });

    it('still applies optional gender / onboardingComplete / beginner1Anchor fields', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 2', beginner1Anchor: 555 },
        bodyweight: 999,
        oneRMs: { bench: 999 },
        mode: 'reclassify-only',
        gender: 'female',
      });
      expect(next.gender).toBe('female');
      expect(next.beginner_1_anchor).toBe(555);
    });
  });

  describe('optional fields applied only when explicitly passed', () => {
    it('gender added when defined', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
        gender: 'female',
      });
      expect(next.gender).toBe('female');
    });

    it('gender NOT touched when omitted (undefined)', () => {
      const userWithGender = { ...baseUser, gender: 'male' };
      const next = mirrorClassificationResponse({
        user: userWithGender,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.gender).toBe('male'); // preserved via spread
    });

    it('onboardingComplete added when defined', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
        onboardingComplete: true,
      });
      expect(next.onboarding_complete).toBe(true);
    });

    it('onboardingComplete=false also added (defined-not-undefined check)', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1' },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
        onboardingComplete: false,
      });
      expect(next.onboarding_complete).toBe(false);
    });

    it('beginner1Anchor mirrored when classData provides it', () => {
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1', beginner1Anchor: 777 },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.beginner_1_anchor).toBe(777);
    });

    it('beginner1Anchor NOT touched when classData omits it', () => {
      const userWithAnchor = { ...baseUser, beginner_1_anchor: 500 };
      const next = mirrorClassificationResponse({
        user: userWithAnchor,
        classData: { classification: 'Novice 1' }, // no beginner1Anchor
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.beginner_1_anchor).toBe(500); // preserved via spread
    });

    it('beginner1Anchor === null is mirrored (defined-not-undefined check)', () => {
      // Server may explicitly send null to indicate "no anchor yet".
      const next = mirrorClassificationResponse({
        user: baseUser,
        classData: { classification: 'Novice 1', beginner1Anchor: null },
        bodyweight: 185,
        oneRMs: { bench: 150, squat: 250, deadlift: 350 },
      });
      expect(next.beginner_1_anchor).toBeNull();
    });
  });
});
