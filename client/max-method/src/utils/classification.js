/**
 * Client-side 13-level fine classification, derived from
 * (sex, bodyweight, big-3 total). Bucket-stepped so the rollup of
 * fine → coarse always equals the server's existing 5-level coarse
 * classification (positions [3, 6, 9, 12] of every row equal the
 * server's 4 coarse boundaries).
 *
 * **Mirror constraint.** The threshold tables (`MALE_THRESHOLDS` /
 * `FEMALE_THRESHOLDS`) and the `FINE_LABELS` array MUST match
 * `Backend_structure/src/utils/levelProgress.js`, which the
 * classification handler uses to detect Beginner-1 entry for the
 * anchor write. The table-parity unit test at
 * `Backend_structure/tests/unit/levelProgress.test.js` asserts
 * deepEqual against a fixture copied from this file — if either side
 * drifts, that test fails. When updating any threshold, edit BOTH
 * files AND the test fixture. This discipline is locked in
 * `docs/decisions.md#mirrored-utils`.
 *
 * **Sex handling.** `"female"` uses `FEMALE_THRESHOLDS`; anything else
 * (including `"other"`, `undefined`, missing) rolls to
 * `MALE_THRESHOLDS`. Matches server behavior at userController.js:33.
 *
 * **Bucketing.** Bodyweight is `Math.floor(bw / 10) * 10`, clamped
 * to the row range (male 110–310, female 90–260). A 215lb male
 * floors to row 210, not 220 — the floor-then-clamp ordering matters.
 *
 * **Threshold comparison.** `findFineIndex` uses `>=`. A total
 * exactly equal to a threshold promotes to that level.
 */

const MALE_THRESHOLDS = {
  110: [292, 326, 360, 394, 435, 477, 518, 565, 611, 658, 708, 758, 808],
  120: [334, 370, 407, 443, 486, 530, 573, 622, 672, 721, 773, 825, 877],
  130: [375, 413, 452, 490, 536, 581, 627, 678, 730, 781, 835, 889, 943],
  140: [415, 455, 495, 535, 583, 630, 678, 731, 785, 838, 894, 950, 1006],
  150: [454, 496, 538, 580, 629, 679, 728, 783, 839, 894, 952, 1009, 1067],
  160: [492, 536, 579, 623, 674, 726, 777, 834, 890, 947, 1006, 1066, 1125],
  170: [530, 575, 620, 665, 718, 770, 823, 882, 940, 999, 1060, 1121, 1182],
  180: [566, 613, 659, 706, 760, 815, 869, 929, 989, 1049, 1111, 1174, 1236],
  190: [602, 650, 698, 746, 802, 857, 913, 974, 1036, 1097, 1161, 1224, 1288],
  200: [637, 686, 735, 784, 841, 899, 956, 1019, 1081, 1144, 1209, 1274, 1339],
  210: [671, 721, 772, 822, 880, 939, 997, 1061, 1125, 1189, 1255, 1322, 1388],
  220: [704, 756, 807, 859, 919, 978, 1038, 1103, 1168, 1233, 1301, 1368, 1436],
  230: [737, 790, 842, 895, 956, 1016, 1077, 1143, 1210, 1276, 1345, 1413, 1482],
  240: [769, 823, 876, 930, 992, 1054, 1116, 1183, 1251, 1318, 1388, 1457, 1527],
  250: [800, 855, 909, 964, 1027, 1090, 1153, 1222, 1290, 1359, 1430, 1500, 1571],
  260: [830, 886, 942, 998, 1062, 1126, 1190, 1260, 1329, 1399, 1471, 1542, 1614],
  270: [860, 917, 974, 1031, 1096, 1161, 1226, 1297, 1367, 1438, 1510, 1583, 1655],
  280: [890, 948, 1005, 1063, 1129, 1195, 1261, 1332, 1404, 1475, 1549, 1622, 1696],
  290: [918, 977, 1035, 1094, 1161, 1228, 1295, 1367, 1440, 1512, 1587, 1661, 1736],
  300: [947, 1006, 1066, 1125, 1193, 1260, 1328, 1402, 1475, 1549, 1624, 1700, 1775],
  310: [974, 1034, 1095, 1155, 1224, 1292, 1361, 1435, 1510, 1584, 1660, 1736, 1812],
};

