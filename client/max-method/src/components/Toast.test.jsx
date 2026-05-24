// Characterization tests for src/components/Toast.jsx.
//
// Toast is D-classified: a generic, fully PROP-CONTROLLED notification surface
// (open / onDismiss / autoDismissMs / role / children). There is no ToastContext
// — unlike every prior interactive-component test in this codebase (ToolsPanel
// et al. wrap a provider), this file deliberately wraps NOTHING. The absence is
// intentional, not an omission.
//
// Timer pattern: (c) — frozen `vi.useFakeTimers()` + `fireEvent` (the
// Stopwatch.test.jsx pattern). Chosen over (b) `shouldAdvanceTime: true` +
// userEvent because the load-bearing assertions are the PAUSE/RESUME WINDOW:
// the countdown must NOT fire while the pointer/focus is inside, then resume on
// leave. That requires the clock to move ONLY on explicit `advanceTimersByTime`
// calls, so the pause window has unambiguous boundaries — `shouldAdvanceTime`
// would let the clock drift during interaction and blur exactly the edge under
// test. The pause/resume triggers are plain DOM events (mouseenter/mouseleave/
// focusin/focusout) plus a button click, all of which `fireEvent` dispatches
// synchronously with no clock dependency.
//
// Unmount cleanup is observed DIRECTLY on a spy, NOT source-verified. Toast's
// timer callback fires `onDismiss?.()` — a PROP callback, not an internal
// setState — so React 19's silent setState-on-unmounted swallow (the hazard that
// forced Stopwatch.test.jsx into a documented source-verification) is simply not
// operative here. The unmount test advances past the deadline and asserts the
// spy was never called: a real behavioral observable. This is why Toast gets the
// cleaner shape; it is not an oversight relative to Stopwatch.
//
// Environment shims (setup.js: matchMedia / AudioContext / offsetParent) are
// globally installed but NONE is load-bearing here — Toast has no media-query
// gating, no audio, and no focus trap. They are transparent to this file.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast from './Toast.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// Default render helper. `open` defaults true; a fresh spy is returned so the
// effect's [onClose] dep stays stable across a test's re-renders.
function setup(props = {}) {
  const onDismiss = props.onDismiss ?? vi.fn();
  const utils = render(
    <Toast open onDismiss={onDismiss} {...props}>
      {props.children ?? 'PR updated'}
    </Toast>,
  );
  return { onDismiss, ...utils };
}

describe('Toast — render / role / live-region', () => {
  it('renders nothing when closed', () => {
    render(<Toast open={false} onDismiss={vi.fn()}>hidden</Toast>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('defaults to role="status" + aria-live="polite" and renders its children', () => {
    setup();
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('PR updated')).toBeInTheDocument();
  });

  it('renders role="alert" + aria-live="assertive" for urgent notices', () => {
    setup({ role: 'alert' });
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('Toast — auto-dismiss timing', () => {
  it('fires onDismiss at exactly the default 12000ms, not before', () => {
    const { onDismiss } = setup();
    act(() => vi.advanceTimersByTime(11999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('honors a custom autoDismissMs', () => {
    const { onDismiss } = setup({ autoDismissMs: 5000 });
    act(() => vi.advanceTimersByTime(4999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables auto-dismiss entirely when autoDismissMs <= 0', () => {
    const { onDismiss } = setup({ autoDismissMs: 0 });
    act(() => vi.advanceTimersByTime(60000));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('Toast — pause / resume (the deciding case for pattern (c))', () => {
  it('pauses the countdown on hover and restarts the full duration on leave', () => {
    const { onDismiss } = setup();
    const toast = screen.getByRole('status');

    act(() => vi.advanceTimersByTime(6000));  // halfway
    fireEvent.mouseEnter(toast);              // pause: timer cleared
    act(() => vi.advanceTimersByTime(20000)); // well past the original 12000 deadline
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast);              // resume: a FRESH full-duration timer
    act(() => vi.advanceTimersByTime(11999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses on focus-in and resumes on focus-out', () => {
    const { onDismiss } = setup();
    const toast = screen.getByRole('status');

    act(() => vi.advanceTimersByTime(6000));
    fireEvent.focusIn(toast);
    act(() => vi.advanceTimersByTime(20000));
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.focusOut(toast);
    act(() => vi.advanceTimersByTime(12000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('Toast — manual dismiss', () => {
  it('dismisses immediately on the × button and cancels the pending timer', () => {
    const { onDismiss } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // The click cleared the auto-dismiss timer — no second fire.
    act(() => vi.advanceTimersByTime(20000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('Toast — cleanup (direct spy observation, not source-verified)', () => {
  it('cancels the pending timer on unmount (onDismiss never fires)', () => {
    const { onDismiss, unmount } = setup();
    act(() => vi.advanceTimersByTime(6000));
    unmount();
    act(() => vi.advanceTimersByTime(20000));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('clears the pending timer when toggled closed (open: true → false)', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Toast open onDismiss={onDismiss}>PR updated</Toast>);
    act(() => vi.advanceTimersByTime(6000));
    rerender(<Toast open={false} onDismiss={onDismiss}>PR updated</Toast>);
    act(() => vi.advanceTimersByTime(20000));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
