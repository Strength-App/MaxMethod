// Characterization tests for src/pages/logger.jsx.
//
// Logger is the "log a quick ad-hoc workout" screen. Batch 14 makes it consume
// two pieces already extracted in earlier batches without changing behavior:
//
//   1. The exercise-name combobox state machine — Batch 13 lifted the
//      keyboard/open-close brain into hooks/useCombobox (its own keyboard
//      contract is pinned in useCombobox.test.jsx). logger carries a
//      byte-identical inline copy; these tests pin the PAGE side of the wiring
//      so the same assertions stay green before and after logger consumes the
//      hook. The one logger-specific piece — its FREE-TEXT "create a brand-new
//      exercise" selection contract (Enter on the no-match row adds a custom
//      exercise instead of filling the input) — is pinned explicitly below,
//      since that is exactly what differs from customDay's program-restricted
//      contract.
//
//   2. The custom-exercise helpers — getAllExerciseNames / isValidExercise /
//      addToCustomExercises. logger inlines byte-identical copies; Batch 14
//      swaps them for utils/customExercises.js. These tests pin the observable
//      effects (the "not in the exercise library" hint, the add affordance, and
//      that adding writes the customExercises localStorage key) so the swap is
//      provably behavior-preserving.
//
// Timers are FAKE and interactions use fireEvent: every handler here is a
// synchronous onChange/onKeyDown/onMouseDown plus the 150ms blur-close delay,
// so fireEvent + fake timers is deterministic and avoids the userEvent +
// fake-timer interplay hazard (see RestTimer.test.jsx).
//
// No userId / user is seeded in localStorage, so neither UserProvider nor
// WorkoutProvider fires a mount fetch (UserContext gates on user?._id;
// WorkoutContext gates on userId) — the combobox surface needs no network, and
// addToCustomExercises with no userId writes localStorage only (no POST). MSW's
// onUnhandledRequest:'error' therefore stays quiet.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider } from '../context/UserContext';
import { WorkoutProvider } from '../context/WorkoutContext';
import Logger from './logger.jsx';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  localStorage.clear();
});

// Render the logger inside the real provider tree it depends on. No localStorage
// seeds → no mount fetch (see file header).
function renderLogger() {
  return render(
    <MemoryRouter>
      <UserProvider>
        <WorkoutProvider>
          <Logger />
        </WorkoutProvider>
      </UserProvider>
    </MemoryRouter>,
  );
}

// Add one exercise card and return its exercise-name search box (the combobox).
function addCardAndGetInput() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Exercise' }));
  return screen.getByRole('combobox', { name: 'Exercise name' });
}

describe('logger — combobox page wiring', () => {
  it('typing shows the suggestion listbox', () => {
    renderLogger();
    const input = addCardAndGetInput();

    fireEvent.change(input, { target: { value: 'Bench' } });

    const listbox = screen.getByRole('listbox', { name: 'Exercise suggestions' });
    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('ArrowDown + Enter fills the input with the highlighted match', () => {
    renderLogger();
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
    renderLogger();
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

  it('closes the suggestion list 150ms after the input loses focus', () => {
    renderLogger();
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

describe('logger — free-text "create new exercise" contract', () => {
  it('shows the no-match "add to custom exercises" row in the listbox', () => {
    renderLogger();
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Zzqqwx' } });

    const listbox = screen.getByRole('listbox', { name: 'Exercise suggestions' });
    expect(within(listbox).getByText(/Add "Zzqqwx" to Custom Exercises/)).toBeInTheDocument();
  });

  it('Enter on the no-match row adds a custom exercise WITHOUT overwriting the typed name', () => {
    renderLogger();
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Zzqqwx' } });

    fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight the lone "add" row
    fireEvent.keyDown(input, { key: 'Enter' });

    // Free-text contract: the typed text is preserved (the input is NOT replaced
    // by a catalog name, unlike customDay), the new name is persisted to the
    // customExercises store, and the list closes.
    expect(input).toHaveValue('Zzqqwx');
    expect(JSON.parse(localStorage.getItem('customExercises'))).toContain('Zzqqwx');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('logger — custom-exercise validation hint', () => {
  it('flags an unknown name and the inline button adds it to custom exercises', () => {
    renderLogger();
    const input = addCardAndGetInput();
    fireEvent.change(input, { target: { value: 'Madeuplift' } });

    // Close the dropdown so the inline "not in library" status row shows
    // (it renders only when the dropdown for this card is closed).
    fireEvent.blur(input);
    act(() => vi.advanceTimersByTime(150));

    expect(screen.getByText(/"Madeuplift" is not in the exercise library/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Add to Custom Exercises' }));

    expect(JSON.parse(localStorage.getItem('customExercises'))).toContain('Madeuplift');
  });
});