const FEMALE_THRESHOLDS = {
   90: [188, 214, 239, 265, 297, 329, 361, 398, 435, 472, 512, 551, 591],
  100: [208, 235, 262, 289, 322, 356, 389, 427, 465, 503, 544, 585, 626],
  110: [226, 254, 283, 311, 345, 380, 414, 453, 493, 532, 574, 616, 658],
  120: [244, 273, 303, 332, 367, 403, 438, 478, 519, 559, 602, 645, 688],
  130: [261, 291, 322, 352, 388, 425, 461, 502, 544, 585, 629, 673, 717],
  140: [278, 309, 340, 371, 408, 445, 482, 524, 567, 609, 654, 699, 744],
  150: [293, 325, 357, 389, 427, 465, 503, 546, 589, 632, 678, 723, 769],
  160: [308, 341, 373, 406, 445, 484, 523, 567, 610, 654, 700, 747, 793],
  170: [323, 356, 389, 422, 462, 501, 541, 586, 630, 675, 722, 769, 816],
  180: [337, 371, 404, 438, 478, 519, 559, 604, 650, 695, 743, 790, 838],
  190: [350, 385, 419, 454, 495, 536, 577, 623, 668, 714, 762, 811, 859],
  200: [363, 398, 433, 468, 510, 551, 593, 640, 686, 733, 782, 831, 880],
  210: [375, 411, 447, 483, 525, 567, 609, 656, 703, 750, 800, 849, 899],
  220: [388, 424, 460, 496, 539, 582, 625, 673, 720, 768, 818, 868, 918],
  230: [399, 436, 473, 510, 553, 597, 640, 688, 736, 784, 835, 885, 936],
  240: [411, 448, 486, 523, 567, 610, 654, 703, 751, 800, 851, 902, 953],
  250: [422, 460, 497, 535, 579, 624, 668, 717, 767, 816, 867, 919, 970],
  260: [433, 471, 509, 547, 592, 637, 682, 732, 781, 831, 883, 935, 987],
};

const FINE_LABELS = [
  'Beginner 1', 'Beginner 2', 'Beginner 3',
  'Novice 1', 'Novice 2', 'Novice 3',
  'Intermediate 1', 'Intermediate 2', 'Intermediate 3',
  'Advanced 1', 'Advanced 2', 'Advanced 3',
  'Elite',
];

const COARSE_BY_INDEX = [
  'Beginner', 'Beginner', 'Beginner',
  'Novice', 'Novice', 'Novice',
  'Intermediate', 'Intermediate', 'Intermediate',
  'Advanced', 'Advanced', 'Advanced',
  'Elite',
];

const ELITE_INDEX = 12;

// "other" rolls to male table, matching server behavior at userController.js:33.
function tableFor(sex) {
  return sex === 'female' ? FEMALE_THRESHOLDS : MALE_THRESHOLDS;
}

function bucketBodyweight(sex, bodyweight) {
  const bw = Number(bodyweight);
  const isFemale = sex === 'female';
  const min = isFemale ? 90 : 110;
  const max = isFemale ? 260 : 310;
  const stepped = Math.floor(bw / 10) * 10;
  return Math.max(min, Math.min(max, stepped));
}

function getThresholds(sex, bodyweight) {
  const row = bucketBodyweight(sex, bodyweight);
  return tableFor(sex)[row];
}

// >= comparison: a total exactly at a threshold promotes to that level.
function findFineIndex(thresholds, total) {
  const t = Number(total);
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (t >= thresholds[i]) idx = i;
    else break;
  }
  return idx;
}

/**
 * Classify a user's big-3 total into one of 13 fine levels.
 *
 * @param {object} params
 * @param {'female'|'male'|'other'|string|undefined} params.sex
 *   `"female"` uses female table; any other value (including `"other"`,
 *   `undefined`, `null`) uses the male table.
 * @param {number|string} params.bodyweight  Floored to the nearest 10
 *   and clamped to the row range (male 110–310, female 90–260).
 * @param {number|string} params.total  Sum of bench + squat + deadlift.
 *   Coerced via `Number()`.
 *
 * @returns {string} One of the 13 labels: `"Beginner 1"`..`"Beginner 3"`,
 *   `"Novice 1"`..`"Novice 3"`, `"Intermediate 1"`..`"Intermediate 3"`,
 *   `"Advanced 1"`..`"Advanced 3"`, `"Elite"`. Totals below the first
 *   threshold floor to `"Beginner 1"`; totals at or above the Elite
 *   threshold are `"Elite"`.
 *
 * @example
 * fineLevel({ sex: 'male', bodyweight: 200, total: 686 })  // 'Beginner 2' (exact threshold)
 * fineLevel({ sex: 'male', bodyweight: 200, total: 685 })  // 'Beginner 1'
 * fineLevel({ sex: 'female', bodyweight: 150, total: 503 })  // 'Intermediate 1'
 * fineLevel({ sex: 'other', bodyweight: 200, total: 686 })  // 'Beginner 2' (male table)
 */
