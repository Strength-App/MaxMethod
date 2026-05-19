/**
 * MSW default request handlers.
 *
 * Defaults installed via `server.listen()` in setup.js, restored after
 * each test by `server.resetHandlers()`. Tests that need different
 * behavior on a specific endpoint override with `server.use(http.x(...))`
 * inside the test or a per-file beforeEach.
 *
 * Per docs/decisions.md#fetch-mocking. Endpoints are added here when a
 * hook or component test needs the endpoint reachable but doesn't care
 * about the specific response shape. Test-specific shapes are per-test
 * overrides.
 *
 * Design intent for each default below: "what's the least surprising
 * response for a test that doesn't otherwise care about this endpoint."
 */

import { http, HttpResponse } from 'msw';
import { API_URL } from '../../config/api.js';

export const handlers = [
  // -----------------------------------------------------------------
  // GET /api/users/profile/:id — UserContext bootstrap refresh
  // -----------------------------------------------------------------
  // Consumer: src/context/UserContext.jsx:43-60 — a one-time fetch on
  // mount that refreshes the user document from the server. On 200, it
  // calls setUser(response); on !ok, it no-ops; on network error, it
  // no-ops.
  //
  // Default: 500 → bootstrap no-ops. Tests that pre-populate user via
  // localStorage and then want the bootstrap to refresh-and-replace
  // override with a 200 + the desired user shape. Most hook/component
  // tests don't want the bootstrap to interfere with their controlled
  // user state, so 500 is the least-surprising default.
  http.get(`${API_URL}/api/users/profile/:id`, () =>
    HttpResponse.json({ error: 'test default — override per-test if needed' }, { status: 500 }),
  ),

  // -----------------------------------------------------------------
  // GET /api/users/workout/:userId — active workout document
  // -----------------------------------------------------------------
  // Consumer: src/context/WorkoutContext.jsx:52-69 — fired from
  // fetchWorkout, which is triggered by a useEffect on userId. If the
  // response is 404, fetchWorkout sets workout=null and returns early
  // (no log/assignments seeding, no PB read). Any !ok status that isn't
  // 404 throws and gets swallowed into the context's error state.
  //
  // Default: 404 → workout stays null, the bootstrap fetch is a clean
  // no-op for any test that doesn't depend on workout shape. Tests that
  // need a populated workout document override with a 200 + valid shape.
  http.get(`${API_URL}/api/users/workout/:userId`, () =>
    HttpResponse.json({ error: 'test default — override per-test if needed' }, { status: 404 }),
  ),

  // -----------------------------------------------------------------
  // GET /api/users/workout/:userId/personal-bests — PB lookup
  // -----------------------------------------------------------------
  // Consumer: src/context/WorkoutContext.jsx:54-68 — fired in parallel
  // with the active-workout fetch. If the workout fetch returned 404,
  // the PB result is discarded (early return). When ok, the context
  // sets `personalBests = pbData.personal_bests ?? {}`.
  //
  // Default: 200 with empty personal_bests. Tests that need populated
  // PBs override per-test.
  http.get(`${API_URL}/api/users/workout/:userId/personal-bests`, () =>
    HttpResponse.json({ personal_bests: {} }, { status: 200 }),
  ),

  // -----------------------------------------------------------------
  // GET /api/users/workout/:userId/all-history — session history
  // -----------------------------------------------------------------
  // Consumer: src/hooks/usePostWorkoutModal.js:86-104 — lazy-fetch on
  // modal open. Response shape: { sessions: [...] } | { sessions: [] }
  // | parse failure → []. The hook normalizes session.date to local
  // midnight.
  //
  // Default: 200 with an empty sessions array. Tests that need
  // populated history override per-test.
  http.get(`${API_URL}/api/users/workout/:userId/all-history`, () =>
    HttpResponse.json({ sessions: [] }, { status: 200 }),
  ),

  // -----------------------------------------------------------------
  // POST /api/users/classification — post-workout reclassification
  // -----------------------------------------------------------------
  // Consumer: src/hooks/usePostWorkoutModal.js:124-146 — fired from
  // handleContinue after saveAndGetPBs returns truthy. On ok, the hook
  // calls setUser(mirrorClassificationResponse(...)) with the response
  // body. On !ok, setUser is skipped.
  //
  // Default: 500 → handleContinue's setUser path is NOT taken. Most
  // handleContinue tests focus on the screen-advance / continuing-flag
  // invariants which are unconditional in the finally block; tests that
  // want the success-path setUser branch override per-test with a 200
  // and a mirrorClassificationResponse-parseable body.
  http.post(`${API_URL}/api/users/classification`, () =>
    HttpResponse.json({ error: 'test default — override per-test if needed' }, { status: 500 }),
  ),
];
