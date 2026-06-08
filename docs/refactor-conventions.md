<!--
ARCHIVED 2026-06-05. This was the previous CLAUDE.md, built for the 2026
Frontend Refactor & Test Coverage initiative. It is kept here for reference
because it captures load-bearing discipline rules, ADR cross-links, and
test-design hazards that may still matter. The active project guide is now
the rewritten /CLAUDE.md at the repo root.
-->

# Working in this codebase (archived refactor-initiative conventions)

> Last reviewed: 2026-06-07 (Batch 16 — codebase-conventions section synthesized)

MaxMethodApp is a React 19 + Vite SPA for strength-training program management. The frontend lives at `client/max-method/`; the backend is `Backend_structure/` (Express + Mongo). This file orients contributors and AI agents working on **the frontend**.

**Before making any change, read this file. Before making non-trivial structural changes, also read [`docs/decisions.md`](docs/decisions.md) for the relevant ADR. When you're about to introduce a convention not described here, surface it as a decision rather than acting on it.**

This file is short by design. The deep rationale for each rule lives in `docs/decisions.md` — follow the links when you need depth.

---

## Session conventions

These rules govern *how* the agent works in this codebase. They were established during the 2026 Frontend Refactor & Test Coverage initiative and are load-bearing on the rest of the work.

### Discipline rules

