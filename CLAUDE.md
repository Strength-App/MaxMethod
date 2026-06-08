# Working in this codebase

> Last rewritten: 2026-06-05 · codebase-conventions summary added 2026-06-07 (Batch 16)

Read this file before making any change.

---

## What MaxMethod is

**MaxMethod** is a strength-training app. It builds personalized weightlifting
programs for users, walks them through each workout day, records the weights and
reps they actually lift, and adjusts future training based on that history. The
headline feature is automatic progression for the "big three" lifts (Bench,
Squat, Deadlift): the app tracks each user's estimated one-rep max and nudges
their target weights up over time.

It has three parts:

1. **Frontend** — a single-page web app the user clicks around in (React 19 +
   Vite). Lives in `client/max-method/`.
2. **Backend** — a web server that the frontend talks to over the internet. It
   holds the business logic and is the only thing allowed to touch the database
   (Express). Lives in `Backend_structure/`.
3. **Database** — where all the data is permanently stored (MongoDB, a cloud
   database named `Maxmethod_db`).

The public site is **maxmethod-fitness.com**.

### How a click becomes saved data (the data flow)

```
User clicks in browser
        │
        ▼
Frontend (React, client/max-method/)
   - shows screens, collects input
   - sends an HTTP request to the backend
        │  e.g. PATCH /api/users/...
        ▼
Backend (Express, Backend_structure/)
   - receives the request in a "route"
   - runs the business logic
   - reads/writes the database
        │  via the MongoDB driver
        ▼
MongoDB ("Maxmethod_db" cloud database)
```

The frontend **never** connects to MongoDB directly. It only ever calls the
backend's `/api/...` endpoints. The backend is the single gatekeeper to the
database.

---

## File directory (high level)

### Frontend — `client/max-method/`

| Folder / file        | What it holds                                                      |
| -------------------- | ----------------------------------------------------------------- |
| `src/pages/`         | One file per full screen the user sees (home, logger, goals, …).  |
| `src/components/`    | Reusable UI pieces shared across pages (buttons, modals, timers). |
| `src/context/`       | App-wide shared state (the logged-in user, the active workout).   |
| `src/hooks/`         | Reusable bits of behavior shared between components.              |
| `src/utils/`         | Plain calculation helpers (e.g. one-rep-max math).               |
| `src/data/`          | Static data baked into the app (e.g. exercise lists).            |
| `src/config/`        | Frontend settings, including the backend's web address.          |
| `src/assets/`        | Images and other static files.                                    |
| `src/test/`          | Test setup and shared test helpers.                              |
| `src/App.jsx`        | The top-level component; wires the pages together.               |
| `src/main.jsx`       | The entry point that starts the whole app.                       |

### Backend — `Backend_structure/`

