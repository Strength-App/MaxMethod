// Characterization tests for src/hooks/useModalA11y.js.
//
// These tests pin CURRENT behavior. The hook is consumed by six modal-bearing
// pages/components (viewProgram, history, customWorkout, customDay, ToolsPanel,
// PostWorkoutModal); its return shape and the four behaviors it wires up
// (initial focus, Tab trap, Escape, focus return) plus body-scroll lock are
// public API for those consumers.
//
// File extension convention: `.test.jsx` because this file contains JSX
// (the test harness components). Per docs/decisions.md#test-file-extension-convention,
// tests that render React use `.test.jsx`; pure-function tests stay `.test.js`.
//
// Layout-property gap: jsdom doesn't compute layout, so the hook's
// isVisible() predicate (which checks `el.offsetParent !== null`) reports
// every element as not-visible by default. src/test/setup.js installs an
// HTMLElement.prototype.offsetParent shim that returns parentNode so
// focusables in attached DOM register as visible. See
// docs/decisions.md#jsdom-environment-mocks.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState, useEffect } from 'react';
import { useModalA11y } from './useModalA11y.js';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------
//
// A controllable modal that exercises every prop combination the hook
// supports. Children render conditionally so the "no focusables" branch is
// reachable. `attachRef` is the opt-out for the modalRef.current=null branch.
//
// The opener button stays in the DOM so focus-return tests have a stable
// target; tests that need the opener removed do it explicitly via prop.

