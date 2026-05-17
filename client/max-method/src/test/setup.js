/**
 * Vitest global setup — runs once per worker before any test file.
 *
 * Three responsibilities:
 *   1. Register @testing-library/jest-dom matchers globally
 *      (toBeInTheDocument, toHaveFocus, toHaveAttribute, ...).
 *   2. Mock browser APIs jsdom doesn't implement but the codebase uses.
 *      Scope is determined by the Batch 1 browser-API audit, not
 *      speculation: only matchMedia and AudioContext are referenced.
 *      Five APIs the plan anticipated (IntersectionObserver,
 *      ResizeObserver, canvas .getContext, navigator.vibrate,
 *      window.scrollTo) are not used and are not mocked.
 *      requestAnimationFrame / cancelAnimationFrame are handled
 *      natively by jsdom@29 and need no mock either.
 *   3. (Future commits will wire MSW server lifecycle here.)
 *
 * See docs/decisions.md#dom-environment for the jsdom choice rationale
 * and CLAUDE.md "Surprising things" for the audit findings.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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
//   ctx.state                                           (property read)
//   ctx.resume()                                        (method)
//   ctx.createOscillator()                              (factory)
//   ctx.createGain()                                    (factory)
//   osc.connect(gain).connect(ctx.destination)          (chained connect)
//   osc.frequency.value, osc.type, osc.start, osc.stop  (oscillator shape)
//   gain.gain.value, gain.gain.setTargetAtTime          (gain envelope shape)
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
  setTargetAtTime() { /* no-op — gain-envelope shaping doesn't matter in tests */ }
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
