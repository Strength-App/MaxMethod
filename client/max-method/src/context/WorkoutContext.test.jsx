// Risk #8 characterization tests — WorkoutContext.updateLog debounce
// cleanup bug. See docs/decisions.md#debounce-cleanup-shape for the
// governing ADR (with the Batch-5 amendment recording the Property-A
// reshape) and the three-commit shape (these tests + the fix land
// together in commit 1 per Rule #13's bisectability requirement; the
// "characterization" framing is documented in the commit body, not in
// commit order).
//
// Three properties pinned at the hook layer (per Rule #21 — the bug
// lives in WorkoutContext.updateLog, so the invariant is pinned where
// it lives, not at consumer pages):
//   A) In-flight PATCH fetch is aborted on unmount — observed at the
//      network layer via MSW's request.signal. (The plan's original
//      framing — "no setState-on-unmounted warning" — was React-17-era
//      and unobservable in React 19, which silently swallows setState
//      against unmounted components. Reshape to a network-layer
//      observable preserves the contract — "in-flight fetches do not
//      race the unmount" — without reaching into implementation. See
//      the ADR amendment for the reasoning.)
//   B) Pending debounce timer does not fire an orphan PATCH after
//      unmount.
//   C) Stale earlier in-flight PATCH cannot land after a newer
//      updateLog has already updated state — cross-call ordering
//      preserved via AbortController.
//
// Pattern: hold-the-fetch (per usePostWorkoutModal.test.jsx's
// cancellation-guard precedent at lines 365-381 for the held-promise
// shape; that precedent's console.error-spy observable is React-19-
// invisible — see the cancellation-guard-tests-react19-invisibility
// follow-up — so we use the network-layer abort observable here
// instead) for the in-flight-at-unmount scenarios. Property A's
// handler attaches an abort listener to request.signal so the test
// can observe the abort at the network boundary. Real timers —
// debounce is 500ms, so each test waits ~600ms once; the three tests
// stay under the test-file budget.
//
// File extension is .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { WorkoutProvider, useWorkout } from './WorkoutContext.jsx';
import { API_URL } from '../config/api.js';

// Module-level capture of the live context value. The Probe component
// renders inside WorkoutProvider and writes the context value into this
// binding each render. useEffect (not render-side reassignment) per
// react-hooks/immutability — the module-level capture is a deliberate
// test affordance, and effects are the lint-sanctioned place for side
// effects of this shape (same pattern as usePostWorkoutModal.test.jsx's
// UserSetExposer at lines 67-78).
let workoutCtx = null;
function Probe() {
  const ctx = useWorkout();
  useEffect(() => {
    workoutCtx = ctx;
  });
  return null;
}

beforeEach(() => {
  localStorage.clear();
  workoutCtx = null;
});

afterEach(() => {
  localStorage.clear();
});

