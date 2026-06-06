// Characterization tests for src/components/workout/RestTimer.jsx.
//
// RestTimer is the per-exercise rest countdown extracted verbatim from day.jsx
// and logger.jsx in Batch 10 (docs/comparisons/rest-timer.md). These tests pin
// the behavior the inline copies always had, as permanent armor now that the
// component is shared by both pages:
//   - the M:SS display derived from `initialSeconds`
//   - the once-per-second countdown (floored at 0)
//   - auto-skip: `onSkip` fires exactly once when the display reaches 0:00
//   - the manual Skip button fires `onSkip`
//   - pause halts the countdown and flips the control's label / aria-pressed;
//     resume restarts it
//   - +30s / -30s adjust the remaining time, floored at 0
//   - the ARIA contract: role="timer", a spoken aria-label, aria-live="off"
//
// Timers are faked so the 1s interval never advances on its own; the countdown
// is driven explicitly with act + advanceTimersByTime. Button presses are plain
// synchronous onClick handlers, so fireEvent drives them deterministically
// (no userEvent + fake-timer interplay — see CLAUDE.md → Test-design hazards).
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RestTimer from './RestTimer.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// Advance the faked clock by whole seconds inside act(), so the interval's
// setState and the resulting re-render are flushed the way React expects.
function tick(seconds) {
  act(() => vi.advanceTimersByTime(seconds * 1000));
}

describe('RestTimer — initial render', () => {
  it('shows the starting time as M:SS', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('zero-pads the seconds', () => {
    render(<RestTimer initialSeconds={125} onSkip={() => {}} />);
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('exposes the timer role with a spoken aria-label and an off live region', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('aria-label', 'Rest timer: 1 minutes 30 seconds remaining');
    // The visible countdown is intentionally not announced every second.
    expect(screen.getByText('1:30')).toHaveAttribute('aria-live', 'off');
  });
});

describe('RestTimer — countdown', () => {
  it('counts down one second per tick', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    tick(1);
    expect(screen.getByText('1:29')).toBeInTheDocument();
    tick(5);
    expect(screen.getByText('1:24')).toBeInTheDocument();
  });

  it('updates the aria-label as time passes', () => {
    render(<RestTimer initialSeconds={62} onSkip={() => {}} />);
    tick(2);
    expect(screen.getByRole('timer')).toHaveAttribute(
      'aria-label',
      'Rest timer: 1 minutes 0 seconds remaining',
    );
  });
});

describe('RestTimer — reaching zero', () => {
  it('floors at 0:00 and calls onSkip exactly once', () => {
    const onSkip = vi.fn();
    render(<RestTimer initialSeconds={2} onSkip={onSkip} />);

    tick(1);
    expect(screen.getByText('0:01')).toBeInTheDocument();
    expect(onSkip).not.toHaveBeenCalled();

    tick(1);
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(onSkip).toHaveBeenCalledTimes(1);

    // Stays at zero and does not fire again as the interval keeps ticking.
    tick(5);
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('RestTimer — manual skip', () => {
  it('fires onSkip when the Skip button is pressed', () => {
    const onSkip = vi.fn();
    render(<RestTimer initialSeconds={90} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('RestTimer — pause and resume', () => {
  it('halts the countdown while paused and reflects state on the button', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    const pause = screen.getByRole('button', { name: 'Pause timer' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(pause);

    const resume = screen.getByRole('button', { name: 'Resume timer' });
    expect(resume).toHaveTextContent('Resume');
    expect(resume).toHaveAttribute('aria-pressed', 'true');

    // Time does not move while paused.
    tick(5);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('restarts the countdown when resumed', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
    tick(5);
    expect(screen.getByText('1:30')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }));
    tick(3);
    expect(screen.getByText('1:27')).toBeInTheDocument();
  });
});

describe('RestTimer — adjusting time', () => {
  it('adds 30 seconds', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add 30 seconds' }));
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('subtracts 30 seconds', () => {
    render(<RestTimer initialSeconds={90} onSkip={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Subtract 30 seconds' }));
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('never goes below zero when subtracting', () => {
    const onSkip = vi.fn();
    render(<RestTimer initialSeconds={20} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Subtract 30 seconds' }));
    expect(screen.getByText('0:00')).toBeInTheDocument();
    // Reaching zero by subtraction also triggers the auto-skip.
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
