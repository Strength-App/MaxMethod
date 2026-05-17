# Architecture Decision Records

This file captures decisions that affect future work on the codebase. Each entry follows the same shape:

- **Decision** — what was decided (one paragraph).
- **Alternatives considered** — the options that were on the table and what made them lose (one paragraph).
- **Rationale** — why this option (one paragraph).
- **Revisit conditions** — what would trigger reopening the decision (one paragraph).

New entries are added at the bottom (chronological), use stable anchor IDs that other docs can link to, and follow this shape strictly. Variations of prose style or section length make the file harder to skim — don't.

> Last reviewed against codebase: 2026-05-17

---

## Frontend Refactor, Documentation & Test Coverage Initiative — Phase 1 Decisions

The entries below were settled during Phase 1 planning. They govern Batches 0–16 of the refactor. Plan file: `~/.claude/plans/i-want-to-plan-purrfect-meteor.md`.

---

### test-runner

**Decision.** Use Vitest + React Testing Library (with `@testing-library/jest-dom` matchers and `@testing-library/user-event` for interaction). Vitest config sets `environment: 'jsdom'` explicitly. Setup file is `src/test/setup.js`.

**Alternatives considered.** Jest + RTL was rejected because it would require babel/transform config for Vite with no upside. "Skip component testing, utils only" was rejected because the H-batches need characterization tests at the component level to catch wiring regressions.

**Rationale.** Vite-native, ESM-first, ~100% Jest API parity, zero extra build config. RTL's `getByRole`/`getByLabelText` queries align with the integration-leaning posture.

**Revisit conditions.** Vitest reaches end-of-life or stops matching Jest's API in a way that breaks tests we depend on.

---

### dom-environment

**Decision.** jsdom (declared explicitly in `vitest.config.js`). Global mocks for missing browser APIs live in `src/test/setup.js`, added only for APIs the codebase actually references — confirmed by Batch 1's grep audit.

**Alternatives considered.** happy-dom is faster but newer; periodic compatibility surprises around DOM APIs the app relies on outweigh the speed delta. Maintaining both environments doubles the maintenance surface for no clear benefit.

**Rationale.** Most widely used DOM emulator, most compatible. The Batch 1 setup file mocks (at minimum) `AudioContext` / `webkitAudioContext` for `ToolsContext`'s timer-end beep; other browser APIs (`matchMedia`, `IntersectionObserver`, `ResizeObserver`, canvas, `vibrate`, `scrollTo`) are mocked only if the audit finds them in use.

**Revisit conditions.** jsdom becomes a measurable test-suite bottleneck.

---

### fetch-mocking

**Decision.** MSW (Mock Service Worker) for network-level fetch mocking. One handlers file at `client/max-method/src/test/msw/handlers.js`.

**Alternatives considered.** Per-test `vi.fn()` stubs were rejected because every test would embed knowledge of the request shape (brittle under API extraction). Extracting an API client module first and stubbing that was rejected because the brief discourages new abstractions without justification.

**Rationale.** Survives refactors of the fetch wrapper. Tests assert on realistic request/response shapes. One new devDep pays back across every page/context test.

**Revisit conditions.** MSW's API breaks in a major version we can't migrate to, or test suite grows large enough that the handlers file becomes unwieldy (then split per domain).

---

### rtl-posture

**Decision.** Integration-leaning component tests: render with the full provider tree (`<UserProvider><WorkoutProvider><ToolsProvider>...`) seeded with test state, MSW backing fetch.

**Alternatives considered.** Shallow tests mocking each context were rejected — they miss exactly the provider/component wiring bugs we're most likely to introduce in H-batches.

**Rationale.** Slower per-test but catches wiring regressions. The PB-detection and log-sync flows in `day.jsx` are integration concerns and need integration tests.

**Revisit conditions.** Test runtime becomes a problem.

---

### snapshots