describe('WorkoutContext — Risk #8 debounce cleanup', () => {
  it('aborts the in-flight PATCH /workout/log fetch when the provider unmounts during the request', async () => {
    // Property A — in-flight-at-unmount abort, observed at the network
    // layer.
    //
    // Scenario: updateLog schedules a 500ms timer; the timer fires and
    // the PATCH starts; the MSW handler holds the response until the
    // test releases it. Before the test releases, the provider
    // unmounts. The handler attaches an abort listener to its
    // request.signal — when the fix's cleanup-on-unmount fires
    // controller.abort(), the signal's 'abort' event propagates to the
    // handler's listener and `aborted` flips true. With the bug, the
    // cleanup never aborts the fetch, the signal never fires, the flag
    // stays false; the held promise eventually releases and the
    // handler completes normally (the client-side setState that
    // results is silently swallowed by React 19, but the test doesn't
    // depend on that — the network-layer abort observable is the
    // contract).
    //
    // The framing is "in-flight fetches do not race the unmount" — a
    // network-boundary contract. Reaching into request.signal is the
    // honest observable for that contract; it is not reaching into
    // the implementation (the AbortController instance, controller
    // refs, internal cancellation flags), only into what the network
    // mock can see about the request itself.
    let aborted = false;
    let releasePatch;
    const patchHeld = new Promise((resolve) => { releasePatch = resolve; });
    server.use(
      http.patch(`${API_URL}/api/users/workout/log`, async ({ request }) => {
        if (request.signal.aborted) {
          aborted = true;
        } else {
          request.signal.addEventListener('abort', () => {
            aborted = true;
          });
        }
        await patchHeld;
        return HttpResponse.json({
          pbUpdate: { isPersonalBest: true, exercise: 'bench', newPersonalBest: 200 },
        });
      }),
    );

    // userId is NOT set in localStorage — the bootstrap effect's
    // `if (userId)` guard skips fetchWorkout, so the test is isolated
    // to updateLog's debounce. The PATCH body still goes (with
    // userId: null) which the MSW handler matches by URL.
    const { unmount } = render(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );

    // Trigger updateLog. Debounce timer starts.
    await act(async () => {
      await workoutCtx.updateLog(0, 0, 0, 0, 'actualReps', '5');
    });

    // Wait past the 500ms debounce — setTimeout fires, fetch starts,
    // handler attaches the abort listener and is blocked on patchHeld.
    await new Promise((r) => setTimeout(r, 600));

    // Unmount provider while the fetch is in flight. With the fix, the
    // cleanup effect fires controller.abort(); the request.signal's
    // 'abort' event propagates to the handler's listener.
    unmount();

    // Give time for the abort propagation through MSW's interceptor.
    await new Promise((r) => setTimeout(r, 100));

    // Release the held promise so the handler doesn't hang the test
    // suite if the abort path never fired.
    releasePatch();
    await new Promise((r) => setTimeout(r, 50));

    expect(aborted).toBe(true);
  });

  it('does not fire an orphan PATCH /workout/log when the provider unmounts during a pending debounce', async () => {
    // Property B — pre-fire unmount: no orphan fetch.
    //
    // Scenario: updateLog schedules a 500ms timer; the provider
    // unmounts BEFORE the timer fires. With the bug present, the timer
    // still fires after unmount and the PATCH request is sent — an
    // orphan request with no consumer. With the fix (cleanup function
    // calling clearTimeout on unmount), the timer is cancelled and no
    // request fires.
    let patchCount = 0;
    server.use(
      http.patch(`${API_URL}/api/users/workout/log`, () => {
        patchCount += 1;
        return HttpResponse.json({});
      }),
    );

    const { unmount } = render(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );

    await act(async () => {
      await workoutCtx.updateLog(0, 0, 0, 0, 'actualReps', '5');
    });

    // Unmount BEFORE the 500ms debounce expires.
    unmount();

    // Advance past the debounce window. With the bug present,
    // setTimeout fires and PATCH is sent. With the fix, the timer was
    // cleared in the unmount cleanup.
    await new Promise((r) => setTimeout(r, 600));

    expect(patchCount).toBe(0);
  });

  it('does not let a stale earlier in-flight fetch overwrite state after a newer updateLog has landed', async () => {
    // Property C — cross-call ordering via AbortController.
    //
    // Two sequential updateLog calls. The first fetch fires (starts and
    // is held); a second updateLog call follows; the second fetch fires
    // (starts and is held). Release the SECOND fetch first — its
    // response sets personalBests. Then release the FIRST — with the
    // bug present, the stale response ALSO calls setPersonalBests,
    // adding the older exercise key/value to state on top of the
    // newer state. With the fix (AbortController on in-flight fetch,
    // aborted at the start of the next updateLog), the first fetch
    // was aborted before the second updateLog scheduled its timer, so
    // the stale response never lands.
    let aRelease;
    let bRelease;
    const aHeld = new Promise((resolve) => { aRelease = resolve; });
    const bHeld = new Promise((resolve) => { bRelease = resolve; });
    let callIdx = 0;
    server.use(
      http.patch(`${API_URL}/api/users/workout/log`, async () => {
        callIdx += 1;
        if (callIdx === 1) {
          await aHeld;
          return HttpResponse.json({
            pbUpdate: { isPersonalBest: true, exercise: 'Earlier', newPersonalBest: 100 },
          });
        }
        await bHeld;
        return HttpResponse.json({
          pbUpdate: { isPersonalBest: true, exercise: 'Later', newPersonalBest: 200 },
        });
      }),
    );

    render(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );

    // First updateLog. Debounce timer A scheduled.
    await act(async () => {
      await workoutCtx.updateLog(0, 0, 0, 0, 'actualReps', '5');
    });
    await new Promise((r) => setTimeout(r, 600));
    // Fetch A is now in flight (held on aHeld).

    // Second updateLog. Debounce timer B scheduled.
    await act(async () => {
      await workoutCtx.updateLog(1, 0, 0, 0, 'actualReps', '7');
    });
    await new Promise((r) => setTimeout(r, 600));
    // Fetch B is now in flight (held on bHeld).

    // Release B first. It lands; personalBests gets the Later key.
    bRelease();
    await waitFor(() => expect(workoutCtx.personalBests.Later).toBe(200));

    // Release A. With the bug, A's response also lands and adds the
    // Earlier key. With the fix, A was aborted on the second updateLog
    // call and never resolves.
    aRelease();
    await new Promise((r) => setTimeout(r, 50));

    expect(workoutCtx.personalBests).toEqual({ Later: 200 });
  });
});
