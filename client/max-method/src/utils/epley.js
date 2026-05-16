// Pure 1RM estimation utilities. Twin of Backend_structure/src/utils/epley.js.
// Kept in sync by code review — the two files MUST match because they back
// the same feature on opposite sides of the network boundary (server uses it
// for the post-log estimate, client uses it for the OneRMCalc tool).
//
// Epley: 1RM = weight × (1 + reps / 30). A true 1-rep set IS the 1RM, so we
// special-case reps===1 instead of letting the formula's 1.033× artifact
// inflate it. Sets outside the [1, 15] rep range are skipped.

export function estimateOneRepMax(weight, reps, { allowHighReps = false } = {}) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (!Number.isInteger(r) || r < 1) return null;
  if (!allowHighReps && r > 15) return null;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

export function floorTo5(n) {
  if (!Number.isFinite(n)) return null;
  return Math.floor(n / 5) * 5;
}

export function topSetEpley(sets) {
  let best = null;
  for (const set of sets ?? []) {
    const e = estimateOneRepMax(set?.weight, set?.reps);
    if (e == null) continue;
    if (best == null || e > best.e1RM) {
      best = { weight: Number(set.weight), reps: Number(set.reps), e1RM: e };
    }
  }
  return best;
}