**Decision.** Snapshots used sparingly — only for `PostWorkoutScreen1`, `PostWorkoutScreen2`, and `UserLevelBadge`. Other components assert on visible text / accessible queries.

**Alternatives considered.** Blanket snapshots create snapshot rot. Zero snapshots miss regressions where DOM structure shifts but text stays.

**Rationale.** The three named components have stable JSX where structure regressions are most likely to matter. Everything else gets behavior assertions.

**Revisit conditions.** A snapshot in the allowed set becomes a churn source.

---

### coverage-philosophy

**Decision.** `@vitest/coverage-v8` installed; coverage is opt-in via `--coverage` flag. Per-category targets recorded as comments in `vitest.config.js`, not as enforced thresholds. **No CI gate on coverage.** Batch summaries report per-category coverage for touched files only.

**Alternatives considered.** Global ≥80% threshold gates create the wrong incentive (writing meaningless tests to lift the number). Skipping coverage tooling entirely loses a useful diagnostic.

**Rationale.** Coverage tooling has diagnostic value (find gaps when investigating). Coverage gates have failure modes (gaming, punishment of legitimate refactors that reduce numbers). The user named this explicitly: "tooling earns its keep through curated application, not uniform application."

**Per-category targets (informational):**
- `src/utils/**`: aim 100% — pure functions, no excuse for gaps
- `src/hooks/**`, `src/context/**`: aim ~80% — branch coverage on logic
- `src/components/**`: aim ~50% — interaction flows, not rendering

**Revisit conditions.** Team grows and coverage trends become useful as a team signal (then add a coverage upload service, still without gating).

---

### test-lint-plugins

**Decision.** Install `eslint-plugin-testing-library`, `eslint-plugin-jest-dom`, and `eslint-plugin-vitest`. Configure each with its **recommended preset** (no custom rule selection), scoped to `**/*.test.{js,jsx}` via the `files` constraint. Violations are CI-blocking like any other lint failure. Per-line disables require justification comments.

**Alternatives considered.** Adding only `testing-library` saves dep count but loses the jest-dom matcher checks. Skipping all three defers cost.

**Rationale.** Test-lint catches common footguns automatically (e.g., `container.querySelector` instead of `getByRole`). Cheap; benefits every test. Scoping to test files keeps the rules out of production code where they don't apply.

**Revisit conditions.** A plugin's recommended preset becomes inappropriately aggressive.

---

### typescript-migration

**Decision.** Out of scope for this initiative. Codebase remains JavaScript; type hints via JSDoc where they add real signal.

**Alternatives considered.** Incremental migration (TS for new/touched files) was rejected — produces a half-typed codebase with mixed import patterns indefinitely. Full migration was rejected — massive scope expansion that conflicts with "preserve behavior."

**Rationale.** TS migration is a separate, much larger initiative deserving its own focused decision-making. The current refactor's value comes from bounded scope.

**Revisit conditions.** Type-related bugs become a meaningful source of regressions, or the team decides to commit to TS as a primary initiative.

---

### app-css-decomposition

**Decision.** Out of scope for this initiative. `App.css` (~5,800 lines) stays as-is. Components moving from inline to extracted reuse existing `App.css` class names verbatim — no new CSS, no Tailwind in new components, no consolidation of duplicate rules.

**Alternatives considered.** Allowing CSS consolidation during component extraction was rejected because consolidation is a design decision (not mechanical) and bundling it with extraction destroys bisectability. Tailwind in new components was rejected because it commits the codebase to a long-term migration path without deliberate evaluation.

**Rationale.** Visual-regression coverage is a prerequisite for safe App.css decomposition; we don't have it. CSS observations noticed during extraction go to `docs/follow-ups.md` for the dedicated decomposition initiative.

**Revisit conditions.** Decision made to start the App.css decomposition initiative with proper visual-regression prerequisites.

---

### mirrored-utils

