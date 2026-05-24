/**
 * Vitest global setup — runs once per worker before any test file.
 *
 * Three responsibilities:
 *   1. Register custom matchers globally: @testing-library/jest-dom
 *      (toBeInTheDocument, toHaveFocus, toHaveAttribute, ...) and vitest-axe
 *      (toHaveNoViolations).
 *   2. Mock browser APIs jsdom doesn't implement but the codebase uses.
 *      Scope is determined by the Batch 1 browser-API audit plus
 *      Batch 4's focus-management gap: matchMedia, AudioContext, and
 *      HTMLElement.prototype.offsetParent are mocked because each has
 *      a real consumer in the codebase. Five APIs the plan anticipated
 *      (IntersectionObserver, ResizeObserver, canvas .getContext,
 *      navigator.vibrate, window.scrollTo) are not used and are not
 *      mocked. requestAnimationFrame / cancelAnimationFrame are
 *      handled natively by jsdom@29 and need no mock either. See
 *      docs/decisions.md#jsdom-environment-mocks for the ADR governing
 *      this list and the discipline for future additions.
 *   3. Wire MSW server lifecycle (listen / resetHandlers / close).
 *
 * See docs/decisions.md#dom-environment for the jsdom choice rationale
 * and CLAUDE.md "Surprising things" for the audit findings.
 */

import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { vi, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './msw/server.js';

// Second global matcher registration alongside the jest-dom side-effect import
// above: vitest-axe's toHaveNoViolations. Lifted here in Batch 7 so every
// axe-using test (ToolsPanel, EquipmentSelect, PostWorkoutModal, future
// consumers) shares one idempotent registration instead of re-running
// expect.extend in each file. See the chore(setup) commit body for the rationale.
expect.extend(axeMatchers);

// =============================================================================
// window.matchMedia
// =============================================================================
//
// Single call site: src/components/UserLevelBadge.jsx:55 — reads
// .matches on '(prefers-reduced-motion: reduce)' to gate the level-up
// animation. Default mock returns matches=false (reduced-motion NOT
// preferred). Tests that need to assert reduced-motion behavior can
// override per-test:
//
//   beforeEach(() => {
//     window.matchMedia = vi.fn().mockImplementation((q) => ({
//       matches: q.includes('reduce'), media: q, ...
//     }));
//   });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    // Legacy listener API (deprecated but still present on real MediaQueryList)
    addListener: vi.fn(),
    removeListener: vi.fn(),
    // Modern listener API
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// =============================================================================
// window.AudioContext / window.webkitAudioContext
// =============================================================================
//
// Single call site: src/context/ToolsContext.jsx:71 — uses the prefixed-
// fallback pattern `const Ctor = window.AudioContext || window.webkitAudioContext`
// and lazy-constructs an AudioContext inside the timer's `start()` callback
// (user-gesture unlock point). Subsequent usage:
//
//   ctx.state                                              (property read)
//   ctx.currentTime                                        (property read — envelope base time)
//   ctx.resume()                                           (method)
//   ctx.createOscillator()                                 (factory)
//   ctx.createGain()                                       (factory)
//   osc.connect(gain).connect(ctx.destination)             (chained connect)
//   osc.frequency.value, osc.type, osc.start, osc.stop     (oscillator shape)
//   gain.gain.value, gain.gain.setValueAtTime,             (gain envelope shape)
//     gain.gain.linearRampToValueAtTime
//
// The mock covers exactly those surfaces — nothing speculative.
//
// --- Opt-out for tests that exercise the "no AudioContext" branch ---
//
// The production code's `if (Ctor)` guard means there IS a real "audio
// unavailable" code path. To test it, delete the globals in beforeEach
// and restore after:
//
//   beforeEach(() => {
//     const saved = {
//       ac: window.AudioContext,
//       wk: window.webkitAudioContext,
//     };
//     delete window.AudioContext;
//     delete window.webkitAudioContext;
//     return () => {
//       window.AudioContext = saved.ac;
//       window.webkitAudioContext = saved.wk;
//     };
//   });
//
// Or with Vitest's stub helper (auto-restored by `vi.unstubAllGlobals()`):
//
//   beforeEach(() => {
//     vi.stubGlobal('AudioContext', undefined);
//     vi.stubGlobal('webkitAudioContext', undefined);
//   });
//   afterEach(() => vi.unstubAllGlobals());
//
// The default (mock installed) is the behavior most tests want. Opt-out
// is for explicit audio-absent-branch coverage.

class MockAudioParam {
  constructor() {
    this.value = 0;
  }
  // playBeep shapes the gain envelope with these two; both are no-ops in tests —
  // the curve doesn't affect any assertion, only that the calls don't throw.
  setValueAtTime() { /* no-op */ }
  linearRampToValueAtTime() { /* no-op */ }
}

class MockAudioNode {
  constructor() {
    // Real AudioNode.connect(destination) returns the destination node,
    // which is what enables the `osc.connect(gain).connect(dest)` chain.
    this.connect = vi.fn().mockImplementation((dest) => dest);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor() {
    super();
    this.frequency = new MockAudioParam();
    this.type = 'sine';
    this.start = vi.fn();
    this.stop = vi.fn();
  }
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super();
    this.gain = new MockAudioParam();
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.destination = new MockAudioNode();
    // playBeep reads currentTime as the envelope base; a static 0 suffices
    // because the envelope-shaping methods above are no-ops.
    this.currentTime = 0;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  createGain() {
    return new MockGainNode();
  }
}

window.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;

// =============================================================================
// HTMLElement.prototype.offsetParent
// =============================================================================
//
// Six consumers via src/hooks/useModalA11y.js's isVisible() predicate
// (viewProgram, history, customWorkout, customDay, ToolsPanel,
// PostWorkoutModal). The predicate checks `el.offsetParent !== null` to
// decide whether an element is in layout — a standard test for
// "is this element rendered and visible." jsdom doesn't compute layout,
// so the real DOM's offsetParent getter returns null for every element
// regardless of CSS or position. Without this shim, isVisible() reports
// every focusable as not-visible, getFocusables() returns [], and the
// hook's Tab-trap and initial-focus behaviors degrade — characterization
// tests against real production behavior break for an environment reason,
// not a hook bug.
//
// The shim returns `parentNode` so any element attached to the test DOM
// reports a truthy offsetParent. That's a coarse simulation — real
// browsers return the nearest positioned ancestor or null for display:none
// elements — but it's enough to make the visibility predicate honest about
// "is this element actually in the document," which is the load-bearing
// distinction for the focus-management code.
//
// See docs/decisions.md#jsdom-environment-mocks for the ADR. Future
// focus-managing components (ContextMenu, EquipmentSelect, RestTimer in
// later batches) inherit this shim without further configuration.

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get() {
    return this.parentNode;
  },
});

// =============================================================================
// MSW server lifecycle
// =============================================================================
//
// `onUnhandledRequest: 'error'` fails any test that makes a network
// request the test author didn't explicitly mock. Catches accidental
// network coupling early — if a component fetches but its test forgot
// to install a handler, the test fails loudly instead of producing a
// flaky timeout or a silent fall-through.
//
// `resetHandlers` after each test undoes per-test `server.use(...)`
// overrides so tests stay isolated. Default handlers (currently empty
// — see ./msw/handlers.js) survive the reset.
//
// `server.close` at suite end releases the MSW interceptors.

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
