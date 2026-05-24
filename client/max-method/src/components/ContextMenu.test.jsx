// Characterization tests for src/components/ContextMenu.jsx.
//
// ContextMenu is D-classified: a generic positioned menu (right-click / long-
// press) implementing the WAI-ARIA menu pattern. It does NOT consume
// useModalA11y — its focus management is its own, source-verified here: rAF-
// deferred focus on the first item on open (source lines 73-84), focus-follows-
// highlight (89-93), return-focus to returnFocusRef on close (81), and a
// document-level mousedown + capture-phase window scroll close listener (53-65).
//
// The harness memoizes onClose with useCallback — but here that is HYGIENE, not
// load-bearing. The only effect depending on onClose is the outside-click/scroll
// subscriber ([open, onClose], line 65): an unstable onClose would re-subscribe
// those document/window listeners each render but would NOT thrash focus, because
// the focus effects key on [open] and [highlightedIndex, open], never on onClose.
// ContextMenu is therefore the counter-example to ToolsPanel.test.jsx's framing,
// where useModalA11y's onClose-dependent focus effect made memoization genuinely
// load-bearing. Here it is correctness-of-habit only.
//
// Timers: real timers (pattern (a) per CLAUDE.md — no precise timing assertions
// in this file). The rAF-deferred initial focus is driven via
// `await waitFor(() => expect(...).toHaveFocus())`, which resolves whether focus
// lands synchronously (the focus-follows-highlight effect also fires on open) or
// one rAF tick later — rather than fake-timer flushing. No vi.useFakeTimers here.
//
// Viewport-edge flip (Q2 = stub): the "menu must not render off-screen" flip
// (lines 38-49) is a CORRECTNESS invariant, not aesthetic positioning, so it is
// behaviorally pinned. jsdom returns a zero rect from getBoundingClientRect, so
// the flip branches are unreachable without intervention; these tests stub
// HTMLElement.prototype.getBoundingClientRect per-test (restored in afterEach)
// to return a controlled rect that drives flip-left / flip-up. This is the
// precedent for geometry-derived branch testing in later batches.
//
// Two source facts diverge from the original plan's coverage matrix and are
// pinned as the real contract: (1) the item shape is { label, onSelect } with NO
// `disabled` support, so no disabled-item tests are written; (2) Enter / Space /
// click call item.onSelect but do NOT auto-close — closing is the onSelect
// handler's job (JSDoc lines 16-17), so onClose is asserted NOT called on
// activation.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState, useRef, useCallback } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContextMenu from './ContextMenu.jsx';

afterEach(() => vi.restoreAllMocks());

function makeItems() {
  return [
    { label: 'Swap exercise', onSelect: vi.fn() },
    { label: 'View in Library', onSelect: vi.fn() },
    { label: 'Remove', onSelect: vi.fn() },
  ];
}

// Controlled harness: handleClose flips `open` to false (so close paths are
// observable as the menu unmounting) AND calls the passed spy. The opener button
// doubles as the returnFocusRef target and a reopen affordance.
function Harness({ items, onClose, x = 10, y = 10, withReturnFocus = false, startOpen = true }) {
  const [open, setOpen] = useState(startOpen);
  const returnFocusRef = useRef(null);
  const handleClose = useCallback(() => { onClose?.(); setOpen(false); }, [onClose]);
  return (
    <>
      <button ref={returnFocusRef} type="button" onClick={() => setOpen(true)}>opener</button>
      <ContextMenu
        open={open}
        x={x}
        y={y}
        items={items}
        onClose={handleClose}
        returnFocusRef={withReturnFocus ? returnFocusRef : undefined}
      />
    </>
  );
}

// Per-test stub of every element's getBoundingClientRect (restored in afterEach).
function stubRect(width, height) {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width, height, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0,
  });
}

const firstItem = () => screen.getByRole('menuitem', { name: 'Swap exercise' });

describe('ContextMenu — open / closed structure', () => {
  it('renders nothing when closed', () => {
    render(<Harness items={makeItems()} onClose={vi.fn()} startOpen={false} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders a vertical menu with one menuitem per item when open', () => {
    render(<Harness items={makeItems()} onClose={vi.fn()} />);
    expect(screen.getByRole('menu')).toHaveAttribute('aria-orientation', 'vertical');
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: 'View in Library' })).toBeInTheDocument();
  });
});