export function fineLevel({ sex, bodyweight, total }) {
  const thresholds = getThresholds(sex, bodyweight);
  const idx = findFineIndex(thresholds, total);
  return FINE_LABELS[idx];
}

/**
 * Roll a fine label up to its coarse (5-level) bucket.
 *
 * @param {string} fineLabel  One of the 13 fine labels.
 *
 * @returns {string|null} One of `"Beginner"`, `"Novice"`,
 *   `"Intermediate"`, `"Advanced"`, `"Elite"`. Returns `null` for any
 *   unrecognized label (including empty string, `null`, `undefined`,
 *   or case-mismatched inputs — the lookup is exact).
 *
 * @example
 * coarseLevel('Beginner 2')   // 'Beginner'
 * coarseLevel('Elite')        // 'Elite'
 * coarseLevel('Unknown')      // null
 * coarseLevel('beginner 1')   // null (case-sensitive)
 */
export function coarseLevel(fineLabel) {
  const idx = FINE_LABELS.indexOf(fineLabel);
  return idx === -1 ? null : COARSE_BY_INDEX[idx];
}

/**
 * Resolve a user's full progress shape: current level, next level,
 * and remaining lbs to advance.
 *
 * @param {object} params  Same as `fineLevel`.
 *
 * @returns {{
 *   fineLevel: string,
 *   coarseLevel: string,
 *   currentThreshold: number,
 *   nextThreshold: number|null,
 *   nextLevel: string|null,
 *   lbsToNext: number|null,
 * }}
 *   For Elite users, `nextThreshold`, `nextLevel`, and `lbsToNext` are
 *   all `null` (no higher tier). For all other levels, `lbsToNext` is
 *   clamped to 0 via `Math.max` — the guard handles edge inputs but
 *   isn't normally exercised on monotonic totals.
 *
 * @example
 * levelProgress({ sex: 'male', bodyweight: 200, total: 841 })
 * // {
 * //   fineLevel: 'Novice 2', coarseLevel: 'Novice',
 * //   currentThreshold: 841, nextThreshold: 899,
 * //   nextLevel: 'Novice 3', lbsToNext: 58,
 * // }
 *
 * levelProgress({ sex: 'male', bodyweight: 200, total: 1339 })
 * // {
 * //   fineLevel: 'Elite', coarseLevel: 'Elite',
 * //   currentThreshold: 1339, nextThreshold: null,
 * //   nextLevel: null, lbsToNext: null,
 * // }
 */
export function levelProgress({ sex, bodyweight, total }) {
  const thresholds = getThresholds(sex, bodyweight);
  const idx = findFineIndex(thresholds, total);
  const fine = FINE_LABELS[idx];
  const coarse = COARSE_BY_INDEX[idx];

  if (idx === ELITE_INDEX) {
    return {
      fineLevel: fine,
      coarseLevel: coarse,
      currentThreshold: thresholds[idx],
      nextThreshold: null,
      nextLevel: null,
      lbsToNext: null,
    };
  }

  const nextThreshold = thresholds[idx + 1];
  return {
    fineLevel: fine,
    coarseLevel: coarse,
    currentThreshold: thresholds[idx],
    nextThreshold,
    nextLevel: FINE_LABELS[idx + 1],
    lbsToNext: Math.max(0, nextThreshold - Number(total)),
  };
}

