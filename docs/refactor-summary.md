# Frontend Refactor, Documentation & Test Coverage — Initiative Summary

> **Status: complete.** Batches 0–16 merged to `dev` between 2026-05-17 and 2026-06-08 (PRs #79–#100).
> This document is the retrospective for the whole initiative. For *why* behind any
> specific decision, follow the links into [`docs/decisions.md`](decisions.md); for
> deferred work, [`docs/follow-ups.md`](follow-ups.md); for the working rules,
> [`docs/refactor-conventions.md`](refactor-conventions.md).

---

## 1. What this was

`client/max-method/` is a React 19 + Vite single-page app. At the start of this
initiative it **worked in production but had zero automated tests**, two ~700-line
pages with embedded sub-components, several blocks of duplicated logic, a handful
of latent correctness bugs, and no written record of its load-bearing invariants.

The initiative executed a three-phase brief **while preserving behavior**:

1. **Improve code quality** — extract genuine duplication, remove dead code, fix
   the latent bugs (each surfaced explicitly, never silently).
2. **Document the exported surface** — plain-language JSDoc on every public
   boundary; an ADR trail for every non-obvious decision.
3. **Establish test coverage** — a real test runner and an integration-leaning
   suite that pins behavior *before* any refactor touched a file.

Behavior changes were allowed only with explicit sign-off, and each one is
recorded (see §6).

---

## 2. By the numbers

| Metric | Start | End |
|---|---|---|
| Automated tests | **0** | **744** (49 test files) |
| Test runner | none | Vitest + React Testing Library + MSW |
| CI | none | GitHub Actions (lint + tests, gates merges to `dev`) |
| Source files (non-test) under `src/` | ~40 | 53 |
| ADR entries (`docs/decisions.md`) | 0 | 45 |
| Tracked follow-ups | 0 | 46 active · 7 resolved |
| ESLint baseline violations | 79 (unenforced) | shrinking, CI-enforced |

**Scale:** ~181 commits across the initiative; **124 files changed, +18,811 / −1,658 lines.**

---

## 3. How the work was run (the operating model)

The initiative was deliberately process-heavy because the goal was *trust*, not
just code. The full rules live in
[`docs/refactor-conventions.md`](refactor-conventions.md); the load-bearing ones:

- **One batch = one PR**, branched off the current `dev` tip, sequential, never
  parallel. The agent paused for human review between every batch and never
  auto-merged.
- **A move is not a refactor.** Every extraction was a *verbatim lift* in its own
  commit; cleanup or behavior change came in a separate, later commit only with a
  concrete reason.
- **Surface bugs, don't silently fix.** Every bug got its own commit, a
  characterization test that *failed first*, and a batch-summary note.
- **When in doubt about sharing, don't.** Every "should we share this?" question
  produced a written shape-comparison in [`docs/comparisons/`](comparisons/),
  a decision, and an ADR.
- **Characterization tests first.** For any non-trivial file, tests that pin
  current behavior had to pass against the *unmodified* code before a refactor
  touched it. A test that failed on unmodified code = a bug surfaced.
- **Persist decisions to `docs/`, not chat.** 45 ADRs and 53 follow-up entries are
  the durable record.
- **Match the tool to the question:** RTL = behavior, axe = static a11y, keyboard
  tests = interaction, coverage = diagnostic (never a gate), manual visual check =
  appearance (Batches 10–15 only).

---

## 4. Batch-by-batch

| # | PR | Merged | What landed |
|---|---|---|---|
| **0** | #79 | 05-17 | Repo scaffolding: PR template, CI workflow, `docs/decisions.md`, `docs/follow-ups.md`, the combobox shape-comparison, and `CLAUDE.md` (session conventions complete; codebase conventions left as a Batch-16 placeholder). No source changes. Established the ESLint suppressions baseline (79 pre-existing errors). |
| **1** | #80 | 05-17 | Test infrastructure: Vitest + RTL + `@testing-library/jest-dom` + `user-event` + MSW + jsdom + `vitest-axe`; the three test-lint plugins; `vitest.config.js`; `src/test/setup.js` (browser-API mocks added only where the codebase audit found a real consumer); `src/test/msw/handlers.js`. |
| **2** | #81 | 05-19 | The three **mirrored utils** (`epley`, `classification`, `exerciseNameNormalize`) — exhaustive table-driven tests + JSDoc, **behavior frozen** (they have backend parity fixtures). |
| **3** | #82 | 05-19 | New shared helpers: `utils/dateUtils.js`, `utils/customExercises.js`, and `config/exercises.js` (canonical `MOVEMENT_PATTERNS` / `EXERCISE_EQUIPMENT` / etc.). Ground-truthed the 32 within-file duplicate keys (`no-dupe-keys`) and proved them cosmetic before consolidating. |
| **4** | #83 | 05-19 | Hook docs + tests: `useModalA11y`, `useWorkoutStats` (now consumes `dateUtils`), `usePostWorkoutModal`. Established the modal-a11y test harness pattern and the hook-layer-vs-component-layer pinning rule. |
| **5** | #84 | 05-20 | **Context providers + the WorkoutContext debounce/in-flight-fetch cleanup bug fix** (Risk #8 — `AbortController` + `useRef` timeout). Sibling audit of `UserContext`/`ToolsContext` (findings deferred); cross-page staleness audit (confirmed `personalBests` is the only stale field). |
| **6** | #85 | 05-24 | Tool components (`PlateCalc` table-driven, `OneRMCalc`, `RPECalc`, `Timer`, `Stopwatch`, FAB family) characterized + JSDoc; backfilled `ToolsContext` characterization. Established the three timer-test patterns. |
| **7** | #86 (+#87, #88) | 05-24 | Primitives (`Toast`, `UserLevelBadge`, `EquipmentSelect`, `ContextMenu`, `MaxMethodLogo`); first snapshot (`UserLevelBadge`); axe on `EquipmentSelect`. **Fix #87:** ContextMenu rAF focus-steal race (post-merge CI). **#88:** pin `.snap` files to LF. |
| **8** | #90 | 06-06 | Post-workout flow (`PostWorkoutModal` + `Screen1/2`): snapshot-lock invariant (Risk #7), axe on the modal, `usePostWorkoutModal` cleanup + cancellation-guard test reshape. |
| **9a** | #91 | 06-06 | Light pages characterized + documented. **Deleted the dead, crash-on-render `classification.jsx`** route. **Onboarding Epley unification** (signed-off behavior change). Locked the title-only day filter (Risk #6) with a ground-truth table. |
| **9b** | #92 | 06-06 | Three bug-fix pages: **`createAcc` axios→fetch** (+ axios removed from deps), **`settings` Rules-of-Hooks fix**, **`viewProgram` title-save cancel-on-unmount**. |
| **10** | #93 (+#89) | 06-06 | Extracted the shared **`RestTimer`** into `components/workout/` (verbatim lift, consumed by `day` + `logger`) after a written shape comparison proved a literal copy. |
| **11** | #94 | 06-06 | `reviewProgram.jsx` consumes `config/exercises.js`; resolved its squat-alias divergence with a documented local overlay. |
| **12** | #95 | 06-06 | `exerciseLibrary.jsx` consumes config; **relocated the `ALL_EXERCISES` catalog and alias map out of the page into `config/`** (removing an upside-down `utils/ → pages/` import) and completed `utils/customExercises.js`. |
| **13** | #96 | 06-06 | Extracted **`hooks/useCombobox.js`** (headless typeahead state machine) and migrated `customDay.jsx` onto it. |
| **14** | #97 | 06-06 | `logger.jsx` consumes `useCombobox`, `customExercises`, and the new shared `utils/restDuration.js`. |
| **15** | #99 (+#98) | 06-07 | `day.jsx` — the final boss: 22 characterization tests + config consumption. Card-internal extraction **deliberately deferred** (single consumer, ~22 props). **Fix #98:** `"Squats" → "Squat"` normalization (a real PB/progression bug). |
| **16** | #100 | 06-08 | Synthesized the codebase-conventions section; brought READMEs current. Docs-only. |

---

## 5. Bugs surfaced & fixed

Each was surfaced explicitly, characterized with a failing-first test, fixed in its
own commit, and recorded.

1. **`WorkoutContext.updateLog` orphan fetch / unmount race** (Risk #8, Batch 5).
   A pending debounce timer and in-flight PATCH had no cleanup. Fixed with a
   `useRef` timeout + `AbortController`. Two real behaviors: each new edit aborts a
   prior in-flight PATCH (stale-write protection), and provider teardown cancels
   pending work. [`#debounce-cleanup-shape`](decisions.md#debounce-cleanup-shape)
2. **`settings.jsx` Rules-of-Hooks ordering** (Risk #11, Batch 9b). An early return
   sat above hook calls. Fixed by moving the return below the hooks + internal
   `if (!user) return` guards in each effect. [`#rules-of-hooks-fix-shape`](decisions.md#rules-of-hooks-fix-shape)
3. **`viewProgram.jsx` orphan title-save** (Batch 9b). The debounced title PATCH had
   no cancel path; same `AbortController` fix shape. [`#viewprogram-title-save-cancel-on-unmount`](decisions.md#viewprogram-title-save-cancel-on-unmount)
4. **`classification.jsx` crash-on-render dead route** (Batch 9a). Reachable from an
   incomplete-onboarding login, it read props it was never passed. **Deleted**; the
   login redirect was repointed to the working `/onboarding`. [`#classification-page-removal`](decisions.md#classification-page-removal)
5. **`"Squats"` not counted toward the Squat PB** (Batch 15, fix #98). Legacy program
   data named `"Squats"` wrote its PB under the wrong key and was excluded from
   big-three progression. Fixed by adding the alias to the *mirrored* normalizer
   (client **and** backend, in lockstep). [`#squat-alias-normalization-coverage`](decisions.md#squat-alias-normalization-coverage)
6. **`ContextMenu` rAF focus-steal race** (fix #87). Two focus mechanisms raced on
   open; fixed at the source by targeting the live highlight, not a fixed position.
7. **32 within-file duplicate object keys** (`no-dupe-keys`, Batch 3). Ground-truthed
   as cosmetic (identical values) before consolidation — *not* the runtime data loss
   first feared. [`#within-file-key-duplication-finding`](decisions.md#within-file-key-duplication-finding)
8. **`usePostWorkoutModal` dead `personalBests` subscription** + React-19-invisible
   cancellation-guard tests (Batch 8) — removed the dead subscribe; reshaped the
   tests into real regression armor.

A recurring discovery — the **in-flight-fetch-no-cleanup** shape — was audited
across all three contexts; the remaining low-impact idempotent-GET instances were
deferred with rationale rather than force-fixed.

---

## 6. Deliberate behavior changes (signed off)

The initiative was behavior-preserving by default. These are the exceptions, each
user-confirmed and documented:

- **Onboarding 1RM estimation** (Batch 9a): entered-best-set baselines now use
  `floorTo5(estimateOneRepMax(...))` instead of a private percentage table — one
  estimator across the whole app. Baselines estimate slightly higher and floor (not
  round) to the nearest 5. [`#onboarding-epley-unification`](decisions.md#onboarding-epley-unification)
- **`day.jsx` swap-list de-aliasing** (Batch 15): the Hinge swap list now offers
  `Deadlift`; the Squat list offers the canonical `Squat` and drops the legacy
  `Squats`/`Back Squat` *pick-list* spellings (legacy data still resolves correctly
  on the PB path). [`#day-movement-patterns-consumption`](decisions.md#day-movement-patterns-consumption)
- **Cancel-on-unmount / cross-call abort** semantics in `WorkoutContext` and
  `viewProgram` (Batches 5, 9b) — see §5 #1, #3.
- **`reviewProgram` squat-swap reorder** (Batch 11) — cosmetic; the two aliases moved
  to the end of the list, membership unchanged.

---

## 7. Architecture & shared modules created

- **`config/exercises.js`** — the single source of truth for exercise data:
  `MOVEMENT_PATTERNS`, `EXERCISE_EQUIPMENT`, `PATTERN_MUSCLES`, `VIDEO_NAME_ALIASES`,
  `EXERCISE_NAME_ALIASES`, and the `ALL_EXERCISES` catalog. Three pages
  (`reviewProgram`, `exerciseLibrary`, `day`) plus `customDay`/`logger`/`history`
  now consume it; per-page divergences became documented local overlays.
- **`hooks/useCombobox.js`** — headless typeahead state machine + keyboard/ARIA
  contract, shared by `customDay` and `logger` (history kept its own, by decision).
- **`components/workout/`** — first home for UI lifted out of the big workout pages
  (`RestTimer`), with a barrel and a directory README.
- **`utils/dateUtils.js`, `utils/customExercises.js`, `utils/restDuration.js`** —
  extracted duplicated helpers.
- **`createAcc` migrated axios → native fetch**, removing the app's only axios
  dependency (the rest of the app already used `fetch`).

---

## 8. Testing approach

- **Integration-leaning RTL**: real provider tree, MSW backing `fetch`, queries by
  accessible role/name (not `data-testid`).
- **Characterization-first**: tests pin observed behavior before refactors; a
  failing-on-unmodified-code test means a bug, not a bad test.
- **Keyboard contracts** tested with `userEvent.keyboard()` asserting focus + ARIA.
- **Axe** on a11y-load-bearing components (modals, forms, focus-managers); snapshots
  only on three named components, in their settled (non-animating) state.
- **Coverage is diagnostic, never gated.**
- **Hard-won test-design lessons** (all in
  [`refactor-conventions.md` → Surprising things](refactor-conventions.md)): the
  three timer-test patterns; React 19 silently swallows `setState` on unmounted
  components (so cleanup must be pinned via a network/side-effect observable, not an
  absent warning); effect-driven focus needs `await waitFor`; modal harnesses must
  memoize callbacks.
- **ESLint suppressions baseline** captured 79 pre-existing errors so CI could gate
  *new* violations immediately while the bug-tier errors shrank in their assigned
  batches.

---

## 9. Deferred work (the honest backlog)

46 active follow-ups are tracked in [`docs/follow-ups.md`](follow-ups.md). The
notable ones a future contributor should know about:

- **`personalBests` staleness** between `day` and `logger` mid-session — known,
  deferred (design space: refresh-on-mount / subscribe / push / React Query).
- **`day.jsx` card-internal extraction** — deferred after a closure-dependency audit
  (the program card reads ~22 things from scope; single consumer). The 22
  characterization tests are the safety net for whoever takes it on.
- **Remaining in-flight-GET cleanup** in `WorkoutContext.fetchWorkout` and
  `UserContext` bootstrap — low-impact, deferred.
- **Two FE alias maps** (`exerciseNameNormalize.ALIASES` vs
  `config.EXERCISE_NAME_ALIASES`) kept in agreement by hand — dedup tracked.
- **`react-refresh` context split**, **`UserContext` synchronous hydration**,
  **`customWorkout.jsx` heavy refactor**, **`.gitignore` UTF-8 re-save**,
  **`.claude/settings.local.json` should be gitignored**, and several
  inline-domain-helper consolidations (`RPECalc` table, tool time-formatters).

**Explicitly out of scope** (each with an entry): TypeScript migration, `App.css`
decomposition, a React Query data layer, E2E tests (Playwright/Cypress), Storybook,
pre-commit hooks, and a coverage-upload service.

---

## 10. Conventions now in force

Finalized in [`docs/refactor-conventions.md`](refactor-conventions.md) and summarized
for non-technical readers in the root [`CLAUDE.md`](../CLAUDE.md):

- Frontend talks only to `/api/...`; never the DB directly; no client cache layer.
- Three mirrored utils change in lockstep with the backend.
- `config/exercises.js` is the single exercise-data source; pages read from it, not
  the reverse; divergences are documented overlays.
- Two genuinely different things stay two domain-named components (no `isProgramMode`
  flags); >6–7 props or >3 booleans means it's two components.
- Color tokens carry meaning: `--accent` (red) = identity, `--accent-green` =
  completion.
- Tests colocated as `name.test.{js,jsx}`; extension mirrors the source.
- Conventional Commits with scope, body answers *why*, no `Co-Authored-By` trailers.

---

## 11. Pointers

- **Decisions / ADRs**: [`docs/decisions.md`](decisions.md)
- **Follow-ups / backlog**: [`docs/follow-ups.md`](follow-ups.md)
- **Working conventions (agent-facing)**: [`docs/refactor-conventions.md`](refactor-conventions.md)
- **Shape comparisons**: [`docs/comparisons/`](comparisons/)
- **Project guide (plain-language)**: [`CLAUDE.md`](../CLAUDE.md)
- **Manual testing**: [`TESTING_GUIDE.md`](../TESTING_GUIDE.md)
