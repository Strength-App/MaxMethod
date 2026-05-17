# Working in this codebase

> Last reviewed: 2026-05-17 (Batch 0)

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

14. **Never push past the checkpoint.** Pause between batches for review. No queueing the next batch on a stale base.

15. **Stop-summarize-ask on scope growth.** Triggers: PR ≥ 1000 lines, files outside scope, unanticipated architectural decision, time +50% over estimate, bug load-bearing on the batch. Commit partial work as a **draft PR**; produce a *situation / options / recommendation* summary; full pause until direction lands. Symmetric for scope shrinkage. See [`docs/decisions.md#scope-growth-protocol`](docs/decisions.md#scope-growth-protocol).

16. **CI failure on a passing local run = investigate** (lockfile drift, environment difference). Don't silence.

17. **Disable an ESLint rule only with a justifying comment.** Bulk-disabling is almost always wrong.

### Verification rules

18. **Match the tool to the question.**
    - RTL = behavior. `getByRole({ name })`, not `getByTestId`.
    - Axe = static a11y. Necessary, not sufficient — doesn't catch cognitive a11y, reading order, pronunciation.
    - Coverage = diagnostic. Per-category, per-batch reporting. **Never a CI gate.** Targets are in `vitest.config.js` as comments, not thresholds.
    - Manual visual check = appearance. Capped to **visual-check batches (Batches 10–15 in the refactor initiative)**. Pre-batch baselines in uncommitted `.batch-screenshots/batch-NN-baseline/`; post-batch comparison before PR opens.
    - Keyboard tests = interaction. `userEvent.keyboard()`, not `fireEvent`. Assert on `toHaveFocus` + ARIA, not internal state.
    See [`docs/decisions.md#coverage-philosophy`](docs/decisions.md#coverage-philosophy), [`#accessibility-testing`](docs/decisions.md#accessibility-testing), [`#keyboard-testing`](docs/decisions.md#keyboard-testing), [`#visual-regression`](docs/decisions.md#visual-regression).

19. **JSDoc thorough on the public boundary, terse internally.** `@param` + `@returns` + non-obvious behavior + edge cases on every export. Internal helpers: one-line WHY only when non-obvious. Don't restate what the signature already says.

---

## Codebase conventions

> **This section is a marked placeholder.** It will be filled in by **Batch 16** of the 2026 refactor initiative, synthesizing observed reality from per-batch summaries, `docs/decisions.md`, and `client/max-method/src/components/workout/README.md`. The session-conventions section above is complete and authoritative now; the codebase-conventions section below is intentionally empty until the refactor lands enough patterns to synthesize from.

### Where things live

*To be completed at end of refactor.*

### Naming patterns

*To be completed at end of refactor.*

### Domain boundaries

*To be completed at end of refactor.*

---

## Surprising things

Non-obvious behaviors worth knowing before touching the relevant code. Each links to the ADR with the rationale.

- **`home.jsx` / `viewProgram.jsx` day-display filter is title-only.** A day with `title: null` is hidden; a day with a missing title field is hidden. Intentional, not a bug. Don't "fix" by adding `&& d.exercises?.length`. See [`docs/decisions.md#day-filter-truth-table`](docs/decisions.md#day-filter-truth-table).

- **Direct `localStorage.getItem('userId')` reads in several pages.** Not a bug. UserContext bootstrap is async; these reads survive the pre-hydration paint where `useUser()` returns `null`. Don't "consolidate" without addressing UserContext hydration timing — see `#user-context-hydration-redesign` in `docs/follow-ups.md`.

- **Three mirrored utilities** (`src/utils/epley.js`, `src/utils/classification.js`, `src/utils/exerciseNameNormalize.js`) are mirrored with `Backend_structure/src/utils/*` and have parity test fixtures. Any change must be made in lockstep with the backend. See [`docs/decisions.md#mirrored-utils`](docs/decisions.md#mirrored-utils).

- **`WorkoutContext.updateLog` debounce cancels on unmount** (post-Batch-5 fix). Edits made within the 500ms debounce window before navigation away are not persisted. Intentional; matches user expectation. See [`docs/decisions.md#debounce-cleanup-shape`](docs/decisions.md#debounce-cleanup-shape).

- **`personalBests` are stale between `day.jsx` and `logger.jsx` mid-session.** Known issue, deferred to `#personal-bests-staleness-day-logger` in `docs/follow-ups.md`. Don't accidentally "fix" without context.

- **`customDay.jsx` does not auto-save to DB during new-workout creation.** Only the manual "Save Workout" button persists. Switching to edit-mode enables the 500ms debounced auto-save. This gating is via `location.state.isDbWorkout`. Don't remove the gate.

- **CSS variables `--accent` (red, identity) and `--accent-green` (completion state)** follow a strict semantic split. Completion fills/borders/text use green; identity contexts (badge labels, threshold values) use red. See [`docs/decisions.md#color-token-convention`](docs/decisions.md#color-token-convention).

- **The big-3 lifts (Bench / Squat / Deadlift) have a seeded floor on personal bests.** `updatePersonalBest` raises only; `rebuildPersonalBest` is bidirectional but floors at `current_one_rep_maxes` for the big three. Server-side logic; client must round-trip correctly. See `#project_pr_semantics` in agent memory.

---

## Pointers

- **Plan file** (current refactor initiative): `~/.claude/plans/i-want-to-plan-purrfect-meteor.md`
- **ADRs**: [`docs/decisions.md`](docs/decisions.md)
- **Follow-ups**: [`docs/follow-ups.md`](docs/follow-ups.md)
- **Shape comparisons**: [`docs/comparisons/`](docs/comparisons/) (combobox; future: rest-timer in Batch 10, day-filter-truth-table in Batch 9a if standalone)
- **Manual testing guide**: [`TESTING_GUIDE.md`](TESTING_GUIDE.md)
- **End-user guide**: [`USER_GUIDE.md`](USER_GUIDE.md)
- **Frontend README**: [`client/max-method/README.md`](client/max-method/README.md)
