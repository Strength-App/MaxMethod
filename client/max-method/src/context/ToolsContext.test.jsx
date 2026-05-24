// Characterization tests for src/context/ToolsContext.jsx — the countdown timer
// state machine (status idle→running→paused→finished, start/pause/resume/reset/
// adjust, the timestamp-model re-sync, finish beep).
//
// Batch 5 gap: ToolsContext was D-classified in the plan's Batch 5 ("Context
// providers") but never characterized — PR #84 silently narrowed Batch 5 to the
// WorkoutContext Risk #8 fix + sibling audit. Pinned here in Batch 6 because the
// tool components consume this machine: Timer and ToolsFAB are thin readers of
// it, so per Rule #21 the invariant is pinned at the layer it lives (the
// provider) and those components then test wiring only. Stopwatch is
// self-contained and is pinned separately at its own layer. The broader
// context-D gap (UserContext + the rest of WorkoutContext) is tracked at
// docs/follow-ups.md#context-d-characterization-gap.
//
// Mechanics: drive the public useTools()/useTimer() surface with renderHook +
// vi.useFakeTimers() (the tick interval reads endsAt - Date.now(), so fake
// timers control both the clock and setInterval). The AudioContext mock from
// src/test/setup.js was aligned with playBeep's surface earlier in this batch
// (the AudioContext-mock-alignment commit). We spy on createOscillator (to
// count beeps) and add a close spy (to lock the no-close-on-unmount behavior —
// see the unmount test).
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToolsProvider, useTools, useTimer } from './ToolsContext.jsx';

function wrapper({ children }) {
  return <ToolsProvider>{children}</ToolsProvider>;
}

beforeEach(() => {
  vi.useFakeTimers();
  // createOscillator exists on the mock and is spied call-through (playBeep
  // needs the real oscillator node). close does NOT exist on the mock — the
  // provider never calls it — so we add a spy to assert it stays uncalled.
  vi.spyOn(window.AudioContext.prototype, 'createOscillator');
  window.AudioContext.prototype.close = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.AudioContext.prototype.close;
});

describe('ToolsContext timer — provider contract', () => {
  it('exposes idle status, zero remaining, and zero duration before any start', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.durationMs).toBe(0);
  });

  it('throws when useTools is called outside a ToolsProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTools())).toThrow(
      'useTools must be used inside <ToolsProvider>',
    );
    spy.mockRestore();
  });
});

describe('ToolsContext timer — start', () => {
  it('transitions idle → running and seeds remaining and duration from the requested ms', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    expect(result.current.status).toBe('running');
    expect(result.current.remainingMs).toBe(60_000);
    expect(result.current.durationMs).toBe(60_000);
  });

  it('ignores a non-finite or non-positive duration and stays idle', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(0));
    expect(result.current.status).toBe('idle');
    act(() => result.current.start(-1000));
    expect(result.current.status).toBe('idle');
    act(() => result.current.start(NaN));
    expect(result.current.status).toBe('idle');
    act(() => result.current.start(Infinity));
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);
  });
});

describe('ToolsContext timer — countdown and finish', () => {
  it('decrements remaining as the tick interval advances', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remainingMs).toBe(59_000);
  });

  it('transitions running → finished and zeroes remaining when the duration elapses', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.status).toBe('finished');
    expect(result.current.remainingMs).toBe(0);
  });

  it('plays the finish beep exactly once when the timer reaches zero', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(1000));
    // Advance EXACTLY to the finish boundary, in its own act(). Only the tick at
    // 1000ms sees remaining <= 0, so it beeps once; the act() flush then lets
    // React run the effect cleanup that clears the interval. (Advancing past the
    // boundary in a single step would fire every subsequent tick synchronously
    // before React could clear the interval — a fake-timer artifact, not real
    // behavior, since in real time the interval is cleared between 250ms ticks.)
    // Principle: characterize the production contract ("one beep"), not the
    // test-environment artifact — the same discipline as #jsdom-environment-mocks'
    // "don't characterize the jsdom degradation."
    act(() => vi.advanceTimersByTime(1000));
    expect(window.AudioContext.prototype.createOscillator).toHaveBeenCalledTimes(1);
    // With the interval now cleared, further time produces no additional beeps.
    act(() => vi.advanceTimersByTime(3000));
    expect(window.AudioContext.prototype.createOscillator).toHaveBeenCalledTimes(1);
  });

  // The timer recomputes remaining from (endsAt - Date.now()) rather than
  // decrementing a counter per tick. This characterizes that wall-clock-truth
  // property: jump the clock forward WITHOUT firing the ~120 intervening ticks
  // (what a backgrounded/throttled tab looks like — the interval coalesces or is
  // skipped) and the next read still reports true elapsed time. A naive per-tick
  // decrement, with no ticks fired, would still read the full 60s. pause() reads
  // (endsAt - Date.now()) synchronously, the same source-of-truth the tick
  // callback uses, so it pins the mechanism without depending on the subtle
  // setSystemTime + advanceTimersByTime overdue-interval interaction. This
  // wall-clock-truth property is what the cross-page-staleness audit's "no
  // per-page snapshot to go stale" verdict (follow-ups.md) implicitly relies on.
  it('recomputes remaining from endsAt - Date.now() so a coalesced/skipped tick still reports true wall-clock remaining', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => {
      vi.setSystemTime(Date.now() + 30_000); // 30s wall-clock jump, no ticks fired
      result.current.pause();
    });
    expect(result.current.remainingMs).toBe(30_000);
  });
});

