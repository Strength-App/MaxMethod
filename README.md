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
| HTTP Client | Axios |

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

---

## Project Structure

```
client/max-method/
├── src/
│   ├── pages/           # All screen/page components
│   ├── context/         # React Context providers
│   │   ├── UserContext.jsx     # Auth state + user profile (localStorage cached)
│   │   └── WorkoutContext.jsx  # Active workout, exercise assignments, session logs
│   ├── assets/          # Images and static files
│   └── data/            # Static data files
├── index.html
├── vite.config.js
└── package.json
```

---

## Pages

### Onboarding & Auth

| Page | Description |
|---|---|
| `welcomepage.jsx` | Entry screen — login or sign up |
| `createAcc.jsx` | Account registration |
| `onboarding.jsx` | Initial user setup (goals, experience level) |
| `classification.jsx` | Strength classification via bench / squat / deadlift 1RMs |

### Program & Workout

| Page | Description |
|---|---|
| `pickNewProgram.jsx` | Browse and select a training program |
| `reviewProgram.jsx` | Preview program details before committing |
| `viewProgram.jsx` | View the active program schedule |
| `day.jsx` | Today's workout view |
| `customDay.jsx` | Edit or customize a workout day |
| `logger.jsx` | Log sets, reps, and weights during a session |

### Analytics & Utilities

| Page | Description |
|---|---|
| `home.jsx` | Main dashboard |
| `history.jsx` | Workout history and progress tracking |
| `goals.jsx` | Set and manage fitness goals |
| `exerciseLibrary.jsx` | Browse all available exercises with video |
| `customWorkout.jsx` | Build a custom workout |
| `settings.jsx` | Account and app settings |
| `loadingPage.jsx` | Shared loading state screen |

---

## State Management

State is handled by two React Contexts (no Redux/Zustand):

- **UserContext** — auth token, user profile, and fitness metrics. Persisted to `localStorage` to survive page refreshes.
- **WorkoutContext** — active program, current day's exercise assignments, and in-session logs.

---

## Backend API

All API calls go to `http://localhost:5050/api/users`. The Vite dev server proxy forwards them automatically — no extra configuration needed in development. See the backend README for available endpoints.
