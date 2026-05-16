// MIRROR: keep in sync with
// Backend_structure/src/utils/exerciseNameNormalize.js. The ALIASES map and
// canonicalExerciseName signature must match the server twin — both files
// back the same write/read canonicalization on opposite sides of the
// network boundary. Drift would mean a Back Squat workout's PB writes land
// on Squat (server canonicalizes at write) but reads continue to miss it
// (client doesn't canonicalize lookups).
//
// The getPersonalBest helper below is CLIENT-ONLY — server reads from
// personal_bests inside the same file as the normalizer and applies it
// directly. No server twin needed for the helper.

const ALIASES = {
  "back squat": "Squat",
};

export function canonicalExerciseName(name) {
  if (typeof name !== "string") return name;
  const aliased = ALIASES[name.trim().toLowerCase()];
  return aliased ?? name;
}

// Centralized read accessor for per-exercise PB lookups. Canonicalizes the
// key before indexing into the personalBests object, so a slot labeled
// "Back Squat" correctly resolves to personal_bests.Squat. Fallback param
// matches the convention at each call site (?? 0 for PR-detection sites,
// ?? null for display sites).
//
// Adding a future alias = one edit to the ALIASES map above; every call
// site benefits automatically. Adding a future read site = call this
// helper; no risk of forgetting to canonicalize.
export function getPersonalBest(personalBests, exerciseName, fallback = 0) {
  return personalBests?.[canonicalExerciseName(exerciseName)] ?? fallback;
}