describe('ToolsContext timer — pause and resume', () => {
  it('freezes remaining and transitions running → paused', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.pause());
    expect(result.current.status).toBe('paused');
    expect(result.current.remainingMs).toBe(59_000);
  });

  it('does not advance remaining while paused', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.remainingMs).toBe(59_000);
  });

  it('resumes from the frozen remaining and transitions paused → running', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000)); // remaining 59_000
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(5000)); // frozen at 59_000
    act(() => result.current.resume());
    expect(result.current.status).toBe('running');
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remainingMs).toBe(58_000);
  });

  it('ignores pause unless running and resume unless paused', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    // idle: both are no-ops
    act(() => result.current.pause());
    expect(result.current.status).toBe('idle');
    act(() => result.current.resume());
    expect(result.current.status).toBe('idle');
    // running: resume is a no-op (only pause applies)
    act(() => result.current.start(60_000));
    act(() => result.current.resume());
    expect(result.current.status).toBe('running');
  });
});

describe('ToolsContext timer — adjust', () => {
  it('adds time to a running timer', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000)); // remaining 59_000
    act(() => result.current.adjust(30_000));
    expect(result.current.remainingMs).toBe(89_000);
  });

  it('subtracts time from a running timer and clamps the display at zero', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000)); // remaining 59_000
    act(() => result.current.adjust(-70_000));
    expect(result.current.remainingMs).toBe(0);
    // Still running — finish detection happens on the next tick, not in adjust().
    expect(result.current.status).toBe('running');
  });

  it("adjusts a paused timer's frozen remaining", () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000)); // remaining 59_000
    act(() => result.current.pause());
    act(() => result.current.adjust(30_000));
    expect(result.current.status).toBe('paused');
    expect(result.current.remainingMs).toBe(89_000);
  });

  it('is a no-op when idle or finished, and ignores a zero or non-finite delta', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    // idle
    act(() => result.current.adjust(30_000));
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);
    // running with a zero / non-finite delta
    act(() => result.current.start(60_000));
    act(() => result.current.adjust(0));
    expect(result.current.remainingMs).toBe(60_000);
    act(() => result.current.adjust(NaN));
    expect(result.current.remainingMs).toBe(60_000);
    // finished
    act(() => result.current.start(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.status).toBe('finished');
    act(() => result.current.adjust(30_000));
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.status).toBe('finished');
  });
});

describe('ToolsContext timer — reset', () => {
  it('returns to idle and clears remaining and duration from running, paused, or finished', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });

    // from running
    act(() => result.current.start(60_000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.durationMs).toBe(0);

    // from paused
    act(() => result.current.start(60_000));
    act(() => result.current.pause());
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);

    // from finished
    act(() => result.current.start(1000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.durationMs).toBe(0);
  });
});

describe('ToolsContext timer — interval lifecycle', () => {
  it('clears the tick interval when the timer leaves the running state (no ghost ticks)', () => {
    const { result } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(60_000));
    act(() => result.current.reset());
    // If the interval survived reset, these advances would mutate state.
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingMs).toBe(0);
  });

  it('clears the tick interval on provider unmount and does not close the AudioContext', () => {
    const { result, unmount } = renderHook(() => useTimer(), { wrapper });
    act(() => result.current.start(1000));
    unmount();
    // Advance past when the timer would have finished. If the interval were not
    // cleared on unmount, it would fire, hit zero, and call playBeep() →
    // createOscillator (plus setState on an unmounted provider).
    act(() => vi.advanceTimersByTime(3000));
    expect(window.AudioContext.prototype.createOscillator).not.toHaveBeenCalled();
    // Locks current behavior: the provider does NOT .close() the AudioContext on
    // unmount. This is an absence-assertion change-detector, not a correctness
    // claim — not-closing is benign in current usage (root provider, unmounts
    // only on reload/tab-close). See docs/follow-ups.md#toolscontext-audiocontext
    // -close; when that deferral is resolved, this assertion fails and forces a
    // conscious update.
    expect(window.AudioContext.prototype.close).not.toHaveBeenCalled();
  });
});
