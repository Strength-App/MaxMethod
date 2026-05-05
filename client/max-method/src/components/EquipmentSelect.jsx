import { useState, useRef, useEffect } from 'react';

/**
 * EquipmentSelect — non-typeahead combobox with colored equipment pills inside options.
 *
 * Replaces native <select> for cases where each option needs a styled visual badge
 * that <option> elements cannot render (HTML stripped from native option content).
 *
 * Reuses the global `.rp-equipment-tag` and `.rp-equipment-tag--{kind}` classes
 * defined in App.css for the equipment pill rendering — same colors and typography
 * used on parent rows.
 *
 * ARIA: WAI-ARIA 1.2 Select-Only Combobox pattern.
 *  - Trigger: role=combobox, aria-haspopup=listbox, aria-expanded, aria-controls,
 *    aria-activedescendant when an option is highlighted.
 *  - Popup:   role=listbox.
 *  - Options: role=option, aria-selected on the current value.
 *
 * Keyboard: ArrowDown/Up, Home/End, Enter, Space (open or select), Escape (close +
 * return focus), Tab (close, no preventDefault).
 */
export default function EquipmentSelect({
  value,
  options,
  equipment = {},
  onChange,
  id,
  ariaLabel,
  autoFocus = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [placement, setPlacement] = useState('bottom');

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // Opt-in autofocus on mount. Used by consumers that mount this component in
  // response to a user action elsewhere (e.g. a context-menu "Swap" item) and
  // need focus to land directly on the trigger without a double focus shift.
  // Defaults to false so existing consumers (reviewProgram) are unaffected.
  // autoFocus is intentionally read on mount only — re-running on prop change
  // would steal focus during normal interaction.
  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listboxId = `${id}-listbox`;
  const optionId = (idx) => `${id}-option-${idx}`;
  const activeDescendant =
    isOpen && highlightedIndex != null ? optionId(highlightedIndex) : undefined;

  const equipmentKind = (eq) =>
    eq ? eq.toLowerCase().replace(/\s+/g, '-') : null;

  // Reset highlight when options array identity changes (defensive — prevents
  // stale-index pointer on parent-driven option list changes).
  useEffect(() => {
    setHighlightedIndex(null);
  }, [options]);

  // Click-outside listener (only while open). Checks against trigger + popup
  // refs only — won't interfere with the outer .rp-swap-dropdown panel.
  useEffect(() => {
    if (!isOpen) return undefined;
    function onDocMouseDown(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        popupRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isOpen]);

  function open(initialHighlight) {
    if (!options.length) return;
    // Default highlight = current value's index, so opening doesn't jump
    // the user away from their selection. Fallback to 0 if value not in options.
    const fallbackIdx = options.indexOf(value);
    const idx =
      initialHighlight != null
        ? initialHighlight
        : fallbackIdx >= 0
          ? fallbackIdx
          : 0;
    setHighlightedIndex(idx);

    // Measure once on open. Flip upward if not enough space below.
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const POPUP_MAX = 280;
      setPlacement(
        spaceBelow < POPUP_MAX && spaceAbove > spaceBelow ? 'top' : 'bottom'
      );
    }
    setIsOpen(true);
  }

  function close({ returnFocus = false } = {}) {
    setIsOpen(false);
    setHighlightedIndex(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  function selectAt(idx) {
    if (idx == null || idx < 0 || idx >= options.length) return;
    onChange(options[idx]);
    close();
  }

  function onTriggerKeyDown(e) {
    // Tab / Escape work even with empty options (close-and-go is harmless).
    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        close({ returnFocus: true });
      }
      return;
    }
    if (e.key === 'Tab') {
      if (isOpen) close();
      // No preventDefault — let focus move naturally.
      return;
    }

    // Navigation keys require a non-empty option list.
    if (!options.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setHighlightedIndex((cur) =>
            cur == null || cur === options.length - 1 ? 0 : cur + 1
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          open(options.length - 1);
        } else {
          setHighlightedIndex((cur) =>
            cur == null || cur === 0 ? options.length - 1 : cur - 1
          );
        }
        break;
      case 'Home':
        e.preventDefault();
        if (isOpen) setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        if (isOpen) setHighlightedIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ': // Space-to-select per WAI-ARIA combobox button + native <select>
                // convention. Diverges from the original written spec (Enter only)
                // — matches user expectations coming from native pickers.
        e.preventDefault();
        if (!isOpen) {
          open();
        } else if (highlightedIndex != null) {
          selectAt(highlightedIndex);
        }
        break;
      default:
        break;
    }
  }

  function onTriggerClick() {
    if (isOpen) close();
    else open();
  }

  const currentKind = equipmentKind(equipment[value]);

  return (
    <div className="es-root">
      <button
        ref={triggerRef}
        type="button"
        className={`es-trigger${isOpen ? ' es-trigger--open' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-label={ariaLabel}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="es-trigger-content">
          <span className="es-trigger-name">{value}</span>
          {equipment[value] && (
            <span
              className={`rp-equipment-tag rp-equipment-tag--${currentKind}`}
              aria-hidden="true"
            >
              {equipment[value]}
            </span>
          )}
        </span>
        <span className="es-trigger-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <ul
          ref={popupRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`es-popup${placement === 'top' ? ' es-popup--up' : ''}`}
        >
          {options.map((opt, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isSelected = opt === value;
            const kind = equipmentKind(equipment[opt]);
            const className = [
              'es-option',
              isHighlighted && 'es-option--highlighted',
              isSelected && 'es-option--selected',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li
                key={opt}
                id={optionId(idx)}
                role="option"
                aria-selected={isSelected}
                className={className}
                // Sticky highlight by design — diverges from customDay typeahead
                // behavior. Once moved, highlight stays where it landed; clearing
                // on every leave creates flicker when the user is scanning.
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus on trigger for keyboard return
                  selectAt(idx);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <span className="es-option-content">
                  <span className="es-option-name">{opt}</span>
                  {equipment[opt] && (
                    <span
                      className={`rp-equipment-tag rp-equipment-tag--${kind}`}
                      aria-hidden="true"
                    >
                      {equipment[opt]}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