1. **Surface bugs; do not silently fix.** Bugs discovered during a refactor get their own commit and an explicit note in the batch summary. See [`docs/decisions.md#rules-of-hooks-fix-shape`](docs/decisions.md#rules-of-hooks-fix-shape) and [`docs/decisions.md#debounce-cleanup-shape`](docs/decisions.md#debounce-cleanup-shape) for two canonical examples.

2. **A move is not a refactor.** Every extraction defaults to a **verbatim lift** in its own commit. Cleanup, API reshape, or behavior change goes in a separate commit afterward, only if a concrete reason has emerged. "Verbatim" applies to behavior, not literal source — imports change, closures become props with the same names, but anything else (rename, restructure, reformat) defers to a later commit.

3. **Renames in their own commits** with per-rename justification in the batch summary: *"Renamed X → Y because the existing name meant Z, which was wrong/confusing because..."* If that line is hard to write, the rename probably doesn't meet the bar. Hook return shapes are public API. Be explicit when renaming variables that double as strings (localStorage keys, query params, event names, CSS classes, `data-testid` values, MSW handler paths). Capture **rejected** renames when the judgment isn't obvious.

4. **When in doubt about sharing, don't.** Re-merging two components is straightforward; splitting a unified-with-mode-prop is hard. Burden of proof is on *share*. For every "should we share this?" question: **compare actual shapes, document the comparison in `docs/comparisons/<thing>.md`, decide, record in `docs/decisions.md`.** See [`docs/comparisons/combobox.md`](docs/comparisons/combobox.md) for the canonical example.

5. **No new abstractions without concrete justification.** "Three call sites" is a signal to *investigate*, not a mandate to extract.

6. **No new dependencies without asking.** This includes "nice-to-have" deps like commitlint, husky, Codecov.

7. **Prop-count signal.** An extracted component with >6-7 props, or >3 boolean props, is doing too much. Stop and reconsider — usually means two genuinely different components are being squeezed into one.

8. **Ask before non-obvious decisions.** If unsure whether a pattern is intentional, ask. If a refactor would change a public API or observable behavior, ask.

9. **Surprising code → check for captured rationale first.** Memory, comment, commit message, ADR. If captured → lock with tests + doc + ADR entry. If not → escalate as *bug-or-intentional*.

10. **"While I'm here" is not a license.** The open file is not permission to do unrelated work. Noticed-but-out-of-scope cleanups go to `docs/follow-ups.md`, never absorbed silently.

11. **Persist decisions to `docs/`, not chat.** Decisions that affect future batches go in `docs/decisions.md`. Deferrals go in `docs/follow-ups.md`. Chat is ephemeral.

### Workflow rules

12. **Per-batch branch off `dev` tip at the moment work starts.** No stale base; no parallel batches. Naming: `refactor/batch-NN-description` (lex-sortable). Next batch's branch is not created until the previous merges. See [`docs/decisions.md#branching-strategy`](docs/decisions.md#branching-strategy).

13. **One PR per batch, multiple commits per PR.** Conventional Commits with scope. Pattern: `test(scope)` → `refactor(scope)` → `fix(scope)` (if a bug was surfaced) → `docs(scope)`. Each commit independently green for bisectability. Rebase-merge to `dev`. **Agent does not auto-merge** and **does not start the next batch** until the previous merges. PR size ceiling: ~1000 lines. See [`docs/decisions.md#pr-commit-strategy`](docs/decisions.md#pr-commit-strategy).
    - **Test-before-feat commit-shape distinction.** For *characterization tests against existing code* (e.g. D-classification utilities like `epley`/`classification`/`exerciseNameNormalize`/`setDisplay`), the test commit lands first and passes against unmodified source from that commit forward — bisectability holds. For *new-file helpers* (no existing source to characterize, e.g. Batch 3's `dateUtils.js` and `customExercises.js`), tests and the helper land in a single combined `feat(<helper>)` commit. A test file importing a non-existent module isn't a useful bisectable intermediate state. The test-first design discipline lives in the agent's working order during development, not in commit history. Clarification adopted post-Batch-3 after two intermediate-red commits in that batch surfaced the gap.
    - **No `Co-Authored-By` trailers.** Commit authorship is set via `git config` and reflects the human who pushed; collaborative work with AI tooling is implicit in the workflow and doesn't need an explicit trailer. A Claude-specific trailer locks the commit history to a particular AI provider in a way that ages awkwardly (model names change, attribution conventions shift, the trailer becomes a dated artifact). Consistency matters: don't drift between trailer-having and trailer-less commits within a batch.

14. **Never push past the checkpoint.** Pause between batches for review. No queueing the next batch on a stale base.

15. **Stop-summarize-ask on scope growth.** Triggers: PR ≥ 1000 lines, files outside scope, unanticipated architectural decision, time +50% over estimate, bug load-bearing on the batch. Commit partial work as a **draft PR**; produce a *situation / options / recommendation* summary; full pause until direction lands. Symmetric for scope shrinkage. See [`docs/decisions.md#scope-growth-protocol`](docs/decisions.md#scope-growth-protocol).

16. **CI failure on a passing local run = investigate** (lockfile drift, environment difference). Don't silence.

17. **Disable an ESLint rule only with a justifying comment.** Bulk-disabling is almost always wrong.

18. **Shrink `eslint-suppressions.json` when you touch its files.** When touching a file with entries in `client/max-method/eslint-suppressions.json`, address that file's suppressions as part of the batch's work — either fix the violations (and run `npm run lint:suppressions-prune` from `client/max-method/` to clean the file) or, for genuine bugs scheduled for a later batch, leave them and document why in the batch summary. **The suppressions list shrinks with every batch that touches a listed file; it never grows.** New ESLint violations in any file always fail CI. See [`docs/decisions.md#lint-suppressions-baseline`](docs/decisions.md#lint-suppressions-baseline) and [`docs/follow-ups.md#lint-suppressions-shrinkage`](docs/follow-ups.md#lint-suppressions-shrinkage).
    - **Lint-invocation semantics.** `npm run lint` is the CI gate — it reads `eslint-suppressions.json` and treats suppressed violations as non-failing. `npx eslint <files>` (or `npx eslint .` directly) **bypasses the suppressions file** — useful for ad-hoc per-file checks during development, but it surfaces the full set of pre-existing suppressed violations as "new" errors. If you see a high error count from a per-file run, sanity-check it against `npm run lint` before reacting; the suppressions baseline is intentional, not regression. Surfaced post-Batch-4 after a per-file run during the useModalA11y test commit reported errors that `npm run lint` accepted, creating a false-positive lint-broke-the-baseline moment.

### Verification rules

explore - plan - code - document - test - commit

19. **Match the tool to the question.**
    - RTL = behavior. `getByRole({ name })`, not `getByTestId`.
    - Axe = static a11y. Necessary, not sufficient — doesn't catch cognitive a11y, reading order, pronunciation.
    - Coverage = diagnostic. Per-category, per-batch reporting. **Never a CI gate.** Targets are in `vitest.config.js` as comments, not thresholds.
    - Manual visual check = appearance. Capped to **visual-check batches (Batches 10–15 in the refactor initiative)**. Pre-batch baselines in uncommitted `.batch-screenshots/batch-NN-baseline/`; post-batch comparison before PR opens.
    - Keyboard tests = interaction. `userEvent.keyboard()`, not `fireEvent`. Assert on `toHaveFocus` + ARIA, not internal state.
    See [`docs/decisions.md#coverage-philosophy`](docs/decisions.md#coverage-philosophy), [`#accessibility-testing`](docs/decisions.md#accessibility-testing), [`#keyboard-testing`](docs/decisions.md#keyboard-testing), [`#visual-regression`](docs/decisions.md#visual-regression).

20. **JSDoc thorough on the public boundary, terse internally.** `@param` + `@returns` + non-obvious behavior + edge cases on every export. Internal helpers: one-line WHY only when non-obvious. Don't restate what the signature already says.

21. **Match the test layer to the invariant location.** When a Risk Register entry is allocated to Batch N but the underlying invariant lives at a layer characterized in an earlier Batch M (M < N), pin the invariant in Batch M where it lives; Batch N handles the consumer-integration concern separately. Pinning at both layers is not duplication — the hook-layer test pins the invariant; the component-layer test pins the wiring. Established post-Batch-4: Risk #7 (PostWorkoutModal snapshot lock) was nominally allocated to Batch 8, but the `preFineLevel !== null` gate and the once-effect that captures the snapshot live entirely in `usePostWorkoutModal` (lines 56-76). The three load-bearing snapshot-lock assertions landed in Batch 4 at the hook layer; Batch 8 will still test the component-level integration (e.g., that PostWorkoutModal renders the captured values correctly), but won't re-pin the invariant.

---

## Codebase conventions

> Synthesized in **Batch 16** (2026-06-07) from `docs/decisions.md`, the per-batch PR summaries, and `client/max-method/src/components/workout/README.md`. This is the *observed* shape of the frontend after the refactor — the rules and the non-obvious placements, not an exhaustive file listing (the plain-language directory map is in the root [`CLAUDE.md`](../CLAUDE.md)). Follow the ADR links for the why.

### Where things live

All paths under `client/max-method/src/` unless noted.

- **`pages/`** — one route-level screen per file. A page owns its own data fetching (`fetch` inside a `useEffect`) and composes primitives + hooks. Business *data* no longer lives here: the exercise catalog and movement-pattern maps were lifted into `config/` (see *Domain boundaries*).
- **`components/`** — reusable primitives shared across pages (`Toast`, `UserLevelBadge`, `EquipmentSelect`, `ContextMenu`, `MaxMethodLogo`, `PostWorkoutModal` + `PostWorkoutScreen1/2`).
  - **`components/tools/`** — the calculator / timer FAB family (`PlateCalc`, `OneRMCalc`, `RPECalc`, `Timer`, `Stopwatch`, `ToolsFAB`, `ToolsPanel`, `Tools`).
  - **`components/workout/`** — components lifted out of the two big workout pages (`day.jsx`, `logger.jsx`) so the shared UI isn't copy-pasted. `RestTimer` is the first; import via the barrel `components/workout/index.js`. Directory-local conventions (color tokens, verbatim-lift styling, plain-language JSDoc) live in its [`README.md`](../client/max-method/src/components/workout/README.md).
- **`context/`** — the three providers (`UserContext`, `WorkoutContext`, `ToolsContext`). Each file exports **both** the `<Provider>` and its `useXxx()` hook — that co-export is the reason each carries a `react-refresh/only-export-components` suppression: a tracked trade-off ([`docs/follow-ups.md#react-refresh-context-split`](follow-ups.md#react-refresh-context-split)), *not* a defect to "fix" casually.
- **`hooks/`** — cross-component behavior: `useModalA11y` (focus-trap + return-focus), `useWorkoutStats`, `usePostWorkoutModal`, `useCombobox` (the headless typeahead state-machine shared by `customDay` + `logger`; [`#combobox-primitive`](decisions.md#combobox-primitive)).
- **`utils/`** — shared helpers. **Not pure-only** ([`#utils-purity`](decisions.md#utils-purity)): a `utils/` module may touch I/O if it documents the side effects at the boundary and keeps them fail-safe (`customExercises.js` is the reference). `epley.js` / `classification.js` / `exerciseNameNormalize.js` are **mirrored with the backend** (see *Domain boundaries*). Others: `dateUtils`, `restDuration`, `setDisplay`.
- **`config/`** — `api.js` (`API_URL` from `VITE_API_URL`) and `exercises.js`, the canonical exercise data layer: `MOVEMENT_PATTERNS`, `EXERCISE_EQUIPMENT`, `PATTERN_MUSCLES`, `VIDEO_NAME_ALIASES`, `EXERCISE_NAME_ALIASES`, and the `ALL_EXERCISES` catalog (with `ALL_EXERCISE_NAMES`). Dependency arrows point *into* config — pages and utils import from it, never the reverse ([`#exercise-data-layer-relocation-and-alias-home`](decisions.md#exercise-data-layer-relocation-and-alias-home)).
- **`test/`** — `setup.js` (jsdom global mocks, each justified by a comment naming its consumer; [`#jsdom-environment-mocks`](decisions.md#jsdom-environment-mocks)) and `msw/handlers.js` (the single network-mock file; [`#fetch-mocking`](decisions.md#fetch-mocking)).
- **Tests are colocated** as `name.test.js` / `name.test.jsx` siblings of their source.
- **`docs/`** (repo root) — `decisions.md` (ADRs), `follow-ups.md` (deferred work), `comparisons/` (the shape-comparison artifacts behind each share / don't-share decision). The lint baseline `eslint-suppressions.json` lives in `client/max-method/`.

### Naming patterns

- **Components** PascalCase (`RestTimer`); **hooks** `useXxx`; **util / config modules** camelCase; **exported data maps** SCREAMING_SNAKE (`MOVEMENT_PATTERNS`).
- **Test-file extension mirrors the source**: `.test.jsx` when the test renders React / contains JSX, `.test.js` when it's JSX-free ([`#test-file-extension-convention`](decisions.md#test-file-extension-convention)).
- **Domain-named components, never a mode prop.** Two genuinely different things stay two components with descriptive names (`ProgramExerciseCard` vs `AdHocExerciseCard`), not one component with an `isProgramMode` flag. Burden of proof is on *sharing* (session rule #4); >6–7 props or >3 booleans means it's really two components (rule #7). `day.jsx`'s card was left un-extracted for exactly this reason ([`docs/follow-ups.md#day-card-internal-extraction`](follow-ups.md#day-card-internal-extraction)).
- **Color tokens carry meaning, not just hue**: `var(--accent)` (red) marks *identity* (badge labels, threshold values); `var(--accent-green)` is reserved for *completion state* (finished sets / days — fills, borders, text). Strict split ([`#color-token-convention`](decisions.md#color-token-convention)).
- **Per-page overlays** of a canonical map are named for what they restore and recorded in an ADR (`reviewProgram`'s squat-alias overlay, `day`'s cable-only overlay) — never silent local copies.
- **Commits** are Conventional Commits with scope (`refactor(day): …`), body answers *why*, **no `Co-Authored-By` trailers** (rule #13). **Branches** are `refactor/batch-NN-description` (lex-sortable).

### Domain boundaries

- **The frontend never touches Mongo.** Every read/write goes through the backend's `/api/...` endpoints via `fetch`; `config/api.js` holds the base URL. There is no client cache layer and no React Query — Context holds state, `fetch` moves it ([`#react-query-data-layer`](follow-ups.md#react-query-data-layer) is deferred).
- **Three mirrored utils** (`epley`, `classification`, `exerciseNameNormalize`) are behavior-for-behavior siblings of `Backend_structure/src/utils/*` and have backend parity fixtures. Change both sides in one step or the apps disagree ([`#mirrored-utils`](decisions.md#mirrored-utils)). The alias map inside `exerciseNameNormalize.ALIASES` is part of that mirror.
- **`config/exercises.js` is the single source for exercise data.** Pages consume it; it imports from no page (the old upside-down `utils/ → pages/` import was removed in Batch 12). Where one consumer genuinely needs different membership, it overlays the canonical map locally and documents why ([`#day-movement-patterns-consumption`](decisions.md#day-movement-patterns-consumption), [`#reviewprogram-squat-alias-overlay`](decisions.md#reviewprogram-squat-alias-overlay)). Two FE alias maps coexist — `exerciseNameNormalize.ALIASES` (mirrored, on the PB path) and `config.EXERCISE_NAME_ALIASES` (FE-only, for library lookup) — kept in agreement by hand; dedup tracked at [`docs/follow-ups.md#exercise-name-alias-map-single-source`](follow-ups.md#exercise-name-alias-map-single-source).
- **Big-three progression is server-owned.** The Bench / Squat / Deadlift personal-best seeded floor lives in the backend; the client must round-trip the response shape correctly (Risk #1). `updatePersonalBest` raises only; `rebuildPersonalBest` is bidirectional but floors at the seeded 1RM for the big three.
- **Two-tier persistence for authored workouts, gated.** `customDay.jsx` / `customWorkout.jsx` keep a draft in `localStorage` and debounce a PATCH to the DB — but auto-save is **gated during new-workout creation** (`location.state.isDbWorkout === false`): nothing auto-saves, only the explicit "Save Workout" button persists. Editing an existing DB workout enables the 500 ms debounced save. Don't remove the gate (see *Surprising things → Code hazards*).
- **In-flight fetches clean up on supersede / unmount.** `WorkoutContext.updateLog` and `viewProgram`'s title save use an `AbortController` (cancel a superseded or in-flight request); the sibling bootstrap GETs were audited and deferred as low-impact ([`#debounce-cleanup-shape`](decisions.md#debounce-cleanup-shape)). `WorkoutProvider` wraps the router, so **in-app navigation does not cancel a pending edit** — only page reload / tab close does.
- **One known cross-page staleness:** `personalBests` can read stale between `day.jsx` and `logger.jsx` mid-session; every other context field was audited safe ([`#cross-page-staleness-other-context-fields`](follow-ups.md#cross-page-staleness-other-context-fields)).

---

## Surprising things

Non-obvious behaviors and findings worth knowing before you touch — or write tests for — the relevant code. **Code hazards** are *don't accidentally "fix" this* warnings about production behavior; **test-design hazards** are *don't write tests this way* findings from prior batches. Code hazards link to their ADR; test-design hazards link to the canonical test.

### Code hazards

- **`home.jsx` / `viewProgram.jsx` day-display filter is title-only.** A day with `title: null` is hidden; a day with a missing title field is hidden. Intentional, not a bug. Don't "fix" by adding `&& d.exercises?.length`. See [`docs/decisions.md#day-filter-truth-table`](docs/decisions.md#day-filter-truth-table).

- **Direct `localStorage.getItem('userId')` reads in several pages.** Not a bug. UserContext bootstrap is async; these reads survive the pre-hydration paint where `useUser()` returns `null`. Don't "consolidate" without addressing UserContext hydration timing — see `#user-context-hydration-redesign` in `docs/follow-ups.md`.

- **Three mirrored utilities** (`src/utils/epley.js`, `src/utils/classification.js`, `src/utils/exerciseNameNormalize.js`) are mirrored with `Backend_structure/src/utils/*` and have parity test fixtures. Any change must be made in lockstep with the backend. See [`docs/decisions.md#mirrored-utils`](docs/decisions.md#mirrored-utils).

- **`WorkoutContext.updateLog` debounce cleanup.** Two behaviors: (1) each new `updateLog` aborts any in-flight PATCH from a prior edit (prevents stale-write races on rapid successive edits); (2) on `WorkoutProvider` unmount — page reload or tab close only, since the provider wraps the router and survives in-app navigation — a pending debounce is cancelled rather than sent as an orphan request. Note: in-app navigation does **not** cancel a pending edit. See [`docs/decisions.md#debounce-cleanup-shape`](docs/decisions.md#debounce-cleanup-shape).

- **`personalBests` are stale between `day.jsx` and `logger.jsx` mid-session.** Known issue, deferred to `#personal-bests-staleness-day-logger` in `docs/follow-ups.md`. Don't accidentally "fix" without context.

- **`customDay.jsx` does not auto-save to DB during new-workout creation.** Only the manual "Save Workout" button persists. Switching to edit-mode enables the 500ms debounced auto-save. This gating is via `location.state.isDbWorkout`. Don't remove the gate.

- **CSS variables `--accent` (red, identity) and `--accent-green` (completion state)** follow a strict semantic split. Completion fills/borders/text use green; identity contexts (badge labels, threshold values) use red. See [`docs/decisions.md#color-token-convention`](docs/decisions.md#color-token-convention).

- **The big-3 lifts (Bench / Squat / Deadlift) have a seeded floor on personal bests.** `updatePersonalBest` raises only; `rebuildPersonalBest` is bidirectional but floors at `current_one_rep_maxes` for the big three. Server-side logic; client must round-trip correctly. See `#project_pr_semantics` in agent memory.

### Test-design hazards

- **Three timer-test patterns — pick by what you assert.** *Why three:* `vi.useFakeTimers()` without `shouldAdvanceTime` hangs the suite under `userEvent` with no error, so realistic-interaction tests need either real timers or `shouldAdvanceTime: true`. The setups: **(a)** *real timers* (no `vi.useFakeTimers`) when no test asserts a tick value — simplest (`ToolsPanel.test.jsx`); **(b)** `vi.useFakeTimers({ shouldAdvanceTime: true })` + `userEvent` for realistic interaction with coarse (≥1s) tick assertions — the fake clock tracks real time so `userEvent`'s awaits resolve, while explicit `vi.advanceTimersByTime` still drives the timer (`Timer.test.jsx`); **(c)** *frozen* `vi.useFakeTimers()` + `fireEvent` for exact sub-second/tick determinism (`Stopwatch.test.jsx`; `ToolsContext.test.jsx` is the frozen variant driving the API via `renderHook`/`act`).

- **Modal-consumer test harnesses must memoize their callbacks.** `useModalA11y`'s effect lists `onClose` in its deps, so a harness passing a fresh closure on every render re-runs the effect each render — re-capturing the opener and thrashing focus, which breaks focus-trap and focus-return assertions. Wrap the harness's callbacks in `useCallback` so the effect stays scoped to `isOpen` transitions. Canonical fix: the `Harness` in `ToolsPanel.test.jsx`. Applies to every `useModalA11y` consumer's tests (viewProgram, history, customWorkout, customDay, ToolsPanel, PostWorkoutModal, and future consumers in Batches 10/13/14/15).

- **React 19 silently swallows setState on an unmounted component** — no `console.error`, no act warning. A cleanup-on-unmount test therefore **cannot** assert absence-of-warning: it would pass against buggy-by-omission code (false armor). Characterize cleanup via a side-effect/network observable (the in-flight fetch abort in `WorkoutContext.test.jsx`; `createOscillator`-not-called-after-unmount in `ToolsContext.test.jsx`); or, when no observable exists, source-verify the cleanup and **document in the test file that it's source-verified, not behaviorally pinned** (e.g. `Stopwatch.test.jsx`) — the explicit admission stops source-verification from being silently mistaken for behavioral pinning. See [`docs/decisions.md#debounce-cleanup-shape`](docs/decisions.md#debounce-cleanup-shape) and [`#jsdom-environment-mocks`](docs/decisions.md#jsdom-environment-mocks).

- **Pattern (b)'s per-click cost — use `fireEvent` for synchronous bulk walks.** Each awaited `user.click` under `vi.useFakeTimers({ shouldAdvanceTime: true })` (pattern (b)) consumes **~130ms** of wall time — its awaits resolve through the advancing fake clock. A test that walks a stepper/range one awaited click at a time pays ~130ms × N: 30 clicks ≈ 4s, ~80% of the 5000ms test-timeout budget, fragile under any parallel-suite load. For **synchronous** state transitions (clamps, counters — handler-driven, no effect involved), use `fireEvent.click` for the bulk walk and reserve `userEvent.click` for boundary / assertion-relevant clicks where realistic-interaction semantics actually matter. Canonical example: `Timer.test.jsx`'s clamps-minutes test (4138ms → 315ms isolated). **Do NOT apply this shortcut to effect-driven state transitions** — `fireEvent` does not solve the cost there and may introduce a race; see [`#waitfor-discipline-for-effect-driven-focus`](docs/follow-ups.md#waitfor-discipline-for-effect-driven-focus).

- **Effect-driven focus must be asserted with `await waitFor`.** When a component moves focus inside a `useEffect` keyed on state (rather than synchronously in the event handler), a bare `expect(el).toHaveFocus()` races the effect's commit on slow / parallel runners. Wrap those assertions: `await waitFor(() => expect(el).toHaveFocus())`. Two related hazards: **(1) effect-lag** — the focus effect commits a render-cycle after the triggering `setState`. `useModalA11y`'s initial-focus and focus-return-to-opener are both effect-driven; canonical `waitFor` usage is `PostWorkoutModal.test.jsx` (Batch 8). Handler-driven focus (e.g. the Tab-trap's synchronous `.focus()` inside the keydown handler) does **not** need `waitFor` and asserts directly — match the wait to where the focus actually happens. **(2) effect-ordering / focus-steal** — when two focus mechanisms fire on one trigger, a late one can clobber the other; the source-side fix is to make the deferred focus target the *live* state (a single source of truth), not a position-fixed target. Canonical: the `fix(ContextMenu)` rAF-follows-highlight change. See [`docs/follow-ups.md#waitfor-discipline-for-effect-driven-focus`](docs/follow-ups.md#waitfor-discipline-for-effect-driven-focus).

---

## Pointers

- **Plan file** (current refactor initiative): `~/.claude/plans/i-want-to-plan-purrfect-meteor.md`
- **ADRs**: [`docs/decisions.md`](docs/decisions.md)
- **Follow-ups**: [`docs/follow-ups.md`](docs/follow-ups.md)
- **Shape comparisons**: [`docs/comparisons/`](docs/comparisons/) (combobox, rest-timer, day-filter-truth-table, exercise-map-truth-table)
- **Manual testing guide**: [`TESTING_GUIDE.md`](TESTING_GUIDE.md)
- **End-user guide**: [`USER_GUIDE.md`](USER_GUIDE.md)
- **Frontend README**: [`client/max-method/README.md`](client/max-method/README.md)
