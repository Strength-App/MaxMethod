# Follow-ups

Deferred work — scope-adjacent improvements, design alternatives waiting for evidence, observations surfaced during execution that don't belong in the current batch.

Each entry follows the same shape:

- **What** — one-line description.
- **Design space** — what's actually open / what options exist.
- **Trigger conditions** — what evidence would justify picking this up.
- **Effort / risk** — rough sizing.

When an entry is acted on, move it to a "Resolved" section at the bottom (with a link to the implementing PR), don't delete it — the historical record preserves context.

> Last reviewed: 2026-05-17

---

## Active follow-ups

### typescript-migration

- **What.** Migrate the frontend from JavaScript to TypeScript.
- **Design space.** Incremental (TS for new/touched files) vs. full migration vs. JSDoc-types-only intermediate step. Incremental risks a half-typed codebase with mixed import patterns; full is large-scope. Build config and ESLint config would need TS plugins.
- **Trigger conditions.** Type-related bugs become a meaningful source of regressions, or the team commits to TS as a primary initiative with its own roadmap.
- **Effort / risk.** Large effort (every file touched), medium risk (codemods make most of it mechanical, but invariants in mirrored utils need careful preservation).

### app-css-decomposition

- **What.** Decompose `client/max-method/src/App.css` (~5,800 lines) into per-component sheets, CSS Modules, or another scoped-style approach.
- **Design space.** CSS Modules (smallest scope change), Tailwind migration (committed during evaluation; rejected as default for new components in this initiative), vanilla-extract, plain per-component files with naming conventions. Each option has its own visual-regression-coverage prerequisite.
- **Trigger conditions.** Visual-regression tooling (Playwright + screenshot diffing) is in place to safely refactor styles. Pattern of contributors editing the wrong CSS rule because of App.css scale. Team decides to standardize a styling approach.
- **Effort / risk.** Large effort, high regression risk without visual-regression coverage.

### react-query-data-layer

- **What.** Migrate from raw `fetch` + Context to React Query (or TanStack Query / RTK Query) for the data layer.
- **Design space.** React Query is the natural fit given the SPA shape; would centralize caching, retry, optimistic updates, abort handling. Would also let `personalBests` staleness across pages (see below) be addressed cleanly via cache invalidation.
- **Trigger conditions.** A second concrete data-staleness or sync bug surfaces beyond the personalBests one (i.e., the pattern, not the single case). Or the team decides cache management is worth a dedicated initiative.
- **Effort / risk.** Medium-large; affects every page/context that calls fetch. Tests using MSW still work.

### e2e-tests

- **What.** Add an end-to-end test framework (Playwright or Cypress) covering the critical user flows: login → program selection → log workout → view history.
- **Design space.** Playwright (faster, modern, multi-browser) vs. Cypress (more mature ecosystem, single-browser). Playwright preferred. Would also unlock visual-regression coverage as a side benefit.
- **Trigger conditions.** Production regressions slipping past integration tests. Team grows past size where manual smoke can cover the surface.
- **Effort / risk.** Medium effort (test framework setup + ~5 critical flow tests). CI run time grows meaningfully.

### storybook

- **What.** Add Storybook for component isolation, visual review, and component-documentation.
- **Design space.** Storybook is the standard; alternative is Histoire (smaller, Vite-native). Storybook integrates with Chromatic for visual regression if desired.
- **Trigger conditions.** Team grows to a size where component-isolation-review is needed. Design-system formalization. Cross-team component sharing.
- **Effort / risk.** Medium effort (Storybook config + per-component stories). Ongoing per-component story-maintenance cost.

### mirrored-utils-behavior-changes

- **What.** Coordinate a synchronized behavior change to one of the three mirrored utils (`epley`, `classification`, `exerciseNameNormalize`) and their `Backend_structure/src/utils/*` counterparts.
- **Design space.** N/A — depends on the specific change. Process: parallel PRs in client + backend, both gated on the backend's parity test fixture being updated in lockstep.
- **Trigger conditions.** Product requirement (e.g., add a new big-three lift alias to `exerciseNameNormalize`, adjust a leveling threshold, support reps>15 in `epley`).
- **Effort / risk.** Small effort per change; high risk if parity drifts (one side updated, other not).

### user-context-hydration-redesign

- **What.** Redesign `UserContext` to hydrate synchronously from localStorage on first render, eliminating the need for direct `localStorage.getItem('userId')` reads in pages.
- **Design space.** Approach 1: initialize `useState` from `JSON.parse(localStorage.getItem('user'))` synchronously (no useEffect-based bootstrap). Approach 2: introduce a `useUserId()` helper that handles the null-on-first-paint case via Suspense. The latter requires React's experimental APIs and is more speculative.
- **Trigger conditions.** Audit of all `useUser()` consumers reveals every one of them already handles `user === null` correctly (so the redesign is purely a removal of redundant localStorage reads, not a behavior change). Or a bug surfaces where the localStorage reads diverge from UserContext state.
- **Effort / risk.** Medium effort (touches ~6 pages with scattered reads). Behavior risk if any consumer assumes null-on-first-paint.

### personal-bests-staleness-day-logger

