// Characterization tests for src/pages/goals.jsx.
//
// Goals is the final step before program generation. It arrives carrying the
// user's strength-test result via router state (classification + optional
// combined 1RM total), shows that back as a banner, and collects two choices:
// training days (3/4/5) and a training focus. On submit it validates both
// selections, reads userId from localStorage, and hands everything off to
// /loading — or bounces a signed-out user back to '/'.
//
// Light-weight: the page has no fetches and no providers. It reads location
// state via the real useLocation (so MemoryRouter's initialEntries seed it)
// and navigates via a mocked useNavigate, which lets the tests assert the
// destination + handed-off state without a real route table. window.alert is
// spied because the page uses it for inline validation.
//
// .test.jsx per #test-file-extension-convention — the wrappers contain JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Goals from './goals.jsx';

// useNavigate mock — assert the destination + state, not a real route table.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Render Goals with a router-state payload standing in for the classification
// result that the previous screen normally passes along.
function renderGoals(state = { classification: 'Intermediate', totalOneRepMax: 500 }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/goals', state }]}>
      <Goals />
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

describe('goals — strength profile banner', () => {
  it('shows the classification and combined 1RM total from router state', () => {
    renderGoals({ classification: 'Intermediate', totalOneRepMax: 500 });
    expect(screen.getByText('Your Strength Profile')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    // The total is rendered split across text + a bold value, so match the number.
    expect(screen.getByText('500 lbs')).toBeInTheDocument();
  });
});

describe('goals — submit validation', () => {
  it('alerts about the missing selections and does not navigate', () => {
    renderGoals();
    fireEvent.click(screen.getByRole('button', { name: /build my program/i }));

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('training days'),
    );
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('training focus'),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('goals — submit hands choices to /loading', () => {
  it('navigates to /loading with the assembled state for a signed-in user', () => {
    localStorage.setItem('userId', 'u-1');
    renderGoals({ classification: 'Intermediate', totalOneRepMax: 500 });

    fireEvent.click(screen.getByRole('radio', { name: /4 days/i }));
    fireEvent.click(screen.getByRole('radio', { name: /strength/i }));
    fireEvent.click(screen.getByRole('button', { name: /build my program/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/loading', expect.objectContaining({
      state: expect.objectContaining({
        source: 'goals',
        userId: 'u-1',
        classification: 'Intermediate',
        daysPerWeek: '4',
        goalSelection: 'strength',
      }),
    }));
  });

  it('alerts a session error and routes home when no userId is stored', () => {
    renderGoals();

    fireEvent.click(screen.getByRole('radio', { name: /4 days/i }));
    fireEvent.click(screen.getByRole('radio', { name: /strength/i }));
    fireEvent.click(screen.getByRole('button', { name: /build my program/i }));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Session error'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockNavigate).not.toHaveBeenCalledWith('/loading', expect.anything());
  });
});

describe('goals — focus cards are keyboard-activatable', () => {
  it('selects a focus card with the Space key (aria-checked flips)', () => {
    renderGoals();
    const card = screen.getByRole('radio', { name: /strength/i });
    expect(card).not.toBeChecked();

    fireEvent.keyDown(card, { key: ' ' });
    expect(card).toBeChecked();
  });

  it('selects a focus card with the Enter key (aria-checked flips)', () => {
    renderGoals();
    const card = screen.getByRole('radio', { name: /muscle building/i });
    expect(card).not.toBeChecked();

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(card).toBeChecked();
  });
});
