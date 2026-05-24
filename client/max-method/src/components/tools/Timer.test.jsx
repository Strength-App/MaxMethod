// Characterization tests for src/components/tools/Timer.jsx.
//
// Timer is D-classified and is a WIRING-ONLY consumer of ToolsContext's timer
// state machine. Per Rule #21 that state machine is pinned at the context layer
// (src/context/ToolsContext.test.jsx — countdown/finish/beep/pause/resume/adjust/
// reset/drift/interval-cleanup). This file does NOT re-pin any of that. It pins:
//   - Timer-LOCAL logic: duration entry + clamping (minutes [0,30], seconds
//     [0,59]), presets, ceil-display formatting, status→button-mode derivation
//     (case (a): Timer reads status and derives the UI locally), hold-to-repeat
//     steppers.
//   - DISPATCH WIRING: that the right user action calls the right context
//     method, observed through the resulting UI (Start→running, Pause→paused,
//     Resume→running, ±30s→adjusted display, Dismiss→idle).
//
// Rendered with the real ToolsProvider (integration posture, docs/decisions.md
// #rtl-posture). Fake timers throughout so the context's tick interval never
// auto-advances; userEvent gets advanceTimers so its internal delays don't hang.
//
// Module-local consts (PRESETS, MAX_MINUTES, the 400/80ms hold timings) are not
// exported; per Rule #2 no export was added to ease testing — behaviors are
// asserted through observable output.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsProvider } from '../../context/ToolsContext.jsx';
import Timer from './Timer.jsx';

// shouldAdvanceTime lets the fake clock track real time, so userEvent's internal
// awaits resolve (a plain vi.useFakeTimers() hangs userEvent). Explicit
// vi.advanceTimersByTime jumps still work on top, for the countdown/hold timers.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

function setup() {
  const user = userEvent.setup();
  render(
    <ToolsProvider>
      <Timer />
    </ToolsProvider>,
  );
  return user;
}

describe('Timer — initial / idle state', () => {
  it('starts at 00:00 with the "Set Duration" prompt and Start disabled', () => {
    setup();
    expect(screen.getByText('Set Duration')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    // Presets and steppers are visible while idle.
    expect(screen.getByRole('button', { name: '05:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase minutes' })).toBeInTheDocument();
  });
});

describe('Timer — duration entry and clamping (Timer-local)', () => {
  it('builds the entered duration from the minute/second steppers', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Increase minutes' })); // 1 min
    await user.click(screen.getByRole('button', { name: 'Increase seconds' })); // 1 sec
    await user.click(screen.getByRole('button', { name: 'Increase seconds' })); // 2 sec
    expect(screen.getByText('01:02')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('clamps minutes to [0, 30]', async () => {
    const user = setup();
    expect(screen.getByRole('button', { name: 'Decrease minutes' })).toBeDisabled(); // at 0
    for (let i = 0; i < 30; i++) {
      await user.click(screen.getByRole('button', { name: 'Increase minutes' }));
    }
    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase minutes' })).toBeDisabled(); // at 30
  });

  it('clamps seconds to [0, 59]', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Decrease seconds' })).toBeDisabled(); // at 0
    const incSeconds = screen.getByRole('button', { name: 'Increase seconds' });
    // Reach the upper bound via a single hold (deterministic + fast under fake
    // timers, vs. 59 slow awaited clicks): immediate +1, then +1 every 80ms after
    // the 400ms delay. Overshoot the count; setSeconds(Math.min(59, …)) clamps.
    fireEvent.pointerDown(incSeconds);
    act(() => vi.advanceTimersByTime(400 + 80 * 70));
    fireEvent.pointerUp(incSeconds);
    expect(screen.getByText('00:59')).toBeInTheDocument();
    expect(incSeconds).toBeDisabled(); // at 59
  });
});

describe('Timer — presets (Timer-local entry)', () => {
  it('applying a preset fills the entry and enables Start', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: '03:00' }));
    // Steppers reflect the preset; once running the display is unambiguous.
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    // After Start the presets are hidden, so "03:00" is now only the display.
    expect(screen.getByText('03:00')).toBeInTheDocument();
  });
});