**Decision.** `utils/classification.js`, `utils/epley.js`, and `utils/exerciseNameNormalize.js` get JSDoc + comprehensive unit tests in Batch 2 but **no behavior changes**. They are mirrored with `Backend_structure/src/utils/*` and the backend has parity test fixtures that fail on drift.

**Alternatives considered.** Refactoring in lockstep with the backend is out of scope for a frontend-only initiative. Leaving them entirely untouched misses an easy testing win on the most critical math in the app.

**Rationale.** The three utils encode load-bearing invariants (Epley formula, leveling thresholds, exercise aliases). Testing them locks behavior; any test failure surfaces a backend-parity bug before it ships.

**Revisit conditions.** Backend coordinates a synchronized change to one of the three utils.

---

### pre-commit-hooks

**Decision.** Skip for this initiative. CI is the canonical pass/fail signal.

**Alternatives considered.** husky + lint-staged adds two devDeps and a one-time setup but introduces hook bypass (`--no-verify`) as a real risk surface and Windows-shell-compat issues. Commitlint adds a third dep without clear benefit during a refactor.

**Rationale.** "Tooling looking for a problem to solve, rather than tooling solving a problem you have." Local devs can run `npm run lint && npx vitest run` before pushing; CI catches what they miss.

**Revisit conditions.** A pattern of broken CI from PRs that would have been caught by pre-commit hooks emerges.

---

### ci-shape

**Decision.** Minimal GitHub Actions workflow at `.github/workflows/ci.yml`. Single `verify` job: checkout, setup-node@v4 (Node 20, npm cache, `cache-dependency-path: client/max-method/package-lock.json`), `npm ci`, `npm run lint`, `npx vitest run`. Triggers on PRs to `dev` and pushes to `dev`. Concurrency control cancels in-flight runs on new pushes. Branch protection (configured in GitHub UI) requires CI pass before merge; **no auto-merge**.

**Alternatives considered.** Adding coverage upload (Codecov / Coveralls) was rejected — diagnostic value doesn't require an external service for this team size. Skipping CI entirely loses the merge-result verification.

