// Characterization tests for src/pages/loadingPage.jsx.
//
// LoadingPage is the "building your program" interstitial. It runs ONCE on
// mount (guarded by a hasRun ref): it reads the router state's `source` and
// orchestrates the server calls that turn the user's answers into a program,
// then forwards them to /review-program. It also cycles status messages on an
// interval purely for show.
//
// Three source branches:
//   - 'onboarding': POST /classification (mirror into UserContext) then POST
//     /goals, then go to /review-program.
//   - 'goals': POST /goals, then go to /review-program.
//   - neither / missing source: go straight to /home.
// Any failure alerts and navigates back one step.
//
// Integration-shaped: real UserProvider + WorkoutProvider in a MemoryRouter,
// useNavigate mocked to assert the destination + forwarded state, window.alert
// spied (the error path uses it), MSW backing the /classification and /goals
// POSTs. Router state is seeded via MemoryRouter initialEntries.
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { WorkoutProvider } from '../context/WorkoutContext';
import { API_URL } from '../config/api.js';
import LoadingPage from './loadingPage.jsx';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Render LoadingPage with a given router-state payload (the orchestration
// input the previous screen passes along). A user is seeded so the onboarding
// branch's mirror-into-context has a base user to spread.
function renderLoading(state) {
  localStorage.setItem('user', JSON.stringify({ _id: 'u-1', email: 'lifter@example.com' }));
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/loading', state }]}>
      <UserProvider>
        <WorkoutProvider>
          <LoadingPage />
        </WorkoutProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('loadingPage — shell', () => {
  it('renders a busy status region', () => {
    renderLoading({ source: 'goals', userId: 'u-1', classification: 'Beginner', daysPerWeek: '3', goalSelection: 'strength' });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('loadingPage — no source', () => {
  it('bails straight to /home when there is no source in state', async () => {
    renderLoading(undefined);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home'));
  });
});

describe('loadingPage — goals source', () => {
  it('posts /goals and forwards the new program to /review-program', async () => {
    server.use(
      http.post(`${API_URL}/api/users/goals`, () =>
        HttpResponse.json({ workoutId: 'wl-9', weeks: [{ days: [] }], classification: 'Beginner' }),
      ),
    );
    renderLoading({
      source: 'goals',
      userId: 'u-1',
      classification: 'Beginner',
      daysPerWeek: '3',
      goalSelection: 'strength',
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/review-program', {
        replace: true,
        state: {
          workoutLogId: 'wl-9',
          weeks: [{ days: [] }],
          userId: 'u-1',
          classification: 'Beginner',
        },
      }),
    );
  });

  it('alerts and steps back when /goals fails', async () => {
    server.use(
      http.post(`${API_URL}/api/users/goals`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    renderLoading({
      source: 'goals',
      userId: 'u-1',
      classification: 'Beginner',
      daysPerWeek: '3',
      goalSelection: 'strength',
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(mockNavigate).not.toHaveBeenCalledWith('/review-program', expect.anything());
  });
});

describe('loadingPage — onboarding source', () => {
  it('classifies, sets goals, and forwards to /review-program', async () => {
    let classBody = null;
    server.use(
      http.post(`${API_URL}/api/users/classification`, async ({ request }) => {
        classBody = await request.json();
        return HttpResponse.json({ classification: 'Intermediate' });
      }),
      http.post(`${API_URL}/api/users/goals`, () =>
        HttpResponse.json({ workoutId: 'wl-3', weeks: [], classification: 'Intermediate' }),
      ),
    );

    renderLoading({
      source: 'onboarding',
      userId: 'u-1',
      email: 'lifter@example.com',
      gender: 'male',
      benchPress: 115,
      squat: 165,
      deadlift: 200,
      bodyWeight: 180,
      daysPerWeek: '4',
      goalSelection: 'hypertrophy',
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/review-program', expect.objectContaining({
        replace: true,
        state: expect.objectContaining({ workoutLogId: 'wl-3', userId: 'u-1', classification: 'Intermediate' }),
      })),
    );
    // The classification POST carries the onboarding maxes in set-actual mode.
    expect(classBody).toEqual(expect.objectContaining({ mode: 'set-actual', benchPress: 115 }));
  });
});
