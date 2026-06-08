// Characterization tests for src/pages/reviewProgram.jsx.
//
// ReviewProgram is the screen shown right after a program is generated and
// before it becomes the user's active program. It lists week-1's days and
// the exercises in each, lets the user swap any non-fixed exercise for an
// equipment-appropriate alternative (the swap applies across every week),
// and finalizes the program on the backend.
//
// These tests are written BEFORE Batch 11 migrates the page off its two
// inline data maps (EXERCISE_EQUIPMENT, MOVEMENT_PATTERNS) onto the shared
// config/exercises.js. They pin the observable behavior that migration must
// preserve — in particular the swap pick-list for the "Squat Pattern" slot,
// which is the one place the page's data differs from the canonical config
// (it carries the alias spellings 'Squats' and 'Back Squat'). See
// docs/follow-ups.md#reviewprogram-movement-patterns-alias-strategy.
//
// Integration-shaped: real WorkoutProvider in a MemoryRouter (the page reads
// useWorkout + useLocation), useNavigate mocked to assert destinations,
// window.alert spied (finalize error path), MSW backing the swap PATCH and
// the post-finalize workout refetch. location.state is supplied through the
// MemoryRouter entry so useLocation().state matches how the app navigates
// here.
//
// .test.jsx per #test-file-extension-convention — the wrappers contain JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server.js';
import { WorkoutProvider } from '../../context/WorkoutContext';
import { API_URL } from '../../config/api.js';
import ReviewProgram from './ReviewProgram.jsx';

// useNavigate mock — assert the destination + state, not a real route table.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// A representative program-state shape. Day 1 carries: a duplicated "Squat"
// slot (to exercise the dedup), a "Cable Row" slot (to exercise the equipment
// pill), and a circuit (to exercise the circuit-group rendering). Day 2 has a
// null title so it must be filtered out of the overview.
function makeState(overrides = {}) {
  return {
    workoutLogId: 'wl-1',
    userId: 'u-1',
    classification: 'Intermediate',
    weeks: [
      {
        days: [
          {
            title: 'Day 1 — Lower',
            slots: [
              { slotIdx: 0, exercise: 'Squat', label: 'Squat Pattern' },
              // Same exercise again — should collapse into the row above.
              { slotIdx: 1, exercise: 'Squat', label: 'Squat Pattern' },
              { slotIdx: 2, exercise: 'Cable Row', label: 'Horizontal Pull' },
              {
                slotIdx: 3,
                label: 'Finisher',
                circuitType: 'AMRAP',
                exercises: [
                  { exercise: 'Plank', label: 'Core' },
                  { label: 'Rest' },
                ],
              },
            ],
          },
          // No title → filtered out of the overview grid.
          { title: null, slots: [{ slotIdx: 0, exercise: 'Bench Press', label: 'Horizontal Push' }] },
        ],
      },
    ],
    ...overrides,
  };
}

// Render ReviewProgram with the given navigation state inside real providers.
function renderReviewProgram(state = makeState()) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/review-program', state }]}>
      <WorkoutProvider>
        <ReviewProgram />
      </WorkoutProvider>
    </MemoryRouter>,
  );
}

// Open the swap dropdown for a slot, then open the inner combobox listbox,
// and return that listbox element for option assertions.
function openSwapListbox(exerciseName) {
  fireEvent.click(screen.getByRole('button', { name: `Swap ${exerciseName} for an alternative` }));
  fireEvent.click(screen.getByRole('combobox', { name: `Replacement for ${exerciseName}` }));
  return screen.getByRole('listbox', { name: `Replacement for ${exerciseName}` });
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('reviewProgram — navigation guard', () => {
  it('redirects home when there is no program in navigation state', () => {
    renderReviewProgram({});
    expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
  });
});

describe('reviewProgram — rendering', () => {
  it('shows the title, the classification banner, and only titled days', () => {
    renderReviewProgram();

    expect(screen.getByRole('heading', { name: /review your program/i })).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();

    // Day 1 is titled and shown; the null-title day (with Bench Press) is hidden.
    expect(screen.getByText('Day 1 — Lower')).toBeInTheDocument();
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
  });

  it('collapses repeated slots of the same exercise into one row', () => {
    renderReviewProgram();
    // Two "Squat" slots in the source → exactly one "Squat" exercise row.
    expect(screen.getAllByText('Squat')).toHaveLength(1);
  });

  it('renders the equipment pill from the equipment map', () => {
    renderReviewProgram();
    // Cable Row maps to the "Cable" equipment label.
    expect(screen.getByText('Cable')).toBeInTheDocument();
    // Squat maps to "Barbell".
    expect(screen.getByText('Barbell')).toBeInTheDocument();
  });

  it('renders a circuit group with its exercises', () => {
    renderReviewProgram();
    // The circuit header joins its parts with " · ".
    expect(screen.getByText('Finisher · AMRAP')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    // The "Rest" placeholder row renders but offers no swap.
    expect(screen.getByText('Rest')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /swap rest for an alternative/i }),
    ).not.toBeInTheDocument();
  });
});

