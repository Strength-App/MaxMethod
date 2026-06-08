// Characterization tests for src/pages/home.jsx.
//
// Home is the logged-in landing screen. It shows the user's level badge (for
// non-custom programs), then one of four states: loading, error, no-program
// empty state, or the normal schedule grid of weeks and day cells.
//
// The headline lock here is Risk #6 — the day-display title filter
// (`week.days.filter(d => d?.title != null)`). The ground-truth matrix is
// recorded in docs/comparisons/day-filter-truth-table.md; the
// "day-title filter (Risk #6)" block below pins it against that recorded
// truth, NOT against intuition. Key edge: empty-string and whitespace-only
// titles are KEPT (they are non-null); only null/undefined/missing are dropped.
//
// home reads useWorkout + useUser + useNavigate. Those are mocked here so each
// render branch (loading / error / no-program / normal / custom) and each day
// dataset can be driven directly — the page's own logic (badge gating, progress
// math, the title filter, day-cell navigation) is what's under test, not the
// contexts' derivation of that state.
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home.jsx';

const { mockNavigate, ctx } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  // Mutable holders the mocked hooks read from; each test sets ctx.workout / ctx.user.
  ctx: { workout: {}, user: null },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('../../context/WorkoutContext', () => ({ useWorkout: () => ctx.workout }));
vi.mock('../../context/UserContext', () => ({ useUser: () => ({ user: ctx.user }) }));

const fetchWorkout = vi.fn();

// Build the useWorkout return value, defaulting the non-interesting fields.
function workoutState({ displayWorkout = null, loading = false, error = null } = {}) {
  return { displayWorkout, loading, error, fetchWorkout };
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  fetchWorkout.mockClear();
  ctx.workout = workoutState();
  ctx.user = null;
  localStorage.setItem('userId', 'u-1');
});

afterEach(() => {
  localStorage.clear();
});

describe('home — render branches', () => {
  it('shows a loading message while the program is loading', () => {
    ctx.workout = workoutState({ loading: true });
    renderHome();
    expect(screen.getByText(/loading your program/i)).toBeInTheDocument();
  });

  it('shows an error alert when loading failed', () => {
    ctx.workout = workoutState({ error: 'network down' });
    renderHome();
    expect(screen.getByRole('alert')).toHaveTextContent(/network down/i);
  });

  it('shows the empty state with both CTAs when there is no program', () => {
    ctx.workout = workoutState({ displayWorkout: null });
    renderHome();
    expect(screen.getByRole('heading', { name: /no active program/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go to programs/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/pickNewProgram');

    fireEvent.click(screen.getByRole('button', { name: /start a workout/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/logger');
  });

  it('re-fetches the program on mount when a userId is stored', () => {
    renderHome();
    expect(fetchWorkout).toHaveBeenCalledWith('u-1');
  });
});

describe('home — progress summary', () => {
  it('counts completed vs total days across all weeks', () => {
    ctx.workout = workoutState({
      displayWorkout: {
        type: 'generated', classification: 'Intermediate', goalSelection: 'strength', daysPerWeek: 2,
        weeks: [
          { days: [{ title: 'A', completed: true }, { title: 'B', completed: false }] },
          { days: [{ title: 'C', completed: true }] },
        ],
      },
    });
    renderHome();
    // 2 of 3 days done → 67%.
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('2 days done')).toBeInTheDocument();
    expect(screen.getByText('3 total days')).toBeInTheDocument();
  });
});

describe('home — day-title filter (Risk #6)', () => {
  // Locks docs/comparisons/day-filter-truth-table.md: a day is shown when it
  // HAS a title (non-null), even if that title is empty or whitespace; days
  // with null/undefined/missing titles are dropped. user is null so the only
  // buttons on screen are the day cells.
  function renderWithDays(days) {
    ctx.workout = workoutState({
      displayWorkout: { type: 'generated', classification: 'X', goalSelection: 'strength', daysPerWeek: 5, weeks: [{ days }] },
    });
    renderHome();
  }

  it('drops null, undefined, and missing-field titles but keeps empty/whitespace', () => {
    renderWithDays([
      { title: 'Push', completed: false },   // kept
      { title: null, completed: false },     // dropped
      { completed: false },                  // dropped (no title field)
      { title: '', completed: false },       // kept (empty label)
      { title: '   ', completed: false },    // kept (whitespace label)
    ]);
    // Exactly the three non-null-title days render as cells.
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /open push of week 1/i })).toBeInTheDocument();
  });

  it('navigates to the day route using the filtered index', () => {
    renderWithDays([
      { title: 'Push', completed: false },
      { title: 'Pull', completed: false },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /open pull of week 1/i }));
    // Pull is index 1 in the filtered list → day number 2.
    expect(mockNavigate).toHaveBeenCalledWith('/day/1/2');
  });
});

describe('home — level badge gating', () => {
  // The badge renders for a logged-in user UNLESS the active program is custom.
  // A null-state user (no recorded maxes) makes the badge show its stable
  // empty-state prompt, which is the gating signal these tests key on.
  const nullStateUser = { gender: 'male', current_bodyweight: 180 };

  it('shows the level badge above a non-custom program', () => {
    ctx.user = nullStateUser;
    ctx.workout = workoutState({
      displayWorkout: { type: 'generated', classification: 'X', goalSelection: 'strength', daysPerWeek: 3, weeks: [] },
    });
    renderHome();
    expect(screen.getByText(/log a workout with a bench press, squat, or deadlift/i)).toBeInTheDocument();
  });

  it('hides the level badge for a custom workout', () => {
    ctx.user = nullStateUser;
    ctx.workout = workoutState({
      displayWorkout: { type: 'custom', title: 'My Split', weeks: [] },
    });
    renderHome();
    expect(screen.queryByText(/log a workout with a bench press/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Split' })).toBeInTheDocument();
  });
});
