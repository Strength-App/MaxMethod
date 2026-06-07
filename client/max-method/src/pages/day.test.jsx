// Characterization tests for src/pages/day.jsx — the program-driven workout
// screen (the largest page in the app, "Batch 15's final boss").
//
// These tests are written BEFORE Batch 15 touches the file. They pin the
// observable behavior that the batch must preserve, with particular weight on
// the two things 15a's config consumption changes:
//
//   1. The "Swap for today" alternative list — day.jsx resolves it from its
//      inline `movementPatterns` map. 15a migrates that to the shared
//      config/exercises.js (with an overlay), so the pick-list a user sees for
//      a given slot is the migration-critical invariant.
//   2. The equipment pills inside the swap dropdown — sourced from the inline
//      `EXERCISE_EQUIPMENT` map, which 15a swaps for the byte-identical
//      config copy.
//
// Integration-shaped, mirroring reviewProgram.test.jsx: a real
// UserProvider + WorkoutProvider tree, MSW backing the workout/profile/PB
// fetches, useNavigate mocked to assert destinations. day.jsx reads its route
// params (`/day/:weekNum/:dayNum`) via useParams, so it is mounted under a
// Routes/Route with those params filled.
//
// The workout is delivered through the ACTIVE-program path (WorkoutContext's
// fetchWorkout, seeded by a localStorage userId + an MSW 200), not the
// external-viewWorkout path, because that is the editable flow that owns
// "Mark Day Complete", the swap menu, and PB detection.
//
// .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { WorkoutProvider } from '../context/WorkoutContext';
import { API_URL } from '../config/api.js';
import Day from './day.jsx';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// A representative active-program workout document. Week 1 / Day 1 carries:
//   - slot 0: a FIXED main lift (Bench Press) — no edit button, PB chip, a
//     literal weight target.
//   - slot 1: a swappable accessory (Cable Row, Horizontal Pull) — edit button,
//     swap-for-today menu, equipment pill.
//   - slot 2: a percentage-target lift (Squat Pattern, "75%") — resolves against
//     the user's squat 1RM from the profile fetch.
// The shape matches what WorkoutContext.fetchWorkout seeds from (weeks[].days[].slots[]).
function makeWorkout(overrides = {}) {
  return {
    _id: 'wl-1',
    type: 'generated',
    progression_note: 'Add 5 lbs when you hit the top of the rep range.',
    weeks: [
      {
        days: [
          {
            title: 'Push Day',
            completed: false,
            slots: [
              {
                slotIdx: 0,
                exercise: 'Bench Press',
                label: 'Horizontal Push',
                fixed: 'Bench Press',
                sets: 3,
                reps: '5',
                weightNote: '135',
              },
              {
                slotIdx: 1,
                exercise: 'Cable Row',
                label: 'Horizontal Pull',
                sets: 3,
                reps: '10',
                weightNote: '100',
              },
              {
                slotIdx: 2,
                exercise: 'Squat',
                label: 'Squat Pattern',
                sets: 2,
                reps: '5',
                weightNote: '75%',
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

const PROFILE = {
  _id: 'u-1',
  current_one_rep_maxes: { bench: 225, squat: 315, deadlift: 405 },
  estimated_one_rep_maxes: { bench: 230, squat: 320, deadlift: 410 },
};

// Install MSW handlers for the active-program bootstrap. `workout` lets a test
// vary the document; PBs default to a Bench Press best so the PB chip renders.
function seedServer({ workout = makeWorkout(), personalBests = { 'Bench Press': 245 } } = {}) {
  server.use(
    http.get(`${API_URL}/api/users/profile/:id`, () => HttpResponse.json(PROFILE)),
    http.get(`${API_URL}/api/users/workout/:userId`, () => HttpResponse.json(workout)),
    http.get(`${API_URL}/api/users/workout/:userId/personal-bests`, () =>
      HttpResponse.json({ personal_bests: personalBests }),
    ),
  );
}

// Render Day at week 1 / day 1 inside the real provider tree, then wait for the
// active workout to load (the day title appears once WorkoutContext resolves).
async function renderDay({ state } = {}) {
  localStorage.setItem('userId', 'u-1');
  const entry = state ? { pathname: '/day/1/1', state } : '/day/1/1';
  const utils = render(
    <MemoryRouter initialEntries={[entry]}>
      <UserProvider>
        <WorkoutProvider>
          <Routes>
            <Route path="/day/:weekNum/:dayNum" element={<Day />} />
          </Routes>
        </WorkoutProvider>
      </UserProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Push Day' });
  return utils;
}

// Open a card's right-click menu and click "Swap for today", returning the
// swap dropdown's combobox listbox for option assertions.
function openSwapListbox(exerciseName) {
  // The card header is the accessible "Expand … card" button.
  const header = screen.getByRole('button', { name: new RegExp(`Expand ${exerciseName} card`, 'i') });
  fireEvent.contextMenu(header);
  fireEvent.click(screen.getByRole('menuitem', { name: 'Swap for today' }));
  fireEvent.click(screen.getByRole('combobox', { name: `Replacement for ${exerciseName} (today only)` }));
  return screen.getByRole('listbox', { name: `Replacement for ${exerciseName} (today only)` });
}

beforeEach(() => {
  mockNavigate.mockClear();
  seedServer();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('day — header and summary', () => {
  it('renders the week badge, day title, and progression note', async () => {
    await renderDay();
    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Push Day' })).toBeInTheDocument();
    expect(
      screen.getByText('Add 5 lbs when you hit the top of the rep range.'),
    ).toBeInTheDocument();
  });

  it('summarizes total sets across all slots (3 + 3 + 2 = 8)', async () => {
    await renderDay();
    expect(screen.getByText('8 total sets')).toBeInTheDocument();
    expect(screen.getByText('0 sets done')).toBeInTheDocument();
  });
});

describe('day — exercise cards', () => {
  it('shows a fixed main lift without an edit button', async () => {
    await renderDay();
    // The fixed Bench Press name is plain text, not the "Change exercise" button.
    expect(
      screen.queryByRole('button', { name: /change exercise \(currently Bench Press\)/i }),
    ).not.toBeInTheDocument();
    // A non-fixed accessory exposes the change-exercise button.
    expect(
      screen.getByRole('button', { name: /change exercise \(currently Cable Row\)/i }),
    ).toBeInTheDocument();
  });

  it('renders the current PB chip from personalBests', async () => {
    await renderDay();
    // Bench Press PB of 245 is shown on its card.
    expect(screen.getByText('Current PR')).toBeInTheDocument();
    expect(screen.getByText('245')).toBeInTheDocument();
  });
});

describe('day — swap-for-today alternatives (config-migration invariant)', () => {
  it('offers the horizontal-pull list for a Cable Row slot', async () => {
    await renderDay();
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

  it('shows the equipment label for an option (Cable Row → Cable)', async () => {
    await renderDay();
    const listbox = openSwapListbox('Cable Row');
    // The selected/option rendering surfaces the equipment label from the map.
    expect(within(listbox).getByRole('option', { name: 'Cable Row' })).toBeInTheDocument();
    expect(within(listbox).getAllByText('Cable').length).toBeGreaterThan(0);
  });
});

describe('day — percentage target resolution', () => {
  it('resolves a "75%" Squat target against the user\'s squat 1RM', async () => {
    await renderDay();
    // Open the Squat card to reveal its set rows.
    fireEvent.click(screen.getByRole('button', { name: /Expand Squat card/i }));
    // 75% of 315 (squat 1RM) = 236.25 → rounded to nearest 5 = 235, for both
    // of the Squat slot's two sets.
    await waitFor(() => expect(screen.getAllByText('235')).toHaveLength(2));
  });
});