describe('reviewProgram — swap alternatives (data-map invariants)', () => {
  // The migration-critical lock: the swap pick-list for a Squat-pattern slot
  // must offer all 11 names, INCLUDING the alias spellings 'Squats' and
  // 'Back Squat' that the canonical config/exercises.js map omits. Order is
  // not asserted — only membership and count are load-bearing.
  it('offers the full squat-pattern alternative list including the alias spellings', () => {
    renderReviewProgram();
    const listbox = openSwapListbox('Squat');

    const expected = [
      'Squat', 'Front Squat', 'SSB Squats', 'Squats', 'Back Squat', 'Box Squats',
      'Bodyweight Squat', 'Pendulum Squat', 'Leg Press', 'Goblet Squat', 'Zercher Squat',
    ];
    expect(within(listbox).getAllByRole('option')).toHaveLength(expected.length);
    for (const name of expected) {
      expect(within(listbox).getByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('offers the horizontal-pull alternatives for a Cable Row slot', () => {
    renderReviewProgram();
    const listbox = openSwapListbox('Cable Row');

    const expected = [
      'Barbell Row', 'Underhand Barbell Row', 'Cable Row', 'T Bar Rows',
      'Single Arm Cable Rows', 'Single Arm Dumbbell Rows', 'Chest Supported Row',
      'Seal Row', 'Pendlay Row',
    ];
    expect(within(listbox).getAllByRole('option')).toHaveLength(expected.length);
    for (const name of expected) {
      expect(within(listbox).getByRole('option', { name })).toBeInTheDocument();
    }
  });
});

describe('reviewProgram — swapping and finalizing', () => {
  it('updates the row and the customized-count when an alternative is chosen', () => {
    renderReviewProgram();
    // Cable Row is a single (non-collapsed) slot, so one selection = one change.
    const listbox = openSwapListbox('Cable Row');

    // Options activate on mousedown (focus stays on the trigger for keyboard return).
    fireEvent.mouseDown(within(listbox).getByRole('option', { name: 'T Bar Rows' }));

    // The slot's displayed name follows the selection, and the footer counts it.
    expect(screen.getByText('T Bar Rows')).toBeInTheDocument();
    expect(screen.getByText(/1 exercise customized/i)).toBeInTheDocument();
  });

  it('sends a swap PATCH for the change, then refetches and routes home', async () => {
    const patchBodies = [];
    server.use(
      http.patch(
        `${API_URL}/api/users/workout-log/:id/swap-exercise-all-weeks`,
        async ({ request }) => {
          patchBodies.push(await request.json());
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    renderReviewProgram();
    const listbox = openSwapListbox('Cable Row');
    fireEvent.mouseDown(within(listbox).getByRole('option', { name: 'T Bar Rows' }));

    fireEvent.click(screen.getByRole('button', { name: /finalize and start this program/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }),
    );
    expect(patchBodies).toEqual([
      { dayIdx: 0, slotIdx: 2, newExercise: 'T Bar Rows' },
    ]);
  });

  it('applies a swap on a collapsed row to every underlying slot', async () => {
    // The two source "Squat" slots (slotIdx 0 and 1) collapse into one row, so
    // swapping that row fires one PATCH per underlying slot.
    const patchBodies = [];
    server.use(
      http.patch(
        `${API_URL}/api/users/workout-log/:id/swap-exercise-all-weeks`,
        async ({ request }) => {
          patchBodies.push(await request.json());
          return HttpResponse.json({ ok: true });
        },
      ),
    );

    renderReviewProgram();
    const listbox = openSwapListbox('Squat');
    fireEvent.mouseDown(within(listbox).getByRole('option', { name: 'Front Squat' }));

    // Both underlying slots are counted as customized in the footer.
    expect(screen.getByText(/2 exercises customized/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /finalize and start this program/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }),
    );
    expect(patchBodies).toEqual([
      { dayIdx: 0, slotIdx: 0, newExercise: 'Front Squat' },
      { dayIdx: 0, slotIdx: 1, newExercise: 'Front Squat' },
    ]);
  });

  it('alerts and stays on the page when a swap fails to save', async () => {
    server.use(
      http.patch(
        `${API_URL}/api/users/workout-log/:id/swap-exercise-all-weeks`,
        () => HttpResponse.error(),
      ),
    );

    renderReviewProgram();
    const listbox = openSwapListbox('Squat');
    fireEvent.mouseDown(within(listbox).getByRole('option', { name: 'Front Squat' }));

    fireEvent.click(screen.getByRole('button', { name: /finalize and start this program/i }));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalledWith('/home', { replace: true });
  });
});
