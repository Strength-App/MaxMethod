// Characterization tests for src/components/tools/Stopwatch.jsx.
//
// Stopwatch is D-classified and FULLY SELF-CONTAINED: it owns its state machine
// (idle/running/paused), its own count-up tick interval, and its display — it
// does NOT consume ToolsContext and has no audio. So unlike Timer (a wiring-only
// consumer whose state machine is pinned at the context layer), Stopwatch's
// invariant lives at the component layer, and this file is the right and only
// place to pin it. There is no Rule #21 split here.
//
// Stopwatch shares the timestamp-model DISCIPLINE with ToolsContext (elapsed =
// Date.now() - startedAt, re-read on each tick rather than incrementing a
// counter — its own source comment notes this), but the two state machines are
// meaningfully different (count-up vs count-down, no finished/beep, no
// resume/adjust events, MAX_MS clamp vs finish-at-0). That's a shared good
// practice, not duplicated code — no consolidation finding.
//
// Test-infra note: the display is centisecond-precision on a 100ms tick, so
// these tests use FROZEN fake timers (no shouldAdvanceTime) for exact
// determinism — elapsed advances only by explicit vi.advanceTimersByTime, and
// advancing to a 100ms tick boundary yields a deterministic display. Interactions
// use fireEvent because userEvent's awaits hang against a frozen clock (Timer's
// test uses the shouldAdvanceTime + userEvent alternative, which fits there
// because it doesn't assert exact sub-second values). No keyboard contract is
// under test, so fireEvent.click is sufficient.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Stopwatch from './Stopwatch.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const start = () => fireEvent.click(screen.getByRole('button', { name: 'Start' }));
const pause = () => fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
const reset = () => fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

describe('Stopwatch — initial / idle state', () => {
  it('starts Ready at 00:00.00 with Start available and Reset disabled', () => {
    render(<Stopwatch />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('00:00.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});

describe('Stopwatch — state machine (transitions through the button surface)', () => {
  it('Start transitions idle → running and the tick advances elapsed', () => {
    render(<Stopwatch />);
    start();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
    advance(3000);
    expect(screen.getByText('00:03.00')).toBeInTheDocument();
  });

  it('Pause freezes elapsed and stops the tick (running → paused)', () => {
    render(<Stopwatch />);
    start();
    advance(3000);
    pause();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument(); // resume affordance
    advance(5000); // no tick while paused
    expect(screen.getByText('00:03.00')).toBeInTheDocument();
  });

  it('resuming (Start from paused) continues from the frozen elapsed', () => {
    render(<Stopwatch />);
    start();
    advance(3000);
    pause();
    advance(5000); // frozen at 3.00
    start(); // resume
    expect(screen.getByText('Running')).toBeInTheDocument();
    advance(2000);
    expect(screen.getByText('00:05.00')).toBeInTheDocument(); // 3.00 frozen + 2.00 new
  });

  it('Reset returns to idle and clears elapsed', () => {
    render(<Stopwatch />);
    start();
    advance(3000);
    reset();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('00:00.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});

describe('Stopwatch — display formatting (MM:SS.CS, floored)', () => {
  // Advance to a 100ms tick boundary so elapsed is exact; expected strings are
  // hand-computed from Stopwatch.jsx's formatTime (a module-local fn, not
  // exported — Rule #2: no export added to ease testing).
  const CASES = [
    { ms: 3700,  display: '00:03.70', why: 'seconds + centiseconds' },
    { ms: 65500, display: '01:05.50', why: 'minutes + seconds + centiseconds' },
  ];

  it.each(CASES)('renders $display ($why)', ({ ms, display }) => {
    render(<Stopwatch />);
    start();
    advance(ms);
    expect(screen.getByText(display)).toBeInTheDocument();
  });
});

describe('Stopwatch — accessible announcements (aria-live)', () => {
  it('announces start, pause (with elapsed), and reset', () => {
    render(<Stopwatch />);
    start();
    expect(screen.getByText('Stopwatch started')).toBeInTheDocument();
    advance(3000);
    pause();
    expect(screen.getByText('Stopwatch paused at 3 seconds')).toBeInTheDocument();
    reset();
    expect(screen.getByText('Stopwatch reset')).toBeInTheDocument();
  });

  it('announces resume (not start) when starting from a paused elapsed', () => {
    render(<Stopwatch />);
    start();
    advance(3000);
    pause();
    start(); // resume — elapsedBeforePause > 0
    expect(screen.getByText('Stopwatch resumed')).toBeInTheDocument();
  });
});

describe('Stopwatch — timestamp-model drift resistance', () => {
  // Same mechanism the ToolsContext drift test pins: elapsed is recomputed from
  // Date.now() - startedAt, not accumulated per tick. Jump the wall clock with
  // NO ticks fired, then pause() (which reads the wall-clock delta synchronously)
  // — a naive per-tick accumulator, having fired zero ticks, would read 0.
  it('reports true wall-clock elapsed after a clock jump with no ticks fired', () => {
    render(<Stopwatch />);
    start();
    vi.setSystemTime(Date.now() + 30_000); // 30s jump, no ticks (synchronous; no act needed)
    pause(); // reads Date.now() - startedAt synchronously; fireEvent wraps the update in act
    expect(screen.getByText('00:30.00')).toBeInTheDocument();
  });
});