describe('ContextMenu — focus management (its own, not useModalA11y)', () => {
  it('moves focus to the first item on open', async () => {
    render(<Harness items={makeItems()} onClose={vi.fn()} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
  });

  it('returns focus to the opener when closed', async () => {
    const user = userEvent.setup();
    render(<Harness items={makeItems()} onClose={vi.fn()} withReturnFocus />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'opener' })).toHaveFocus());
  });
});

describe('ContextMenu — keyboard navigation', () => {
  it('ArrowDown moves focus to the next item and wraps past the end', async () => {
    const user = userEvent.setup();
    render(<Harness items={makeItems()} onClose={vi.fn()} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'View in Library' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // wrap back to first
    expect(firstItem()).toHaveFocus();
  });

  it('ArrowUp from the first item wraps to the last', async () => {
    const user = userEvent.setup();
    render(<Harness items={makeItems()} onClose={vi.fn()} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
  });

  it('Home focuses the first item and End the last', async () => {
    const user = userEvent.setup();
    render(<Harness items={makeItems()} onClose={vi.fn()} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(firstItem()).toHaveFocus();
  });

  it('marks the focused item with the highlighted class', async () => {
    const user = userEvent.setup();
    render(<Harness items={makeItems()} onClose={vi.fn()} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'View in Library' }))
      .toHaveClass('cm-menu-item--highlighted');
  });
});

describe('ContextMenu — activation (calls onSelect; does NOT auto-close)', () => {
  it('Enter activates the focused item without closing the menu', async () => {
    const user = userEvent.setup();
    const items = makeItems();
    const onClose = vi.fn();
    render(<Harness items={items} onClose={onClose} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(items[0].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('Space activates the focused item', async () => {
    const user = userEvent.setup();
    const items = makeItems();
    render(<Harness items={items} onClose={vi.fn()} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{ArrowDown}');       // highlight index 1
    await user.keyboard(' ');
    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
  });

  it('click activates that item without closing the menu', async () => {
    const user = userEvent.setup();
    const items = makeItems();
    const onClose = vi.fn();
    render(<Harness items={items} onClose={onClose} />);
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));
    expect(items[2].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ContextMenu — close affordances', () => {
  it('Escape calls onClose and the menu closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness items={makeItems()} onClose={onClose} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Tab calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness items={makeItems()} onClose={onClose} />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{Tab}');
    expect(onClose).toHaveBeenCalled();
  });

  it('an outside mousedown calls onClose', async () => {
    const onClose = vi.fn();
    render(<Harness items={makeItems()} onClose={onClose} />);
    await screen.findByRole('menu');
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a scroll calls onClose', async () => {
    const onClose = vi.fn();
    render(<Harness items={makeItems()} onClose={onClose} />);
    await screen.findByRole('menu');
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ContextMenu — highlight reset on reopen', () => {
  it('resets the highlight to the first item each time it reopens', async () => {
    const user = userEvent.setup();
    render(<Harness items={makeItems()} onClose={vi.fn()} withReturnFocus />);
    await waitFor(() => expect(firstItem()).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'View in Library' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'opener' }));
    await waitFor(() => expect(firstItem()).toHaveFocus());
  });
});

describe('ContextMenu — viewport-edge flip (Q2: stubbed getBoundingClientRect)', () => {
  it('flips left and up when the menu would overflow the viewport', () => {
    stubRect(200, 300);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    render(<Harness items={makeItems()} onClose={vi.fn()} x={vw - 50} y={vh - 50} />);
    // nx = max(PADDING, vw - width - PADDING); ny = max(PADDING, vh - height - PADDING)
    expect(screen.getByRole('menu')).toHaveStyle({
      left: `${vw - 200 - 4}px`,
      top: `${vh - 300 - 4}px`,
    });
  });

  it('does not flip when the menu fits at the requested position', () => {
    stubRect(200, 300);
    render(<Harness items={makeItems()} onClose={vi.fn()} x={10} y={10} />);
    expect(screen.getByRole('menu')).toHaveStyle({ left: '10px', top: '10px' });
  });
});

describe('ContextMenu — listener cleanup on unmount', () => {
  it('removes the outside-click listener on unmount (no late onClose)', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness items={makeItems()} onClose={onClose} />);
    await screen.findByRole('menu');
    unmount();
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });
});
