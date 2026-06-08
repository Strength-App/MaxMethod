# MaxMethod — Frontend

An all-in-one strength training web app. MaxMethod assesses your current fitness level, generates personalized workout programs, tracks progress with detailed analytics, and provides an exercise library with video coaching — all in one seamless experience.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + React Router 7 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| Video | React Player 3 |
| Calendar | React Calendar 6 |
| HTTP Client | Fetch API (native) |
| Testing | Vitest + React Testing Library + MSW |

---

## Getting Started

```bash
cd client/max-method
npm install
npm run dev
```

App runs at `http://localhost:5173`. API requests are proxied to the backend at `http://localhost:5050` — the backend must be running.

### Other Scripts

```bash
npm run build    # Production bundle → dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint checks
```

### Tests

Run from `client/max-method`:

```bash
npm test                  # Vitest watch mode
npm run test:run          # single run (used by CI)
npm run test:coverage     # coverage report (diagnostic — not gated)
```

Coverage targets are informational, recorded as comments in `vitest.config.js`.
See [`docs/decisions.md#coverage-philosophy`](docs/decisions.md#coverage-philosophy).

---

## Project Structure

```
client/max-method/
├── src/
│   ├── pages/           # Full screens, grouped by area: auth/, onboarding/, program/, workout/, account/
│   ├── components/      # Reusable UI: ui/, postworkout/, tools/, workout/
│   ├── context/         # React Context providers (UserContext, WorkoutContext, ToolsContext)
│   ├── hooks/           # Reusable behavior (useModalA11y, useCombobox, ...)
│   ├── utils/           # Helpers (epley, classification, ... — some mirrored with the backend)
│   ├── config/          # api.js (backend URL) + exercises.js (exercise catalog)
│   └── test/            # Vitest setup + MSW handlers
├── index.html
├── vite.config.js
└── package.json
```

---

## Pages

### Onboarding & Auth

| Page | Description |
|---|---|
| `auth/WelcomePage.jsx` | Entry screen — login or sign up |
| `auth/CreateAcc.jsx` | Account registration |
| `onboarding/Onboarding.jsx` | Initial user setup (goals, experience level, and bench / squat / deadlift strength classification) |

### Program & Workout

| Page | Description |
|---|---|
| `program/PickNewProgram.jsx` | Browse and select a training program |
| `program/ReviewProgram.jsx` | Preview program details before committing |
| `program/ViewProgram.jsx` | View the active program schedule |
| `workout/Day.jsx` | Today's workout view |
| `workout/CustomDay.jsx` | Edit or customize a workout day |
| `workout/Logger.jsx` | Log sets, reps, and weights during a session |

### Analytics & Utilities

| Page | Description |
|---|---|
| `account/Home.jsx` | Main dashboard |
| `workout/History.jsx` | Workout history and progress tracking |
| `onboarding/Goals.jsx` | Set and manage fitness goals |
| `account/ExerciseLibrary.jsx` | Browse all available exercises with video |
| `workout/CustomWorkout.jsx` | Build a custom workout |
| `account/Settings.jsx` | Account and app settings |
| `onboarding/LoadingPage.jsx` | Shared loading state screen |

---

## State Management

State is handled by two React Contexts (no Redux/Zustand):

- **UserContext** — auth token, user profile, and fitness metrics. Persisted to `localStorage` to survive page refreshes.
- **WorkoutContext** — active program, current day's exercise assignments, and in-session logs.

---

## Backend API

All API calls go to `http://localhost:5050/api/users`. The Vite dev server proxy forwards them automatically — no extra configuration needed in development. See the backend README for available endpoints.
