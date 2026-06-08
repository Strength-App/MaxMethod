// Characterization tests for src/pages/exerciseLibrary.jsx.
//
// The Exercise Library is the reference screen: a searchable, body-region-
// tabbed catalog of every movement the app knows about, each card carrying its
// movement pattern, equipment, primary muscle, and a body-muscle diagram.
// Opening a card shows a detail view (coaching cues, personal record, exercise
// history) with a how-to video. A separate "Custom" tab lets the user add and
// remove their own exercises.
//
// These tests are written BEFORE Batch 12 migrates the page off its inline data
// maps onto config/exercises.js AND relocates the exercise-data layer
// (buildExerciseList / ALL_EXERCISES / the PATTERN_* tables / EXERCISE_NAME_ALIASES)
// out of this page into config. They pin the observable behavior that migration
// must preserve — every piece of relocated data is asserted through the rendered
// output so a data-source swap can't silently change what the user sees:
//   - card pattern / equipment / primary muscle  → MOVEMENT_PATTERNS, EXERCISE_EQUIPMENT, PATTERN_PRIMARY
//   - body-muscle diagram label                  → PATTERN_MUSCLES
//   - body-region grouping + tab filter          → bodyOf / UPPER_PATTERNS / LOWER_PATTERNS
//   - total catalog count                        → buildExerciseList / ALL_EXERCISES
//   - detail coaching cues + tips                → PATTERN_STEPS, PATTERN_TIPS
//   - video resolution incl. the alias bridge    → VIDEO_NAME_ALIASES + buildVideoLookup
//   - focus-an-exercise deep link incl. alias    → EXERCISE_NAME_ALIASES
//
// Integration-shaped: real WorkoutProvider in a MemoryRouter (the page reads
// useWorkout + useLocation), useNavigate mocked to a spy (the page calls it to
// clear consumed location.state), MuxPlayer stubbed to a plain element exposing
// the resolved playback id, MSW backing the library-videos / exercise-history /
// custom-exercises endpoints.
//
// .test.jsx per #test-file-extension-convention — the wrappers contain JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server.js';
import { WorkoutProvider } from '../../context/WorkoutContext';
import { API_URL } from '../../config/api.js';
import ExerciseLibrary from './ExerciseLibrary.jsx';

// Every test renders the full ~168-card catalog (each card mounts an inline SVG
// body diagram), so a single render is heavy. The assertions are fast; only the
// render is slow, and on a loaded/contended machine one render can blow past the
// 5s default and flake. Give this file generous headroom — on CI (fast Linux)
// these tests finish in well under a second, so the larger budget is never hit.
vi.setConfig({ testTimeout: 20000 });

// useNavigate mock — the page calls navigate(pathname, { replace, state:null })
// to clear consumed location.state after a focusExercise / resetToList signal.
// A spy lets the deep-link tests observe the consumed detail view without the
// real router unmounting it.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// MuxPlayer is a heavy web component; stub it to a plain element that surfaces
// the resolved playback id so the video-lookup tests can assert exactly which
// mongo video name a frontend label resolved to.
vi.mock('@mux/mux-player-react', () => ({
  default: ({ playbackId }) => <div data-testid="mux-player" data-playback-id={playbackId} />,
}));

// Current ALL_EXERCISES entry counts (buildExerciseList emits one entry per
// name per pattern, so cross-pattern repeats are counted). Hardcoded so the
// test stays independent of where ALL_EXERCISES is defined; if the relocation
// drops or duplicates data, these break.
const TOTAL_ENTRIES = 168;
const LOWER_ENTRIES = 63;
const CARDIO_ENTRIES = 9;

// Always-on default: the library-videos fetch fires on mount with no userId
// gate, and onUnhandledRequest is 'error', so every render needs it mocked.
function videosHandler(videos = []) {
  return http.get(`${API_URL}/api/users/library-videos`, () => HttpResponse.json(videos));
}

// The detail views fetch all-time exercise history on mount, but only when a
// userId is present. Tests that open a detail view with a userId set must
// register this handler (onUnhandledRequest is set to 'error').
function historyHandler(history = []) {
  return http.get(`${API_URL}/api/users/workout/:userId/exercise-history`, () =>
    HttpResponse.json({ history }),
  );
}

function renderLibrary({ state = null, userId = null, videos = [] } = {}) {
  if (userId) localStorage.setItem('userId', userId);
  server.use(videosHandler(videos));
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/exerciseLibrary', state }]}>
      <WorkoutProvider>
        <Routes>
          <Route path="/exerciseLibrary" element={<ExerciseLibrary />} />
        </Routes>
      </WorkoutProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
});
afterEach(() => {
  localStorage.clear();
});

