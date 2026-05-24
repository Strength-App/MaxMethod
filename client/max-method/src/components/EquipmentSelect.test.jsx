// Characterization tests for src/components/EquipmentSelect.jsx.
//
// EquipmentSelect is D-classified: a Select-Only Combobox (WAI-ARIA 1.2) — a
// button trigger + a listbox of options with colored equipment pills. It does
// NOT consume useModalA11y; its focus management is its own, source-verified
// here: opt-in autoFocus → triggerRef.focus() on mount (lines 44-47),
// close({ returnFocus }) → trigger refocus (106-110), a document mousedown
// outside-click listener while open (65-78), and option onMouseDown +
// preventDefault to keep focus on the trigger during selection (247-248). Focus
// never leaves the trigger — options are tracked via aria-activedescendant, not
// roving focus.
//
// `options` and `equipment` are MEMOIZED at the call site in real consumers, and
// the reset-on-options paired test below uses RTL `rerender` with a stable vs.
// fresh `options` reference to make the dependency explicit. This is the LOAD-
// BEARING form of the Hazard (b) generalization (contrast ContextMenu, where
// memoizing onClose was hygiene-only): the reset effect at lines 59-61 fires
// setHighlightedIndex(null) whenever the `options` identity changes, so a harness
// that recreates `options` every render would thrash the highlight and break any
// "ArrowDown opens with the current value highlighted" / "highlight persists"
// assertion. The paired tests ("stable ref → persists" + "new ref → resets") are
// the pattern for characterizing reset-on-identity-change semantics.
//
// Axe: toHaveNoViolations is registered globally in src/test/setup.js (lifted in
// Batch 7); this file imports only { axe } from vitest-axe and configures rules
// per-call in the accessibility describe block (the Batch 7 row mandates axe on
// EquipmentSelect).
//
// Placement flip (Q2 = documented-as-visual): open() measures
// getBoundingClientRect + window dims to flip the popup above the trigger when
// space is short (the es-popup--up class, lines 94-102). That flip is AESTHETIC
// positioning ("dropdown appears above vs. below"), not a correctness invariant,
// so — unlike ContextMenu's off-screen flip — it is NOT behaviorally pinned here.
// It is source-verified only. The gap has a known observation point: when this
// component's consumer (day.jsx) reaches the manual visual-check batches
// (Batches 10-15, see docs/decisions.md#visual-regression), a regressed
// popup-up branch would be caught against the visual baseline. Located gap, not
// an unbounded deferral.
//
// Source note diverging from the plan's coverage matrix: selectAt (lines 112-116)
// has NO same-value guard — re-selecting the current value DOES call
// onChange(value). Pinned below as the real contract.
//
// Timers: real (pattern (a)) — no timing assertions; the autoFocus assertion
// uses waitFor for robustness.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import EquipmentSelect from './EquipmentSelect.jsx';

const OPTIONS = ['Bench', 'Squat', 'Deadlift'];

function setup(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    <EquipmentSelect
      id="es"
      value={props.value ?? 'Bench'}
      options={props.options ?? OPTIONS}
      equipment={props.equipment ?? {}}
      onChange={onChange}
      ariaLabel="Exercise"
    />,
  );
  return { onChange, ...utils };
}

const trigger = () => screen.getByRole('combobox', { name: 'Exercise' });

