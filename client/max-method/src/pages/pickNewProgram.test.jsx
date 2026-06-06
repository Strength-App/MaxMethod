// Characterization tests for src/pages/pickNewProgram.jsx.
//
// PickNewProgram is the "Programs" screen. It lets a logged-in user (1)
// review the training programs they've already created ("My Programs"),
// (2) open or delete any of them, and (3) generate a brand-new program by
// entering their three big lifts plus bodyweight. There's also a static
// "Featured Programs" preview section and a "Create Custom Workout" footer
// button.
//
// Integration-shaped: real UserProvider + WorkoutProvider in a MemoryRouter
// (the page reads useUser + useWorkout), useNavigate mocked to assert
// destinations + handed-off state, window.alert spied (used for the
// no-session error), and MSW backing the program-logs list/delete and the
// classification POST. A user is seeded into localStorage before render so
// `user` is populated and the providers bootstrap the way the app does for
// a logged-in user.
//
// .test.jsx per #test-file-extension-convention — the wrappers contain JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { WorkoutProvider } from '../context/WorkoutContext';
import { API_URL } from '../config/api.js';
import PickNewProgram from './pickNewProgram.jsx';

// useNavigate mock — assert the destination + state, not a real route table.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Render PickNewProgram inside real providers. A user is seeded into
// localStorage so `user.email` / `user.gender` reads have values and the
// mount fetch of program-logs sees a userId.
function renderPickNewProgram() {
  localStorage.setItem('userId', 'u-1');
  localStorage.setItem(
    'user',
    JSON.stringify({ _id: 'u-1', email: 'a@b.com', gender: 'male' }),
  );
  return render(
    <MemoryRouter>
      <UserProvider>
        <WorkoutProvider>
          <PickNewProgram />
        </WorkoutProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

// Stub the program-logs list endpoint with a given array of programs.
function stubProgramLogs(programs) {
  server.use(
    http.get(`${API_URL}/api/users/program-logs/:userId`, () =>
      HttpResponse.json(programs, { status: 200 }),
    ),
  );
}

// Fill the four "Generate New Program" number inputs.
function fillGenerateForm({ bench = '200', deadlift = '300', squat = '250', bodyWeight = '180' } = {}) {
  fireEvent.change(screen.getByLabelText(/bench press 1rm/i), { target: { value: bench } });
  fireEvent.change(screen.getByLabelText(/deadlift 1rm/i), { target: { value: deadlift } });
  fireEvent.change(screen.getByLabelText(/squat 1rm/i), { target: { value: squat } });
  fireEvent.change(screen.getByLabelText(/body weight/i), { target: { value: bodyWeight } });
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('pickNewProgram — My Programs list', () => {
  it('renders the programs fetched on mount', async () => {
    stubProgramLogs([
      { _id: 'p-1', title: 'Power Builder', type: 'generated', createdAt: '2026-01-01T00:00:00Z' },
      { _id: 'p-2', title: 'Custom Split',  type: 'custom',    createdAt: '2026-02-01T00:00:00Z' },
    ]);
    renderPickNewProgram();

    expect(await screen.findByText('Power Builder')).toBeInTheDocument();
    expect(screen.getByText('Custom Split')).toBeInTheDocument();
  });

  it('shows the empty state when there are no programs', async () => {
    stubProgramLogs([]);
    renderPickNewProgram();

    expect(
      await screen.findByText(/no programs yet — generate your first one above/i),
    ).toBeInTheDocument();
  });
});

describe('pickNewProgram — open + delete a program', () => {
  it('navigates to the view-program route with the program in state when a card is clicked', async () => {
    const program = { _id: 'p-1', title: 'Power Builder', type: 'generated', createdAt: '2026-01-01T00:00:00Z' };
    stubProgramLogs([program]);
    renderPickNewProgram();

    const card = await screen.findByRole('button', { name: /open program: power builder/i });
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/view-program/p-1', {
      state: { program },
    });
  });

  it('fires the DELETE and removes the card from the list', async () => {
    let deletedId = null;
    // Title deliberately distinct from the static FEATURED names ("Power
    // Builder" etc.) so the disappear assertion isn't matching a featured card.
    stubProgramLogs([
      { _id: 'p-1', title: 'My Saved Split', type: 'generated', createdAt: '2026-01-01T00:00:00Z' },
    ]);
    server.use(
      http.delete(`${API_URL}/api/users/program-logs/:id`, ({ params }) => {
        deletedId = params.id;
        return HttpResponse.json({ ok: true });
      }),
    );
    renderPickNewProgram();

    fireEvent.click(await screen.findByRole('button', { name: /delete program: my saved split/i }));

    await waitFor(() => expect(screen.queryByText('My Saved Split')).not.toBeInTheDocument());
    expect(deletedId).toBe('p-1');
  });
});

describe('pickNewProgram — generate a new program', () => {
  it('posts the classification and navigates to /goals with classification + total', async () => {
    stubProgramLogs([]);
    let postBody = null;
    server.use(
      http.post(`${API_URL}/api/users/classification`, async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ classification: 'Intermediate', totalOneRepMax: 500 });
      }),
    );
    renderPickNewProgram();
    // Wait for the mount fetch to settle (empty state) before submitting.
    await screen.findByText(/no programs yet/i);

    fillGenerateForm({ bench: '200', deadlift: '300', squat: '250', bodyWeight: '180' });
    fireEvent.click(screen.getByRole('button', { name: /submit program details/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/goals', {
        state: { classification: 'Intermediate', totalOneRepMax: 500 },
      }),
    );
    // The mode "set-actual" branch is what the page sends here.
    expect(postBody).toEqual(
      expect.objectContaining({
        benchPress: 200,
        deadlift: 300,
        squat: 250,
        bodyWeight: 180,
        mode: 'set-actual',
      }),
    );
  });

  it('alerts and routes home when there is no userId in storage', async () => {
    stubProgramLogs([]);
    renderPickNewProgram();
    await screen.findByText(/no programs yet/i);

    // Drop the session id the way a stale/cleared login would.
    localStorage.removeItem('userId');

    fillGenerateForm();
    fireEvent.click(screen.getByRole('button', { name: /submit program details/i }));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Session error'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

describe('pickNewProgram — footer', () => {
  it('navigates to the custom-workout builder from the footer button', async () => {
    stubProgramLogs([]);
    renderPickNewProgram();
    await screen.findByText(/no programs yet/i);

    fireEvent.click(screen.getByRole('button', { name: /create custom workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/customWorkout');
  });
});
