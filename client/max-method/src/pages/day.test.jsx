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
    // Write paths the set-logging interactions touch. Shapes don't matter to
    // these tests — they exist so onUnhandledRequest:'error' stays quiet.
    http.patch(`${API_URL}/api/users/workout/log`, () => HttpResponse.json({})),
    http.post(`${API_URL}/api/users/workout/pb-check`, () => HttpResponse.json({})),
    http.patch(`${API_URL}/api/users/workout/complete-day`, () =>
      HttpResponse.json({ e1rmUpdates: [] }),
    ),
    // Custom-workout days debounce-save themselves on mount.
    http.patch(`${API_URL}/api/users/workout/custom-day`, () => HttpResponse.json({})),
  );
}

// Builders for the non-strength slot shapes. All keep the day title "Push Day"
// so renderDay's load-wait works unchanged.
function makeCardioWorkout() {
  return makeWorkout({
    weeks: [{ days: [{ title: 'Push Day', completed: false, slots: [{
      slotIdx: 0, exercise: 'Treadmill', label: 'Cardio',
      cardioType: 'Intervals', cardioNote: '8 rounds',
      cardioSets: [
        { distance: '400m', recovery: '90s', intensity: 'Hard' },
        { distance: '400m', recovery: '90s', intensity: 'Hard' },
      ],
    }] }] }],
  });
}

function makeSupersetWorkout() {
  return makeWorkout({
    weeks: [{ days: [{ title: 'Push Day', completed: false, slots: [
      { slotIdx: 0, exercise: 'DB Curls', label: 'Bicep Accessory', superset: true, supersetGroup: 'A', sets: 3, reps: '10', weightNote: '30' },
      { slotIdx: 1, exercise: 'Tricep Pushdowns', label: 'Tricep Accessory', superset: true, supersetGroup: 'A', sets: 3, reps: '10', weightNote: '50' },
    ] }] }],
  });
}

function makeAmrapWorkout() {
  return makeWorkout({
    weeks: [{ days: [{ title: 'Push Day', completed: false, slots: [{
      slotIdx: 0, label: 'Finisher', circuitType: 'AMRAP', totalTime: '10 min',
      circuitNote: 'As many rounds as possible',
      exercises: [{ exercise: 'Burpees', reps: '10' }, { exercise: 'Pushups', reps: '15' }],
    }] }] }],
  });
}

function makeEmomWorkout() {
  return makeWorkout({
    weeks: [{ days: [{ title: 'Push Day', completed: false, slots: [{
      slotIdx: 0, label: 'Conditioning', circuitType: 'EMOM', circuitNote: 'Every minute on the minute',
      exercises: [{ exercise: 'Kettlebell Swings', sets: 3, reps: '10', weightNote: '53' }],
    }] }] }],
  });
}

function makeSwapWorkout() {
  return makeWorkout({
    weeks: [{ days: [{ title: 'Push Day', completed: false, slots: [
      { slotIdx: 0, exercise: 'RDLs', label: 'Hinge', sets: 3, reps: '8', weightNote: '135' },
      { slotIdx: 1, exercise: 'Lat Pulldowns', label: 'Vertical Pull Cable Only', sets: 3, reps: '10', weightNote: '100' },
    ] }] }],
  });
}