| Folder / file        | What it holds                                                       |
| -------------------- | ------------------------------------------------------------------ |
| `server.js`          | Starts the web server and connects the routes.                     |
| `src/routes/`        | Defines the `/api/...` URLs the frontend can call.                 |
| `src/controllers/`   | The logic that runs when a route is hit.                           |
| `src/services/`      | Larger business operations (e.g. big-three progression).           |
| `src/models/`        | The shapes/structures of the data stored in the database.          |
| `src/middleware/`    | Code that runs on requests before the route (e.g. auth checks).    |
| `src/utils/`         | Backend calculation helpers (some mirror the frontend's).          |
| `src/config/`        | Configuration, including `database.js` (the MongoDB connection).   |
| `AI_tools/`          | Standalone helper tools (exercise selector, weight picker).        |
| `prisma/`            | Schema/migration files (note: the live DB connection is the native MongoDB driver in `src/config/database.js`, not Prisma). |

### The MongoDB connection

- The backend connects in **`Backend_structure/src/config/database.js`** using
  the official MongoDB driver. It reads the secret connection string from the
  `MONGODB_URI` environment variable and opens the `Maxmethod_db` database.
- Everything else in the backend imports that one shared `db` object to read and
  write data. There is exactly one connection point — don't add another.

> **Mirrored utilities:** `client/max-method/src/utils/epley.js`,
> `classification.js`, and `exerciseNameNormalize.js` are deliberate copies of
> files in `Backend_structure/src/utils/`. If you change one side, change the
> other in the same step, or the frontend and backend will disagree.

---

## Workflow

Every task follows these six steps **in order**:

### explore → plan → code → document → test → commit

1. **explore** — Read the relevant code first. Understand what exists before
   changing anything. Don't guess at how something works; go look.

2. **plan** — Decide what you'll change and how, before writing code. For
   anything non-trivial, lay out the plan and confirm direction.

3. **code** — Make the change. Keep it focused on the task at hand; don't fix
   unrelated things you happen to notice (note those separately instead).

4. **document** — Comment the code (see the rules below). This is not optional
   and not an afterthought — it happens for every function you write or touch.
   **Any new feature is also written up in [`features.md`](features.md).**

5. **test** — Verify the change works. Add or update tests. Run them and confirm
   they pass before moving on.

6. **commit** — Save the work in a clear, self-contained commit with a message
   that explains what changed and why.

---

## Documentation & commenting rules

**Comment every function. Comment every non-obvious piece of code.**

Write comments for a reader **with no technical background**. Assume the person
reading has never seen code before. Explain *what* the code does and *why* it
exists in plain English — not jargon. If a non-programmer couldn't follow your
comment, rewrite it.

Concretely:

- **Every function** gets a comment above it explaining, in plain language, what
  it does, what goes in, and what comes out.
- **Every non-obvious line or block** gets a short plain-English note about what
  it's doing and why.
- Prefer explaining the *purpose* ("so the user doesn't lose their work") over
  restating the mechanics ("calls the save function").

### Bad vs. good comments

**❌ Bad** — restates the code, uses jargon, explains nothing a reader couldn't
already see:

```js
// increment i
i++;

// loop the array and call updateLog
sets.forEach(s => updateLog(s));

/**
 * @param {number} w weight
 * @param {number} r reps
 * @returns {number} 1rm
 */
function epley(w, r) {
  return w * (1 + r / 30);
}
```

**✅ Good** — plain language, explains purpose and meaning for a non-technical
reader:

```js
// Move to the next set in the workout.
i++;

// Save every set the user just finished so their progress isn't lost
// if they close the app.
sets.forEach(s => updateLog(s));

/**
 * Estimates the most weight a person could lift one time ("one-rep max"),
 * based on a set they actually did. For example, if someone lifted 100 lbs
 * for 5 reps, this estimates the single heaviest lift they could manage.
 *
 * This lets the app set sensible target weights without making the user
 * attempt a dangerous max-effort lift.
 *
 * @param {number} w - The weight they lifted (in pounds).
 * @param {number} r - How many reps they completed at that weight.
 * @returns {number} The estimated one-rep max, in pounds.
 */
function epley(w, r) {
  return w * (1 + r / 30);
}
```

The good version tells someone *why the code exists and what it means for the
user*, in words a non-programmer understands. That's the bar.

---

## New features

When you add a new feature, write it up in **[`features.md`](features.md)**:
what it does, who it's for, and how it works at a high level. Keep it in plain
language, same audience as the comments.

---

## Codebase conventions (the short version)

These are the load-bearing patterns the codebase already follows. The full,
linked synthesis — *where things live*, *naming patterns*, *domain boundaries* —
lives in [`docs/refactor-conventions.md`](docs/refactor-conventions.md) (the
"Codebase conventions" section). Read that before any non-trivial structural
change; read [`docs/decisions.md`](docs/decisions.md) for the *why* behind a
specific rule.

- **The frontend only talks to the backend's `/api/...` endpoints.** It never
  reaches the database directly, and there's no caching layer — React Context
  holds the data, `fetch` moves it.
- **Three "mirrored" helper files must change in lockstep with the backend**:
  `src/utils/epley.js`, `classification.js`, `exerciseNameNormalize.js`. They are
  copies of backend files and the backend has tests that fail if they drift.
- **All exercise data lives in one place**: `src/config/exercises.js`. Pages read
  from it; it never reads from a page. If one screen needs a slightly different
  list, it makes a small, clearly-labelled local tweak (an "overlay") and records
  why — it does not quietly keep its own copy.
- **Two genuinely different things stay two components**, each with a descriptive
  name (e.g. `ProgramExerciseCard` vs `AdHocExerciseCard`) — never one component
  with an "is it this mode or that mode?" switch. When unsure whether to share
  code, the default is *don't*.
- **Colors mean things, not just look nice**: red (`--accent`) marks *identity*
  (labels, thresholds); green (`--accent-green`) marks *completion* (a finished
  set or day). Don't swap them.
- **Tests sit next to the file they test** (`thing.test.jsx` beside `thing.jsx`)
  and use real accessibility queries, not test-only hooks.
- **A few behaviors look like bugs but aren't** — the title-only day filter, the
  no-auto-save-during-creation gate on custom workouts, the deliberately-stale
  personal-bests between two screens. Before "fixing" something surprising, check
  the *Surprising things* section of
  [`docs/refactor-conventions.md`](docs/refactor-conventions.md).

## Pointers

- **New features log**: [`features.md`](features.md)
- **Codebase & session conventions** (agent-facing; the discipline rules, codebase conventions, and "surprising things"): [`docs/refactor-conventions.md`](docs/refactor-conventions.md)
- **ADRs / decisions**: [`docs/decisions.md`](docs/decisions.md)
- **Follow-ups**: [`docs/follow-ups.md`](docs/follow-ups.md)
- **Manual testing guide**: [`TESTING_GUIDE.md`](TESTING_GUIDE.md)
- **End-user guide**: [`USER_GUIDE.md`](USER_GUIDE.md)
- **Frontend README**: [`client/max-method/README.md`](client/max-method/README.md)
