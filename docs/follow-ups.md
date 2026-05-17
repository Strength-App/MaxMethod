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

---

## Resolved follow-ups

<!--
When a follow-up is acted on, move it here with:
- The implementing PR(s)
- Date resolved
- One-line summary of how it was resolved
Don't delete — the historical record preserves context for future "why did we do it that way?" questions.
-->