/**
 * Sum of bench + squat + deadlift from a maxes-shaped object.
 *
 * Per-lift null/undefined values coerce to 0 in the sum (a user with
 * `bench=245, squat=null, deadlift=null` totals 245 — they're not at
 * level 0, they're at the level 245 implies). Defensive against
 * null/undefined `maxes` too.
 *
 * @param {{bench?: number|string|null, squat?: number|string|null, deadlift?: number|string|null} | null | undefined} maxes
 *
 * @returns {number} Sum of the three lifts. Each lift `Number()`-coerced
 *   with `?? 0` fallback for null/undefined.
 *
 * @example
 * bigThreeTotal({ bench: 100, squat: 200, deadlift: 300 })  // 600
 * bigThreeTotal({ bench: 245, squat: null, deadlift: null })  // 245
 * bigThreeTotal({})       // 0
 * bigThreeTotal(null)     // 0
 * bigThreeTotal(undefined)  // 0
 */
export function bigThreeTotal(maxes) {
  return Number(maxes?.bench ?? 0)
       + Number(maxes?.squat ?? 0)
       + Number(maxes?.deadlift ?? 0);
}

/**
 * Resolve a user's big-3 total. Source-of-truth is
 * `estimated_one_rep_maxes`; falls back to `current_one_rep_maxes`
 * only when estimated is missing or all-null.
 *
 * **Per-source fallback, NOT per-lift.** If estimated has ANY non-null
 * lift, the entire sum comes from estimated (remaining nulls coerce
 * to 0 inside `bigThreeTotal`). Only fall back to current when all
 * three estimated lifts are null. This protects two transition states:
 *   1. Pre-migration users whose docs predate `estimated_one_rep_maxes`
 *      — estimated is undefined → fall to current.
 *   2. Post-Phase-2 / pre-feature-trigger users whose estimated dict
 *      exists but is all-null — fall to current so their level isn't
 *      0 until they log their first big-3 workout.
 *
 * Do NOT layer a per-lift merge (e.g., `estimated.bench ?? current.bench`).
 * Cross-source mixing would let stale current values leak into otherwise-
 * fresh estimated state and is explicitly out of scope.
 *
 * @param {{
 *   estimated_one_rep_maxes?: object|null,
 *   current_one_rep_maxes?: object|null
 * } | null | undefined} user
 *
 * @returns {number} Big-3 total per the source-resolution rule above.
 *   Defensive against null/undefined user.
 *
 * @example
 * bigThreeTotalForUser({
 *   estimated_one_rep_maxes: { bench: 245, squat: null, deadlift: null },
 *   current_one_rep_maxes:   { bench: 200, squat: 300, deadlift: 400 },
 * })  // 245 — estimated wins because it has a non-null lift
 *
 * bigThreeTotalForUser({
 *   estimated_one_rep_maxes: { bench: null, squat: null, deadlift: null },
 *   current_one_rep_maxes:   { bench: 200, squat: 300, deadlift: 400 },
 * })  // 900 — estimated all-null, fall to current
 */
export function bigThreeTotalForUser(user) {
  const est = user?.estimated_one_rep_maxes;
  if (est && (est.bench != null || est.squat != null || est.deadlift != null)) {
    return bigThreeTotal(est);
  }
  return bigThreeTotal(user?.current_one_rep_maxes);
}

/**
 * True iff the user has NEVER recorded any 1RM in either field —
 * neither `estimated_one_rep_maxes` nor `current_one_rep_maxes` has
 * a single non-null lift.
 *
 * Stricter than `bigThreeTotalForUser(user) === 0`: a user with
 * explicit zeros (e.g. `current = { bench: 0, ... }`) is NOT
 * null-state because they've entered data, the data just sums to
 * zero. Such a user gets the normal Beginner-1-at-0% badge; only
 * the EVER-never-entered case gets the alternate empty-state element.
 *
 * @param {{
 *   estimated_one_rep_maxes?: object|null,
 *   current_one_rep_maxes?: object|null
 * } | null | undefined} user
 *
 * @returns {boolean} `true` if both fields are absent or all-null.
 *
 * @example
 * isNullState(null)  // true
 * isNullState({})    // true
 * isNullState({ current_one_rep_maxes: { bench: 0, squat: 0, deadlift: 0 } })  // false — explicit zeros count as data
 * isNullState({ estimated_one_rep_maxes: { bench: 100 } })  // false
 */
