// Characterization tests for src/pages/customDay.jsx.
//
// customDay is the "build / edit one day of a workout" screen. It has two
// behaviors this batch must lock before refactoring:
//
//   1. The two-tier persistence GATE (Risk #5). In creation mode (reached from
//      the customWorkout builder, no workoutLogId in route state) the page must
//      NEVER auto-save to the database — work lives only in localStorage until
//      the user explicitly saves. In edit mode (reached from viewProgram with a
//      workoutLogId) the page DOES auto-save, debounced 500ms. The bug this
//      guards against is silent DB writes during fresh creation.
//
//   2. The exercise-name combobox wiring. Batch 13 lifts the combobox's
//      keyboard/open-close state machine into hooks/useCombobox (its own
//      keyboard contract is pinned in useCombobox.test.jsx). These tests pin
//      the PAGE side of that wiring — selecting a match fills the name, the
//      no-match "add to custom exercises" affordance shows, and the 150ms
//      blur-close delay (which lives in the page markup, not the hook) — so the
//      same tests stay green before and after the page consumes the hook.
//
// Timers are FAKE and interactions use fireEvent: every handler here is a
// synchronous onClick/onChange/onKeyDown plus setTimeout-based delays (500ms
// save, 150ms blur), so fireEvent + fake timers is deterministic and avoids the
// userEvent + fake-timer interplay hazard (see RestTimer.test.jsx).
//
// Network is stubbed at global.fetch: the workout GET answers 404 (so
// WorkoutContext's mount fetch resolves cleanly via its 404 branch) and every
// other call is recorded so the save-gate assertions can look for the
// custom-day PATCH specifically.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkoutProvider } from '../../context/WorkoutContext';
import { API_URL } from '../../config/api.js';
import CustomDay from './CustomDay.jsx';

// useNavigate mock — the page navigates on Back; we never assert it here, but
// the mock keeps the real router out of the picture.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let fetchMock;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  // The save-gate test must prove it is the workoutLogId gate that stops the
  // save — not a missing userId — so a userId is always present.
  localStorage.setItem('userId', 'u-1');
  // Default network: the workout GET 404s (clean no-op in WorkoutContext); all
  // other calls resolve benignly and are recorded for assertions.
  fetchMock = vi.fn(() =>
    Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Render customDay at /custom-day/:weekNum/:dayNum with the given navigation
// state, inside a real WorkoutProvider. weekNum/dayNum come from the path so
// useParams resolves the way the live app routes here.
function renderCustomDay(state = undefined, { week = 1, day = 1 } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/custom-day/${week}/${day}`, state }]}>
      <Routes>
        <Route
          path="/custom-day/:weekNum/:dayNum"
          element={
            <WorkoutProvider>
              <CustomDay />
            </WorkoutProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

// All custom-day PATCH calls recorded by the fetch stub (the auto-save writes).
function customDayPatchCalls() {
  return fetchMock.mock.calls.filter(
    ([url, opts]) => String(url).includes('/custom-day') && opts?.method === 'PATCH',
  );
}

describe('customDay — persistence gate (Risk #5)', () => {
  it('does NOT auto-save to the database during fresh creation, even after edits', () => {
    renderCustomDay(undefined); // no workoutLogId in state → creation mode

    // Make an edit that, in edit mode, would schedule a save.
    fireEvent.click(screen.getByRole('button', { name: 'Add Exercise' }));
    // Let any debounce window fully elapse.
    act(() => vi.advanceTimersByTime(500));

    expect(customDayPatchCalls()).toHaveLength(0);
  });

  it('DOES auto-save (debounced PATCH) in edit mode once the debounce elapses', () => {
    renderCustomDay({
      workoutLogId: 'wl-1',
      exercises: [{ name: 'Bench Press', sets: [{ reps: '5', target: '100', actual: '', done: false }] }],
    });

    // Nothing should have fired before the 500ms debounce elapses.
    expect(customDayPatchCalls()).toHaveLength(0);

    act(() => vi.advanceTimersByTime(500));

    const patches = customDayPatchCalls();
    expect(patches.length).toBeGreaterThan(0);
    // It targets the external workout-log custom-day endpoint.
    expect(String(patches[0][0])).toBe(
      `${API_URL}/api/users/workout-log/wl-1/custom-day`,
    );
  });
});

// Helper: in creation mode, add one exercise card and return its search input.
function addCardAndGetInput() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Exercise' }));
  return screen.getByRole('combobox', { name: 'Exercise name' });
}

describe('customDay — combobox page wiring', () => {
  it('typing shows the suggestion listbox', () => {
    renderCustomDay(undefined);
    const input = addCardAndGetInput();

    fireEvent.change(input, { target: { value: 'Bench' } });

    const listbox = screen.getByRole('listbox', { name: 'Exercise suggestions' });
    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('ArrowDown + Enter fills the input with the highlighted match', () => {
    renderCustomDay(undefined);
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Bench' } });

    const firstOption = within(
      screen.getByRole('listbox', { name: 'Exercise suggestions' }),
    ).getAllByRole('option')[0].textContent;

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    // The chosen suggestion's name is written into the box, and the list closes.
    expect(input).toHaveValue(firstOption);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clicking a match (mousedown) fills the input and closes the list', () => {
    renderCustomDay(undefined);
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Bench' } });

    const option = within(
      screen.getByRole('listbox', { name: 'Exercise suggestions' }),
    ).getAllByRole('option')[0];
    const name = option.textContent;
    fireEvent.mouseDown(option);

    expect(input).toHaveValue(name);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('offers the "add to custom exercises" affordance when nothing matches', () => {
    renderCustomDay(undefined);
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Zzqqwx' } });

    const listbox = screen.getByRole('listbox', { name: 'Exercise suggestions' });
    expect(within(listbox).getByText(/Add "Zzqqwx" to Custom Exercises/)).toBeInTheDocument();
  });

  it('closes the suggestion list 150ms after the input loses focus', () => {
    renderCustomDay(undefined);
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Bench' } });
    expect(screen.getByRole('listbox', { name: 'Exercise suggestions' })).toBeInTheDocument();

    fireEvent.blur(input);
    // The close is deliberately delayed so a scrollbar drag inside the list
    // doesn't dismiss it; it is still open immediately after blur.
    expect(screen.getByRole('listbox', { name: 'Exercise suggestions' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