describe('EquipmentSelect — trigger render / ARIA', () => {
  it('renders a collapsed combobox showing the current value', () => {
    setup({ value: 'Squat' });
    const t = trigger();
    expect(t).toHaveAttribute('aria-haspopup', 'listbox');
    expect(t).toHaveAttribute('aria-expanded', 'false');
    expect(t).toHaveAttribute('aria-controls', 'es-listbox');
    expect(t).not.toHaveAttribute('aria-activedescendant');
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders the equipment pill as an aria-hidden tag with a kebab-cased kind class', () => {
    setup({ value: 'Cable Row', options: ['Cable Row'], equipment: { 'Cable Row': 'Cable Machine' } });
    const tag = screen.getByText('Cable Machine');
    expect(tag).toHaveClass('rp-equipment-tag', 'rp-equipment-tag--cable-machine');
    expect(tag).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('EquipmentSelect — autoFocus (opt-in, mount only)', () => {
  it('focuses the trigger on mount when autoFocus is set', async () => {
    render(
      <EquipmentSelect
        id="es"
        value="Bench"
        options={OPTIONS}
        equipment={{}}
        onChange={vi.fn()}
        ariaLabel="Exercise"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- characterizing EquipmentSelect's own autoFocus prop; the a11y rule targets authoring, not test pinning of existing behavior (same disable day.jsx uses at its call sites)
        autoFocus
      />,
    );
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it('does not focus the trigger by default', () => {
    setup();
    expect(trigger()).not.toHaveFocus();
  });
});

describe('EquipmentSelect — open / close', () => {
  it('toggles open then closed on trigger click', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    expect(screen.getByRole('listbox', { name: 'Exercise' })).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders options with aria-selected on the current value when open', async () => {
    const user = userEvent.setup();
    setup({ value: 'Squat' });
    await user.click(trigger());
    expect(screen.getByRole('option', { name: 'Squat' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Bench' })).toHaveAttribute('aria-selected', 'false');
  });

  it('closes on an outside mousedown', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not open when the options list is empty', async () => {
    const user = userEvent.setup();
    setup({ options: [], value: '' });
    await user.click(trigger());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('EquipmentSelect — keyboard: opening from the trigger', () => {
  it('ArrowDown opens and highlights the current value', async () => {
    const user = userEvent.setup();
    setup({ value: 'Squat' }); // index 1
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-1');
  });

  it('ArrowUp opens and highlights the last option', async () => {
    const user = userEvent.setup();
    setup({ value: 'Bench' });
    trigger().focus();
    await user.keyboard('{ArrowUp}');
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-2');
  });
});

describe('EquipmentSelect — keyboard: navigation while open', () => {
  it('ArrowDown moves the highlight down and wraps past the end', async () => {
    const user = userEvent.setup();
    setup({ value: 'Bench' }); // opens highlighting index 0
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight 0
    await user.keyboard('{ArrowDown}'); // 1
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-1');
    await user.keyboard('{ArrowDown}'); // 2
    await user.keyboard('{ArrowDown}'); // wrap to 0
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-0');
  });

  it('ArrowUp wraps from the first option to the last', async () => {
    const user = userEvent.setup();
    setup({ value: 'Bench' });
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight 0
    await user.keyboard('{ArrowUp}');   // wrap to last
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-2');
  });

  it('Home highlights the first option and End the last', async () => {
    const user = userEvent.setup();
    setup({ value: 'Squat' });
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open
    await user.keyboard('{End}');
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-2');
    await user.keyboard('{Home}');
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-0');
  });
});

describe('EquipmentSelect — selection', () => {
  it('Enter selects the highlighted option, fires onChange, closes, keeps focus on the trigger', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'Bench' });
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight 0
    await user.keyboard('{ArrowDown}'); // highlight 1 (Squat)
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('Squat');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('Space selects the highlighted option', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'Bench' });
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight 0
    await user.keyboard('{ArrowDown}'); // highlight 1
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith('Squat');
  });

  it('selects an option on mousedown (preventDefault keeps focus on the trigger)', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'Bench' });
    await user.click(trigger());
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Deadlift' }));
    expect(onChange).toHaveBeenCalledWith('Deadlift');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('re-selecting the current value still calls onChange (no same-value guard)', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'Squat' }); // index 1
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight current (Squat)
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('Squat');
  });
});

describe('EquipmentSelect — keyboard: closing', () => {
  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('Tab closes the listbox', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('EquipmentSelect — reset-on-options-change (load-bearing memoization)', () => {
  it('preserves the highlight across a re-render with the SAME options reference', async () => {
    const user = userEvent.setup();
    const options = [...OPTIONS]; // one stable reference for both renders
    const onChange = vi.fn();
    const props = { id: 'es', value: 'Bench', options, equipment: {}, onChange, ariaLabel: 'Exercise' };
    const { rerender } = render(<EquipmentSelect {...props} />);
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight 0
    await user.keyboard('{ArrowDown}'); // highlight 1
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-1');
    rerender(<EquipmentSelect {...props} options={options} />); // same array identity
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-1');
  });

  it('resets the highlight when the options reference changes identity', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const base = { id: 'es', value: 'Bench', equipment: {}, onChange, ariaLabel: 'Exercise' };
    const { rerender } = render(<EquipmentSelect {...base} options={[...OPTIONS]} />);
    trigger().focus();
    await user.keyboard('{ArrowDown}'); // open, highlight 0
    await user.keyboard('{ArrowDown}'); // highlight 1
    expect(trigger()).toHaveAttribute('aria-activedescendant', 'es-option-1');
    rerender(<EquipmentSelect {...base} options={[...OPTIONS]} />); // fresh identity, same contents
    expect(trigger()).not.toHaveAttribute('aria-activedescendant');
  });
});

describe('EquipmentSelect — listener cleanup on unmount', () => {
  it('removes the document mousedown listener on unmount', async () => {
    const user = userEvent.setup();
    const { onChange, unmount } = setup();
    await user.click(trigger());
    unmount();
    // No listbox, and a stray document mousedown must not throw / call onChange.
    fireEvent.mouseDown(document.body);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('EquipmentSelect — accessibility (axe)', () => {
  const axeOpts = {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { region: { enabled: false }, 'heading-order': { enabled: false } },
  };

  it('has no violations when collapsed', async () => {
    const { container } = setup({ value: 'Squat', equipment: { Squat: 'Barbell' } });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it('has no violations when open', async () => {
    const user = userEvent.setup();
    const { container } = setup({ value: 'Squat', equipment: { Squat: 'Barbell' } });
    await user.click(trigger());
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it('has no violations when open with a highlighted option', async () => {
    const user = userEvent.setup();
    const { container } = setup({ value: 'Bench' });
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});
