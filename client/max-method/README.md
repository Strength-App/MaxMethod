# MaxMethodApp — Frontend (`client/max-method`)

React 19 + Vite SPA. JavaScript (no TypeScript). State via React Context. Tailwind 4 + global `App.css`.

> Working on this codebase? Read [`../../CLAUDE.md`](../../CLAUDE.md) first — it captures the discipline conventions for changes in this repo.

## Quickstart

```sh
npm install
npm run dev      # vite dev server on http://localhost:5173 (proxies /api → :5050)
npm run build    # vite build into dist/
npm run lint     # eslint
```

## Tests

> Vitest + React Testing Library + MSW land in **Batch 1** of the 2026 refactor initiative. Until then, no automated tests exist (manual testing per [`../../TESTING_GUIDE.md`](../../TESTING_GUIDE.md)).

Once Batch 1 merges, the test commands will be:

```sh
npx vitest                # watch mode
npx vitest run            # single run (used by CI)
npx vitest run --coverage # coverage report (diagnostic — not gated)
```

Coverage targets are informational, recorded as comments in `vitest.config.js`. See [`../../docs/decisions.md#coverage-philosophy`](../../docs/decisions.md#coverage-philosophy).

## Where things live

- `src/pages/` — route-level components
- `src/components/` — reusable UI (Toast, Modal, EquipmentSelect, ContextMenu, UserLevelBadge, PostWorkoutModal, ...)
- `src/components/tools/` — Plate Calc, 1RM Calc, RPE Calc, Timer, Stopwatch
- `src/components/workout/` — workout-domain components (RestTimer, ProgramExerciseCard, ...) — **created in Batch 10 onward**
- `src/context/` — `UserContext`, `WorkoutContext`, `ToolsContext`
- `src/hooks/` — `useModalA11y`, `useWorkoutStats`, `usePostWorkoutModal`, `useCombobox` (Batch 13)
- `src/utils/` — pure helpers; `epley.js` / `classification.js` / `exerciseNameNormalize.js` are **mirrored with the backend**
- `src/config/api.js` — `API_URL` from `VITE_API_URL`
- `src/test/` — Vitest setup, MSW handlers (Batch 1)

## Conventions

The conventions document is at the repo root: [`../../CLAUDE.md`](../../CLAUDE.md). Architecture decisions and their rationale: [`../../docs/decisions.md`](../../docs/decisions.md). Deferred work: [`../../docs/follow-ups.md`](../../docs/follow-ups.md).

## Routing

`BrowserRouter` in `App.jsx`. 18 routes. `protectedRoute()` gates onboarded users; `hideNavigation` list hides the side nav on auth/onboarding flows.
