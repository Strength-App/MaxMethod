// Characterization tests for src/pages/history.jsx.
//
// History is the workout-log screen: it loads the user's completed sessions
// on mount and shows them two ways — a Timeline (sessions grouped by month)
// and a Calendar (sessions placed on their day cells). Tapping a session opens
// a read-only detail modal (which also gates the edit flow, not exercised here).
//
// These are focused characterization tests for the load + the two read-only
// views + the view toggle — the surface that Batch 9a's only change touches
// (swapping the page's local `dateKey` for the shared utils/dateUtils.js one,
// a byte-identical lift). The exhaustive edit/PB/combobox behavior is out of
// this batch's scope; dateKey's own correctness is locked in
// utils/dateUtils.test.js.
//
// Integration-shaped: real UserProvider (the page reads useUser), MSW backing
// the all-history fetch. A userId is seeded so loadHistory fires.
//
// .test.jsx per #test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { UserProvider } from '../context/UserContext';
import { API_URL } from '../config/api.js';
import History from './history.jsx';

// Stub the all-history endpoint with a given sessions array.
function stubHistory(sessions) {
  server.use(
    http.get(`${API_URL}/api/users/workout/:userId/all-history`, () =>
      HttpResponse.json({ sessions }),
    ),
  );
}

// A completed session in the server's shape (date is an ISO string; the page
// re-parses it to a local-midnight Date).
function session(overrides = {}) {
  return {
    date: '2026-03-10T12:00:00Z',
    dayTitle: 'Push Day',
    slots: [{ exercise: 'Bench Press' }, { exercise: 'Overhead Press' }],
    ...overrides,
  };
}

function renderHistory() {
  localStorage.setItem('userId', 'u-1');
  return render(
    <UserProvider>
      <History />
    </UserProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('history — load + timeline', () => {
  it('shows the empty state when there are no completed sessions', async () => {
    stubHistory([]);
    renderHistory();
    expect(
      await screen.findByText(/no completed workouts yet/i),
    ).toBeInTheDocument();
  });

  it('lists a completed session in the timeline', async () => {
    stubHistory([session()]);
    renderHistory();
    // The session row is a button whose accessible name leads with its title.
    expect(
      await screen.findByRole('button', { name: /push day/i }),
    ).toBeInTheDocument();
  });

  it('opens the session detail modal when a timeline row is activated', async () => {
    stubHistory([session()]);
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: /push day/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('history — view toggle', () => {
  it('switches from the timeline tab to the calendar tab', async () => {
    stubHistory([]);
    renderHistory();
    await screen.findByText(/no completed workouts yet/i);

    fireEvent.click(screen.getByRole('tab', { name: /calendar/i }));

    expect(screen.getByRole('tab', { name: /calendar/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /timeline/i })).toHaveAttribute('aria-selected', 'false');
    // Calendar month navigation is now present.
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
  });

  it('advances the calendar month when the next arrow is pressed', async () => {
    stubHistory([]);
    renderHistory();
    await screen.findByText(/no completed workouts yet/i);
    fireEvent.click(screen.getByRole('tab', { name: /calendar/i }));

    // The Next arrow's label names the month it will move TO; after clicking,
    // that month + year becomes the visible month title.
    const nextBtn = screen.getByRole('button', { name: /next month/i });
    const target = nextBtn.getAttribute('aria-label').replace('Next month, ', '');
    fireEvent.click(nextBtn);

    expect(screen.getByText(target)).toBeInTheDocument();
  });
});
