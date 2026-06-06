# Architecture Decision Records

This file captures decisions that affect future work on the codebase. Each entry follows the same shape:

- **Decision** — what was decided (one paragraph).
- **Alternatives considered** — the options that were on the table and what made them lose (one paragraph).
- **Rationale** — why this option (one paragraph).
- **Revisit conditions** — what would trigger reopening the decision (one paragraph).

New entries are added at the bottom (chronological), use stable anchor IDs that other docs can link to, and follow this shape strictly. Variations of prose style or section length make the file harder to skim — don't.

> Last reviewed against codebase: 2026-05-19

---

## Frontend Refactor, Documentation & Test Coverage Initiative — Phase 1 Decisions

The entries below were settled during Phase 1 planning. They govern Batches 0–16 of the refactor. Plan file: `~/.claude/plans/i-want-to-plan-purrfect-meteor.md`.

---

### test-runner

**Decision.** Use Vitest + React Testing Library (with `@testing-library/jest-dom` matchers and `@testing-library/user-event` for interaction). Vitest config sets `environment: 'jsdom'` explicitly. Setup file is `src/test/setup.js`.

**Alternatives considered.** Jest + RTL was rejected because it would require babel/transform config for Vite with no upside. "Skip component testing, utils only" was rejected because the H-batches need characterization tests at the component level to catch wiring regressions.

**Rationale.** Vite-native, ESM-first, ~100% Jest API parity, zero extra build config. RTL's `getByRole`/`getByLabelText` queries align with the integration-leaning posture.