describe('exerciseLibrary — catalog rendering', () => {
  it('renders the header and the full catalog count', () => {
    renderLibrary();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    // The count region announces "<n> exercises shown".
    expect(screen.getByText(`${TOTAL_ENTRIES} exercises shown`)).toBeInTheDocument();
  });

  it('groups exercises under their body-region sections', () => {
    renderLibrary();
    // Section labels are headings within the list (Upper/Lower/Core/Cardio
    // sections plus their pattern subgroups). The four region labels appear.
    expect(screen.getAllByText('Upper Body').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lower Body').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Core').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cardio').length).toBeGreaterThan(0);
  });

  it('exposes a card whose label carries pattern, equipment, and primary muscle', () => {
    renderLibrary();
    // Pins MOVEMENT_PATTERNS (Bench Press lives under Horizontal Push),
    // EXERCISE_EQUIPMENT (Barbell), and PATTERN_PRIMARY (Chest) at once.
    expect(
      screen.getByRole('button', {
        name: 'Bench Press — Upper, Horizontal Push, Barbell, primary muscle: Chest',
      }),
    ).toBeInTheDocument();
  });

  it('labels the body-muscle diagram from the pattern muscle map', () => {
    renderLibrary();
    // Pins PATTERN_MUSCLES — the diagram's accessible name lists the
    // highlighted muscle keys for Horizontal Push.
    expect(
      screen.getAllByLabelText('Body diagram highlighting: chest, shoulders, triceps').length,
    ).toBeGreaterThan(0);
  });
});

describe('exerciseLibrary — body-region tabs', () => {
  it('filters to lower-body exercises when the Lower Body tab is chosen', () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('tab', { name: 'Lower Body' }));
    expect(screen.getByText(`${LOWER_ENTRIES} exercises shown`)).toBeInTheDocument();
    // A known lower-body movement is present; a known upper-body one is gone.
    expect(
      screen.getByRole('button', { name: /^Squat — Lower, Squat Pattern, Barbell/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Bench Press —/ }),
    ).not.toBeInTheDocument();
  });

  it('filters to cardio exercises when the Cardio tab is chosen', () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('tab', { name: 'Cardio' }));
    expect(screen.getByText(`${CARDIO_ENTRIES} exercises shown`)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Treadmill — Cardio/ }),
    ).toBeInTheDocument();
  });
});

describe('exerciseLibrary — search', () => {
  it('filters the catalog by exercise name', () => {
    renderLibrary();
    fireEvent.change(screen.getByLabelText('Search exercises or patterns'), {
      target: { value: 'goblet' },
    });
    expect(
      screen.getByRole('button', { name: /^Goblet Squat —/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Bench Press —/ })).not.toBeInTheDocument();
  });

  it('shows the empty state when nothing matches', () => {
    renderLibrary();
    fireEvent.change(screen.getByLabelText('Search exercises or patterns'), {
      target: { value: 'zzzznotathing' },
    });
    expect(screen.getByText(/No exercises match/)).toBeInTheDocument();
  });
});

describe('exerciseLibrary — detail view', () => {
  it('opens coaching cues and tips for the selected exercise', () => {
    renderLibrary();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bench Press — Upper, Horizontal Push, Barbell, primary muscle: Chest',
      }),
    );
    // Coaching cues come from PATTERN_STEPS['Horizontal Push'].
    expect(screen.getByText('Coaching Cues')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Grip')).toBeInTheDocument();
    // Tips come from PATTERN_TIPS['Horizontal Push'].
    expect(screen.getByText('Arch upper back — keeps shoulders safe')).toBeInTheDocument();
    // Detail meta badges echo the classification data.
    expect(screen.getByText('Upper Body')).toBeInTheDocument();
  });

  it('shows the empty personal-record state when the user has no PR', () => {
    server.use(historyHandler([]));
    renderLibrary({ userId: 'u-1', videos: [] });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bench Press — Upper, Horizontal Push, Barbell, primary muscle: Chest',
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Personal Record' }));
    expect(screen.getByText('No personal record yet')).toBeInTheDocument();
  });

  it('falls back to "video coming soon" when no library video matches', () => {
    renderLibrary({ videos: [] });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bench Press — Upper, Horizontal Push, Barbell, primary muscle: Chest',
      }),
    );
    expect(screen.getByText(/Video coming soon/)).toBeInTheDocument();
    expect(screen.queryByTestId('mux-player')).not.toBeInTheDocument();
  });

  it('returns to the list from the detail back button', () => {
    renderLibrary();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bench Press — Upper, Horizontal Push, Barbell, primary muscle: Chest',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to exercise library' }));
    expect(screen.getByText(`${TOTAL_ENTRIES} exercises shown`)).toBeInTheDocument();
  });
});

