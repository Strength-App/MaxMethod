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

- **What.** List to be populated by Batch 5's sibling audit (see Risk #12 in the plan). Other top-level state fields in the contexts (achievements, streaks, recent workouts, recommended exercises) may have the same cross-page staleness pattern as `personalBests`.
- **Design space.** Same as `#personal-bests-staleness-day-logger` — each field follows the same shape.
- **Trigger conditions.** Batch 5 audit completes; populate this entry with confirmed-stale fields.
- **Effort / risk.** Per-field, same shape as personalBests.

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

### usepostworkoutmodal-dead-personalbests-destructure

- **What.** `src/hooks/usePostWorkoutModal.js:47` destructures `personalBests` from `useWorkout()` but never reads it in the hook body. Surfaced during Batch 4's source read (the hook subscribes to WorkoutContext re-renders unnecessarily — every PB change still triggers a re-render via the context subscription, even though the destructured value is unused). Possibly a leftover from an earlier version that read PBs directly before `saveAndGetPBs` became a parent-provided callback (the current shape moves PB lookup into the parent's flow, which makes the destructure redundant).
- **Design space.** One-line removal: delete `personalBests` from the destructure on line 47, leaving `const { } = useWorkout();` (or remove the entire `useWorkout()` call if no other fields are needed — verify with grep). Verify nothing else in the file reads `personalBests` (grep is sufficient — the hook is small and self-contained). Verify the existing characterization tests still pass (they do not assert on personalBests because the hook doesn't expose it). After removal, the hook no longer subscribes to WorkoutContext for PB updates, which is the correct behavior — it never used them.
- **Trigger conditions.** Any batch that touches `usePostWorkoutModal.js`. Batch 8 (post-workout flow components) is the most likely natural moment — the component family this hook serves is owned by that batch and minor hook-side cleanup fits the natural scope. Earlier-than-Batch-8 removal is also fine if a different batch ends up touching the file for unrelated reasons.
- **Effort / risk.** Trivial effort (one-line edit + verify-tests-pass). Risk concentrates on misreading "used somewhere else" — easy to verify with `grep -n personalBests src/hooks/usePostWorkoutModal.js` (should match only line 47 after the destructure removal). If the grep finds another usage that the Batch 4 review missed, the entry needs revisiting before removal.

### workoutcontext-debug-log-cleanup

- **What.** `src/context/WorkoutContext.jsx` contains four `console.log` debug statements left over from earlier development: line 41 (`fetchWorkout called with:`), line 71 (`fetchWorkout got data, weeks:`), line 103 (`fetchWorkout seeded log sample`), and line 117 (`userId effect fired, userId is:`). Surfaced in Batch 4 test output — every test that mounts WorkoutProvider produces console noise that obscures real test output and makes failure debugging harder. Pre-existing from before any test infrastructure existed, when console.log was the only feedback channel.
- **Design space.** Remove all four. None appear load-bearing: they're not error reporting (no `console.error`), they're not gated behind a debug flag, and the codebase has no logging-via-stdout convention that downstream tooling consumes. Verification steps before removal: (1) grep the repo for `'fetchWorkout called'`, `'fetchWorkout got data'`, `'fetchWorkout seeded'`, `'userId effect fired'` — confirm no other code reads these log lines (e.g. via `console.log` interception or as a string match). (2) Search for any documented dev-debug procedure that mentions these specific log lines (grep `docs/` for the string fragments). (3) After removal, verify tests still pass and dev-mode app still functions (the logs are noise, not behavior). The cleanup is mechanical; the verification is the load-bearing part.
- **Trigger conditions.** Batch 5 (context providers, including WorkoutContext for the Risk #8 debounce-cleanup fix). The batch is already touching this file substantively; adding the log removal as a small companion commit fits the natural scope. Earlier removal is fine if another batch incidentally touches the file.
- **Effort / risk.** Low effort (four deletions). Low risk; the only failure mode is removing a log that some tooling or test author silently relies on — unlikely but checked via the grep verification above. If the grep finds an unexpected consumer, the entry needs to identify the consumer's purpose and decide whether to preserve the log or update the consumer.

---

## Resolved follow-ups

<!--
When a follow-up is acted on, move it here with:
- The implementing PR(s)
- Date resolved
- One-line summary of how it was resolved
Don't delete — the historical record preserves context for future "why did we do it that way?" questions.
-->