**Note on `--passWithNoTests` (2026-05-17, Batch 1).** The `test:run` and `test:coverage` npm scripts both include `--passWithNoTests`. Vitest 4 exits code 1 by default when no test files match the discovery glob; this would fail CI for any Batch 1-era state (and any future state where all tests happen to be deleted in a single PR — a degenerate case PR review catches via the diff anyway). The flag is **permanent**, not transitional: keeping it removes a future-contributor footgun (the flag-removal step that's easy to forget once tests exist) and costs nothing once tests are present (the flag becomes informational — it only changes behavior on empty-suite runs). Discipline against accidental test deletion lives in PR review, not in CI semantics.

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

**Decision.** Install `eslint-plugin-testing-library`, `eslint-plugin-jest-dom`, and **`@vitest/eslint-plugin`**. Configure each with its **recommended preset** (no custom rule selection), scoped to `**/*.test.{js,jsx}` via the `files` constraint. Violations are CI-blocking like any other lint failure. Per-line disables require justification comments.

**Substitution note (2026-05-17, Batch 1).** Originally named `eslint-plugin-vitest@0.5.4` at plan time; substituted `@vitest/eslint-plugin@^1.6.17` during Batch 1's dep approval. The legacy package (`veritem/eslint-plugin-vitest`) has been stale since 2024 — last npm publish over a year ago. The Vitest organization's actively-maintained official version lives at `vitest-dev/eslint-plugin-vitest` under the `@vitest/eslint-plugin` package name with the same purpose, same recommended-preset shape, and ongoing maintenance. The substitution is purely a tracking-the-maintained-fork correction, not a behavior change.

**Alternatives considered.** Adding only `testing-library` saves dep count but loses the jest-dom matcher checks. Skipping all three defers cost. Pinning the legacy `eslint-plugin-vitest@0.5.4` was considered and rejected — actively-maintained tooling beats deprecated tooling, all else equal.

**Rationale.** Test-lint catches common footguns automatically (e.g., `container.querySelector` instead of `getByRole`, `no-focused-tests`, `expect-expect`). Cheap; benefits every test. Scoping to test files keeps the rules out of production code where they don't apply.

**Revisit conditions.** A plugin's recommended preset becomes inappropriately aggressive. The legacy `eslint-plugin-vitest` resumes maintenance and overtakes `@vitest/eslint-plugin` in rule coverage (unlikely).

---

### typescript-migration

**Decision.** Out of scope for this initiative. Codebase remains JavaScript; type hints via JSDoc where they add real signal.

**Alternatives considered.** Incremental migration (TS for new/touched files) was rejected — produces a half-typed codebase with mixed import patterns indefinitely. Full migration was rejected — massive scope expansion that conflicts with "preserve behavior."

**Rationale.** TS migration is a separate, much larger initiative deserving its own focused decision-making. The current refactor's value comes from bounded scope.

**Revisit conditions.** Type-related bugs become a meaningful source of regressions, or the team decides to commit to TS as a primary initiative.

**Note on transitive TypeScript dependency (2026-05-17, Batch 1).** As of Batch 1, `typescript@6.0.3` appears in `node_modules` as a transitive of `@vitest/eslint-plugin` → `@typescript-eslint/utils` → `@typescript-eslint/typescript-estree` (which declares `typescript: ">=4.8.4 <6.1.0"` as a required peer dependency). It also appears transitively under `msw` (CLI tooling). Both consumers dedupe to the same `6.0.3` resolution.

This does **not** contradict the out-of-scope decision: TypeScript is present as a parser library used internally by lint tooling, not as a source-language compiler. The codebase remains JavaScript-only — no `tsconfig.json`, no `.ts/.tsx` files, no `tsc` invocation in any npm script. The transitive is unavoidable while retaining any modern Vitest lint plugin: the legacy `eslint-plugin-vitest@0.5.4` named in the original plan has the same transitive via `@typescript-eslint/utils@^7.7.1`.

If you see `typescript` in `node_modules` and wonder "I thought TypeScript was out of scope?" — this is why. The decision still stands for source-language commitments.

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

**Amendment (Batch 5, 2026-05-19 — applied; commits `b8731d4` fix+tests, `8ae4568` debug-log cleanup).** Three corrections to the Decision text above, surfaced during execution:

1. **Commit shape (Rule #13 reconciliation).** The "three commits" framing is conceptual, not literal. A commit whose stated purpose is "characterization tests that fail" is not independently green and so violates Rule #13's bisectability requirement (and doesn't qualify for the new-file-helper carve-out, since `WorkoutContext.jsx` already existed). The fix and its three characterization tests therefore landed *together* in commit `b8731d4`; the "characterization" status is documented in the commit body (with a demonstrability proof: check out `HEAD~1`, apply only the test file, run vitest, observe the three failures) rather than expressed as a separate red commit. The sibling-audit findings land as this amendment plus the follow-up entries below — a `docs(context-audit)` commit — not as a code commit.

2. **Property A reshape (React 19 observability).** The Decision's first property — "no `setState`-on-unmounted warning" — was React-17-era. React 19 silently swallows `setState` dispatched against an unmounted component: no `console.error`, no act warning, no observable channel. A test asserting "no warning" passes against unmodified source, contradicting the "tests fail today" framing. Property A was reshaped to observe the in-flight fetch's **abort at the network boundary** (the MSW handler attaches an `abort` listener to `request.signal`; the test asserts it fired). The contract is "in-flight fetches do not race the unmount"; `request.signal` is the network-layer observable for that contract — not implementation-reaching (it does not touch the `AbortController` instance or any internal flag). The three reshaped properties are: (A) in-flight PATCH aborts on unmount, (B) no orphan PATCH when unmount precedes the debounce firing, (C) cross-call ordering — a stale earlier in-flight PATCH cannot land after a newer `updateLog` has updated state.

3. **Behavior framing (provider-lifetime correction).** The original "edits before unmount are cancelled — matches user expectation" framing elided where `WorkoutProvider` actually sits: it wraps `<Routes>` (`App.jsx:104`) so state survives in-app navigation. The fix has two distinct behaviors with very different real-world trigger frequencies:
   - **Cross-call abort (high-frequency, real user value).** Each new `updateLog` aborts any in-flight PATCH from a prior edit. Fires on every rapid successive edit within a session; prevents stale-write races where an older response lands after a newer one. This is the half of the fix that earns its keep in normal use.
   - **Cleanup-on-unmount (defensive, narrow trigger).** On `WorkoutProvider` unmount, a pending debounce timer is cleared and an in-flight PATCH is aborted. But the provider unmounts only on **page reload or tab close** — *not* on in-app navigation (it survives the router) and *not* on logout (which keeps the provider mounted and clears state via `logoutWorkout`). So this path fires only at full app teardown. The correct framing is *defensive* — it prevents orphan requests and `setState`-against-unmounted-provider hazards on teardown — rather than the original "matches user expectation," which tacitly assumed a navigation scenario that does not trigger the cancel. (In-app navigation does **not** cancel a pending edit; the edit persists and the PATCH fires after the page swaps.) See CLAUDE.md's surprising-things entry for the user-facing summary.

**Coherence gap (tracked, deferred).** The fix introduced an internal inconsistency in `WorkoutContext`: `updateLog` now aborts-on-unmount, but `fetchWorkout` (the bootstrap/refetch GET in the same file) does not follow the same pattern. This is the same in-flight-fetch-no-cleanup shape, lower-impact (idempotent GET, React-19 silent swallow), captured as [`docs/follow-ups.md#workoutcontext-fetchworkout-cleanup-pattern`](follow-ups.md#workoutcontext-fetchworkout-cleanup-pattern) and deferred per the audit's defer-not-fix recommendation.

**Sibling audit findings (Batch 5, defer-not-fix).** The Risk #8 audit of `UserContext`/`ToolsContext` (and `WorkoutContext`'s own siblings) for the same debounce-cleanup pattern found two further instances of the in-flight-fetch-no-cleanup shape — both low-impact idempotent GETs — and one minor resource-lifecycle nicety, all deferred to follow-ups: [`#workoutcontext-fetchworkout-cleanup-pattern`](follow-ups.md#workoutcontext-fetchworkout-cleanup-pattern), [`#usercontext-bootstrap-fetch-cleanup-pattern`](follow-ups.md#usercontext-bootstrap-fetch-cleanup-pattern), [`#toolscontext-audiocontext-close`](follow-ups.md#toolscontext-audiocontext-close). The parallel Risk #12 cross-page-staleness audit of all top-level context state fields confirmed `personalBests` remains the only known-stale field (out of scope per [`#personal-bests-staleness-day-logger`](follow-ups.md#personal-bests-staleness-day-logger)); the full enumeration (including one low-risk note on `workout`/`displayWorkout`) is in [`#cross-page-staleness-other-context-fields`](follow-ups.md#cross-page-staleness-other-context-fields). A related test-observability finding (`usePostWorkoutModal`'s cancellation-guard tests share Property A's React-19 invisibility) is captured as [`#usepostworkoutmodal-cancellation-guard-tests-react19-invisibility`](follow-ups.md#usepostworkoutmodal-cancellation-guard-tests-react19-invisibility).

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

### onboarding-epley-unification

**Decision.** `onboarding.jsx` now estimates entered-best-set 1RMs via `floorTo5(estimateOneRepMax(...))` from `utils/epley.js`, replacing a private `REP_COEFFS` percentage-coefficient table (`round((weight / coeff) / 5) * 5`). This is a **deliberate behavior change**, signed off mid-Batch-9a.

**Premise correction.** The plan listed `classification.jsx` + `onboarding.jsx` as "L (route through `utils/epley.js`)", framed as a behavior-preserving dedup. Reading the code revealed the premise was wrong (same shape as the Phase-1 combobox premise correction): these pages did **not** use the Epley formula — they used a Brzycki-style percentage table that yields different numbers (e.g. bench 100×5 → 110 via the table vs 115 via `floorTo5(epley)`). So "route through epley" could not be a verbatim lift; it is a real behavior change.

**What changed for users.** Entered-best-set baselines estimate slightly higher and **floor** (not round) to the nearest 5: bench 100×5 110→115, squat 150×3 160→165; true singles (reps === 1) unchanged at the lifted weight. Non-integer reps in [1,15] previously produced `NaN`; they now produce the em-dash placeholder (the util requires integer reps). Beginner/skip bodyweight-defaults never used the table and are untouched. Because onboarding feeds these maxes to `/loading` → `/classification`, a new user's seeded classification can shift by a level boundary in edge cases. Frontend-contained: onboarding submits the final maxes (not raw weight×reps), so the server consumes the new numbers with no backend change.

**Alternatives considered.** (a) *Pin the percentage table verbatim, dedup only between the two pages, defer reconciliation* — the disciplined behavior-freeze default; rejected by sign-off in favor of converging on one estimator now. (b) *Skip both files* — defers the question. (c) *Unify* (chosen) — one estimator across onboarding, the OneRMCalc tool, and the server's post-log estimate.

**Rationale.** A single 1RM estimator across the app removes a silent divergence where the signup estimate disagreed with every later estimate the user sees. The percentage table had no other consumer once `classification.jsx` (its dead twin) was removed.

**Revisit conditions.** A product decision that the onboarding baseline should be *conservative* (round down harder) or use a different model than post-log estimation — at which point the estimator split would be reintroduced intentionally, documented, and tested.

---

### classification-page-removal

**Decision.** `src/pages/classification.jsx` is **deleted** along with its `/classification` route and `App.jsx` navigation-hiding entry; `welcomepage.jsx`'s incomplete-onboarding login redirect is repointed from `/classification` to `/onboarding`.

**Why it was dead.** `classification.jsx` was the original standalone strength-baseline screen. Commit `cf7031e` ("Added classification.jsx to onboard.jsx") folded its logic into the multi-step `onboarding.jsx`, which is the live flow (createAcc → `/onboarding`). The leftover `/classification` route rendered `<Classification />` with **no props**, but the component reads `formData.benchPressWeight` — so actually reaching the route (an existing user logging in with `onboarding_complete === false`, via `welcomepage.jsx`) crashed at render. The page held the same percentage-table estimator as onboarding (see `#onboarding-epley-unification`); removing the page removed the table's last duplicate.

**Alternatives considered.** (a) *Characterize + unify it anyway by passing props in tests* — pins/changes logic that never runs live; rejected. (b) *Leave it* — leaves a crash-on-render route reachable from login; rejected. (c) *Delete + redirect* (chosen).

**Rationale.** Removing dead, crash-on-render code is strictly safer than documenting around it. The welcomepage repoint is a necessary companion (its old target no longer exists) and is itself a crash fix — incomplete-onboarding logins now resume the working onboarding flow instead of hitting the broken screen.

**Revisit conditions.** N/A — the behavior it implemented lives in `onboarding.jsx`.

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

---

### lint-suppressions-baseline

**Decision.** Pre-existing ESLint violations in `client/max-method/` (79 errors across 17 files, surfaced by CI in Batch 0) are baselined via ESLint 9.24+'s native suppressions feature. `client/max-method/eslint-suppressions.json` captures the exact set of suppressed violations (file × rule × count) and is committed to the repo. The main `lint` script (`eslint .`) reads the file automatically; CI passes on the baseline. New violations of any rule in any file fail CI normally. A `lint:suppressions-check` script (Node wrapper) surfaces stale entries (suppressions whose violations no longer occur) and is wired into CI as a **non-blocking warning step** initially. `lint:suppressions-prune` (a wrapper around `eslint . --prune-suppressions`) provides the cleanup command. Each batch that touches a file with suppressions is expected to shrink that file's entries.

**Alternatives considered.**
- *Loosen the failing rule set* (option d in the original triage): permanently weakens lint signal; rejected because the failing rules catch real bugs already scheduled for plan-allocated batches.
- *Dedicated Batch 0.5 fixing all 79 errors* (option b): wrong shape for the bug-tier errors (Rules-of-Hooks, set-state-in-effect, immutability, no-dupe-keys), all of which have plan-specified characterization-tests-first shapes in their assigned batches. Folding them into a "lint cleanup" pass violates the discipline.
- *Manual hybrid — ignore-list bug-shaped errors, fix the cheap ones in Batch 0.5* (option c): directionally right, but the suppressions feature is purpose-built for exactly this and produces a per-file × per-rule × per-count baseline that's strictly more precise than manual triage.
- *Coarser implementations of option a* (warn-mode, `--max-warnings <N>`): count-based gates are fragile (a *different* file's new warning can replace a fixed warning); the suppressions feature's per-file precision is the correct granularity.

**Rationale.** Preserves the framework's "CI gates merges" property immediately, blocks regression in any file, lets each bug-tier error stay in its plan-allocated batch with characterization tests, and produces a shrinkage curve that's visible in the suppressions-file diff each batch. The shrinkage discipline is captured as meta-rule #18 in `CLAUDE.md`.

**ESLint 9 mechanics worth knowing.**
- `--suppress-all` writes/updates `eslint-suppressions.json` (default location).
- Default `eslint .` reads it and exit-0s on suppressed violations.
- Stale entries surface as a console notice ("There are suppressions left that do not occur anymore") but **do not fail with non-zero exit**. The `check-suppressions.cjs` script (`client/max-method/scripts/`) parses this notice and exits 1 when found — that's how CI surfaces shrinkage.
- `--prune-suppressions` removes unused entries (run via `npm run lint:suppressions-prune`).
- Only **errors** are suppressed by `--suppress-all`. Warnings (in our case 14 × `react-hooks/exhaustive-deps`) remain visible in lint output but don't fail CI either (warnings don't fail unless `--max-warnings 0`).

**Revisit conditions.**
- Suppressions file reaches zero entries (delete the file and remove the related scripts/CI step).
- The shrinkage cadence proves stable across several batches (flip the `lint:suppressions-check` CI step from `continue-on-error: true` to blocking).
- ESLint releases a breaking change to the suppressions API.

---

### within-file-key-duplication-finding

> **Status as of Batch 3 (2026-05-18): ground-truthed; all 32 duplicates are cosmetic (identical values on both sides — `'Bodyweight'` → `'Bodyweight'` in every case).** See [`docs/comparisons/exercise-map-truth-table.md`](comparisons/exercise-map-truth-table.md) for the full 32-entry evidence. The "runtime data loss" framing in the original Decision text below is technically correct at JS-engine level (later overwrites earlier) but observationally inert because the two values are equal. Original framing preserved below for the historical record — the ADR's pre-written revisit-condition correctly anticipated this case, and that calibrated-uncertainty discipline is itself worth preserving.

**Decision.** ESLint's `no-dupe-keys` rule (32 errors) surfaced **within-file duplicate keys** in object literals in `exerciseLibrary.jsx` (22) and `reviewProgram.jsx` (10) — a problem **distinct from the cross-file duplication** the plan had already identified for Batch 3's `config/exercises.js` consolidation. Within-file duplication means later keys silently overwrite earlier ones in the same object literal, causing **runtime data loss** in the lookup tables: some movement/equipment pairings declared earlier in the file are not actually being applied.

The resolution: Batch 3 ground-truths each duplicate against the unmodified runtime behavior (same shape as Risk #6's day-filter ground-truth step), produces `docs/comparisons/exercise-map-truth-table.md` recording which value wins for each duplicated key, and resolves the duplicates as part of consolidating the maps into `config/exercises.js`. The associated implementation work is tracked in `docs/follow-ups.md#exercise-map-dedup-rule` until Batch 3 lands.

**Alternatives considered.**
- *Fix the duplicates in Batch 0 / 0.5 as a quick `no-dupe-keys` cleanup*: rejected because removing a duplicate key is a behavior change (the silently-overwritten value disappears or the silently-winning value disappears, depending on which one we keep). Without ground-truthing against runtime behavior, the "fix" risks changing observable mappings.
- *Treat as a Batch 12 (`exerciseLibrary.jsx`) and Batch 11 (`reviewProgram.jsx`) heavy-refactor concern, not Batch 3*: rejected because the duplicated maps are the same data that's being consolidated into `config/exercises.js`. Fixing the dedup in Batch 3 means the H-batches consume already-resolved data.

**Rationale.** Surfaced by CI enforcement after Batch 0 — exactly the kind of latent bug the lint baseline was supposed to surface. Treating it as a separate ADR (rather than folding into `#lint-suppressions-baseline` or just a follow-up) preserves the discovery as a learnable historical artifact: the absence of CI lint enforcement let runtime data loss accumulate undetected.

**Revisit conditions.** Batch 3 ground-truthing reveals the duplicates aren't actually silent (e.g., they're identical values and the duplication is cosmetic) — then this ADR amends to reflect that and the work changes shape.

---

### utils-purity

**Decision.** Files under `client/max-method/src/utils/` may hold I/O-touching helpers. There is **no pure-only convention** for that directory. The first concrete instance is `utils/customExercises.js` (added in Batch 3), whose `addToCustomExercises` writes to `localStorage` and fires a best-effort `fetch` POST. Future contributors writing a side-effectful `utils/` module are expected to: (1) document the side effects in the module header and the JSDoc of each export that has them; (2) make the side effects fail-safe — best-effort with swallowed errors, no throws that the caller doesn't expect; (3) test the side effects using the existing patterns (MSW for fetch, jsdom's built-in localStorage) rather than inventing new test plumbing.

**Alternatives considered.**
- *Pure-only `utils/`, with a separate `lib/` (or similar) directory for side-effectful helpers.* Rejected because the existing `utils/` files (`epley`, `classification`, `exerciseNameNormalize`, `setDisplay`, plus the new `dateUtils`) happen to be pure but `utils/` wasn't designed that way — it's just where shared helpers live. Splitting into two directories now would invent a convention post-hoc to fit five existing files and one new I/O-touching one, with no concrete payoff beyond cosmetic separation.
- *Pure utils, side-effectful helpers go in `hooks/`.* Rejected because hooks have a React-lifecycle constraint. Module-level helpers like `addToCustomExercises` are called from event handlers and from non-React module code, not from render — wrapping them in a hook would be a category error and would force every consumer to call them inside React.
- *Leave the question unwritten and decide case-by-case.* Rejected because Batch 3 is the first time the question arose, and the cost of re-litigating it in each future batch is higher than the cost of one ADR entry that settles it.

**Rationale.** Side effects in shared helpers are a legitimate category of shared code (state management, network I/O, browser API access). Putting them in `utils/` alongside pure helpers is fine as long as the side effects are documented at the boundary and the helpers are fail-safe. The discipline lives in the documentation contract, not in directory geography. `customExercises.js` is the test case for this rule: its module header announces the side effects, JSDoc on `addToCustomExercises` enumerates them, and the test suite covers the no-userId branch and the fetch-rejects branch alongside the happy path.

**Revisit conditions.** A pattern of `utils/` helpers growing complex enough that the directory becomes hard to navigate — at which point a deliberate pure-vs-side-effectful split would be a single, planned restructure with all the call-site migration that entails, not a piecemeal slide. Also revisit if a future contributor proposes a pure-only convention with a concrete pain point that motivates it (e.g., a tree-shaking constraint where pure helpers need to live in a separate tree).

---

### test-file-extension-convention

**Decision.** Test files use `.test.jsx` when their source contains JSX (test harness components, inline JSX in `render()` calls, etc.) and `.test.js` when the file is JSX-free (pure utility tests). The convention mirrors the source-file convention exactly: `.jsx` for files that contain JSX, `.js` for files that don't. First applied in Batch 4, where `useModalA11y.test.jsx` was the first hook test to render React in a test harness. Batches 1–3's existing tests stay `.test.js` because they characterize pure functions and contain no JSX — no retroactive renames.

**Alternatives considered.**
- *Always `.test.jsx` for uniformity.* Rejected because retroactive renames of Batches 1–3's test files would be busywork with no upside, and forcing JSX-free utility tests to use `.jsx` blurs the per-file signal (a reader can't tell from the extension whether the file actually renders React).
- *Always `.test.js`, with Vitest configured to transform JSX in any `.test.js` file.* Rejected because it adds a second touch to `vitest.config.js` for a problem the file extension already solves cleanly, hides JSX inside a `.js` extension (weaker per-file honesty), and produces no benefit over the chosen convention once it's established.

**Rationale.** Mirrors the source-file convention exactly — readers infer "renders React" from the filename, same as they do for source files. Zero infrastructure cost: Vitest already handles both extensions through `@vitejs/plugin-react`. Retroactively coherent — Batches 1–3 stay correct without renames because their tests legitimately don't contain JSX. Honest per-file signal: a `.test.jsx` filename announces "this test sets up a React tree."

**Revisit conditions.** Vitest changes its default file resolution in a way that makes `.test.jsx` files require additional configuration. The codebase adopts TypeScript and the extension question reshapes around `.test.ts`/`.test.tsx`. The team adopts a different file-extension convention for source files (the test-file convention follows the source-file convention by design).

---

### jsdom-environment-mocks

**Decision.** When the codebase depends on a browser API that jsdom doesn't implement (or implements degenerately because layout isn't computed), mock the API in `src/test/setup.js` scoped to the surfaces the codebase actually uses. Each mock includes a justifying comment naming: the consumer(s), the access pattern, the rationale, and any per-test opt-out for negative branches. The current set of mocks:

- **`window.matchMedia`** — single consumer `UserLevelBadge.jsx` (prefers-reduced-motion gate); default `matches=false`, per-test override pattern documented inline.
- **`window.AudioContext` / `window.webkitAudioContext`** — single consumer `ToolsContext.jsx` (timer-end beep). The mock covers exactly the surfaces `playBeep` touches: `ctx.currentTime`, `ctx.resume`, `ctx.createOscillator`, `ctx.createGain`, `ctx.destination`, the oscillator (`frequency.value`, `type`, `start`, `stop`, chained `connect`), and the gain `AudioParam` (`value`, `setValueAtTime`, `linearRampToValueAtTime`). **Aligned in Batch 6** (`test(setup)`): the original Batch 1 mock shimmed `setTargetAtTime` per a stale comment, but `playBeep` actually calls `setValueAtTime` + `linearRampToValueAtTime` and reads `currentTime`. The drift went unnoticed until Batch 6's ToolsContext characterization — the first test in the codebase to run the timer through to `finished` and exercise the beep path — threw `TypeError: gain.gain.setValueAtTime is not a function`. Per-test opt-out documented inline for the "audio unavailable" branch.
- **`HTMLElement.prototype.offsetParent`** (added in Batch 4) — `useModalA11y.js`'s `isVisible()` predicate checks `el.offsetParent !== null` to decide whether an element is in layout. jsdom doesn't compute layout, so `offsetParent` is always `null` and the predicate degenerately reports every element as not-visible. The shim returns `parentNode` so visible focusables register as visible, restoring the hook's Tab-trap and initial-focus behavior under test. Six consumers of `useModalA11y` rely on this (viewProgram, history, customWorkout, customDay, ToolsPanel, PostWorkoutModal); future focus-managing components in later batches (`ContextMenu`, `EquipmentSelect`, `RestTimer`, etc.) inherit the same shim without further configuration.