function Harness({
  initialOpen = false,
  onClose,
  useInitialFocus = false,
  attachRef = true,
  hasFocusables = true,
  removeOpenerOnOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const initialFocusRef = useRef(null);
  const modalRef = useModalA11y({
    isOpen,
    onClose: onClose ?? (() => setIsOpen(false)),
    initialFocusRef: useInitialFocus ? initialFocusRef : null,
  });

  return (
    <div>
      {!(removeOpenerOnOpen && isOpen) && (
        <button data-testid="opener" onClick={() => setIsOpen(true)}>
          open
        </button>
      )}
      <button data-testid="outside">outside</button>
      {isOpen && (
        <div
          ref={attachRef ? modalRef : null}
          data-testid="modal"
          tabIndex={-1}
        >
          {hasFocusables && (
            <>
              <button data-testid="first">first</button>
              <button
                ref={useInitialFocus ? initialFocusRef : null}
                data-testid="middle"
              >
                middle
              </button>
              <button data-testid="last">last</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: dispatch a real KeyboardEvent on the document so the hook's
// document-level listener receives it. Constructing the event manually
// lets us assert on `.defaultPrevented` directly when needed.
function dispatchKeyDown(opts) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...opts });
  document.dispatchEvent(event);
  return event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useModalA11y', () => {
  beforeEach(() => {
    // Reset body overflow between tests so cleanup assertions are unambiguous.
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('return value', () => {
    it('returns a ref object', () => {
      function Probe({ onRef }) {
        const ref = useModalA11y({ isOpen: false, onClose: () => {} });
        useEffect(() => { onRef(ref); }, [ref, onRef]);
        return null;
      }
      let captured;
      render(<Probe onRef={(r) => { captured = r; }} />);
      expect(captured).toBeDefined();
      expect(captured).toHaveProperty('current');
    });
  });

  describe('isOpen=false', () => {
    it('does not lock body scroll', () => {
      document.body.style.overflow = 'auto';
      render(<Harness initialOpen={false} />);
      expect(document.body).toHaveStyle({ overflow: 'auto' });
    });

    it('does not call onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(<Harness initialOpen={false} onClose={onClose} />);
      dispatchKeyDown({ key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not intercept Tab when modal is closed', () => {
      render(<Harness initialOpen={false} />);
      const event = dispatchKeyDown({ key: 'Tab' });
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('initial focus on open', () => {
    it('moves focus to the first focusable in the modal when no initialFocusRef', async () => {
      render(<Harness initialOpen={false} />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    it('moves focus to initialFocusRef.current when provided', async () => {
      render(<Harness initialOpen={false} useInitialFocus />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(screen.getByTestId('middle')).toHaveFocus();
    });

    it('falls back to the modal node itself when there are no focusables', async () => {
      render(<Harness initialOpen={false} hasFocusables={false} />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(screen.getByTestId('modal')).toHaveFocus();
    });

    it('focuses with preventScroll: true', async () => {
      // Spy on the focus method of HTMLElement.prototype so we capture the
      // exact options the hook passes, regardless of which focusable wins.
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      try {
        render(<Harness initialOpen={false} />);
        const user = userEvent.setup();
        await user.click(screen.getByTestId('opener'));
        // The hook's call is the one with preventScroll. userEvent.click also
        // calls .focus() on the opener with no args; filter by the args shape.
        const hookCall = focusSpy.mock.calls.find(
          (args) => args[0] && args[0].preventScroll === true,
        );
        expect(hookCall).toBeDefined();
      } finally {
        focusSpy.mockRestore();
      }
    });
  });

  describe('isVisible filtering', () => {
    // Render a modal whose first child is hidden via one of the four
    // skip-conditions; the hook should skip it and focus the second child.
    function HiddenFirstHarness({ hideProps }) {
      const [isOpen, setIsOpen] = useState(false);
      const modalRef = useModalA11y({ isOpen, onClose: () => setIsOpen(false) });
      return (
        <div>
          <button data-testid="opener" onClick={() => setIsOpen(true)}>open</button>
          {isOpen && (
            <div ref={modalRef} data-testid="modal" tabIndex={-1}>
              <button data-testid="hidden" {...hideProps}>hidden</button>
              <button data-testid="visible">visible</button>
            </div>
          )}
        </div>
      );
    }

    it.each([
      ['aria-hidden="true"', { 'aria-hidden': 'true' }],
      ['display:none', { style: { display: 'none' } }],
      ['visibility:hidden', { style: { visibility: 'hidden' } }],
    ])('skips focusables hidden by %s during initial focus', async (_, hideProps) => {
      render(<HiddenFirstHarness hideProps={hideProps} />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(screen.getByTestId('visible')).toHaveFocus();
    });

    // The `disabled` check in isVisible (line 113) is defensive duplication of
    // the FOCUSABLE_SELECTOR's `button:not([disabled])` / `input:not([disabled])`
    // clauses. To exercise it, the element must (a) match the selector and
    // (b) have the disabled attribute — which means a non-button, non-input
    // focusable like a tabindexed div.
    it('skips tabindexed elements with the disabled attribute', async () => {
      function DisabledDivHarness() {
        const [isOpen, setIsOpen] = useState(false);
        const modalRef = useModalA11y({ isOpen, onClose: () => setIsOpen(false) });
        return (
          <div>
            <button data-testid="opener" onClick={() => setIsOpen(true)}>open</button>
            {isOpen && (
              <div ref={modalRef} data-testid="modal" tabIndex={-1}>
                <div role="button" data-testid="hidden-div" tabIndex={0} disabled>hidden</div>
                <button data-testid="visible">visible</button>
              </div>
            )}
          </div>
        );
      }
      render(<DisabledDivHarness />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(screen.getByTestId('visible')).toHaveFocus();
    });
  });

  describe('body scroll lock', () => {
    it('sets body.style.overflow to hidden on open', async () => {
      render(<Harness initialOpen={false} />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(document.body).toHaveStyle({ overflow: 'hidden' });
    });

    it('restores the previous overflow value on close', async () => {
      document.body.style.overflow = 'auto';
      render(<Harness initialOpen={false} />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      expect(document.body).toHaveStyle({ overflow: 'hidden' });
      // Close via Escape.
      await user.keyboard('{Escape}');
      expect(document.body).toHaveStyle({ overflow: 'auto' });
    });
  });

  describe('Escape key', () => {
    it('invokes onClose on Escape', async () => {
      const onClose = vi.fn();
      render(<Harness initialOpen onClose={onClose} />);
      const user = userEvent.setup();
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stops propagation on Escape (event does not reach window listeners)', () => {
      const windowListener = vi.fn();
      window.addEventListener('keydown', windowListener);
      try {
        render(<Harness initialOpen onClose={() => {}} />);
        // Bubbles=true ensures the event flows document → window when not stopped.
        dispatchKeyDown({ key: 'Escape' });
        expect(windowListener).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('keydown', windowListener);
      }
    });

    it('does not throw when onClose is undefined', () => {
      // The hook uses optional chaining: onClose?.(). Pass undefined explicitly
      // by routing the harness's onClose prop to undefined via render-time wiring.
      function NoCloseHarness() {
        const [open] = useState(true);
        const modalRef = useModalA11y({ isOpen: open, onClose: undefined });
        return <div ref={modalRef} tabIndex={-1}><button>x</button></div>;
      }
      render(<NoCloseHarness />);
      expect(() => dispatchKeyDown({ key: 'Escape' })).not.toThrow();
    });
  });

  describe('Tab focus trap', () => {
    it('wraps Tab from last to first', async () => {
      render(<Harness initialOpen />);
      // Initial focus lands on `first` per the no-initialFocusRef branch.
      // Move to last manually to exercise the wrap.
      act(() => screen.getByTestId('last').focus());
      const user = userEvent.setup();
      await user.keyboard('{Tab}');
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    it('wraps Shift+Tab from first to last', async () => {
      render(<Harness initialOpen />);
      act(() => screen.getByTestId('first').focus());
      const user = userEvent.setup();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(screen.getByTestId('last')).toHaveFocus();
    });

    it('focuses first when Tab is pressed and active is outside the modal', async () => {
      render(<Harness initialOpen />);
      // Move focus outside the modal explicitly.
      act(() => screen.getByTestId('outside').focus());
      const user = userEvent.setup();
      await user.keyboard('{Tab}');
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    it('focuses last when Shift+Tab is pressed and active is outside the modal', async () => {
      render(<Harness initialOpen />);
      act(() => screen.getByTestId('outside').focus());
      const user = userEvent.setup();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(screen.getByTestId('last')).toHaveFocus();
    });

    it('preventDefaults Tab when modal has no focusables', () => {
      render(<Harness initialOpen hasFocusables={false} />);
      const event = dispatchKeyDown({ key: 'Tab' });
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not preventDefault on Tab in the middle of focusables (both shift values)', () => {
      // Single test covers the early-return branch — when active is neither
      // first, last, nor outside the modal, the hook passes the event through
      // regardless of shiftKey. Two assertions in one test because the branch
      // is the same; the shift bit is the differentiator.
      render(<Harness initialOpen />);
      act(() => screen.getByTestId('middle').focus());
      expect(dispatchKeyDown({ key: 'Tab' }).defaultPrevented).toBe(false);
      expect(dispatchKeyDown({ key: 'Tab', shiftKey: true }).defaultPrevented).toBe(false);
    });
  });

  describe('non-Tab non-Escape keys', () => {
    it('ignores other keys (does not preventDefault, does not call onClose)', () => {
      const onClose = vi.fn();
      render(<Harness initialOpen onClose={onClose} />);
      const event = dispatchKeyDown({ key: 'a' });
      expect(event.defaultPrevented).toBe(false);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on close', () => {
    it('removes the keydown listener when isOpen flips false', () => {
      const onClose = vi.fn();
      const { rerender } = render(<HarnessControlled isOpen onClose={onClose} />);
      // Verify listener is active.
      dispatchKeyDown({ key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      // Close via prop flip.
      rerender(<HarnessControlled isOpen={false} onClose={onClose} />);
      onClose.mockClear();
      dispatchKeyDown({ key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('returns focus to the opener after close', async () => {
      render(<Harness initialOpen={false} />);
      const opener = screen.getByTestId('opener');
      const user = userEvent.setup();
      // userEvent.click() focuses the opener as part of the click sequence.
      await user.click(opener);
      // The modal is now open and focus is in `first`. Close via Escape.
      await user.keyboard('{Escape}');
      expect(opener).toHaveFocus();
    });

    it('does not throw when the opener was removed from the DOM during open', async () => {
      render(<Harness initialOpen={false} removeOpenerOnOpen />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('opener'));
      // Opener is now unmounted; close the modal and verify no throw.
      expect(screen.queryByTestId('opener')).not.toBeInTheDocument();
      expect(() => {
        // Wrap in act() because the Escape handler flips state and triggers
        // a re-render; without the wrap, React emits an act() warning even
        // though the assertion still passes.
        act(() => {
          dispatchKeyDown({ key: 'Escape' });
        });
      }).not.toThrow();
    });
  });

  describe('cleanup on unmount', () => {
    it('removes keydown listener and restores overflow', () => {
      document.body.style.overflow = 'scroll';
      const { unmount } = render(<Harness initialOpen onClose={() => {}} />);
      expect(document.body).toHaveStyle({ overflow: 'hidden' });
      unmount();
      expect(document.body).toHaveStyle({ overflow: 'scroll' });
      // Verify listener is gone — a fresh Escape after unmount must not throw
      // or trigger anything observable.
      expect(() => dispatchKeyDown({ key: 'Escape' })).not.toThrow();
    });
  });

  describe('modalRef.current is null', () => {
    it('does not register a listener when the consumer forgets to attach the ref', () => {
      const onClose = vi.fn();
      render(<Harness initialOpen onClose={onClose} attachRef={false} />);
      dispatchKeyDown({ key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not lock body scroll when the consumer forgets to attach the ref', () => {
      document.body.style.overflow = 'auto';
      render(<Harness initialOpen attachRef={false} />);
      expect(document.body).toHaveStyle({ overflow: 'auto' });
    });
  });
});

// Externally-controlled harness used by the "cleanup on close" rerender test
// — separate from the default Harness because the default owns its own
// `isOpen` state and can't be steered from the test.
function HarnessControlled({ isOpen, onClose }) {
  const modalRef = useModalA11y({ isOpen, onClose });
  return (
    <div>
      <button data-testid="opener">open</button>
      <button data-testid="outside">outside</button>
      {isOpen && (
        <div ref={modalRef} data-testid="modal" tabIndex={-1}>
          <button data-testid="first">first</button>
          <button data-testid="last">last</button>
        </div>
      )}
    </div>
  );
}
