# Exercise-map truth table

> Created: 2026-05-18 (Batch 3, Phase C). Two parts:
> 1. **Cross-file shape inventory** for the four maps named in the Batch 3 plan (`MOVEMENT_PATTERNS`, `EXERCISE_EQUIPMENT`, `PATTERN_MUSCLES`, `VIDEO_NAME_ALIASES`) — feeds the `config/exercises.js` consolidation.
> 2. **Within-file duplicate triage** for the 32 `no-dupe-keys` ESLint violations baselined in `eslint-suppressions.json` (22 in `exerciseLibrary.jsx`, 10 in `reviewProgram.jsx`) — feeds the dedup decision per [`docs/decisions.md#within-file-key-duplication-finding`](../decisions.md#within-file-key-duplication-finding) and [`docs/follow-ups.md#exercise-map-dedup-rule`](../follow-ups.md#exercise-map-dedup-rule).
>
> **How to read this artifact:** Part 1 establishes whether the maps that *appear* duplicated across files actually *are* duplicates. Part 2 establishes whether the within-file duplicate keys cause silent data loss (per the ADR's framing) or are cosmetic. Both parts use direct extraction from the source files (via a one-off Node script that parses the object literals); ground truth is the actual bytes in `pages/exerciseLibrary.jsx`, `pages/reviewProgram.jsx`, and `pages/day.jsx` at the Batch 3 starting commit.

---

## Part 1 — Cross-file shape inventory

### `EXERCISE_EQUIPMENT`

**Defined in 3 files:**

| File | Line | Total entries | Unique keys | Within-file dupes |
|---|---|---|---|---|
| `pages/exerciseLibrary.jsx` | 327 | 174 | 152 | 22 |
| `pages/reviewProgram.jsx` | 8 | 164 | 154 | 10 |
| `pages/day.jsx` | 123 | 154 | 154 | 0 |

**Cross-file value comparison** (after collapsing within-file dupes — the "currently observable" mapping per JS semantics):

- **`exerciseLibrary` vs `reviewProgram`** — 152 shared keys, **all values identical**. `reviewProgram` has 2 extra keys not in `exerciseLibrary`: `'Squats'` and `'Back Squat'` (both → `'Barbell'`).
- **`exerciseLibrary` vs `day`** — 152 shared keys, **all values identical**. `day` has the same 2 extra keys as `reviewProgram`: `'Squats'` and `'Back Squat'` (both → `'Barbell'`).
- **`reviewProgram` vs `day`** — 154 keys, **byte-identical** (same key set, same values).

**Root cause of the 2-key divergence (`'Squats'`, `'Back Squat'`):** `exerciseLibrary.jsx:37` defines `EXERCISE_NAME_ALIASES = { 'squats': 'Squat', 'back squat': 'Squat' }` and uses it to normalize names before lookup (line 1272). `reviewProgram.jsx` and `day.jsx` don't have that aliasing layer — they look up `EXERCISE_EQUIPMENT[name]` directly with the raw program-data names. So `'Squats'` and `'Back Squat'` must be present as keys in their maps. **Intentional split, not a bug.**

**Implication for `config/exercises.js`:** the consolidated map should include `'Squats': 'Barbell'` and `'Back Squat': 'Barbell'` (the superset that satisfies both call patterns). `exerciseLibrary.jsx`'s aliasing layer keeps doing its thing on top, redundantly normalizing names that are already in the map — harmless, and the aliasing layer survives because `EXERCISE_NAME_ALIASES` is out of scope for Batch 3.

**Verdict:** Maps are functionally equivalent after dedup. One-line cross-file divergence is intentional.

---

### `MOVEMENT_PATTERNS`

**Defined in 2 files:**

| File | Line | Total entries | Unique keys | Within-file dupes |
|---|---|---|---|---|
| `pages/exerciseLibrary.jsx` | 58 | 22 | 22 | 0 |
| `pages/reviewProgram.jsx` | 61 | 22 | 22 | 0 |

**Cross-file value comparison:** all 22 keys identical. **1 key has divergent values:**

| Key | `exerciseLibrary` | `reviewProgram` |
|---|---|---|
| `'Squat Pattern'` | `['Squat','Front Squat','SSB Squats','Box Squats','Bodyweight Squat','Pendulum Squat','Leg Press','Goblet Squat','Zercher Squat']` (9 entries) | `['Squat','Front Squat','SSB Squats','Squats','Back Squat','Box Squats','Bodyweight Squat','Pendulum Squat','Leg Press','Goblet Squat','Zercher Squat']` (11 entries) |

`reviewProgram` adds `'Squats'` and `'Back Squat'` to the alternatives array. **Same root cause as `EXERCISE_EQUIPMENT`'s 2-key divergence** — `exerciseLibrary` normalizes through `EXERCISE_NAME_ALIASES`, `reviewProgram` doesn't. Intentional.

**Important asymmetry with `EXERCISE_EQUIPMENT`'s "superset is safe" verdict.** Both `EXERCISE_EQUIPMENT` and `MOVEMENT_PATTERNS` have the same 2-key cross-file divergence with the same root cause, but the **consumer-side handling differs**:

- `EXERCISE_EQUIPMENT` is consumed by passive lookup everywhere (e.g. `EXERCISE_EQUIPMENT[name] || null`, `EXERCISE_EQUIPMENT[selected]`, or as a prop forwarded to `EquipmentSelect` for lookup). Extra keys in the map are unreachable from a given consumer's lookup pattern but harmless — they just sit unused. A 154-key superset is safe.
- `MOVEMENT_PATTERNS` is **iterated** at `exerciseLibrary.jsx:406` (`buildExerciseList`): every name in every pattern's array becomes an exercise card in the library UI. Including `'Squats'` and `'Back Squat'` in the canonical `'Squat Pattern'` array would generate **duplicate library cards** ("Squat", "Squats", "Back Squat" as three separate cards) — a real, user-visible behavior change in `exerciseLibrary`.

**Implication for `config/exercises.js` consolidation strategy.** The asymmetry means "take the superset" is not the right strategy for `MOVEMENT_PATTERNS`. Three candidate strategies were considered:

1. **9-entry canonical (`exerciseLibrary`'s version) in `config/exercises.js`; `reviewProgram` retains its local 11-entry definition until Batch 11.** Minimal behavior change at consolidation time. Defers the consumer-pattern unification question to the consumer's own batch.
2. **Two named maps in `config/exercises.js`** — e.g. `MOVEMENT_PATTERNS_CANONICAL` (9-entry, for iteration / card-rendering) and `MOVEMENT_PATTERNS_WITH_ALIASES` (11-entry, for swap-UI lookup). Honest about the asymmetry; consumers pick the right one.
3. **11-entry canonical, `exerciseLibrary`'s `buildExerciseList` gets a deduplication step in Batch 12** when it migrates. Keeps one canonical map; pushes the consumer-side dedup into the consumer's batch.

**Decision: Option 1** — 9-entry canonical in `config/exercises.js`. `reviewProgram.jsx` keeps its 11-entry local definition until Batch 11 migrates it.

Reasoning:
- The 9-entry version *is* the canonical for the iteration consumer (`exerciseLibrary`'s `buildExerciseList`, verified at lines 406–419: raw iteration, no dedup, no alias-skip — every name in every pattern array becomes a card with that exact name as `.name` and as part of the `.id`). The 2 extra entries in `reviewProgram` are alias names that semantically resolve to the same canonical item, which is what `exerciseLibrary.jsx:37`'s `EXERCISE_NAME_ALIASES` already represents at that site. The architecture suggests aliases-as-normalization is the right shape; `reviewProgram` simply doesn't use it yet.
- Option 2 invents a permanent API shape (two named maps) to encode a current accident. Per the codebase's session conventions (Meta-Rule #4, *when in doubt about sharing, don't*), shape variants like `_CANONICAL` vs `_WITH_ALIASES` differing by 2 entries is exactly the speculative API that the rule warns against.
- Option 3 forces a Batch 12 decision now (how `exerciseLibrary` dedups when it migrates). Option 1 defers each consumer's decision to its own batch — the framework's discipline of "decide at the call site, not in advance."

**Follow-up entry filed.** `reviewProgram`'s migration in Batch 11 will need to decide between (a) keeping its local 2-entry extension, (b) adopting `exerciseLibrary`'s `EXERCISE_NAME_ALIASES` normalization, or (c) moving `EXERCISE_NAME_ALIASES` into `config/exercises.js` for shared use across consumers. Tracked at [`docs/follow-ups.md#reviewprogram-movement-patterns-alias-strategy`](../follow-ups.md#reviewprogram-movement-patterns-alias-strategy).

**Verdict:** 21 of 22 keys byte-identical. 1 key diverges intentionally. Consolidate using the 9-entry canonical; `reviewProgram` extends locally until Batch 11.

---

### `PATTERN_MUSCLES`

**Defined in 1 file:**

| File | Line | Total entries | Unique keys | Within-file dupes |
|---|---|---|---|---|
| `pages/exerciseLibrary.jsx` | 93 | 22 | 22 | 0 |

**Cross-file question:** N/A. Single site. Move verbatim into `config/exercises.js`.

**Verdict:** No divergence to resolve.

---

### `VIDEO_NAME_ALIASES`

**Defined in 1 file:**

| File | Line | Total entries | Unique keys | Within-file dupes |
|---|---|---|---|---|
| `pages/exerciseLibrary.jsx` | 29 | 1 | 1 | 0 |

Content: `{ 'Close Grip Lat Pulldowns': 'Close Grip Pulldowns' }`.

**Cross-file question:** N/A. Single site, single entry. Move verbatim into `config/exercises.js` (or consider whether such a tiny map warrants its own export — design decision deferred to C.3).

**Verdict:** No divergence to resolve.

---

## Part 1 summary

| Map | Sites | Cross-file verdict |
|---|---|---|
| `EXERCISE_EQUIPMENT` | 3 | 152 shared keys identical; `reviewProgram`/`day` have 2 extra (`'Squats'`, `'Back Squat'`) by design — `exerciseLibrary` aliases instead. Consumed via passive lookup at all sites → extra keys are harmless. **Consolidate as the 154-key superset.** |
| `MOVEMENT_PATTERNS` | 2 | All 22 keys present; 21 identical, `'Squat Pattern'` diverges by 2 entries (same root cause). `exerciseLibrary` iterates this map's arrays to build library cards, so adding aliases would duplicate UI. **Decision: 9-entry canonical** — `reviewProgram` keeps its 2-entry local extension until Batch 11 (see follow-up `#reviewprogram-movement-patterns-alias-strategy`). |
| `PATTERN_MUSCLES` | 1 | N/A — single site, move verbatim. |
| `VIDEO_NAME_ALIASES` | 1 | N/A — single site, move verbatim. |

**No bug-tier cross-file mismatches surfaced.** The only cross-file divergence (2 squat-name variants) is the deliberate consequence of `exerciseLibrary.jsx`'s aliasing layer. The consolidation strategy is "take the 154-key superset" for `EXERCISE_EQUIPMENT` (safe — passive lookup at every consumer) and "take the 9-entry canonical" for `MOVEMENT_PATTERNS` (with `reviewProgram` retaining its 2-entry local extension until Batch 11 — see the section above and the follow-up entry).

---

## Part 2 — Within-file duplicate triage

### Key finding

**All 32 within-file duplicate keys have *identical values* on both sides.** Every duplicate in both files is a `'Bodyweight'` → `'Bodyweight'` mapping. The "later silently overwrites earlier" pattern that the [`#within-file-key-duplication-finding`](../decisions.md#within-file-key-duplication-finding) ADR worried about *is technically true* (the JS engine does pick the later one) but **observationally inert** (the two values are equal, so observable behavior is the same either way).

The ADR explicitly named this as a revisit-condition: *"Batch 3 ground-truthing reveals the duplicates aren't actually silent (e.g., they're identical values and the duplication is cosmetic) — then this ADR amends to reflect that and the work changes shape."* This is that case. The duplicates are **cosmetic**, not data-losing.

**Implications:**

1. The default decision for every row is "keep later as canonical" — but since "later" == "earlier" in every case, the choice is observationally moot. No "earlier should win" determinations exist; nothing requires sign-off as a behavior change.
2. `config/exercises.js`'s consolidated `EXERCISE_EQUIPMENT` includes each duplicated key exactly once with the (shared, identical) value. Net effect: 22 fewer rows in `exerciseLibrary`'s eventual `config/exercises.js` consumption (Batch 12) and 10 fewer in `reviewProgram`'s (Batch 11), with **zero observable behavior change**.
3. The `no-dupe-keys` ESLint suppressions on the two files don't shrink in Batch 3 — per the original plan, they shrink in Batches 11/12 when the source files migrate to consume `config/exercises.js` and the duplicate keys physically go away.
4. The `#within-file-key-duplication-finding` ADR should be amended (in this batch or its PR summary) to reflect that the duplicates are cosmetic rather than data-losing. The amendment doesn't change the resolution; it corrects the framing for the historical record.

### Layout pattern

Both files have a trailing block where keys already declared above get re-declared with the same `'Bodyweight'` value. The blocks look like:

- **`exerciseLibrary.jsx`** lines 390–399, marked `// Bodyweight exercises` — adds the new keys (`Banded Tibia Raises`, `Incline Pushups`, `Diamond Pushups`, `Wide Pushups`, `Inverted Bodyweight Row`, `Burpees`) alongside 22 re-declarations.
- **`reviewProgram.jsx`** lines 51–57, marked `// Additional bodyweight exercises from backend patterns` — adds the same 6 new keys alongside 10 re-declarations.

The pattern is consistent with someone adding the "extra bodyweight exercises" later as a discrete code block, copy-pasting from a backend reference that listed every bodyweight exercise (including ones already in the maps), and never noticing that the block redundantly re-declared keys that were already set above with the same value.

### Entries — all 32 enumerated

Compact tabular format: file, key, dupe line (where the redundant later occurrence sits — the operationally useful coordinate for Batches 11/12 to delete from source), earlier value (the JS-overwritten one), later value (the JS-engine-winning one), decision. The "identical values" finding above means **every row's earlier and later columns hold the same string** — `'Bodyweight'` on both sides for all 32 — and every decision is "keep later (cosmetic, no behavior change)." The uniformity of the table is itself the finding.

| # | File | Key | Line | Earlier value | Later value | Decision |
|---|---|---|---|---|---|---|
| 1 | `exerciseLibrary.jsx` | `'Pullups'` | 391 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 2 | `exerciseLibrary.jsx` | `'Chin Ups'` | 391 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 3 | `exerciseLibrary.jsx` | `'Neutral Grip Pullups'` | 391 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 4 | `exerciseLibrary.jsx` | `'Dips'` | 392 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 5 | `exerciseLibrary.jsx` | `'Pushups'` | 392 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 6 | `exerciseLibrary.jsx` | `'Nordics'` | 393 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 7 | `exerciseLibrary.jsx` | `'Bodyweight Back Extensions'` | 393 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 8 | `exerciseLibrary.jsx` | `'GHD Raises'` | 393 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 9 | `exerciseLibrary.jsx` | `'Bodyweight Calf Raises'` | 394 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 10 | `exerciseLibrary.jsx` | `'Tibia Raises'` | 394 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 11 | `exerciseLibrary.jsx` | `'Banded Tibia Curls'` | 394 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 12 | `exerciseLibrary.jsx` | `'Plank'` | 395 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 13 | `exerciseLibrary.jsx` | `'Ab Wheel Rollouts'` | 395 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 14 | `exerciseLibrary.jsx` | `'Hanging Leg Raises'` | 395 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 15 | `exerciseLibrary.jsx` | `'Decline Crunches'` | 395 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 16 | `exerciseLibrary.jsx` | `'Dead Bugs'` | 395 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 17 | `exerciseLibrary.jsx` | `'Bodyweight Squat'` | 396 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 18 | `exerciseLibrary.jsx` | `'Bodyweight Lunges'` | 396 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 19 | `exerciseLibrary.jsx` | `'Bodyweight ATG Lunges'` | 396 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 20 | `exerciseLibrary.jsx` | `'Bodyweight Bulgarians'` | 397 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 21 | `exerciseLibrary.jsx` | `'Bodyweight Hip Thrusts'` | 397 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 22 | `exerciseLibrary.jsx` | `'Bodyweight Glute Bridges'` | 397 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 23 | `reviewProgram.jsx` | `'Bodyweight Squat'` | 54 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 24 | `reviewProgram.jsx` | `'Bodyweight Lunges'` | 54 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 25 | `reviewProgram.jsx` | `'Bodyweight ATG Lunges'` | 54 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 26 | `reviewProgram.jsx` | `'Bodyweight Bulgarians'` | 55 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 27 | `reviewProgram.jsx` | `'Bodyweight Hip Thrusts'` | 55 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 28 | `reviewProgram.jsx` | `'Bodyweight Glute Bridges'` | 55 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 29 | `reviewProgram.jsx` | `'Bodyweight Back Extensions'` | 56 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 30 | `reviewProgram.jsx` | `'Nordics'` | 56 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 31 | `reviewProgram.jsx` | `'GHD Raises'` | 56 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |
| 32 | `reviewProgram.jsx` | `'Bodyweight Calf Raises'` | 57 | `'Bodyweight'` | `'Bodyweight'` | keep later (cosmetic) |

**Counts:** 22 entries in `exerciseLibrary.jsx` (rows 1–22) and 10 in `reviewProgram.jsx` (rows 23–32) — match the ESLint baseline in `client/max-method/eslint-suppressions.json`.

**Operational use for Batches 11/12.** When `reviewProgram.jsx` (Batch 11) and `exerciseLibrary.jsx` (Batch 12) migrate to consume `config/exercises.js`, the dupe-key lines in the table's `Line` column are the ones to delete from the source file. The earlier occurrence stays. The `no-dupe-keys` suppressions for the two files in `eslint-suppressions.json` shrink to zero at that point.
