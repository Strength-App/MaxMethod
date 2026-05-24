// Characterization tests for src/components/tools/Tools.jsx.
//
// Tools is D-classified and the composition ROOT: it owns isOpen + activeTool,
// renders ToolsFAB (only while closed) and ToolsPanel, and consumes useTimer for
// timer-aware open routing. Per Rule #21 this is the integration point — each
// piece is pinned in its own file (ToolsFAB display/dispatch, ToolsPanel
// routing/focus/a11y, the timer state machine in ToolsContext). This file pins
// ONLY the wiring between them and the live-indicator behavior under a real
// ToolsProvider:
//   - tapping the idle FAB opens the panel to the menu (FAB→Panel wiring);
//   - a menu selection flows up to activeTool and into the matching detail;
//   - onClose flips isOpen and restores the FAB;
//   - the FAB reflects a running timer (live indicator);
//   - tapping the FAB while finished resets the timer (finish-dismiss, F-UX2a).
// It does NOT re-pin menu rendering, per-status FAB display, focus management, or
// any tool's behavior — those live in the other test files.
//
// Pattern: shouldAdvanceTime + userEvent — the timer is driven via a captured
// API, clicks/Esc need realistic events, and the FAB display assertions are
// minute-level (drift-tolerant).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsProvider, useTimer } from '../../context/ToolsContext.jsx';
import Tools from './Tools.jsx';

// Capture the live timer API so tests can drive the context (start/advance) into
// each status. Assigned via useEffect (not in render) per the suite's react-hooks
// discipline.
let timer;
function CaptureTimer() {
  const api = useTimer();
  useEffect(() => { timer = api; });
  return null;
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => { vi.useRealTimers(); timer = undefined; });

function setup() {
  const user = userEvent.setup();
  render(
    <ToolsProvider>
      <CaptureTimer />
      <Tools />
    </ToolsProvider>,
  );
  return user;
}

describe('Tools — FAB ↔ Panel open/close wiring', () => {
  it('opens the panel to the tools menu when the idle FAB is tapped, hiding the FAB', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Open Tools' }));
    expect(screen.getByRole('dialog', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1RM Calculator/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Tools' })).not.toBeInTheDocument();
  });

  it('closes the panel and restores the FAB', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Open Tools' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Tools' })).toBeInTheDocument();
  });

  it('routes a menu selection up to activeTool and into the matching detail', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Open Tools' }));
    await user.click(screen.getByRole('button', { name: /RPE Calculator/ }));
    expect(screen.getByRole('dialog', { name: 'RPE Calculator' })).toBeInTheDocument();
  });
});

describe('Tools — live timer indicator + timer-aware open routing', () => {
  it('shows the running countdown on the FAB and opens the Timer view when tapped', async () => {
    const user = setup();
    act(() => timer.start(60_000));
    expect(screen.getByText('01:00')).toBeInTheDocument(); // FAB indicator reflects the running timer
    await user.click(screen.getByRole('button', { name: /Timer running/ }));
    expect(screen.getByRole('dialog', { name: 'Rest Timer' })).toBeInTheDocument();
  });

  it('resets the finished timer and opens the Timer view when the finished FAB is tapped (F-UX2a)', async () => {
    const user = setup();
    act(() => timer.start(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('Done!')).toBeInTheDocument(); // FAB finished indicator
    await user.click(screen.getByRole('button', { name: /Timer finished/ }));
    expect(screen.getByRole('dialog', { name: 'Rest Timer' })).toBeInTheDocument();
    // reset() ran → the timer is back to idle, observable via Timer's idle prompt.
    expect(screen.getByText('Set Duration')).toBeInTheDocument();
  });
});
