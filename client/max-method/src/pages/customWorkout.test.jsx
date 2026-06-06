// Characterization tests for src/pages/customWorkout.jsx.
//
// CustomWorkout is the "build your own workout" screen. It hand-builds a
// program in the browser's localStorage: a title plus a list of weeks, each
// with a list of days. Add Week / Add Day grow the layout, a trash button on
// each week/day opens a focus-trapped confirm dialog before removing it, Save
// writes the draft to localStorage (and flashes "Saved!"), and Finish Workout
// sends the whole thing to the server and goes home.
//
// Two modes, picked from the route: with no :workoutLogId the page is in
// CREATE mode (Finish POSTs a brand-new workout); with a :workoutLogId it's in
// EDIT mode (Finish PATCHes that existing workout's weeks + title).
//
// Integration-shaped: real WorkoutProvider in a MemoryRouter, with both
// useNavigate and useParams mocked so tests can choose create-vs-edit mode and
// assert the destination without a real route table. MSW backs the fetches
// (the create POST / edit PATCHes, plus the WorkoutProvider bootstrap fetch
// that a seeded userId triggers). localStorage is the page's draft store, so
// it's cleared after every test.
//
// .test.jsx per #test-file-extension-convention — the wrappers contain JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { WorkoutProvider } from '../context/WorkoutContext';
import { API_URL } from '../config/api.js';
import CustomWorkout from './customWorkout.jsx';

// useNavigate + useParams mocks. mockNavigate lets tests assert the
// destination; mockParams is a mutable object each test sets to choose the
// mode — {} (default) is CREATE mode, { workoutLogId: 'w-1' } is EDIT mode.
const { mockNavigate, mockParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockParams: {},
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});

// Render CustomWorkout inside a real WorkoutProvider. A userId can be seeded so
// Finish Workout's `localStorage.getItem('userId')` read has a value (without
// it, Finish short-circuits straight to /home).
function renderCustomWorkout({ userId } = {}) {
  if (userId) localStorage.setItem('userId', userId);
  return render(
    <MemoryRouter>
      <WorkoutProvider>
        <CustomWorkout />
      </WorkoutProvider>
    </MemoryRouter>,
  );
}

// Seed an existing one-week / one-day draft into localStorage so the page
// renders with structure already present (used by tests that act on a week or
// day rather than building one from scratch).
function seedOneWeekOneDay() {
  localStorage.setItem(
    'customWorkout',
    JSON.stringify([{ days: [{ title: 'Day 1', completed: false }] }]),
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  // Reset to CREATE mode by default; edit-mode tests opt in by setting it.
  delete mockParams.workoutLogId;
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('customWorkout — building the layout', () => {
  it('adds a week then a day, rendering a day cell', () => {
    renderCustomWorkout();
    fireEvent.click(screen.getByRole('button', { name: /add week/i }));
    fireEvent.click(screen.getByRole('button', { name: /add a new day to week 1/i }));
    // The new day shows up as its own tappable cell.
    expect(
      screen.getByRole('button', { name: /open day 1 of week 1/i }),
    ).toBeInTheDocument();
  });

  it('caps a week at 7 days — the Add Day button disappears at the cap', () => {
    // Seed a week already holding 7 days; the page should not offer an 8th.
    localStorage.setItem(
      'customWorkout',
      JSON.stringify([
        {
          days: Array.from({ length: 7 }, (_, i) => ({
            title: `Day ${i + 1}`,
            completed: false,
          })),
        },
      ]),
    );
    renderCustomWorkout();
    expect(
      screen.queryByRole('button', { name: /add a new day to week 1/i }),
    ).not.toBeInTheDocument();
  });
});

describe('customWorkout — saving a draft', () => {
  it('shows the Saved! affordance and writes the draft to localStorage', () => {
    renderCustomWorkout();
    // Need at least one week so the Save button is offered.
    fireEvent.click(screen.getByRole('button', { name: /add week/i }));
    fireEvent.change(screen.getByLabelText(/workout name/i), {
      target: { value: 'My Split' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save workout draft/i }));

    // The button flips to its "saved" confirmation state.
    expect(
      screen.getByRole('button', { name: /workout saved/i }),
    ).toBeInTheDocument();
    // Both the layout and the title are persisted to the device.
    expect(localStorage.getItem('customWorkoutTitle')).toBe('My Split');
    expect(JSON.parse(localStorage.getItem('customWorkout'))).toEqual([{ days: [] }]);
  });
});

describe('customWorkout — delete confirmation dialog', () => {
  it('opens a confirm dialog and removes the week when confirmed', () => {
    seedOneWeekOneDay();
    renderCustomWorkout();

    fireEvent.click(screen.getByRole('button', { name: /delete week 1/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    // Week heading is gone, so its day cell is gone too.
    expect(screen.queryByRole('heading', { name: /week 1/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open day 1 of week 1/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the day when the dialog is cancelled', () => {
    seedOneWeekOneDay();
    renderCustomWorkout();

    fireEvent.click(screen.getByRole('button', { name: /delete day 1 of week 1/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    // Dialog closed, day untouched.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open day 1 of week 1/i }),
    ).toBeInTheDocument();
  });
});

describe('customWorkout — finishing the workout', () => {
  it('CREATE mode POSTs a new custom workout and goes home', async () => {
    let postHit = false;
    server.use(
      http.post(`${API_URL}/api/users/custom-workout`, () => {
        postHit = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    seedOneWeekOneDay();
    renderCustomWorkout({ userId: 'u-1' });

    fireEvent.click(screen.getByRole('button', { name: /finish workout/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/home'),
    );
    expect(postHit).toBe(true);
  });

  it('EDIT mode PATCHes the weeks + title endpoints and goes home', async () => {
    mockParams.workoutLogId = 'w-1';
    const hits = { weeks: false, title: false };
    server.use(
      http.patch(`${API_URL}/api/users/workout-log/:id/weeks`, () => {
        hits.weeks = true;
        return HttpResponse.json({ ok: true });
      }),
      http.patch(`${API_URL}/api/users/workout-log/:id/title`, () => {
        hits.title = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    seedOneWeekOneDay();
    renderCustomWorkout({ userId: 'u-1' });

    fireEvent.click(screen.getByRole('button', { name: /finish workout/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/home'),
    );
    expect(hits.weeks).toBe(true);
    expect(hits.title).toBe(true);
  });
});

describe('customWorkout — opening a day', () => {
  it('navigates to the per-day page when a day cell is clicked', () => {
    seedOneWeekOneDay();
    renderCustomWorkout();

    fireEvent.click(screen.getByRole('button', { name: /open day 1 of week 1/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/customDay/1/1');
  });
});
