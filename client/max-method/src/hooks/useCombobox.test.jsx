// Characterization tests for src/hooks/useCombobox.js.
//
// useCombobox is the keyboard + open/close state machine lifted verbatim in
// Batch 13 from the literal-copy `handleComboKeyDown` that lived inline in both
// customDay.jsx and logger.jsx (docs/comparisons/combobox.md,
// docs/decisions.md#combobox-primitive). These tests pin the behavior those
// inline copies always had, as permanent armor now that the logic is shared.
//
// The hook is headless — it renders nothing. To test it the way it is actually
// used, a small <Harness> wires it into a real combobox input + listbox that
// mirrors customDay's markup (controlled value, onChange opens the list, options
// from a supplied `optionsFor`, an onSelect spy). Assertions are on OBSERVABLE
// behavior — ARIA state (aria-expanded / aria-activedescendant / aria-selected),
// the presence of the listbox, the typed value, and the onSelect spy — never on
// the hook's internal state, per docs/decisions.md#keyboard-testing.
//
// Timers are REAL here: the hook itself uses no timers. The 150ms blur-close
// delay people associate with this combobox lives in the *page* markup
// (onBlur={() => setTimeout(closeDropdown, 150)}), not in the hook, so it is
// pinned in the customDay characterization tests, not here.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCombobox } from './useCombobox.js';

// A tiny fixed catalog so option counts are predictable:
//   "ap" -> ["Apple", "Apricot"]   (2 matches — exercises wrap behavior)
//   "av" -> ["Avocado"]            (1 match)
//   "xyz" -> [{ kind: 'add', ... }] (no match — the "create new" row)
const CATALOG = ['Apple', 'Apricot', 'Avocado', 'Banana'];

// Mirrors the optionsFor each page supplies: substring match, capped at 8, or a
// single "add" affordance when nothing matches. The hook receives this as a
// prop and stays ignorant of exercises entirely.
function makeOptionsFor() {
  return (name) => {
    if (!name) return [];
    const q = name.toLowerCase();
    const matches = CATALOG.filter(n => n.toLowerCase().includes(q)).slice(0, 8);
    if (matches.length > 0) return matches.map(n => ({ kind: 'match', name: n }));
    return [{ kind: 'add', name: name.trim() }];
  };
}