**Alternatives considered.**
- *Test-file-scoped shims* (define the missing property in each test's `beforeEach`, tear down in `afterEach`). Rejected for codebase-wide concerns. Test-file-scoped shims are appropriate for one-off needs; once a property has multiple consumers, the cost of repeating the shim and risk of drift across files outweighs the conservatism. `offsetParent` has six existing consumers and several upcoming ones — a global mock is cheaper to maintain than N scoped copies.
- *Characterize the jsdom degradation* (rewrite tests to assert what the hook does when `getFocusables()` returns `[]`, i.e., the test-environment artifact). Rejected because characterization tests should pin observable production behavior, not test-environment artifacts. Pinning "the hook treats every element as invisible in our test environment" hides the real contract from future readers and produces tests that would silently mask real regressions.
- *Switch DOM environment to happy-dom or a real-browser runner* (Playwright). Out of scope: would change the testing environment for every existing test, and the trade-off (faster, less compatible — or much slower, hardware-coupled) isn't justified by a layout-property gap that's cheap to mock.

**Rationale.** jsdom is the DOM emulator we chose (see `#dom-environment`); its known limitations around layout are an environment artifact, not a behavior to characterize. Mocking layout-derived properties the codebase relies on is structurally identical to mocking `matchMedia` and `AudioContext` — both are "browser APIs the codebase uses that jsdom doesn't implement." The discipline of justifying each mock with a comment (consumer + access pattern + per-test override if needed) keeps the file from accruing speculative mocks; only APIs the codebase actually references are mocked, per Batch 1's original design.

**Revisit conditions.** Codebase migrates to a non-jsdom default DOM environment (happy-dom, real-browser via Playwright); the layout-property gap is then either closed or shifts shape. A mock's consumer is removed from the codebase and the mock no longer earns its keep — then delete it. A future component's visibility query relies on a layout property other than `offsetParent` (e.g., `getBoundingClientRect`, `IntersectionObserver`) — add a new shim under the same discipline, name its consumer in the comment, and append a bullet to this ADR's "current set of mocks" list. The list above stays the source of truth for which shims exist and why.

---

### snapshot-conventions

**Decision.** The mechanics for the snapshots permitted by [`#snapshots`](#snapshots) (`UserLevelBadge`, `PostWorkoutScreen1`, `PostWorkoutScreen2`):

1. **Reserved to the named files only.** No new file gets a snapshot without amending `#snapshots` first. Everything else asserts on accessible queries / visible text.
2. **Static state only.** Never snapshot a mid-animation render. Components with animation (e.g. `UserLevelBadge`'s phase machine driven by `requestAnimationFrame`) are snapshotted in their settled, non-animating state (omit the animation-triggering prop — for `UserLevelBadge`, `animateFromTotal`). Animated transitions are pinned, if at all, by behavioral `transitionEnd`-driven tests, not snapshots. A snapshot of a mid-rAF frame is nondeterministic and would churn.
3. **File-based, not inline.** Use `toMatchSnapshot()` writing to `__snapshots__/<file>.snap`, not `toMatchInlineSnapshot()`. The rendered trees are large enough (SVG arcs, multi-element progress regions) that inline snapshots would dominate the test file and bury the behavioral assertions.
4. **One snapshot per structurally-distinct branch, not per prop permutation.** Snapshot the cases where the rendered DOM *shape* differs — for `UserLevelBadge`: null-state message, normal badge, Elite (collapsed thresholds + "Maxed Out"), and Beginner-1-with-anchor (anchored origin) — not every (sex, bodyweight, total) tuple. A snapshot is a structural lock; computed values (percentages, labels, lbs-to-next) are pinned by behavioral assertions alongside, which also document *why* a value is what it is.
5. **Full-DOM is acceptable when the render has no nondeterministic values, with props chosen for clean numeric output.** `UserLevelBadge` has no timestamps / random IDs / `Date.now`, so a full-DOM snapshot is honest. Choose prop tuples that yield clean numbers (a total exactly midway between two thresholds → `width: 50%`) so the `.snap` file stays human-readable. Only when a render genuinely contains nondeterministic values does a snapshot serialize a subset (or scrub those fields).

Snapshot via RTL's `asFragment()` (not `container`) to stay clear of `testing-library/no-container`.

**Alternatives considered.**
- *Inline snapshots (`toMatchInlineSnapshot`).* Rejected: the permitted components render non-trivial trees; inlining serialized DOM into the test body would push the intent-named `it()` blocks below screens of markup, inverting the signal-to-noise the test files maintain everywhere else.
- *One snapshot per prop permutation.* Rejected: locks on permutation rather than on structurally-distinct branch — high maintenance (every variant re-baselines on any structural change) for low marginal signal (computed numbers are better pinned by targeted behavioral assertions). The structurally-distinct-branch rule captures the shape regressions snapshots are good at and leaves value regressions to assertions.
- *Subset/serialized snapshots by default.* Rejected as the default: adds serializer complexity for components that have nothing nondeterministic to scrub. Reserved for the case where a render actually carries a nondeterministic value.

**Rationale.** `#snapshots` decided *which* files may use snapshots and why (stable JSX where structure regressions matter); this entry decides *how*, so the three files — and any future addition to the allowed set — share one shape. The static-only and clean-numeric rules are what keep a snapshot a durable structural lock rather than a churn source: a snapshot that captures a mid-animation frame or a `57.142857142857146%` width re-baselines on noise and trains reviewers to `--update` reflexively, defeating the regression-catching purpose. First applied in Batch 7 (`UserLevelBadge` — the codebase's first snapshot); Batch 8's `PostWorkoutScreen1/2` follow the same shape.

**Revisit conditions.** A future component added to `#snapshots`' allowed set has a render containing genuinely nondeterministic values (live timestamps, server-generated IDs) — the full-DOM-by-default rule then needs an amendment naming the scrub/subset approach for that file. A permitted snapshot becomes a churn source despite the static-only rule (investigate whether the component's "static" state is actually deterministic). The team adopts a snapshot serializer (e.g. for a CSS-in-JS library) that changes the serialized shape.
