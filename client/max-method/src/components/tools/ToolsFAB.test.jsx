// Characterization tests for src/components/tools/ToolsFAB.jsx.
//
// ToolsFAB is D-classified and a WIRING-ONLY consumer of ToolsContext (reads
// status + remainingMs via useTimer). Per Rule #21 the timer state machine is
// pinned at the context layer (ToolsContext.test.jsx); this file does NOT re-pin
// countdown/finish/beep. It pins ToolsFAB-LOCAL behavior: the status-derived
// display (launcher icon when idle; running/paused countdown; "Done!" when
// finished), the descriptive aria-label per status, and the open dispatch.
//
// The open-panel mechanism is a callback PROP (`onClick`), not a context action,
// so the dispatch test asserts the mock prop fires. Status is driven through the
// real ToolsProvider (integration posture) via a captured timer API. ToolsFAB
// does NOT use useModalA11y — it's a plain button; the tools panel and its focus
// management live elsewhere (ToolsPanel/Tools), so there is no focus-trap or axe
// surface to pin at this layer.
//
// Frozen fake timers + fireEvent (the Stopwatch pattern): deterministic, and the
// FAB click is a simple dispatch. The urgent state (remaining ≤ 10s) is a
// className-only change with no a11y/behavior difference, so it is intentionally
// not pinned here (visual-only — Rule #19).
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToolsProvider, useTimer } from '../../context/ToolsContext.jsx';
import ToolsFAB from './ToolsFAB.jsx';

// Capture the live timer API so tests can drive the context into each status.
// Assigned via useEffect (not in the render body) per the suite's react-hooks
// discipline (cf. usePostWorkoutModal.test.jsx's setUser exposer).
let timer;
function CaptureTimer() {
  const api = useTimer();
  useEffect(() => { timer = api; });
  return null;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); timer = undefined; });

function setup(onClick = vi.fn()) {
  render(
    <ToolsProvider>
      <CaptureTimer />
      <ToolsFAB onClick={onClick} />
    </ToolsProvider>,
  );
  return { onClick };
}

describe('ToolsFAB — idle', () => {
  it('renders the Tools launcher ("Open Tools") with no countdown', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Open Tools' })).toBeInTheDocument();
    expect(screen.queryByText('Done!')).not.toBeInTheDocument();
  });
});

describe('ToolsFAB — reflects the live timer (wiring, not the state machine)', () => {
  it('shows the running countdown and a descriptive label', () => {
    setup();
    act(() => timer.start(120_000));
    expect(screen.getByText('02:00')).toBeInTheDocument(); // formatTime(120000) → ceil MM:SS
    expect(
      screen.getByRole('button', { name: 'Timer running, 02:00 remaining, tap to view' }),
    ).toBeInTheDocument();
  });

  it('tracks the remaining value as the timer ticks down', () => {
    setup();
    act(() => timer.start(125_000));
    expect(screen.getByText('02:05')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('01:05')).toBeInTheDocument(); // remaining 65000 → ceil → 01:05
  });

  it('shows the paused label with the frozen remaining', () => {
    setup();
    act(() => timer.start(120_000));
    act(() => timer.pause());
    expect(
      screen.getByRole('button', { name: 'Timer paused, 02:00 remaining, tap to view' }),
    ).toBeInTheDocument();
  });

  it('shows "Done!" and the finished label when the timer completes', () => {
    setup();
    act(() => timer.start(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('Done!')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Timer finished, tap to dismiss and open Tools' }),
    ).toBeInTheDocument();
  });
});

describe('ToolsFAB — open dispatch', () => {
  it('calls the onClick prop when tapped', () => {
    const { onClick } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open Tools' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