// Faithful stand-in for a single exercise card's search box, wired to the hook
// the way customDay.jsx wires it (same keydown handler, same ARIA attributes).
// Mouse-hover highlighting is omitted on purpose: these tests cover the hook's
// KEYBOARD contract, and the options use the aria-activedescendant pattern
// (focus stays on the input), so the rows are not themselves focusable. A
// trailing button gives Tab somewhere to land.
function Harness({ optionsFor, onSelect }) {
  const {
    activeDropdown,
    highlightedIndex,
    openDropdown,
    handleComboKeyDown,
  } = useCombobox({ optionsFor, onSelect });

  const ei = 0;
  const [value, setValue] = useState('');
  const isOpen = activeDropdown === ei && value.length > 0;
  const options = isOpen ? optionsFor(value) : [];
  const optionId = (idx) => `opt-${ei}-${idx}`;
  const activeOptionId = isOpen && highlightedIndex != null ? optionId(highlightedIndex) : undefined;

  return (
    <div>
      <input
        aria-label="Exercise name"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="listbox"
        aria-activedescendant={activeOptionId}
        value={value}
        onChange={e => { setValue(e.target.value); openDropdown(ei, null); }}
        onFocus={() => openDropdown(ei, null)}
        onKeyDown={e => handleComboKeyDown(e, ei, value)}
      />
      {isOpen && (
        <div id="listbox" role="listbox" aria-label="Exercise suggestions">
          {options.map((opt, idx) => (
            <div
              key={opt.name}
              id={optionId(idx)}
              role="option"
              aria-selected={highlightedIndex === idx}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
      <button type="button">after</button>
    </div>
  );
}

// Renders the harness, focuses the input, and types `query` so a list of
// suggestions is showing. Returns the userEvent instance + the onSelect spy.
async function setup(query = 'ap') {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<Harness optionsFor={makeOptionsFor()} onSelect={onSelect} />);
  const input = screen.getByRole('combobox', { name: 'Exercise name' });
  await user.click(input);
  if (query) await user.type(input, query);
  return { user, onSelect, input };
}

describe('useCombobox — opening the list', () => {
  it('does nothing on ArrowDown when the box is empty (no options to navigate)', async () => {
    const { user, input } = await setup('');
    await user.keyboard('{ArrowDown}');
    // An empty box yields no options, so no list should appear.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('ArrowDown opens a closed list and highlights the first option', async () => {
    const { user, input } = await setup('ap'); // typing already opened it
    // Close it first (Escape) so we exercise the open-on-ArrowDown branch with
    // a non-empty query still in the box.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', 'opt-0-0');
  });

  it('ArrowUp opens a closed list and highlights the last option', async () => {
    const { user, input } = await setup('ap');
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    const options = screen.getAllByRole('option'); // ["Apple", "Apricot"]
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', 'opt-0-1');
  });
});

describe('useCombobox — arrow navigation wraps', () => {
  it('ArrowDown moves down then wraps from the last option back to the first', async () => {
    const { user } = await setup('ap'); // options: Apple(0), Apricot(1)
    await user.keyboard('{ArrowDown}'); // -> 0
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}'); // -> 1
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}'); // wraps -> 0
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp moves up then wraps from the first option round to the last', async () => {
    const { user } = await setup('ap');
    await user.keyboard('{ArrowDown}'); // -> 0
    await user.keyboard('{ArrowUp}');   // wraps -> 1 (last)
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });
});

describe('useCombobox — Home / End', () => {
  it('Home jumps to the first option, End jumps to the last', async () => {
    const { user } = await setup('ap');
    await user.keyboard('{ArrowDown}'); // -> 0
    await user.keyboard('{End}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('Home / End do nothing while the list is closed', async () => {
    const { user } = await setup('ap');
    await user.keyboard('{Escape}'); // closed, query kept
    await user.keyboard('{Home}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('useCombobox — Enter selection', () => {
  it('Enter on the highlighted option calls onSelect with (index, option) and closes', async () => {
    const { user, onSelect, input } = await setup('ap');
    await user.keyboard('{ArrowDown}'); // highlight Apple
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(0, { kind: 'match', name: 'Apple' });
    // Selection closes the list.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter passes through the "create new" (add) option when nothing matches', async () => {
    const { user, onSelect } = await setup('xyz'); // no catalog match -> add row
    await user.keyboard('{ArrowDown}'); // highlight the single add option
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(0, { kind: 'add', name: 'xyz' });
  });

  it('Enter does nothing when no option is highlighted', async () => {
    const { user, onSelect } = await setup('ap'); // open, highlight is null
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    // List stays open — Enter with no highlight is a no-op, not a close.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

describe('useCombobox — Escape', () => {
  it('Escape closes an open list', async () => {
    const { user, input } = await setup('ap');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('useCombobox — Space is text, not a command', () => {
  it('Space neither selects nor closes — it types a space into the box', async () => {
    const { user, onSelect, input } = await setup('ap');
    await user.keyboard('{ArrowDown}'); // highlight Apple
    await user.keyboard(' ');           // press Space
    expect(onSelect).not.toHaveBeenCalled();
    // The space was entered as text (default not prevented).
    expect(input).toHaveValue('ap ');
    // The list is still open (Space did not close it).
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('useCombobox — Tab', () => {
  it('Tab closes the list and lets focus move on naturally', async () => {
    const { user, input } = await setup('ap');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.tab();
    // Focus left the input for the next control; the list closed without
    // swallowing the Tab.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).not.toHaveFocus();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });
});
