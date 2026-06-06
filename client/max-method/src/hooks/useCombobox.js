import { useState, useCallback } from 'react';

/**
 * Shared keyboard + open/close brain for the exercise-name autocomplete boxes.
 *
 * Both the "build a workout day" screen (`customDay.jsx`) and the "log a quick
 * workout" screen (`logger.jsx`) let the user type an exercise name and pick
 * from a drop-down list of suggestions. The fiddly part — which suggestion is
 * highlighted, what each arrow key does, when the list opens and closes — was
 * historically copy-pasted between those two screens, word for word. This hook
 * is that shared brain, lifted out once so both screens behave identically and
 * a fix in one place fixes both.
 *
 * It deliberately knows NOTHING about how the list looks. Each screen still
 * draws its own text box and its own list of suggestions however it likes
 * (the logger, for example, offers a "create a brand-new exercise" row that
 * customDay does not). This hook only manages the behavior, not the looks.
 *
 * The screens have several exercise cards on the page at once, each with its
 * own little search box. We track *which* card's drop-down is currently open
 * using that card's position number (its index), so only one list shows at a
 * time. That number is what callers pass around as `ei` ("exercise index").
 *
 * @param {Object} params
 * @param {(typedText: string) => Array<{kind: string, name: string}>} params.optionsFor
 *   A function the screen supplies that turns whatever the user has typed into
 *   the current list of suggestions. Returning an empty array means "nothing to
 *   show / nothing to navigate" and the keyboard handler will quietly do
 *   nothing. Each suggestion is an object with at least a `name`; the `kind`
 *   field lets the screen tell apart a real match from a "create new" row.
 * @param {(ei: number, option: {kind: string, name: string}) => void} params.onSelect
 *   What the screen wants to happen when the user presses Enter on the
 *   highlighted suggestion. This is the only screen-specific choice the hook
 *   needs: customDay fills in the chosen name, logger may instead create a new
 *   custom exercise. The hook closes the drop-down for you afterwards.
 *
 * @returns {Object} The pieces each screen wires into its own markup:
 * @returns {number|null} return.activeDropdown - Index of the card whose list
 *   is currently open, or `null` when every list is closed.
 * @returns {number|null} return.highlightedIndex - Which suggestion in the open
 *   list is currently highlighted, or `null` when none is.
 * @returns {Function} return.setHighlightedIndex - Lets the markup highlight a
 *   suggestion directly (used when the mouse hovers over a row).
 * @returns {(ei: number, idx?: number|null) => void} return.openDropdown -
 *   Opens the list for card `ei`, optionally pre-highlighting suggestion `idx`.
 * @returns {() => void} return.closeDropdown - Closes whichever list is open
 *   and clears the highlight.
 * @returns {(e: KeyboardEvent, ei: number, typedText: string) => void} return.handleComboKeyDown -
 *   The keydown handler to attach to each card's search box. Implements the
 *   WAI-ARIA text-input combobox keyboard pattern (see below).
 */
export function useCombobox({ optionsFor, onSelect }) {
  // Which card's suggestion list is open right now (null = none).
  const [activeDropdown, setActiveDropdown] = useState(null);
  // Which suggestion in the open list is highlighted for keyboard selection
  // (null = none). Kept in step with `activeDropdown` so we never highlight a
  // suggestion in a list that isn't showing.
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  // Centralized open/close so the highlight is guaranteed to reset together
  // with the list — never left pointing at a row that's no longer visible.
  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
    setHighlightedIndex(null);
  }, []);
  const openDropdown = useCallback((ei, idx = null) => {
    setActiveDropdown(ei);
    setHighlightedIndex(idx);
  }, []);

  // The combobox keyboard pattern. Empty-options guard: if `optionsFor`
  // returns [] (i.e. the box is empty), Arrow/Enter do nothing so we never
  // point the screen reader at a suggestion that doesn't exist.
  const handleComboKeyDown = useCallback((e, ei, name) => {
    const opts = optionsFor(name);
    const open = activeDropdown === ei;

    switch (e.key) {
      case 'ArrowDown': {
        if (opts.length === 0) return; // empty box — nothing to navigate
        e.preventDefault();
        if (!open) { openDropdown(ei, 0); return; }
        setHighlightedIndex(prev => prev == null ? 0 : (prev + 1) % opts.length);
        return;
      }
      case 'ArrowUp': {
        if (opts.length === 0) return;
        e.preventDefault();
        if (!open) { openDropdown(ei, opts.length - 1); return; }
        setHighlightedIndex(prev => prev == null ? opts.length - 1 : (prev - 1 + opts.length) % opts.length);
        return;
      }
      case 'Home': {
        if (!open || opts.length === 0) return;
        e.preventDefault();
        setHighlightedIndex(0);
        return;
      }
      case 'End': {
        if (!open || opts.length === 0) return;
        e.preventDefault();
        setHighlightedIndex(opts.length - 1);
        return;
      }
      // Note: Space is intentionally NOT handled here. This is a text-input-
      // trigger combobox per WAI-ARIA — Space is text entry, not a UI command.
      // Enter alone selects the highlighted option (matches Google search,
      // browser address bars, IDE autocomplete). Diverges from EquipmentSelect's
      // button-trigger combobox where Space-to-select is correct.
      case 'Enter': {
        if (!open || opts.length === 0 || highlightedIndex == null) return;
        const opt = opts[highlightedIndex];
        if (!opt) return;
        e.preventDefault();
        onSelect(ei, opt);
        closeDropdown();
        return;
      }
      case 'Escape': {
        if (!open) return;
        e.preventDefault();
        closeDropdown();
        return;
      }
      case 'Tab': {
        // Don't preventDefault — let Tab move focus naturally; just close.
        if (open) closeDropdown();
        return;
      }
      default:
        return;
    }
  }, [activeDropdown, highlightedIndex, optionsFor, openDropdown, closeDropdown, onSelect]);

  return {
    activeDropdown,
    highlightedIndex,
    setHighlightedIndex,
    openDropdown,
    closeDropdown,
    handleComboKeyDown,
  };
}
