import { useEffect, useRef, useState } from 'react';

/**
 * ContextMenu — generic positioned menu for right-click + long-press.
 *
 * Renders at fixed (x, y), viewport-edge aware (flips left/up if overflow).
 * Closes on outside-click, Escape, scroll, item select. WAI-ARIA menu pattern:
 * arrow keys + Home/End nav, Enter/Space activates, Tab closes, focus first
 * item on open, return focus to opener (returnFocusRef) on close.
 *
 * Single-item menus are intentionally allowed (e.g. fixed-row cards on day.jsx
 * only get "View in Exercise Library").
 *
 * Item shape: { label: string, onSelect: () => void }. The onSelect handler is
 * responsible for closing the menu — most flows close immediately, but some
 * need to swap focus elsewhere (e.g. the day.jsx swap panel autofocuses an
 * EquipmentSelect trigger) and bypassing the default returnFocusRef path.
 *
 * @param {Object} props
 * @param {boolean} props.open Whether the menu is shown. When false the
 *   component renders nothing and, if `returnFocusRef` is set, returns focus to
 *   the opener.
 * @param {number} props.x Requested viewport x (px) for the menu's left edge,
 *   before edge-flip adjustment.
 * @param {number} props.y Requested viewport y (px) for the menu's top edge,
 *   before edge-flip adjustment.
 * @param {Array<{label: string, onSelect: () => void}>} props.items Menu items,
 *   rendered one button each. `onSelect` fires on Enter / Space / click and is
 *   itself responsible for closing the menu — ContextMenu does NOT auto-close on
 *   activation. There is no `disabled` support.
 * @param {() => void} props.onClose Called to request close — on Escape, Tab,
 *   outside-click, and scroll. The parent owns `open`.
 * @param {React.RefObject<HTMLElement>} [props.returnFocusRef] If provided, its
 *   `.current` is focused when the menu closes (focus return to the opener).
 * @returns {JSX.Element|null} The menu element, or `null` when `open` is false.
 */
export default function ContextMenu({
  open,
  x,
  y,
  items,
  onClose,
  returnFocusRef,
}) {
  const menuRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [adjusted, setAdjusted] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (open) setHighlightedIndex(0);
  }, [open]);

  // Two-phase positioning: first paint at requested (x, y), then measure and
  // flip across viewport edges. Avoids overflow when the menu opens near the
  // right or bottom edge of the screen.
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PADDING = 4;
    let nx = x;
    let ny = y;
    if (nx + rect.width + PADDING > vw) nx = Math.max(PADDING, vw - rect.width - PADDING);
    if (ny + rect.height + PADDING > vh) ny = Math.max(PADDING, vh - rect.height - PADDING);
    setAdjusted({ x: nx, y: ny });
  }, [open, x, y]);

  // Outside-click + scroll close. Capture-phase scroll listener catches nested
  // scroll containers (page-content, modal bodies, etc.).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose]);

  // Focus the open menu via rAF — synchronous focus during the same tick as
  // onContextMenu/touchend can race with the browser's own focus dispatch.
  // On close, return focus to the opener if a ref was supplied. Effect runs
  // only on the open-flip; returnFocusRef is intentionally not a dep — it is
  // a ref whose .current is read at call time, and re-firing on its identity
  // would cause spurious focus shifts.
  //
  // Target the CURRENT highlight, not always the first item: this rAF and the
  // focus-follows-highlight effect below both fire on open, but the rAF is
  // deferred ~1 frame. If a keypress moves the highlight before the rAF fires,
  // focusing the first item would STEAL focus back to item 0. On open the
  // highlight is always item 0 (useState(0) + the open-reset effect above), so
  // querying the highlighted item is identity-preserving for production; it only
  // differs when a keypress beats the ~16ms rAF, where the highlight is correct.
  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => {
        const target = menuRef.current?.querySelector('.cm-menu-item--highlighted')
          ?? menuRef.current?.querySelector('[role="menuitem"]');
        target?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
    returnFocusRef?.current?.focus?.();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus follows the highlighted index, so SR announcement and visual ring
  // match. Items are tabIndex={-1} so Tab exits the menu (handled in onKeyDown
  // below). MUST live before any early return to satisfy rules-of-hooks.
  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    items?.[highlightedIndex]?.focus?.();
  }, [highlightedIndex, open]);

  if (!open) return null;

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        items[highlightedIndex]?.onSelect?.();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        onClose();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={menuRef}
      className="cm-menu"
      role="menu"
      aria-orientation="vertical"
      tabIndex={-1}
      style={{ left: adjusted.x, top: adjusted.y }}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={`cm-menu-item${i === highlightedIndex ? ' cm-menu-item--highlighted' : ''}`}
          onMouseEnter={() => setHighlightedIndex(i)}
          onClick={() => item.onSelect?.()}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