**Rationale.** The per-batch PR strategy depends on automated verification at PR time. CI runs on the *merged* result (not just the branch's working state), catching lockfile drift, environment differences, and case-sensitive filesystem issues.

**Notes.** Pinned `actions/checkout@v4` and `actions/setup-node@v4` (major-version pinning gets bug fixes within v4 but avoids surprise v5 breakage). The Tests step no-ops until Vitest lands in Batch 1, at which point it switches to `npx vitest run`.

**Revisit conditions.** CI run time becomes a bottleneck (split lint and tests into parallel jobs), team adds coverage-trend tracking (then add coverage upload).

---

### accessibility-testing

**Decision.** `vitest-axe` opt-in per test, applied only to components where a11y is load-bearing (modals, dialogs, forms, focus-managing components — `PostWorkoutModal`, `EquipmentSelect`, etc.). Configured with WCAG 2.2 AA rules; `region` and `heading-order` disabled at component granularity (they apply at page level). **No per-test suppressions as a workaround** — if axe reports a violation, fix it or document the deliberate acceptance here.

**Alternatives considered.** Blanket axe assertions on every component test create noise on issues the team isn't ready to fix; the discipline degrades. Static-only (existing `eslint-plugin-jsx-a11y`) misses dynamic issues (focus management, ARIA state).

**Rationale.** Curated application keeps signal density high. Axe is *necessary, not sufficient* — it catches missing accessible names and invalid ARIA, but not cognitive accessibility, reading order, or pronunciation. Manual review with assistive tech remains the only way to catch the second category; document this caveat in CLAUDE.md.

**Revisit conditions.** A pattern of dynamic-a11y regressions slipping through opt-in axe emerges.

---

### keyboard-testing

**Decision.** Components with a keyboard contract (comboboxes, `EquipmentSelect`, `ContextMenu`, `RestTimer`, modal flows) get characterization tests using `userEvent.keyboard()`. Assertions are on observable behavior (`toHaveFocus`, ARIA state) — not internal implementation. Queries use `getByRole({ name })`, not `getByTestId`. Focus-trap tests for modals exercise both Tab directions (forward and Shift+Tab).

**Alternatives considered.** Relying on `vitest-axe` alone misses interaction behavior. Manual keyboard passes are low-fidelity and one-time.

**Rationale.** Keyboard tests are integration test territory, not visual-regression territory. RTL's design philosophy ("test what the user-or-AT can observe") aligns with the keyboard contract. Permanent armor across future refactors.

**Revisit conditions.** N/A — discipline holds across all batches.

---

### visual-regression

**Decision.** Manual per-batch visual checks on **visual-check batches (Batches 10–15)** — no Playwright, no screenshot tooling. Pre-batch baselines captured to uncommitted `.batch-screenshots/batch-NN-baseline/` at session start. Post-batch comparison before PR opens; informal side-by-side, not pixel-level. Findings + attached screenshots in PR description. Reviewer (user) spot-checks one page per visual-check batch.

**Alternatives considered.** Playwright + screenshot diffing is the "rigorous" answer but adds flakiness (font rendering, anti-aliasing), baseline management, hundreds of MB of repo storage, and slower CI — all to catch a one-time risk concentrated in a few specific batches. Trusting the existing tests alone leaves a known gap: RTL doesn't see CSS, so className handling can regress silently.

**Rationale.** Manual checks fill the gap at proportional cost. Default viewport only; H-batches that touch responsive-sensitive components expand the check.

**Terminology.** "H-classification" = the file-classification tier (day, customDay, logger, reviewProgram, exerciseLibrary — owned by Batches 11–15). "Visual-check batches" = batches whose protocol scope includes the visual check (Batches 10–15, because Batch 10's RestTimer extraction also touches rendering). The two terms overlap but are not identical.

**Revisit conditions.** Project grows past the refactor and design changes become frequent enough that automated visual regression earns its keep.

---

### css-during-extraction

**Decision.** During component extractions, `className` references and CSS variable references are part of the **verbatim lift**. No new CSS selectors, no new CSS variables, no consolidation of duplicate rules, no Tailwind utility classes in new components. CSS observations noticed during extraction go to `docs/follow-ups.md`.

**Alternatives considered.** Consolidating duplicate CSS during extraction conflates two different problems (move vs. improve) and destroys bisectability. Tailwind in new components partially commits to a migration path the team hasn't deliberately decided.

**Rationale.** Extraction is mechanical movement; styling is design work. App.css is explicitly out of scope (see `#app-css-decomposition`). The discipline of "verbatim with respect to className" anchors the manual visual check — the post-extraction page is *supposed to look identical*, so any visual difference is an extraction defect, not an intentional change.

**Revisit conditions.** App.css decomposition initiative starts with proper prerequisites.

---

### color-token-convention

**Decision.** New components in `components/workout/` strictly inherit the existing convention: `var(--accent)` for identity (red — badge labels, threshold values), `var(--accent-green)` for completion state (fills, borders, completion text). Recorded in `components/workout/README.md` and CLAUDE.md.

**Alternatives considered.** Looser "guidance" risks drift. Out-of-scope ignores the convention-discoverability problem for future contributors.

**Rationale.** Memory-flagged convention with consistent application across the app. Locking it in writing now prevents future drift.

**Revisit conditions.** Design system decision to change the convention.

---

### branching-strategy

**Decision.** Per-batch branch off the current tip of `dev` at the moment work starts. Sequential, never parallel. Naming: `refactor/batch-NN-description` (lex-sortable; e.g., `refactor/batch-00-repo-setup`, `refactor/batch-01-test-infra`). Next batch's branch is not created until the previous batch's PR merges. Hotfixes branch off `dev` normally and are automatically picked up by subsequent batches. Merged branches are deleted (configure "delete branch on merge" in GitHub).

**Alternatives considered.** Single long-lived `refactor/frontend` branch defers integration cost; produces a mega-merge at the end. Working directly on `dev` skips the PR-review checkpoint.

**Rationale.** Integration discipline beats integration deferral in expected-value terms. Per-batch branches automatically pick up hotfixes; conflicts surface immediately and stay small.

**Revisit conditions.** N/A — model holds across all batches.

---

### pr-commit-strategy

**Decision.** One PR per batch, multiple commits per PR. Conventional Commits with scope (e.g., `refactor(workout-context): cancel pending debounce on unmount`). Body answers *why*, not *what*. Pattern within a PR: `test` → `refactor` → `fix` (if a bug was surfaced) → `docs`. Each commit independently green for bisectability. Rebase-merge to `dev` preserves within-PR commit granularity. Agent does **not** auto-merge and **does not start the next batch** until the previous merges. PR size ceiling: ~1000 lines changed — above that, stop and ask about a split.

**Alternatives considered.** Squash merge collapses the within-PR commits into one (loses bisectability). Stacked PR chain adds workflow overhead. Mega-PR at the end is unreviewable.

**Rationale.** The within-PR commit discipline is exactly what makes a refactor reviewable, revertible, and trustworthy. Rebase merge propagates that discipline to `dev`.

**Revisit conditions.** Team adopts a different commit/merge convention.

---

### scope-growth-protocol

**Decision.** When the agent hits a calibrated trigger (PR ≥ ~1000 lines, files outside scope, unanticipated architectural decision, time +50% over estimate, bug load-bearing on the batch), it **stops**, commits partial work with an honest message (`refactor(scope): partial implementation — pending scope decision on [Z]`), opens (or updates) a **draft PR** with a structured summary (*situation / options / recommendation*), and **fully pauses** until direction lands. No parallel work during the pause. The resolution is persisted to `docs/decisions.md` or `docs/follow-ups.md` — not just chat. Symmetric for scope shrinkage.

**Alternatives considered.** Unilateral split optimizes for the agent's local context and may miss the plan-level perspective. Push-through produces mega-PRs or rushed-to-fit work.

**Rationale.** The per-batch checkpoint depends on the agent surfacing plan-affecting decisions; handling them unilaterally breaks the trust contract.

**Revisit conditions.** N/A.

---

### claude-md

**Decision.** `CLAUDE.md` exists at the repo root. Created in Batch 0 with the **session-conventions section complete** (the meta-rules that govern *how* the agent works on this codebase) and the **codebase-conventions section as a marked placeholder** to be filled in Batch 16. Short and ruthlessly opinionated (~200–500 lines), structured for skim-readers, rules over enumerations, references `docs/decisions.md` for depth rather than duplicating. Self-referential: instructs future Claude Code sessions to read it before making changes and to read `docs/decisions.md` before non-trivial structural decisions. Date-stamped.

**Alternatives considered.** Skipping `CLAUDE.md` defaults future Claude Code sessions to generic behavior, losing the discipline this initiative establishes. Writing it upfront with codebase-conventions speculatively risks codifying things that change during execution.

**Rationale.** Claude Code reads `CLAUDE.md` at session start; the contents shape session behavior. Capture meta-rules now (they're settled), defer codebase-conventions until Batch 16 (synthesis of observed reality, not predicted reality).

**Revisit conditions.** Updated in same commit as convention changes during execution. Final synthesis in Batch 16.

---

### follow-ups-index

**Decision.** `docs/follow-ups.md` is the destination for deferred work — scope-adjacent improvements, design alternatives waiting for evidence, observations noticed during execution that don't belong in the current batch. Each entry follows: one-line description · design space · trigger conditions for revisiting · effort/risk estimate.

**Alternatives considered.** Tracking follow-ups in issues only loses the context. Capturing in chat is ephemeral.

**Rationale.** Disciplined deferral preserves "noticed but didn't do" without absorbing it silently. Persistent, searchable, contextual.

**Revisit conditions.** N/A — file grows with use.

---

### combobox-primitive

**Decision.** Extract a `hooks/useCombobox.js` hook for `customDay.jsx` and `logger.jsx` (whose `handleComboKeyDown` functions are literal copies — verified via grep). The hook captures the state machine + keyboard handlers + ARIA props; each consumer renders its own JSX (input, listbox wrapper, option styling, "create new" affordance for logger). `history.jsx`'s combobox is **not** migrated — different selection contract and surrounding context. `EquipmentSelect.jsx` is a different WAI-ARIA pattern (Select-Only Combobox) and is already extracted. Extraction is the first commit of Batch 13; Batch 14 consumes the same hook.

**Alternatives considered.** A `<Combobox>` component (rather than a hook) was rejected because the rendering varies by consumer (program-restricted vs ad-hoc free-text) — component-shaped primitives force consumers through your rendering decisions. Extracting upfront in Batch 7 was rejected because it would build the API before seeing the call sites. Leaving all three per-page was rejected because the customDay↔logger duplication is literal-copy (comments verbatim identical).

**Rationale.** Phase 1 shape-comparison (`docs/comparisons/combobox.md`) confirmed two-way overlap with the third consumer (history) genuinely different.

**Revisit conditions.** A fourth combobox emerges; a defect surfaces in `history.jsx`'s combobox; logger's free-text "create new" semantics need first-class support in the hook.

---

### rules-of-hooks-fix-shape

**Decision.** The `settings.jsx` Rules-of-Hooks ordering issue is fixed in Batch 9b as three commits: (1) `test(settings)` — characterization tests covering null-user render, populated-user render, and the **null→populated transition** (the case that exposes hook-order issues); (2) `fix(settings)` — move the conditional return below the hook calls and **add internal `if (!user) return;` guards inside each effect body** (because effects will now register on every render); (3) optional `chore(settings)` — remove the `eslint-disable` comment. After the fix, sweep the codebase for similar patterns; findings catalog goes in the batch summary (fix in 9b or list in follow-ups).

**Alternatives considered.** Silent fix folded into the L-refactor violates the surface-bugs rule. Leaving it as a known issue defers a real correctness problem.

**Rationale.** The null→populated transition is the case that distinguishes broken from fixed; without it the test is uninformative. The internal effect guards are part of the fix (effects fire on every render post-fix, so they need their own null-check).

**Revisit conditions.** N/A.

---

### debounce-cleanup-shape

**Decision.** The `WorkoutContext.updateLog` debounce cleanup bug is fixed in Batch 5 as three commits: (1) characterization tests pin three properties — no `setState`-on-unmounted warning, no orphan fetch after unmount during pending debounce, cross-workout edit ordering preserved (these tests fail today; they characterize the bug); (2) the fix uses `useRef` for the timeout ID + `AbortController` for the in-flight fetch; (3) audit sibling contexts (`UserContext`, `ToolsContext`) for the same pattern — findings in batch summary. **Behavior-change note**: post-fix, edits made within the debounce window before unmount are *cancelled* rather than persisting via orphan fetch. Intentional; matches user expectation.

**Alternatives considered.** Silent fix folded into the L-refactor. Leaving as a known issue. Adding a speculative `flush()` method on the debounced callback for consumers to call before navigation was rejected — no current call site needs it.

**Rationale.** The bug is real (`setState`-on-unmounted warnings, orphan fetches with no error handling). The fix has a real behavior change that deserves explicit acknowledgment so it doesn't get rediscovered as a regression later.

**Revisit conditions.** A consumer flow needs the pre-unmount edit to persist (then add `flush()` with concrete justification).

---

### day-filter-truth-table

**Decision.** The `home.jsx` / `viewProgram.jsx` day-display filter (`d?.title != null`) is **intentionally title-only** per memory. In Batch 9a (or wherever Risk #6 is exercised), the filter's behavior is first **ground-truthed** by running the unmodified code against the full input matrix (titled, null-title, missing title field, empty string, whitespace-only) and recording the actual output in `docs/comparisons/day-filter-truth-table.md`. The locking test asserts the recorded truth — not intuition about what the filter "should" do. Doc comment at the filter site references both the test and the truth table.

**Alternatives considered.** Surfacing as a possible bug for review was rejected because the memory entry is explicit and consistent. Fixing to require both title AND something else (e.g., `exercises.length`) is a behavior change out of scope.

**Rationale.** Locking current behavior with ground-truthed tests prevents accidental "fixes" by future contributors and surfaces any edge case where intent diverges from reality.

**Revisit conditions.** A bug report indicates the filter doesn't match user expectation.

---

### batch-0-existence

**Decision.** Batch 0 (this batch) exists as a separate batch from Batch 1 (test infrastructure). Its scope is repo-level scaffolding only: PR template, CI workflow, ADR file, follow-ups index, combobox comparison artifact, CLAUDE.md (with session-conventions complete and codebase-conventions placeholder), client/max-method README stub. No test infra, no source changes.

**Alternatives considered.** Folding into Batch 1 saves one PR cycle but bundles two distinct "done" criteria into one batch, blurring focus. The scaffolding files have downstream consumers from every subsequent batch (ADR file, PR template, branch convention) — they need to exist before Batch 1.

**Rationale.** Scaffolding determines the conventions that govern Batch 1 itself. Separating them preserves the single-concern-per-batch discipline and gives the scaffolding files focused review attention.

**Revisit conditions.** N/A.

---

### batch-9-split

**Decision.** Batch 9 (light-refactor pages) is pre-split into **9a (genuinely light)** and **9b (bug-fix-containing)**. 9a covers welcomepage, classification, onboarding, goals, loadingPage, home, pickNewProgram, history, customWorkout. 9b covers createAcc (axios→fetch two-commit migration), settings (Rules-of-Hooks three-commit fix + codebase sweep), viewProgram (debounced-title cleanup with behavior-change note).

**Alternatives considered.** Single Batch 9 was rejected — twelve files plus three multi-commit bug-fix sequences would bump up against the ~1000-line PR ceiling immediately. Flagging as "likely to split" without pre-design defers the decision to mid-execution where it's improvised.

**Rationale.** Pre-splitting the batch puts the bug fixes in a focused PR where they get focused review. The 9a pages are docs-and-tests-only and can be reviewed quickly as a group.

**Revisit conditions.** Either half grows past the ceiling — apply the scope-growth protocol.

---

### rest-timer-shape-checkpoint

**Decision.** Batch 10's first commit is `docs(workout): RestTimer shape comparison across day/logger` at `docs/comparisons/rest-timer.md`. The artifact resolves whether `logger.jsx`'s timer is a literal copy of `day.jsx`'s (migrate both) or a near-duplicate (extract from day only, defer logger consolidation). The determination drives the rest of the batch.

**Alternatives considered.** Making the determination in-line during extraction risks scope creep and surprises mid-batch.

**Rationale.** Same pattern as the combobox comparison: explicit checkpoint, persisted artifact, decision before execution.

**Revisit conditions.** N/A.

---

### batch-16-synthesis

**Decision.** Batch 16 finalizes `CLAUDE.md`'s codebase-conventions section by **synthesizing existing artifacts** — per-batch summaries, `docs/decisions.md`, `components/workout/README.md`, ADR entries — into a short, opinionated brief. **Not** new analysis from a blank page. Each prior batch's summary flags anything that belongs in CLAUDE.md's codebase section; Batch 16 collates.

**Alternatives considered.** Writing CLAUDE.md's codebase section from retroactive inspection of the codebase is much more work and risks missing things that weren't surfaced earlier.

**Rationale.** Disciplined per-batch reporting makes Batch 16 mostly mechanical. If Batch 16 finds itself doing significant new analysis, that's a signal earlier batches under-reported and the gap should be filled now (not retroactively reconstructed).

**Revisit conditions.** N/A.