- **What.** Fix `personalBests` staleness when switching between `day.jsx` and `logger.jsx` mid-session — currently a PR set in one flow is not visible in the other until refresh.
- **Design space.** Approach 1: refresh-on-mount (`refreshPersonalBests()` in each page's `useEffect`) — adds a refetch per navigation. Approach 2: subscribe to PB updates via a context observer. Approach 3: push from `updateLog` directly (PB delta on response). Approach 4: migrate to React Query (see `#react-query-data-layer`) and let cache invalidation handle it.
- **Trigger conditions.** User report of a stale PB display. Decision to take on the React Query migration (would resolve as a side effect).
- **Effort / risk.** Small if approach 3 (push); medium if approach 4 (entire data layer).

### cross-page-staleness-other-context-fields

- **What.** Populated by Batch 5's Risk #12 sibling audit. The audit enumerated every top-level `useState` field across the three context providers and classified each for the cross-page-staleness pattern (a field updated in one page's flow showing a stale snapshot in another page until refresh — the `personalBests` shape). The plan's illustrative field names (achievements, streaks, recent workouts, recommended exercises) do **not** exist as context state; the actual fields are below. **Net result: `personalBests` remains the only known-stale field** (tracked separately at [`#personal-bests-staleness-day-logger`](#personal-bests-staleness-day-logger), out of Batch 5 scope). One low-risk note on `workout`/`displayWorkout`; everything else is confirmed-safe.

  Audit table (one row per field; `exposed?` = present in the context's `value`; `multi-page read?` = read by 2+ consumer pages/components):

  | Context | Field | Exposed? | Multi-page read? | Verdict | Note |
  |---|---|---|---|---|---|
  | Workout | `personalBests` | yes | yes — day, logger, exerciseLibrary | **known-stale** | Risk #12; out of scope (`#personal-bests-staleness-day-logger`). Incremental `updateLog` path (day) and refetch path (logger) can diverge. |
  | Workout | `workout`/`displayWorkout` | yes | yes — day, home, customDay, pickNewProgram | low-risk | Kept fresh by `completeDay`'s `fetchWorkout(userId)` refetch + home/customDay fetch-on-mount. `day.jsx` is the only reader that does **not** refetch on mount, so a server-side change made through a flow that neither `setWorkout`s nor triggers `completeDay` could show stale in day until the next refetch. Not a user-visible bug today (the main mutation path refetches); noted so a future batch doesn't redo the analysis. |
  | Workout | `loading` | yes | yes — day, home | safe | Transient request-state, reset per `fetchWorkout` (`setLoading(true)` at fetch start). Not a staleness candidate. |
  | Workout | `error` | yes | yes — day, home | safe | Transient request-state (`setError(null)` at fetch start). Not a staleness candidate. |
  | Workout | `assignments` | yes | no — day only | safe | Single-page consumer. |
  | Workout | `log` | yes | no — day only | safe | Single-page consumer. |
  | Workout | `activeProgram` | yes | no read-consumer (only `setActiveProgram` is destructured, by customWorkout/loadingPage) | safe | Write-mostly; no page reads the value. |
  | Workout | `userId` | **no** (internal) | n/a | safe | Not in the context `value`. |
  | Tools | `status` / `remainingMs` / `durationMs` | yes | yes — Timer, ToolsFAB, Tools | safe | Intentionally global, live-shared timer (one timer for the whole app via the FAB). All consumers read the same live value via context; there is no per-page snapshot to go stale. |
  | Tools | `endsAt` / `pauseRemainingMs` | **no** (internal) | n/a | safe | Not in the context `value`. |
  | User | `user` | yes | yes — many pages | low-risk | Live-shared single source of truth, kept in sync via `setUser` by the flows that mutate it (e.g. post-workout reclassify, settings edits). The bootstrap refetch fires once on mount only, so the staleness vector is a flow that mutates the user doc server-side **without** calling `setUser` — a per-flow discipline question, not a field-level structural staleness. No such flow confirmed in this audit. |

- **Design space.** Same as [`#personal-bests-staleness-day-logger`](#personal-bests-staleness-day-logger) — any field that becomes confirmed-stale follows the same fix menu (refresh-on-mount / subscribe / push-from-mutation / React Query). The `workout`/`displayWorkout` low-risk note would only become actionable if a flow that mutates the workout doc server-side without refetching is introduced and a user reports stale workout display in `day.jsx`.
- **Trigger conditions.** A user report of stale display on any multi-page field other than `personalBests`. Or a new flow that mutates `user`/`workout` server-side without keeping context in sync. The decision to take on `#react-query-data-layer` would resolve the whole category as a side effect.
- **Effort / risk.** Per-field, same shape as `personalBests` (small if push-from-mutation; medium if data-layer migration).

### rules-of-hooks-violations-elsewhere

- **What.** List to be populated by Batch 9b's post-fix codebase sweep (see Risk #11 in the plan). If the sweep finds violations the team decides not to fix in 9b, each goes here as a separate entry with file path and the specific violating pattern.
- **Design space.** Each violation gets a three-commit fix per the established shape: characterization test (especially null→populated transition) → move conditional return below hooks + add internal null-guards → optional `eslint-disable` removal.
- **Trigger conditions.** Batch 9b sweep completes; populate this entry with file paths.
- **Effort / risk.** Small per file; risk is the null→populated transition test.

### pre-commit-hooks

- **What.** Add husky + lint-staged for staged-file lint/test runs on commit; optionally add commitlint for Conventional Commits format enforcement.
- **Design space.** husky + lint-staged is the standard combo. Commitlint adds another dep with a `commitlint.config.js`. All three are devDeps.
- **Trigger conditions.** Pattern of broken CI from PRs that would have been caught by pre-commit. Team adds contributors who don't naturally run `npm run lint && npx vitest run` before pushing.
- **Effort / risk.** Small effort; small risk of false-positives on Windows-shell-compat issues and hook bypass (`--no-verify`).

### coverage-upload-service

- **What.** Pipe coverage output through Codecov, Coveralls, or similar; surface coverage trends and per-file coverage in PR comments.
- **Design space.** Codecov has the best free tier and PR integration. Coveralls has a stable history. Either requires a token in GitHub secrets.
- **Trigger conditions.** Team grows and coverage trends become useful as a team signal. PR-comment integration becomes useful (currently we lack a workflow that consumes it).
- **Effort / risk.** Small effort; ongoing cost of a third-party integration.

### workout-card-shell-composition

- **What.** Extract a `WorkoutCardShell` composition primitive that `ProgramExerciseCard` and `AdHocExerciseCard` both render their content inside.
- **Design space.** Only justified if 80%+ implementation overlap emerges between the two cards *and* the shared piece needs no `if (isProgramMode)` conditionals inside. The discipline is "share when the parts that overlap can be lifted into a piece with no conditionals on which consumer is using it."
- **Trigger conditions.** Both `ProgramExerciseCard` and `AdHocExerciseCard` are extracted (Batches 14/15), inspection confirms the visual shell is identical, and there's a concrete need (e.g., a third consumer wants the same shell, or maintenance of the duplicated shell becomes a pain point).
- **Effort / risk.** Small effort if justified; high risk if speculative.

### history-combobox-migration

- **What.** Migrate `history.jsx`'s combobox to consume the `useCombobox` hook extracted in Batch 13.
- **Design space.** History's combobox has a distinct selection contract (`onCancel`, different options source, different surrounding context). Migration would require either expanding the hook's contract or adapting history's call shape.
- **Trigger conditions.** A fourth combobox emerges (so the hook's contract widens anyway). A defect surfaces in `history.jsx`'s combobox that the hook would have prevented. Concrete need for shared keyboard-behavior parity across all three.
- **Effort / risk.** Small effort; small risk.

### use-combobox-further-generalization

- **What.** Generalize the `useCombobox` hook beyond the two-consumer fit (customDay + logger) — e.g., add `onCreate` callback hook for the "create new exercise" affordance, or expose more of the state machine.
- **Design space.** Defer until a third consumer materializes. Premature generalization is exactly the "wrong abstraction" risk.
- **Trigger conditions.** A third concrete consumer (likely history if its migration ever happens, or a new feature) needs something the current hook doesn't provide.
- **Effort / risk.** N/A until triggered.

### rest-timer-tools-context-consolidation

- **What.** Consolidate `RestTimer` (currently independent) with `ToolsContext`'s stopwatch/timer FAB — i.e., should rest timers and the FAB stopwatch share state?
- **Design space.** This is a **product decision**, not a refactor — currently the two are independent (a user can have a rest timer running on the workout screen and a separate stopwatch in the FAB). Consolidating changes user-facing behavior.
- **Trigger conditions.** Product/UX decision that the two should share state. Requires its own sign-off.
- **Effort / risk.** Small code effort; medium UX risk.

### custom-workout-heavy-refactor

- **What.** Heavy refactor of `customWorkout.jsx` — mixed UI/form/DB/routing concerns; currently scoped only to a light pass in Batch 9a.
- **Design space.** Decompose into sub-components mirroring the `customDay.jsx` shape (with the `useCombobox` hook), centralize the localStorage-vs-DB persistence pattern, possibly extract a `useWorkoutDraft` hook.
- **Trigger conditions.** Friction during a future feature change to `customWorkout.jsx`. User reports of bugs concentrated in this page.
- **Effort / risk.** Medium effort; medium risk (two-tier persistence is delicate).

### status-badges-preview-deploys-ci-notifications

- **What.** Add CI status badges to README, GitHub Actions preview deploys for PRs, or CI notifications (Slack / email / etc.).
- **Design space.** Each is its own decision. Badges are cosmetic. Preview deploys require a deploy target. Notifications need a channel.
- **Trigger conditions.** Team grows and these become useful collaboration tools.
- **Effort / risk.** Small each.

### lint-suppressions-shrinkage

- **What.** Reduce `client/max-method/eslint-suppressions.json` from its Batch-0 baseline (79 errors across 17 files) to zero. The baseline captures violations of: `no-dupe-keys` (32), `jsx-a11y/click-events-have-key-events` (11), `jsx-a11y/no-static-element-interactions` (6), `jsx-a11y/interactive-supports-focus` (6), `no-unused-vars` (5), `jsx-a11y/no-noninteractive-element-interactions` (4), `react-refresh/only-export-components` (4), `react-hooks/set-state-in-effect` (4), `react-hooks/static-components` (4), `react-hooks/rules-of-hooks` (1), `react-hooks/immutability` (1), `no-empty` (1).
- **Design space.** Each batch that touches a file with suppressions either fixes the violations as part of its work or leaves them with explicit batch-summary justification (typically: "real bug, scheduled for Batch N's characterization-tests-first sequence"). Bug-tier categories (`rules-of-hooks`, `set-state-in-effect`, `static-components`, `immutability`, `no-dupe-keys`) already have plan-allocated batches with the right shape — they shrink as those batches land. A11y-tier categories shrink as the respective files are touched in Batches 8 / 9a / 9b / 14 / 15. The `react-refresh/only-export-components` suppressions on the three contexts are a separate question (see `#react-refresh-context-split`). Track per-batch shrinkage in the batch summary.
- **Trigger conditions.** Continuous — every batch checks. When the file reaches zero entries, delete it and remove the `lint:suppressions-check` / `lint:suppressions-prune` scripts plus the related CI step. When the shrinkage cadence proves reliable (likely after 4–5 batches), flip the CI `lint:suppressions-check` step from `continue-on-error: true` to blocking.
- **Effort / risk.** Distributed across the refactor; per-file effort is small-to-medium depending on the rule (a11y fixes can be tricky if they require restructuring focus management). The bug-tier fixes are already on the plan and have characterization tests in their batches.
- **Tracking.** Each batch's PR description "Notes" section reports the per-file suppression-count delta. CLAUDE.md meta-rule #18 enforces the shrinks-never-grows invariant.

### exercise-map-dedup-rule

- **What.** Resolve the 32 within-file duplicate keys in `exerciseLibrary.jsx` (22) and `reviewProgram.jsx` (10) as part of Batch 3's `config/exercises.js` consolidation. Each duplicate causes runtime data loss — the later key silently overwrites the earlier value in the same object literal, so some movement/equipment pairings declared in the source are never applied. The work is captured in [`docs/decisions.md#within-file-key-duplication-finding`](decisions.md#within-file-key-duplication-finding).
- **Design space.** For each duplicate key in the two affected files, ground-truth which value is "current" (i.e., the one ESLint says wins — the later one) by reading the unmodified code and tracing usages. Produce `docs/comparisons/exercise-map-truth-table.md` recording: file, key, earlier-value, later-value, which one is currently observable, decision (keep later as the canonical value, or surface to the user that the earlier value should win — the latter is a real behavior change requiring sign-off). Then consolidate into `config/exercises.js` with deduplicated entries.
- **Trigger conditions.** Batch 3 (`Local utils + new helpers`) executes. No earlier execution is correct — fixing the duplicates earlier risks behavior changes without ground-truthing.
- **Effort / risk.** Medium effort (32 duplicates, each needing a ground-truth check). Low risk if the deduplication preserves the currently-observable mappings; higher risk if any of the duplicates turn out to be silent feature regressions that should be restored (then the resolution is a deliberate behavior change, not a refactor).

### react-refresh-context-split

- **What.** The four `react-refresh/only-export-components` suppressions sit on the three Context files (`UserContext.jsx`, `WorkoutContext.jsx`, `ToolsContext.jsx`). The rule fires because each file exports both the React `Context` object (or a `<Provider>` component) **and** a `useXxx()` hook from the same module. Vite's Fast Refresh can't isolate component updates when non-component exports live alongside components, so HMR resets state on every save in dev — a quality-of-life cost during development.
- **Design space.** The mechanical fix is to **split each context into two files**: e.g., `UserContext.jsx` keeps the Provider component (and the Context object as an internal/named export), and a sibling `useUser.js` re-exports the hook. **This is an API change touching every consumer of the hook** (`useUser`, `useWorkout`, `useTools`). It affects every page and every component that calls one of these hooks (likely 20+ files). The Fast-Refresh benefit is real but the import-statement churn is real too.
- **Trigger conditions.** Explicit decision — this is not a default "we'll get to it." Two scenarios that would justify acting:
  - HMR state-reset during context-file edits becomes a measurable productivity drag.
  - Another structural change touches the three context files for an unrelated reason, and the split becomes nearly free as a side effect.
- **Effort / risk.** Medium effort (touches every consumer's import statement; mechanical but pervasive). Low risk per-consumer; medium aggregate risk of import-typo bugs. **The current state is "we suppress, we capture the trade-off, we decide explicitly later whether the Fast-Refresh quality is worth breaking every import statement."** The suppression might be permanent if the answer is no.
- **Decision not yet made.** This entry exists to capture the trade-off, not to commit to the split. Future Claude Code sessions should NOT treat this as scheduled work.

### customExercises-batch-12-completion

- **What.** Complete the `utils/customExercises.js` extraction by adding `getAllExerciseNames` and `isValidExercise` (both named in the Batch 3 plan's scope but deferred during execution; see the Batch 3 PR summary for the discovery write-up). Also migrate the inline `try { JSON.parse(localStorage.getItem('customExercises') || '[]') } catch { /* noop */ }` at `pages/exerciseLibrary.jsx:1280` to consume `getCustomExerciseNames` from the helper module.
- **Design space.** Both deferred helpers depend on a module-load constant `ALL_EXERCISE_NAMES` derived from `ALL_EXERCISES`, currently imported by `pages/customDay.jsx`, `pages/history.jsx`, and `pages/logger.jsx` from `pages/exerciseLibrary.jsx`. Extracting the helpers in Batch 3 would have created an upside-down `utils/ → pages/` import. Batch 12 is when `ALL_EXERCISES` moves out of `pages/exerciseLibrary.jsx` (likely into `config/exercises.js` or a sibling data file alongside `MOVEMENT_PATTERNS` / `EXERCISE_EQUIPMENT` / `PATTERN_MUSCLES` / `VIDEO_NAME_ALIASES`); once the upstream lives outside `pages/`, the helpers compose cleanly. `getAllExerciseNames` is the one-liner `() => [...ALL_EXERCISE_NAMES, ...getCustomExerciseNames()]`; `isValidExercise` is `name => getAllExerciseNames().some(n => n.toLowerCase() === name.toLowerCase())`. Migration of the line-1280 inline read is mechanical — replace the try/catch with `getCustomExerciseNames()` and adjust the surrounding usage.
- **Trigger conditions.** Batch 12 (`exerciseLibrary.jsx`) executes. The blocking concern is the upstream relocation of `ALL_EXERCISES`; this entry has no useful action until that lands.
- **Effort / risk.** Low. Both helpers are one-liners with byte-identical existing inline copies in customDay (both), history (`getAllExerciseNames` only), and logger (both). Risk concentrates upstream — wherever Batch 12 chooses to place `ALL_EXERCISES`, the helpers re-import from there. Reference the Batch 3 PR summary for the deferred reasoning when picking this up.

### reviewprogram-movement-patterns-alias-strategy

- **What.** When `pages/reviewProgram.jsx` migrates to consume `config/exercises.js`'s `MOVEMENT_PATTERNS` in Batch 11, decide how `reviewProgram` resolves its current 2-entry local extension of the `'Squat Pattern'` array (it inlines `'Squats'` and `'Back Squat'` as alternatives; the canonical 9-entry version in `config/exercises.js` does not). Batch 3 chose the 9-entry canonical for the consolidated map because `exerciseLibrary.jsx`'s `buildExerciseList` (line 406) iterates the array and adding aliases would produce duplicate library cards. `reviewProgram` retains its 11-entry local definition in Batch 3 — by the time of Batch 11, the consumer-shape question must be resolved deliberately. See [`docs/comparisons/exercise-map-truth-table.md`](comparisons/exercise-map-truth-table.md) for the original analysis and Option 1 rationale.
- **Design space.** Three candidate resolutions, only one of which should land in Batch 11:
  - *Option A — Keep the local extension.* `reviewProgram` overlays the 2 alias entries on top of the canonical map at import time (e.g. `const PATTERNS = { ...MOVEMENT_PATTERNS, 'Squat Pattern': [...MOVEMENT_PATTERNS['Squat Pattern'], 'Squats', 'Back Squat'] }`). Lowest effort, lowest scope creep. Cost: the canonical config doesn't fully describe `reviewProgram`'s data model; a future fourth consumer would have to make the same call.
  - *Option B — Adopt `exerciseLibrary`'s `EXERCISE_NAME_ALIASES` normalization.* `reviewProgram` imports the alias map and normalizes `ex.label` before looking up `MOVEMENT_PATTERNS[label]`. Eliminates the local extension; unifies the lookup pattern with `exerciseLibrary`. Cost: `EXERCISE_NAME_ALIASES` is currently `exerciseLibrary`-private and `reviewProgram` reaching into a peer page is the kind of cross-coupling the refactor is trying to eliminate.
  - *Option C — Move `EXERCISE_NAME_ALIASES` into `config/exercises.js` and unify the consumer pattern.* Both `reviewProgram` and `exerciseLibrary` consume the shared alias map. Cleanest outcome; largest scope. Note that this is a Batch 11 / 12 coordination question — `EXERCISE_NAME_ALIASES` currently lives in `exerciseLibrary` and its move overlaps both batches' working files.
- **Trigger conditions.** Batch 11 (`reviewProgram.jsx`) executes. Decision must land in Batch 11; the local extension cannot persist after `reviewProgram` migrates to consume the canonical map because the canonical doesn't carry the alias entries.
- **Effort / risk.** Low for Option A (1-line spread). Medium for Option B (cross-file import + normalization at every lookup site in `reviewProgram`). Medium-large for Option C (touches `config/exercises.js`, `pages/reviewProgram.jsx`, AND `pages/exerciseLibrary.jsx` — bumps up against the PR-size ceiling depending on what else Batch 11 is doing). The Batch 11 planner should pick based on whether Batch 12 (`exerciseLibrary.jsx`) is willing to absorb the `EXERCISE_NAME_ALIASES` relocation as part of its own scope; if yes, Option C; if not, Option A.

### gitignore-encoding-fix

- **What.** Re-save `client/max-method/.gitignore` as UTF-8 so git treats it as text rather than binary. Surfaced in Batch 4: the file ends with the line `I m a g e s /` (note the embedded NULs between characters), which makes git classify the whole file as binary and renders edits as `Bin N -> N+M bytes` instead of normal text diffs. The functional behavior of the gitignore entries is unaffected, but the binary classification breaks line-level review of any future change to the file and makes diff/blame less useful.
- **Design space.** One-shot conversion. Approach: read the file's current text content (probably via a tooling utility that handles UTF-16, or by manually retyping the entries), write it back as UTF-8 with consistent LF or CRLF line endings, and verify the result by checking `file client/max-method/.gitignore` reports `ASCII text` (or `UTF-8 Unicode text`) and `git diff` of any subsequent change renders as a normal line-level diff. The `I m a g e s /` line at the end is the suspicious entry — verify whether it's actually intended (looks like a Windows folder name with extra spacing, possibly mis-pasted) before deciding whether to preserve it as `Images/` or drop it. Other concerns: whether the existing `*.local` / `.vscode/*` entries actually match what's intended; trailing-whitespace cleanup is a "while I'm here" target but the conversion is the load-bearing fix.
- **Trigger conditions.** Any future batch that needs to substantively edit `.gitignore` (more than the single-line addition Batch 4 already made) — at that point, fixing the encoding becomes part of the natural scope. Alternatively, a dedicated tidy-up batch if one is scheduled before then.
- **Effort / risk.** Low effort (single file rewrite). Low risk in normal cases; the only failure mode is corrupting the file during conversion (easy to verify with a one-line `git diff` check) or accidentally dropping/renaming entries (verify by sampling git status for previously-ignored paths after the fix).

### workoutcontext-fetchworkout-cleanup-pattern

- **What.** `src/context/WorkoutContext.jsx`'s `fetchWorkout` (the bootstrap/refetch GET, currently ~lines 51-124) has the same in-flight-fetch-no-cleanup shape that Batch 5's Risk #8 fix removed from `updateLog`: it `await`s `fetch()` then dispatches `setWorkout`/`setAssignments`/`setLog`/`setPersonalBests`/`setLoading`/`setError` with no `AbortController` and no cancelled-flag. If `WorkoutProvider` unmounts (or `userId` changes re-firing the effect, or a page calls `fetchWorkout` while another call is in flight) the response resolves and dispatches `setState` against a stale/unmounted provider. Surfaced by Batch 5's Risk #8 sibling audit. **Creates an internal inconsistency**: post-Batch-5, `updateLog` aborts-on-unmount but `fetchWorkout` in the same file does not — see [`docs/decisions.md#debounce-cleanup-shape`](decisions.md#debounce-cleanup-shape) (the amendment's coherence-gap note).
- **Design space.** Same fix shape as the `updateLog` cleanup: an `AbortController` per fetch invocation (stored in a ref so a re-fire or unmount can abort the prior in-flight one), an `AbortError`-filtered catch, and the existing unmount cleanup effect extended to abort the fetch controller. **Lower impact than the `updateLog` bug** for three reasons: (1) it's an idempotent GET, so an orphan request has no server-side side effect (unlike the orphan PATCH); (2) `WorkoutProvider` unmounts only on page reload / tab close (it wraps the router — see the ADR amendment), so the unmount vector is narrow; (3) React 19 silently swallows the `setState`-against-unmounted, so there is no console noise. The one non-trivial vector is **cross-call racing**: the bootstrap effect calls `fetchWorkout` on `userId` change *and* pages (home, customDay, reviewProgram, viewProgram, welcomepage) call it explicitly — two GETs can race and the later-arriving response wins `setWorkout`, which could be the earlier request's data. Usually benign (same data), edge-case if the workout doc changed between the two requests. Characterization carries the same React-19 observability constraint as Risk #8's Property A (the network-layer `request.signal` observable is the workable approach; the `setState`-on-unmounted itself is invisible).
- **Trigger conditions.** Any batch that touches `WorkoutContext.jsx` substantively (Batch 5 chose defer-not-fix to avoid 2-3x'ing its source surface — the audit's job was discovery, not exhaustive fix). A user-visible bug from the cross-call race (stale workout doc displayed after a concurrent refetch). Or the decision to take on [`#react-query-data-layer`](#react-query-data-layer), which would resolve abort/cancel for the whole data layer.
- **Effort / risk.** Small-to-medium (mirror the `updateLog` fix shape + characterization tests with the network-layer abort observable). Low risk — the fix is additive and the GET is idempotent.

### usercontext-bootstrap-fetch-cleanup-pattern

- **What.** `src/context/UserContext.jsx`'s bootstrap fetch (the once-on-mount GET to `/api/users/profile/:id`, currently lines 43-60) has the same in-flight-fetch-no-cleanup shape: its `.then` chain calls `setUser(...)` / `setUser(null)` with no `AbortController` and no cancelled-flag. If `UserProvider` unmounts while the fetch is in flight, the response resolves and dispatches `setUser` against the unmounted provider. Surfaced by Batch 5's Risk #8 sibling audit. The codebase already has the cancelled-flag pattern elsewhere (`usePostWorkoutModal`'s all-history effect, `src/hooks/usePostWorkoutModal.js` lines ~116-129), so the absence here is a gap, not a codebase-wide non-convention.
- **Design space.** Add a cancelled-flag (or `AbortController`) cleanup to the bootstrap `useEffect`'s return. **Lowest impact of the three cleanup-pattern siblings**: it's an idempotent GET, `UserProvider` is the outermost root provider (unmounts only on page reload / tab close), it fires exactly once on mount (no cross-call racing vector, unlike `fetchWorkout`), and React 19 silently swallows the post-unmount `setState`. The cancelled-flag shape from `usePostWorkoutModal` is the cleanest local precedent to copy.
- **Trigger conditions.** Any batch that touches `UserContext.jsx`. Note that [`#user-context-hydration-redesign`](#user-context-hydration-redesign) also targets this file — if that redesign happens, fold this cleanup into it. Otherwise pick it up whenever the file is opened for another reason.
- **Effort / risk.** Small (one cleanup function + a characterization test with the network-layer abort observable). Very low risk — single once-on-mount idempotent GET.

### toolscontext-audiocontext-close

- **What.** `src/context/ToolsContext.jsx`'s `audioCtxRef` holds an `AudioContext` lazily created in `start()` (lines 21, 69-77) and never calls `.close()` on unmount. Surfaced by Batch 5's Risk #8 sibling audit. **Not the Risk #8 shape** — it's a resource-lifecycle nicety, not a `setState`-after-unmount / orphan-fetch hazard. `playBeep` (the only consumer of the ref) is called solely from the timer interval, which *is* cleared on unmount (the `useEffect` at lines 48-63 returns `clearInterval`), so there is no post-unmount audio activity. The only concern is an `AudioContext` that outlives the provider.
- **Design space.** Add an unmount cleanup that calls `audioCtxRef.current?.close()`. **Benign in current usage**: `ToolsProvider` is a root provider that unmounts only on page reload / tab close, and browsers reclaim all `AudioContext`s on page unload — so there is no leak in the app's actual lifecycle. It would only matter if `ToolsProvider` were ever mounted/unmounted repeatedly (e.g. conditionally rendered), which it currently is not. Low-priority.
- **Trigger conditions.** `ToolsProvider` becomes conditionally mounted/unmounted (would introduce a real per-cycle leak). Or any batch touching `ToolsContext.jsx` that wants to close the nicety while the file is open. A browser-reported "too many AudioContexts" warning during development.
- **Effort / risk.** Trivial (one `useEffect` cleanup line). Very low risk.

### context-d-characterization-gap

- **What.** The plan's Batch 5 ("Context providers") classified `UserContext` and `ToolsContext` as **D** (document + characterization tests) and `WorkoutContext` as **L**. The executed Batch 5 (PR #84) delivered only the WorkoutContext Risk #8 debounce/fetch-cleanup fix plus the Risk #8/#12 sibling audits. It did not characterize `UserContext` or `ToolsContext` at all, and pinned `WorkoutContext` only at the Risk #8 debounce-cleanup invariant (three tests). The broader WorkoutContext surface — `fetchWorkout`, `completeDay`, `updatePersonalBest`, `logoutWorkout`, and the field-level state transitions — is unpinned. PR #84's description neither does nor defers this work: the scope narrowed **by omission, not by stated decision** (verified against the merged PR body). **Discovered by Batch 6** while wiring Rule #21 for the tool components. The **ToolsContext piece is resolved in Batch 6** (timer state machine pinned in `ToolsContext.test.jsx`, because Batch 6's Timer/ToolsFAB consume it); the **UserContext and remaining-WorkoutContext pieces had no Batch 6 organic trigger and stay here.**
- **Design space.** Mirror this batch's ToolsContext backfill: characterization at the context layer (real provider + `renderHook`, MSW-backed fetch, fake timers where intervals exist), pinning the observable state-machine contract, not implementation. UserContext: localStorage bootstrap/hydration, the once-on-mount profile refetch, `setUser`/logout transitions, the null-on-first-paint contract pages rely on. WorkoutContext remainder: `fetchWorkout` seed/refetch shape, `completeDay` refetch, `updatePersonalBest`/`rebuildPersonalBest` round-trip, `logoutWorkout` clear. Each is a `test`→`docs` pair like the rest of the refactor. When picked up, follow CLAUDE.md's *Surprising things → Test-design hazards* (the timer-test patterns, and the React-19 setState-swallow discipline for cleanup-on-unmount tests) as the test-design template.
- **Trigger conditions.** Any future batch that meaningfully touches `UserContext.jsx` or `WorkoutContext.jsx` for a non-bug-fix reason (e.g. `#user-context-hydration-redesign`, or a feature change) — characterization lands alongside. If no organic trigger arrives by Batch 16, a freestanding cleanup pass picks up whatever remains, so the refactor doesn't close with two D-classified contexts unpinned.
- **Effort / risk.** Small-to-medium per context (UserContext smaller; WorkoutContext larger given its surface). Low risk — characterizing existing behavior, no source change. The MSW + fake-timer patterns already exist (`WorkoutContext.test.jsx`, this batch's `ToolsContext.test.jsx`).

### claude-settings-local-json-tracked

- **What.** `.claude/settings.local.json` is **tracked** at the repo root. By convention `*.local.json` is gitignored — it holds per-developer state (the Claude Code permission allow-list, which grows as a developer approves Bash/tool calls during a session). Tracked, every session's permission edits become committable noise, and a developer cloning the repo inherits whoever-last-committed-it's allow-list as their baseline. Surfaced this session (Batch 6) as working-tree drift (`M .claude/settings.local.json`) that grew with each approved tool call; an untracked sibling `client/max-method/.claude/settings.local.json` also exists. **Rule #10 territory — noticed this session, out of Batch 6 scope, not absorbed.**
- **Design space.** Add `.claude/settings.local.json` and `client/max-method/.claude/settings.local.json` to `.gitignore`; untrack the root file with `git rm --cached .claude/settings.local.json` (keeps the working copy, drops it from the index). The client-subdir copy is currently untracked; the gitignore entry prevents it from being accidentally staged later (e.g. a `git add -A` run from inside `client/max-method/`). Optionally confirm any shared, non-`.local` `.claude/settings.json` stays tracked as the intended shared baseline. One commit.
- **Trigger conditions.** A developer or batch agent notices the recurring permission-edit diff, or a PR carries an intrusive diff from session permission changes. Natural pickup: any batch already editing `.gitignore` (e.g. alongside `#gitignore-encoding-fix`), or a freestanding repo-hygiene pass.
- **Effort / risk.** Trivial — one `.gitignore` edit + one `git rm --cached` + one commit. Very low risk; only check is that no tooling depends on the file being tracked.

### rpe-coefficients-and-floor5-inline

- **What.** `src/components/tools/RPECalc.jsx` holds two domain artifacts inline: (a) the RPE × reps → %-of-1RM coefficient table (`PERCENTAGES`, an 8×12 grid) and the `RPE_VALUES` ladder; (b) a local floor-to-5 (`Math.floor((orm * pct / 100) / 5) * 5`) that reimplements `utils/epley.js`'s already-exported `floorTo5`. The coefficient table is single-copy across the frontend (`PERCENTAGES`/`RPE_VALUES` grep to `RPECalc.jsx` only); no util-layer home exists. The local floor-to-5 means floor-to-5 logic now lives in three places: `utils/epley.js`'s canonical `floorTo5`, `PlateCalc.jsx`'s integer-tenths plate packing (justified — different domain, avoids 2.5 lb float drift), and `RPECalc.jsx`'s inline reimplementation (unjustified — same round-down-to-5 domain as `floorTo5`). Surfaced by Batch 6's RPECalc characterization. The plan's Context section called out "rep-coefficient tables (3 files)" as a duplication finding; that framing manifests as one frontend copy here (the other counts are likely the backend mirror or the Epley-coefficient lineage, both outside Batch 6 scope). Batch 3 (the canonical consolidation site for shared maps → `config/exercises.js`) scoped in neither the RPE table nor this floor-to-5 — plausibly because the table has no second frontend consumer; the inline floor-to-5 is the simpler oversight. See also [`#tool-time-format-helpers-duplication`](#tool-time-format-helpers-duplication) — a sibling "domain helper inline in a UI component" finding (the tools' time formatters), should Batch 16's synthesis want to treat them as one pattern.
- **Design space.** Two separable consolidations. **(1) floor-to-5 — the cleaner cut, more actionable:** replace the inline expression with `import { floorTo5 } from '../../utils/epley.js'` — a one-line change, behavior-identical (`floorTo5(n)` is `Math.floor(n/5)*5` for finite `n`; RPECalc only ever passes a finite product). Removes a same-domain shadow of an already-exported canonical. **(2) the RPE table:** move `PERCENTAGES`/`RPE_VALUES` to `config/` (e.g. a new `config/rpe.js`, or alongside the other domain data) and import. One consumer today, so the payoff is discoverability for a future RPE-aware surface, not deduplication.
- **Trigger conditions.** floor-to-5: any batch that touches `RPECalc.jsx` for a non-bug-fix reason, or a freestanding cleanup pass. The table: a second RPE consumer materializes (e.g. `logger.jsx` deriving target weights from RPE, or an RPE-driven recommendation), or Batch 16's synthesis surfaces it as a single-copy-but-misplaced item. If no organic trigger arrives, both stay here through Batch 16.
- **Effort / risk.** floor-to-5: trivial (one-line import + delete the local expression; the math is bit-for-bit identical). Risk: confirm no zero/negative edge difference — `floorTo5` returns `null` for non-finite input, but RPECalc guards `orm > 0` before computing, so the product is always finite and the branch never diverges. Table: small-to-medium (move + import; it's a plain const, no semantic transform). Low risk — single consumer, no cross-consumer behavior change.

### tool-time-format-helpers-duplication

- **What.** Two related time-formatting duplications surfaced by Batch 6's tool-component characterization, each a sibling to [`#rpe-coefficients-and-floor5-inline`](#rpe-coefficients-and-floor5-inline) (domain helpers living inline in UI components rather than in `utils/`). **(1) `formatTime` — identical.** The MM:SS display formatter with `Math.ceil` semantics is byte-identical in `src/components/tools/Timer.jsx` and `src/components/tools/ToolsFAB.jsx` (both format a countdown-remaining value). **(2) `formatA11y` — near-duplicate.** The time-to-words aria-live formatter in `src/components/tools/Timer.jsx` and `src/components/tools/Stopwatch.jsx` shares structure but diverges meaningfully: Timer uses `Math.ceil` (countdown — round remaining up so it never prematurely reads zero) with a 3-way branch (minutes+seconds / minutes-only / seconds-only); Stopwatch uses `Math.floor` (elapsed — round down) with a 2-way branch (pairs minutes with seconds whenever minutes > 0). Note: `Stopwatch.jsx` defines its own `formatTime` for the MM:SS.CS count-up display — a distinct format not shared with the countdown formatters in Timer/ToolsFAB. Listed here for completeness; not part of finding (1).
- **Design space.** Two separable consolidations. **(1) `formatTime` — clean cut:** move to a new `utils/timeFormat.js` (e.g. exported as `formatMMSS`) imported by both Timer and ToolsFAB. Identical implementations → a one-line import + one-line delete per consumer, zero behavior change. **(2) `formatA11y` — needs design first:** decide whether the ceil-vs-floor + branch divergence reflects domain semantics (countdown vs elapsed) that should stay two functions, or whether a parameterized shared helper (`formatA11y(ms, { round: 'up' | 'down' })`) is cleaner. The ceil/floor difference is load-bearing: at 999ms, a countdown reads "1 second" (ceil → 1) while elapsed reads "0 seconds" (floor → 0). A naive merge that picks one rounding would be a behavior change in the other consumer. Don't pre-commit — the design question belongs to whichever batch picks it up.
- **Trigger conditions.** `formatTime`: any batch touching `Timer.jsx` or `ToolsFAB.jsx` for a non-bug-fix reason, or a freestanding cleanup pass. `formatA11y`: same triggers, with the design question answered first. Batch 16's synthesis would notice both if no organic trigger arrives by then.
- **Effort / risk.** `formatTime`: trivial (one util file + two import/delete changes; bit-for-bit identical between consumers). Risk very low — the characterization tests in both files pin the observed display, so any extraction divergence fails immediately. `formatA11y`: small-to-medium depending on the design choice; risk low for keep-separate, slightly higher for parameterized-shared (must verify the ceil/floor + branch differences are fully captured by the parameter, not by surrounding consumer context).

### contextmenu-onselect-owns-closing-vs-auto-close-design

- **What.** `src/components/ContextMenu.jsx` deliberately does NOT auto-close on item activation — Enter / Space / click call `item.onSelect()` and the menu stays open unless the handler itself closes it (JSDoc lines 16-17: "The onSelect handler is responsible for closing the menu"). Most menu primitives auto-close on activation; ContextMenu pushes close-control into the consumer. Surfaced by Batch 7's ContextMenu characterization (the test pins that `onClose` is NOT called on activation) plus a spot-check of the only current consumer, `day.jsx`. **The design currently reads as vestigial:** day.jsx's two menu items both close the menu immediately inside their own `onSelect` (`handleViewInLibrary` → `setContextMenu(null)` then navigate; `handleOpenSwap` → null the return-focus ref, `setContextMenu(null)`, then open the swap panel). There is no non-closing-activation case — the flexibility the design buys is unused.
- **Design space.** Two readings of the no-auto-close choice: (1) **intentional** — a consumer wants the menu to stay open after some activations (multi-select / repeated-action pattern), so close-control must live in the handler; (2) **evolved-that-way** — no specific driver, dead surface area. The day.jsx evidence leans (2), with one nuance mildly supporting keeping it: `handleOpenSwap` orchestrates an ordered sequence (null `menuReturnFocusRef.current` to suppress the menu's return-focus, THEN close, THEN open the swap panel whose EquipmentSelect autoFocuses), and consumer-owned close gives a single ordered place for that choreography. But auto-close would produce the same outcome, since `onSelect` runs before any auto-close would fire, so the ref-null still lands first. **If picked up:** either (a) keep as-is and document the intent explicitly in the JSDoc (resolve the ambiguity toward "intentional; consumers may keep open"), or (b) add an opt-in `closeOnSelect` (default true) and let consumers drop their manual close calls — simplifies the common case while preserving the keep-open option. Do NOT silently switch to unconditional auto-close: day.jsx's return-focus-suppression ordering must be verified first.
- **Trigger conditions.** Any batch that touches ContextMenu's consumer (`day.jsx`, a later H-batch) in a way that surfaces a real multi-activation / keep-open need (→ design justified, document it) or confirms the pattern vestigial across all consumers (→ consider the `closeOnSelect` simplification). A second ContextMenu consumer materializing would also resolve the ambiguity.
- **Effort / risk.** Trivial to document (a); small to add `closeOnSelect` (b) — touches ContextMenu plus day.jsx's two onSelect handlers. Low risk: the Batch 7 characterization test pins current behavior, so any change fails the no-auto-close assertion and must be updated deliberately.

### ci-flakiness-resolution-discipline

- **What.** Process question: under what conditions can a flakiness pattern observed locally be banked as "resolved — local-machine artifact" on the strength of CI evidence? Batch 7's axe-lift surfaced parallel/coverage timing flakiness on the local Windows box; CI ran clean once at PR-open, and the conclusion banked was "local artifact, no follow-up." That proved PREMATURE: the post-merge CI run on the same source reproduced a related determinism issue (the ContextMenu rAF focus-steal). One green CI run is not meaningful evidence against intermittent failures, especially when prior local flakiness exists on the same code.
- **Design space.** Tighten the "CI green once ⇒ closed" heuristic. Three shapes. (1) **Higher-N** — require N consecutive green CI runs on the same source before banking resolved (N=2? 3?). (2) **Suspect-then-investigate** — any flakiness observation triggers a determinism investigation (read the implicated test/source with a race-condition lens; harden the timing-coupled assertions defensively) rather than only a green-run watch; more upfront work, but catches the class of bug this remediation fixed. (3) **Status-quo + better follow-up framing** — keep "watch CI" but require the follow-up entry to be filed at watch-time (not deferred), with a revisit-condition tied to "if a determinism issue surfaces anywhere in adjacent code." Likely right answer is (2) plus an N=2 minimum, but decide on the next concrete case, not pre-emptively. Note: the local-serial-is-truth-checker observation (agent memory `project-local-serial-test-truth-checker`) is a related but separate axis (which RUN to trust locally); this entry is about when to STOP investigating.
- **Trigger conditions.** The next batch where a flakiness pattern is observed and the bank-or-investigate question arises. Batch 16 synthesis is also a natural moment to codify whichever shape gets adopted.
- **Effort / risk.** Process change only, no code. Low effort. Risk: under-discipline lets determinism bugs slip (this remediation is the cost); over-discipline (e.g. require 5 green CI runs per observation) taxes every batch.

### timer-minutes-stepper-no-hold-repeat

- **What.** In `src/components/tools/Timer.jsx` the **minutes** stepper is a plain `<button onClick={incMinutes}>` (no press-and-hold repeat), while the **seconds** stepper is a `HoldRepeatButton` (immediate fire + repeat every 80ms after a 400ms delay). The two steppers sit side-by-side in the same row, so the asymmetry is visible. Surfaced during the Timer test-construction-fragility fix: the minutes-clamp test had to walk 0→30 with 30 discrete clicks (no hold path to exploit), which is exactly why it was slow, whereas the seconds-clamp test reaches 59 via a single hold.
- **Design space.** Two readings. (1) **Intentional** — minutes max at 30 (vs. seconds at 59) and step less often, so hold-to-repeat was deemed unnecessary for the smaller range. (2) **UX oversight** — symmetric steppers should behave symmetrically; a user holding the minutes "+" expecting repeat (as the seconds "+" does) gets a single increment. The side-by-side placement makes (2) the more likely read. **If picked up:** wrap the minutes ± buttons in `HoldRepeatButton` (the component already exists and is used for seconds) — small, symmetric change. Bonus: it would let the minutes-clamp test mirror the seconds-clamp test's single-hold construction exactly (`fireEvent.pointerDown` + `vi.advanceTimersByTime` + `pointerUp`), retiring the 30-fireEvent-click walk.
- **Trigger conditions.** Any batch touching `Timer.jsx` source for a non-bug-fix reason (Batch 11+ heavy-page work, or a tools-area pass). A user report that holding the minutes stepper doesn't repeat. NOT a correctness bug — the clamp and increment work; this is an interaction-affordance consistency question, so it waits for an organic source touch.
- **Effort / risk.** Small (swap two plain buttons for the existing `HoldRepeatButton`, mirror the disabled-prop wiring). Low risk — the hold mechanism is already proven on the seconds stepper. If done, update the minutes-clamp test to the hold construction (and this entry resolves).

---

## Resolved follow-ups

<!--
When a follow-up is acted on, move it here with:
- The implementing PR(s)
- Date resolved
- One-line summary of how it was resolved
Don't delete — the historical record preserves context for future "why did we do it that way?" questions.
-->

### workoutcontext-debug-log-cleanup

- **Resolved.** Batch 5, commit `8ae4568`, PR [#84](https://github.com/Strength-App/MaxMethod/pull/84), 2026-05-19.
- **How.** Removed all four leftover `console.log` statements from `src/context/WorkoutContext.jsx` (`fetchWorkout called with:`, `fetchWorkout got data, weeks:`, `fetchWorkout seeded log sample`, `userId effect fired, userId is:`) as a companion commit to the Risk #8 fix. Per the entry's load-bearing verification step, each message string was content-grep'd across `client/max-method/src/` and `docs/` before removal — every match was the source line or this follow-up entry itself; no test interception, no other consumer, no documented dev-debug procedure depending on them. Deletions located by content match, not the entry's recorded pre-Batch-4 line numbers (which had shifted to 53/83/115/129 after the Risk #8 cleanup-effect block landed). Lint and the 312-test suite stayed green.
- **Original entry (preserved for context).**
  - **What.** `src/context/WorkoutContext.jsx` contained four `console.log` debug statements left over from earlier development. Surfaced in Batch 4 test output — every test that mounts WorkoutProvider produced console noise that obscured real test output and made failure debugging harder. Pre-existing from before any test infrastructure existed, when console.log was the only feedback channel.
  - **Design space.** Remove all four; none load-bearing (not error reporting, not gated behind a debug flag, no logging-via-stdout convention consuming them). Verification: grep the repo for the four message strings to confirm no other consumer, then verify tests + dev app still function. The cleanup is mechanical; the verification is the load-bearing part.
  - **Trigger conditions.** Batch 5 (already touching this file substantively for the Risk #8 fix).
  - **Effort / risk.** Low effort (four deletions); low risk, checked via the grep verification.

### usepostworkoutmodal-dead-personalbests-destructure

- **Resolved.** Batch 8, commit `cea75a9`, PR `refactor/batch-08-post-workout-flow` (pending merge), 2026-06-05.
- **How.** Removed the entire `const { personalBests } = useWorkout();` line (the only field read was the unused `personalBests`) and the now-orphaned `useWorkout` import — so the hook no longer subscribes to WorkoutContext at all, which is correct since it never used the value. Verified with `grep -n "personalBests\|useWorkout"`: the only remaining match is a JSDoc prose mention of day.jsx's `personalBests` state (not the destructure). The unused variable had been a suppressed `no-unused-vars` entry, so removing it left a stale suppression — pruned via `npm run lint:suppressions-prune`, shrinking `eslint-suppressions.json` by one entry (Rule #18). The 27 existing hook characterization tests still pass unchanged.
- **Original entry (preserved for context).**
  - **What.** `src/hooks/usePostWorkoutModal.js:47` destructures `personalBests` from `useWorkout()` but never reads it in the hook body. Surfaced during Batch 4's source read (the hook subscribes to WorkoutContext re-renders unnecessarily — every PB change still triggers a re-render via the context subscription, even though the destructured value is unused). Possibly a leftover from an earlier version that read PBs directly before `saveAndGetPBs` became a parent-provided callback (the current shape moves PB lookup into the parent's flow, which makes the destructure redundant).
  - **Design space.** One-line removal: delete `personalBests` from the destructure on line 47, leaving `const { } = useWorkout();` (or remove the entire `useWorkout()` call if no other fields are needed — verify with grep). Verify nothing else in the file reads `personalBests` (grep is sufficient — the hook is small and self-contained). Verify the existing characterization tests still pass (they do not assert on personalBests because the hook doesn't expose it). After removal, the hook no longer subscribes to WorkoutContext for PB updates, which is the correct behavior — it never used them.
  - **Trigger conditions.** Any batch that touches `usePostWorkoutModal.js`. Batch 8 (post-workout flow components) is the most likely natural moment — the component family this hook serves is owned by that batch and minor hook-side cleanup fits the natural scope. Earlier-than-Batch-8 removal is also fine if a different batch ends up touching the file for unrelated reasons.
  - **Effort / risk.** Trivial effort (one-line edit + verify-tests-pass). Risk concentrates on misreading "used somewhere else" — easy to verify with `grep -n personalBests src/hooks/usePostWorkoutModal.js` (should match only line 47 after the destructure removal). If the grep finds another usage that the Batch 4 review missed, the entry needs revisiting before removal.

### usepostworkoutmodal-cancellation-guard-tests-react19-invisibility

- **Resolved.** Batch 8, commit `5188dfa`, PR `refactor/batch-08-post-workout-flow` (pending merge), 2026-06-05.
- **How.** Took the "real regression armor" option, adapted to the hook's `cancelled`-flag (not `AbortController`) shape. Replaced the two `console.error`-spy assertions with output-observable tests: the guard is tripped by CLOSING the modal mid-flight (the effect cleanup flips `cancelled` on a `[postWorkoutData]` deps change exactly as on unmount) while the hook stays mounted, so `historySessions` is readable. Success-path test: a held fetch resolving after close must not populate `historySessions`. Catch-path test: after loading a real session, a held fetch rejecting after close must not reset `historySessions` to `[]`. Both were verified as real armor by mutation — removing each guard (`if (cancelled) return` / `if (!cancelled)`) fails its corresponding test (confirmed `2 failed`), where the old console.error assertions passed against the same mutation.
- **Original entry (preserved for context).**
  - **What.** `src/hooks/usePostWorkoutModal.test.jsx` lines 365-407 assert `console.error` was not called for the cancellation-guard scenarios (unmount before the all-history fetch resolves), but React 19 silently drops `setState` on unmounted components — so the tests would pass against a buggy-by-omission version of the hook (the `if (cancelled) return;` / `if (!cancelled)` guards removed). Surfaced during Batch 5's Risk #8 investigation, when the same `console.error`-spy observable was found ineffective for `WorkoutContext`'s debounce-cleanup characterization. Batch 5's Property A was reshaped to use a network-layer abort observable (`request.signal`); the equivalent reshape for `usePostWorkoutModal` is deferred. The guards in the hook are correct and present — this is a test-observability gap, not a behavior bug.
  - **Design space.** Reshape the cancellation-guard tests to observe the abort/cancellation at the network layer (same pattern Batch 5 adopted — hold the fetch, attach an `abort` listener to `request.signal`, assert it fired), producing real regression armor; **or** accept that the guard is intent-locked-but-not-behavior-pinned and add an inline comment + ADR note documenting the React-19 invisibility. The first option is more work but produces armor; the second is honest but leaves the tests as low-signal artifacts. Note: `usePostWorkoutModal`'s effect uses a `cancelled` boolean flag (not an `AbortController`), so the network-layer reshape would need the fetch held until after unmount and the assertion made on whether the post-unmount `.then` ran — slightly different mechanics than `WorkoutContext`'s AbortController-based abort, but the same network-boundary observability principle.
  - **Trigger conditions.** Any batch that touches `usePostWorkoutModal` — Batch 8 (post-workout flow components) is the natural moment, since that component family is owned by Batch 8. Earlier reshape is fine if a different batch touches the file.
  - **Effort / risk.** Small-to-medium (test reshape + a held-fetch MSW handler). Low risk — the guard exists in source and works correctly; the gap is observability, not behavior.

### waitfor-discipline-for-effect-driven-focus

- **Resolved.** Batch 8 (documented), PR `refactor/batch-08-post-workout-flow` (pending merge), 2026-06-05.
- **How.** Took response (1): documented the pattern as a fourth Test-design hazard in `docs/refactor-conventions.md` (where the test-design hazards now live after the CLAUDE.md rewrite/archive). The entry captures both sub-hazards — effect-lag (`await waitFor` the focus assertion; canonical usage now in `PostWorkoutModal.test.jsx`, where useModalA11y's initial-focus and focus-return are wrapped while the synchronous Tab-trap focus asserts directly) and effect-ordering/focus-steal (source-side single-source-of-truth fix; canonical `fix(ContextMenu)`). Lint enforcement (response 2) was not pursued — recommended only if the pattern recurs.
- **Original entry (preserved for context).**
  - **What.** Test pattern: when a component manages focus via a `useEffect` keyed on state (rather than calling `.focus()` synchronously in the event handler), a post-state-change focus assertion must use `await waitFor(() => expect(...).toHaveFocus())` rather than a bare `expect(...).toHaveFocus()` — the bare form races the effect's commit on slow runners. Surfaced by the ContextMenu test remediation (the post-merge dev regression after PR #86). **Two related but distinct hazards live here:** (1) **effect-LAG** — the focus-follows-highlight effect commits one render-cycle after the keydown handler's setState, so a synchronous assertion can run before it; (2) **effect-ORDERING / focus-steal** — when TWO focus mechanisms fire on the same trigger (ContextMenu's synchronous focus-follows-highlight effect AND the rAF-deferred first-item focus), a late-firing one can clobber the other's result. ContextMenu's CI flake was actually (2), fixed at the source (the rAF now targets the live highlight, not always the first item); the `waitFor` wraps address (1) defensively.
  - **Design space.** Two responses. (1) Document the pattern in CLAUDE.md under *Surprising things → Test-design hazards* as a fourth entry alongside the three timer-test patterns and the useModalA11y harness-memoization discipline — same shape ("when X focus-management happens in production, assert tests this way"), cross-referencing the ContextMenu fix as the canonical effect-ordering example and the `waitFor` wraps as the canonical effect-lag example. (2) Lint enforcement: `eslint-plugin-testing-library`'s `await-async-utils` is already on via the recommended preset but does not flag a bare `toHaveFocus()` after `user.keyboard()`; a custom rule could, but that is heavier. Recommend (1) first; (2) only if the pattern recurs. **Source-side companion lesson:** when a component has more than one focus mechanism on the same trigger, prefer a single source of truth (the live highlight) over a position-fixed target (always-first) so a late async focus cannot steal — the ContextMenu fix is the template.
  - **Trigger conditions.** Any future component test where state-then-effect focus management is introduced. Specifically: Batch 8's `PostWorkoutModal` (focus-trap modal, multiple focus transitions), Batch 10's `RestTimer` (likely focus on state change), and Batches 13-15's day/logger/customDay pages (which consume ContextMenu and EquipmentSelect). The CLAUDE.md amendment is the natural moment when the first of those batches writes effect-driven focus tests.
  - **Effort / risk.** Small. The CLAUDE.md amendment is one paragraph + a snippet. Risk near zero — the pattern is confirmed; documenting it prevents recurrence.