describe('Timer — status → button-mode derivation and dispatch wiring', () => {
  // Drives the real context; assertions are on Timer's UI reaction, not the
  // state machine itself (that's pinned at the context layer).
  async function startTwoMinutes(user) {
    await user.click(screen.getByRole('button', { name: '02:00' })); // preset
    await user.click(screen.getByRole('button', { name: 'Start' }));
  }

  it('Start dispatches the entered duration and switches to running mode', async () => {
    const user = setup();
    await startTwoMinutes(user);
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('02:00')).toBeInTheDocument(); // start(120000) → remaining
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
  });

  it('Pause then Resume walks running → paused → running', async () => {
    const user = setup();
    await startTwoMinutes(user);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('reaching zero shows the finished state, and Dismiss returns to idle', async () => {
    const user = setup();
    // Enter 1 second and start.
    await user.click(screen.getByRole('button', { name: 'Increase seconds' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('Done!')).toBeInTheDocument();
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    await user.click(dismiss);
    expect(screen.getByText('Set Duration')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});

describe('Timer — ±30s adjust wiring', () => {
  it('adds 30 seconds to a running timer and announces it', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: '02:00' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Add 30 seconds' }));
    expect(screen.getByText('02:30')).toBeInTheDocument();
    expect(screen.getByText(/Added 30 seconds/)).toBeInTheDocument();
  });

  it('subtracts 30 seconds from a running timer and announces it', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: '02:00' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Subtract 30 seconds' }));
    expect(screen.getByText('01:30')).toBeInTheDocument();
    expect(screen.getByText(/Removed 30 seconds/)).toBeInTheDocument();
  });
});

describe('Timer — ceil-display formatting (Timer-local)', () => {
  it('rounds the displayed remaining time UP to the next second (never 0:00 while running)', async () => {
    const user = setup();
    // 2-second timer, then advance 1001ms → 999ms remaining.
    await user.click(screen.getByRole('button', { name: 'Increase seconds' }));
    await user.click(screen.getByRole('button', { name: 'Increase seconds' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await act(() => vi.advanceTimersByTime(1001));
    // remaining ≈ 999ms; ceil → "00:01" (a floor/round-down would show 00:00).
    expect(screen.getByText('00:01')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });
});

describe('Timer — hold-to-repeat steppers (Timer-local)', () => {
  it('single click increments by one', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Increase seconds' }));
    expect(screen.getByText('00:01')).toBeInTheDocument();
  });

  // Hold-to-repeat fires once immediately, then (after a 400ms delay) every 80ms.
  // Pinned as a contract under fake timers via pointer events — characterizing
  // the documented fire rate, not a synchronous overshoot. fireEvent is used for
  // the press/hold/release because userEvent doesn't model a sustained pointer
  // hold; the contract (delay + interval) is what matters, observed via the
  // resulting increment count.
  it('holding repeats: one immediate + (after 400ms) one every 80ms', async () => {
    setup();
    const incSeconds = screen.getByRole('button', { name: 'Increase seconds' });
    fireEvent.pointerDown(incSeconds);          // immediate +1  → 1
    act(() => vi.advanceTimersByTime(640));      // 400ms delay, then +1 at 480/560/640 → +3
    fireEvent.pointerUp(incSeconds);             // stop the repeat
    expect(screen.getByText('00:04')).toBeInTheDocument();
  });

  it('releasing the hold before the 400ms delay fires only the immediate increment', async () => {
    setup();
    const incSeconds = screen.getByRole('button', { name: 'Increase seconds' });
    fireEvent.pointerDown(incSeconds);          // immediate +1 → 1
    act(() => vi.advanceTimersByTime(200));       // before the 400ms repeat delay
    fireEvent.pointerUp(incSeconds);             // stop (clears the pending timeout)
    act(() => vi.advanceTimersByTime(1000));      // no further fires
    expect(screen.getByText('00:01')).toBeInTheDocument();
  });
});
