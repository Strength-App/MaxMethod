// Characterization tests for src/pages/viewProgram.jsx — the debounced title
// save (Batch 9b cleanup target).
//
// In edit mode for a custom program, typing in the title field schedules a
// PATCH 500ms after the last keystroke (debounce). These tests pin: the save
// fires with the latest value, rapid edits collapse to a single save, and
// unmounting within the debounce window cancels it. The behavior CHANGE added
// with the fix — aborting an in-flight PATCH on unmount — gets its own armor
// test alongside the fix.
//
// Real timers throughout (the debounce is 500ms): per the local test-flakiness
// note, userEvent + fake timers is the fragile combo; fireEvent + real waits is
// stable. waitFor timeouts are widened past the 500ms debounce.
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server.js';
import { WorkoutProvider } from '../../context/WorkoutContext';
import { API_URL } from '../../config/api.js';
import ViewProgram from './ViewProgram.jsx';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ programLogId: 'p-1' }) };
});

// Records PATCH /title calls.
let titlePatches;
function stubWorkoutLog(data = { title: 'Old Title', type: 'custom', weeks: [{ days: [] }] }) {
  titlePatches = [];
  server.use(
    http.get(`${API_URL}/api/users/workout-log/:id`, () => HttpResponse.json(data)),
    http.patch(`${API_URL}/api/users/workout-log/:id/title`, async ({ request }) => {
      titlePatches.push(await request.json());
      return HttpResponse.json({ ok: true });
    }),
  );
}

// Render in edit mode for a custom program (so the title input shows). The
// program is passed via router state so no program-logs fetch is needed.
function renderViewProgram() {
  return render(
    <MemoryRouter initialEntries={[{
      pathname: '/view-program/p-1',
      state: { program: { _id: 'p-1', workoutLogId: 'wl-1', type: 'custom', title: 'Old' }, isEditing: true },
    }]}>
      <WorkoutProvider>
        <ViewProgram />
      </WorkoutProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  localStorage.setItem('userId', 'u-1');
});

afterEach(() => {
  localStorage.clear();
});

describe('viewProgram — debounced title save', () => {
  it('saves the latest title once the debounce settles', async () => {
    stubWorkoutLog();
    renderViewProgram();
    const input = await screen.findByDisplayValue('Old Title');

    fireEvent.change(input, { target: { value: 'New Title' } });

    await waitFor(() => expect(titlePatches).toContainEqual({ title: 'New Title' }), { timeout: 2000 });
  });

  it('collapses rapid edits into a single save of the final value', async () => {
    stubWorkoutLog();
    renderViewProgram();
    const input = await screen.findByDisplayValue('Old Title');

    fireEvent.change(input, { target: { value: 'Draft 1' } });
    fireEvent.change(input, { target: { value: 'Draft 2' } });
    fireEvent.change(input, { target: { value: 'Final' } });

    await waitFor(() => expect(titlePatches).toContainEqual({ title: 'Final' }), { timeout: 2000 });
    // The superseded drafts never reached the server.
    expect(titlePatches).toHaveLength(1);
  });

  it('cancels the pending save when the page unmounts within the debounce window', async () => {
    stubWorkoutLog();
    const { unmount } = renderViewProgram();
    const input = await screen.findByDisplayValue('Old Title');

    fireEvent.change(input, { target: { value: 'Abandoned' } });
    unmount(); // before the 500ms debounce elapses

    // Wait past the debounce; the cleared timer must never have fired.
    await new Promise((r) => setTimeout(r, 700));
    expect(titlePatches).toHaveLength(0);
  });
});

describe('viewProgram — in-flight save abort (fix armor)', () => {
  // Behavior change: once the debounce timer fires, the PATCH is in flight; if
  // the page then unmounts, the AbortController cancels it rather than letting
  // it complete as an orphan write. This fails against the pre-fix code (no
  // signal was passed, so unmount couldn't abort the request).
  it('aborts a title save that is in flight when the page unmounts', async () => {
    const state = { started: false, aborted: false };
    server.use(
      http.get(`${API_URL}/api/users/workout-log/:id`, () =>
        HttpResponse.json({ title: 'Old Title', type: 'custom', weeks: [{ days: [] }] }),
      ),
      http.patch(`${API_URL}/api/users/workout-log/:id/title`, ({ request }) => {
        state.started = true;
        // Hold the response open until the request is aborted.
        return new Promise((resolve) => {
          request.signal.addEventListener('abort', () => {
            state.aborted = true;
            resolve(HttpResponse.json({ ok: true }));
          });
        });
      }),
    );

    const { unmount } = renderViewProgram();
    const input = await screen.findByDisplayValue('Old Title');
    fireEvent.change(input, { target: { value: 'In Flight' } });

    // Wait for the debounce to fire and the PATCH to actually start.
    await waitFor(() => expect(state.started).toBe(true), { timeout: 2000 });

    unmount();

    await waitFor(() => expect(state.aborted).toBe(true), { timeout: 2000 });
  });
});