export function isNullState(user) {
  const est = user?.estimated_one_rep_maxes;
  const cur = user?.current_one_rep_maxes;
  const estHasAny = est && (est.bench != null || est.squat != null || est.deadlift != null);
  const curHasAny = cur && (cur.bench != null || cur.squat != null || cur.deadlift != null);
  return !estHasAny && !curHasAny;
}

/**
 * Mirror the `/classification` response into UserContext so home /
 * settings / post-workout displays render correctly without requiring
 * log-out + log-in.
 *
 * Consumed by 4 sites:
 *   - `pickNewProgram.jsx handleSubmit`  — Pattern A (re-classification)
 *   - `day.jsx handleContinue`           — Pattern A (re-classification)
 *   - `logger.jsx handleContinue`        — Pattern A (re-classification, PB re-fetch)
 *   - `loadingPage.jsx onboarding branch` — Pattern B (onboarding, +gender +onboardingComplete)
 *
 * **Mode parameter mirrors the server-side branching** in
 * `userController.js`'s classification handler:
 *   - `"set-actual"` (default) — mirror bodyweight,
 *     `current_one_rep_maxes`, AND `estimated_one_rep_maxes` (hard
 *     override — actual is authoritative).
 *   - `"reclassify-only"` — mirror ONLY `current_classification`. Do
 *     NOT touch bodyweight or either max field. Use this in the
 *     post-workout flow where the server is just recomputing
 *     classification from a payload that does NOT represent fresh
 *     user-entered actuals.
 *
 * **Optional-field semantics**: `gender`, `onboardingComplete`, and
 * `classData.beginner1Anchor` are mirrored when the field is defined
 * (`!== undefined`). An explicit `null` IS mirrored — only
 * `undefined` is treated as "don't touch". Symmetric to how server
 * `buildUserResponse` distinguishes null (explicit) from missing.
 *
 * **beginner_1_anchor sticky semantics**: server includes this in
 * every classification response (the just-written value when the
 * anchor fired this call, OR the existing value otherwise). Mirror
 * unconditionally — re-mirroring an unchanged value is a no-op.
 *
 * Symmetry: server `buildUserResponse` produces the canonical user-doc
 * shape; this helper consumes the `/classification` response and
 * merges it with form data into UserContext. Producer-consumer pair
 * across the boundary.
 *
 * The resolve-then-sum pattern at `day.jsx` + `logger.jsx
 * handleContinue` (PB-with-fallback resolution that produces `oneRMs`)
 * stays inline — same separation principle as `bigThreeTotal`. Helper
 * trusts caller to pass already-resolved `oneRMs`; it only
 * Number-coerces bodyweight (the always-known scalar).
 *
 * @param {object} params
 * @param {object} params.user  Current user object; spread first so
 *   unrelated fields survive untouched.
 * @param {{classification: string, beginner1Anchor?: number|null}} params.classData
 *   The `/classification` response from the server.
 * @param {number|string} params.bodyweight  Number-coerced. Ignored
 *   when `mode === "reclassify-only"`.
 * @param {object} params.oneRMs  Already-resolved big-3 maxes. Written
 *   to BOTH `current_one_rep_maxes` and `estimated_one_rep_maxes` in
 *   `"set-actual"` mode (same reference). Ignored in `"reclassify-only"`.
 * @param {string} [params.gender]  Onboarding only. Applied when defined.
 * @param {boolean} [params.onboardingComplete]  Onboarding only.
 *   Applied when defined (including `false`).
 * @param {'set-actual'|'reclassify-only'} [params.mode='set-actual']
 *
 * @returns {object} New user object (spread + mutations applied per mode).
 */
export function mirrorClassificationResponse({ user, classData, bodyweight, oneRMs, gender, onboardingComplete, mode = "set-actual" }) {
  const isReclassifyOnly = mode === "reclassify-only";
  const next = {
    ...user,
    current_classification: classData.classification,
  };
  if (!isReclassifyOnly) {
    next.current_bodyweight = Number(bodyweight);
    next.current_one_rep_maxes = oneRMs;
    next.estimated_one_rep_maxes = oneRMs;
  }
  if (gender !== undefined) next.gender = gender;
  if (onboardingComplete !== undefined) next.onboarding_complete = onboardingComplete;
  if (classData.beginner1Anchor !== undefined) {
    next.beginner_1_anchor = classData.beginner1Anchor;
  }
  return next;
}