describe('exerciseLibrary — video lookup', () => {
  it('plays a directly-matching library video', async () => {
    renderLibrary({ videos: [{ exercise_name: 'Bench Press', mux_playback_id: 'bench-id' }] });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bench Press — Upper, Horizontal Push, Barbell, primary muscle: Chest',
      }),
    );
    // The library-videos fetch is async; the player appears once it resolves.
    expect(await screen.findByTestId('mux-player')).toHaveAttribute('data-playback-id', 'bench-id');
  });

  it('bridges a frontend label to a mongo video name via VIDEO_NAME_ALIASES', async () => {
    // 'Close Grip Lat Pulldowns' (frontend) → 'Close Grip Pulldowns' (mongo).
    // The normalizers alone can't bridge this, so the alias map must apply.
    renderLibrary({
      videos: [{ exercise_name: 'Close Grip Pulldowns', mux_playback_id: 'cgp-id' }],
    });
    fireEvent.click(
      screen.getByRole('button', { name: /^Close Grip Lat Pulldowns —/ }),
    );
    expect(await screen.findByTestId('mux-player')).toHaveAttribute('data-playback-id', 'cgp-id');
  });
});

describe('exerciseLibrary — custom exercises', () => {
  it('lists, adds, and removes custom exercises through the Custom tab', async () => {
    server.use(
      http.get(`${API_URL}/api/users/u-1/custom-exercises`, () =>
        HttpResponse.json({ custom_exercises: [] }),
      ),
      http.post(`${API_URL}/api/users/u-1/custom-exercises`, async ({ request }) => {
        const { name } = await request.json();
        return HttpResponse.json({ custom_exercises: [name] });
      }),
      http.delete(`${API_URL}/api/users/u-1/custom-exercises/:name`, () =>
        HttpResponse.json({ ok: true }),
      ),
    );
    renderLibrary({ userId: 'u-1' });
    fireEvent.click(screen.getByRole('tab', { name: 'Custom' }));

    expect(screen.getByText('No custom exercises yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('New custom exercise name'), {
      target: { value: 'My Special Lift' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add custom exercise' }));

    expect(
      await screen.findByRole('button', { name: 'My Special Lift, custom exercise' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove My Special Lift from custom exercises' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'My Special Lift, custom exercise' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('rejects a duplicate custom exercise name', async () => {
    server.use(
      http.get(`${API_URL}/api/users/u-1/custom-exercises`, () =>
        HttpResponse.json({ custom_exercises: ['Existing Move'] }),
      ),
    );
    renderLibrary({ userId: 'u-1' });
    fireEvent.click(screen.getByRole('tab', { name: 'Custom' }));
    await screen.findByRole('button', { name: 'Existing Move, custom exercise' });

    fireEvent.change(screen.getByLabelText('New custom exercise name'), {
      target: { value: 'existing move' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add custom exercise' }));
    expect(
      screen.getByText('That exercise already exists in your custom list'),
    ).toBeInTheDocument();
  });
});

describe('exerciseLibrary — deep links via location.state', () => {
  it('opens a standard exercise straight to its detail view', () => {
    renderLibrary({ state: { focusExercise: 'Bench Press' } });
    expect(screen.getByText('Coaching Cues')).toBeInTheDocument();
    expect(screen.getByText('Arch upper back — keeps shoulders safe')).toBeInTheDocument();
  });

  it('resolves a legacy alias name through EXERCISE_NAME_ALIASES', () => {
    // 'squats' is not a catalog name; the alias map maps it to 'Squat', whose
    // detail (Squat Pattern coaching cues) should open.
    renderLibrary({ state: { focusExercise: 'squats' } });
    expect(screen.getByText('Coaching Cues')).toBeInTheDocument();
    // A Squat-Pattern-specific cue label.
    expect(screen.getByText('Stance')).toBeInTheDocument();
  });

  it('opens a custom exercise detail when the focus name is a custom one', () => {
    server.use(historyHandler([]));
    localStorage.setItem('customExercises', JSON.stringify(['Sled Push']));
    renderLibrary({ state: { focusExercise: 'Sled Push' }, userId: 'u-1' });
    expect(screen.getByText('Custom Exercise')).toBeInTheDocument();
  });
});