function makeCustomWorkout() {
  return {
    _id: 'wl-c',
    type: 'custom',
    weeks: [{ days: [{ title: 'Push Day', completed: false, exercises: [
      { name: 'My Lift', sets: [
        { reps: '8', target: '100', actual: '', actualReps: '', done: false },
        { reps: '8', target: '100', actual: '', actualReps: '', done: false },
      ] },
    ] }] }],
  };
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
  // The card header is the accessible "Expand/Collapse … card" button — match
  // by card name regardless of its open/closed verb (the first card in the day
  // is open by default).
  const header = screen.getByRole('button', { name: new RegExp(`${exerciseName} card`, 'i') });
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

  // After Batch 15a's config consumption, the Squat-pattern swap list is the
  // canonical config list: it offers the canonical "Squat" spelling and NOT the
  // legacy aliases "Squats"/"Back Squat" (those normalize to Squat on the PB
  // path). This is the intended behavior change — see
  // docs/decisions.md#day-movement-patterns-consumption.
  it('offers the canonical Squat-pattern list (Squat, not the alias Squats)', async () => {
    await renderDay();
    const listbox = openSwapListbox('Squat');
    const expected = [
      'Squat', 'Front Squat', 'SSB Squats', 'Box Squats', 'Bodyweight Squat',
      'Pendulum Squat', 'Leg Press', 'Goblet Squat', 'Zercher Squat',
    ];
    expect(within(listbox).getAllByRole('option')).toHaveLength(expected.length);
    for (const name of expected) {
      expect(within(listbox).getByRole('option', { name })).toBeInTheDocument();
    }
    // The legacy alias spellings are gone from the pick-list.
    expect(within(listbox).queryByRole('option', { name: 'Squats' })).not.toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: 'Back Squat' })).not.toBeInTheDocument();
  });

  it('offers Deadlift in the Hinge swap list (intended addition)', async () => {
    seedServer({ workout: makeSwapWorkout() });
    await renderDay();
    const listbox = openSwapListbox('RDLs');
    expect(within(listbox).getByRole('option', { name: 'Deadlift' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Hip Thrusts' })).toBeInTheDocument();
  });

  it('keeps the cable-only Vertical Pull list via the day-local overlay', async () => {
    seedServer({ workout: makeSwapWorkout() });
    await renderDay();
    const listbox = openSwapListbox('Lat Pulldowns');
    const expected = [
      'Lat Pulldowns', 'Close Grip Lat Pulldowns', 'Wide Grip Lat Pulldowns', 'Single Arm Pulldowns',
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

  it('applies a chosen swap to the card and persists it to localStorage', async () => {
    await renderDay();
    const listbox = openSwapListbox('Cable Row');
    // Options activate on mousedown (focus stays on the trigger for keyboard return).
    fireEvent.mouseDown(within(listbox).getByRole('option', { name: 'T Bar Rows' }));

    // The accessory card now shows the replacement exercise.
    expect(
      await screen.findByRole('button', { name: /change exercise \(currently T Bar Rows\)/i }),
    ).toBeInTheDocument();
    // The per-day override is persisted under the swap-for-today key.
    const stored = JSON.stringify(localStorage).includes('T Bar Rows');
    expect(stored).toBe(true);
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

describe('day — set logging and PR detection', () => {
  it('flips the PB chip to "New PR!" when an actual weight beats the stored PB', async () => {
    await renderDay();
    // Bench Press card is open by default (openCards starts { 0: true }).
    // Stored Bench PB is 245; entering 250 in set 1 beats it.
    expect(screen.getByText('Current PR')).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Actual weight in pounds for Bench Press, set 1' }),
      { target: { value: '250' } },
    );
    expect(await screen.findByText('New PR!')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('marks a set done, updates the done count, and starts a rest timer on a non-final set', async () => {
    await renderDay();
    const check = screen.getByRole('button', { name: 'Mark Bench Press, set 1 complete' });
    expect(check).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(check);

    // The same button now reports the set as complete.
    expect(
      screen.getByRole('button', { name: 'Mark Bench Press, set 1 incomplete' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // Day summary reflects one completed set.
    expect(screen.getByText('1 sets done')).toBeInTheDocument();
    // Completing a non-final set (1 of 3) starts the rest countdown.
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip rest' })).toBeInTheDocument();
  });

  it('does NOT start a rest timer when restTimerEnabled is "false"', async () => {
    localStorage.setItem('restTimerEnabled', 'false');
    await renderDay();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Bench Press, set 1 complete' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});

describe('day — keyboard card toggle', () => {
  it('expands a collapsed card with Enter on its header', async () => {
    await renderDay();
    // Cable Row (gi=1) starts collapsed; its set rows aren't shown yet.
    const header = screen.getByRole('button', { name: /Expand Cable Row card/i });
    expect(
      screen.queryByRole('spinbutton', { name: 'Actual weight in pounds for Cable Row, set 1' }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(header, { key: 'Enter' });

    // The header flips to "Collapse" and the first set's weight input appears.
    expect(screen.getByRole('button', { name: /Collapse Cable Row card/i })).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: 'Actual weight in pounds for Cable Row, set 1' }),
    ).toBeInTheDocument();
  });
});

describe('day — read-only external view', () => {
  it('disables inputs, hides "Mark Day Complete", and shows a plain Back button', async () => {
    // A viewWorkout in navigation state with no editMode is read-only.
    await renderDay({ state: { viewWorkout: makeWorkout() } });

    // Inputs are disabled (Bench card is open by default).
    expect(
      screen.getByRole('spinbutton', { name: 'Actual weight in pounds for Bench Press, set 1' }),
    ).toBeDisabled();
    // No completion control on an externally-viewed workout.
    expect(
      screen.queryByRole('button', { name: /mark day complete/i }),
    ).not.toBeInTheDocument();
    // Footer reads "Back" (external) rather than "Back to Home".
    expect(screen.getByRole('button', { name: /^Back$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to home/i })).not.toBeInTheDocument();
  });
});

describe('day — cardio slot', () => {
  it('renders a Cardio section with the exercise and its prescription', async () => {
    seedServer({ workout: makeCardioWorkout() });
    await renderDay();
    // Cardio slots render inside a dedicated "Cardio" section.
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    // The first (and only) card is open by default, so the cardio meta and
    // prescribed cells are already visible.
    expect(screen.getByText('Intervals')).toBeInTheDocument();
    expect(screen.getByText('8 rounds')).toBeInTheDocument();
    expect(screen.getAllByText('400m').length).toBeGreaterThan(0);
  });
});

describe('day — superset grouping', () => {
  it('wraps two same-group slots in a labeled superset block', async () => {
    seedServer({ workout: makeSupersetWorkout() });
    await renderDay();
    expect(screen.getByText('Superset A')).toBeInTheDocument();
    // Match by card name regardless of Expand/Collapse verb — the first card in
    // a group is open by default, the rest closed.
    expect(
      screen.getByRole('button', { name: /DB Curls card/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tricep Pushdowns card/i }),
    ).toBeInTheDocument();
  });
});

describe('day — circuits', () => {
  it('renders an AMRAP circuit with a rounds tracker and per-exercise cards', async () => {
    seedServer({ workout: makeAmrapWorkout() });
    await renderDay();
    // Badge joins label · type · totalTime.
    expect(screen.getByText('Finisher · AMRAP · 10 min')).toBeInTheDocument();
    expect(screen.getByText('As many rounds as possible')).toBeInTheDocument();
    // AMRAP tracks rounds at the circuit level (the rounds input).
    expect(screen.getByRole('spinbutton', { name: 'Rounds completed' })).toBeInTheDocument();
    // Each circuit move gets its own card.
    expect(screen.getByText('Burpees')).toBeInTheDocument();
    expect(screen.getByText('Pushups')).toBeInTheDocument();
  });

  it('renders a non-AMRAP (EMOM) circuit with per-exercise set cards', async () => {
    seedServer({ workout: makeEmomWorkout() });
    await renderDay();
    expect(screen.getByText('Conditioning · EMOM')).toBeInTheDocument();
    expect(screen.getByText('Every minute on the minute')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Expand Kettlebell Swings card/i }),
    ).toBeInTheDocument();
  });
});

describe('day — custom workout', () => {
  it('renders custom exercise cards from day.exercises', async () => {
    seedServer({ workout: makeCustomWorkout() });
    await renderDay();
    // Custom exercises are seeded by a second effect after the workout loads,
    // so the card name arrives a render after the day title — query it async.
    expect(await screen.findByText('My Lift')).toBeInTheDocument();
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
  });
});
