// Characterization tests for src/components/tools/ToolsPanel.jsx.
//
// ToolsPanel is D-classified and is the user-facing modal that composes the five
// tools (master→detail: a menu of tools, each opening into its component). Three
// Rule #21 layering decisions govern what this file pins:
//   1. useModalA11y INTEGRATION, not internals. The hook (Batch 4,
//      useModalA11y.test.jsx) owns the focus trap / Esc / initial focus /
//      focus-return mechanics; here we pin that ToolsPanel WIRES it correctly
//      (trap works at the dialog ref, Esc closes, focus lands in the panel on
//      open, focus returns to the opener on close).
//   2. ToolsPanel's OWN master-detail focus effect (ToolsPanel.jsx:49-63) — pin
//      directly: entering a tool moves focus to Back, returning to menu moves
//      focus to the first menu item. This is ToolsPanel-owned logic.
//   3. menu→detail ROUTING — assert the right component MOUNTS for each
//      activeTool (presence + the dialog title), NOT its behavior (each tool is
//      characterized in its own test file).
// ToolsPanel does not consume ToolsContext directly; it renders Timer/Stopwatch
// which do, so the harness wraps the real ToolsProvider (integration posture).
//
// No fake timers: ToolsPanel exercises no countdown/interval (tool tabs render
// idle; useModalA11y focus is synchronous), so real timers + userEvent is the
// robust choice here — unlike Timer/Stopwatch, which drive timers.

import { describe, it, expect } from 'vitest';
import { useState, useCallback } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { ToolsProvider } from '../../context/ToolsContext.jsx';
import ToolsPanel from './ToolsPanel.jsx';

// vitest-axe matcher registration is local to this file — ToolsPanel is the
// first axe-using test in the codebase. Lifting to src/test/setup.js becomes
// worth doing once Batches 7 (EquipmentSelect) and 8 (PostWorkoutModal) land
// their axe tests; at that point three+ consumers justify the consolidation.
// Until then, local registration keeps axe opt-in and avoids mid-batch
// infrastructure changes for downstream batches' benefit.
expect.extend(axeMatchers);

// Stateful harness: ToolsPanel is controlled (parent owns isOpen + activeTool).
// Callbacks are wrapped in useCallback so they're stable — useModalA11y's effect
// depends on onClose, so a fresh identity each render would re-run the effect and
// thrash focus on every activeTool change. The "Launch Tools" trigger gives
// useModalA11y a real previously-focused element to return focus to on close.
function Harness({ startOpen = false, startTool = 'menu' }) {
  const [isOpen, setIsOpen] = useState(startOpen);
  const [activeTool, setActiveTool] = useState(startTool);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleSelect = useCallback((t) => setActiveTool(t), []);
  return (
    <ToolsProvider>
      <button type="button" onClick={() => setIsOpen(true)}>Launch Tools</button>
      <ToolsPanel
        isOpen={isOpen}
        onClose={handleClose}
        activeTool={activeTool}
        onSelectTool={handleSelect}
      />
    </ToolsProvider>
  );
}

describe('ToolsPanel — open / closed', () => {
  it('renders nothing when closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens to the tools menu listing all five tools', () => {
    render(<Harness startOpen />);
    expect(screen.getByRole('dialog', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1RM Calculator/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RPE Calculator/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plate Calculator/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rest Timer/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stopwatch/ })).toBeInTheDocument();
  });
});

describe('ToolsPanel — menu→detail routing (Rule #21: the tool mounts, not its behavior)', () => {
  const ROUTES = [
    { tool: '1rm', title: '1RM Calculator', probe: () => screen.getByLabelText('Weight (lbs)') },
    { tool: 'rpe', title: 'RPE Calculator', probe: () => screen.getByLabelText('1RM (lbs)') },
    { tool: 'plates', title: 'Plate Calculator', probe: () => screen.getByLabelText('Target (lbs)') },
    // "Rest Timer" here is ToolsPanel's panel label for the Timer component as
    // presented in the tools panel. It is NOT Batch 10's RestTimer.jsx (the
    // workout-screen rest timer to be extracted), and NOT the
    // #rest-timer-tools-context-consolidation design question — three distinct
    // uses of the phrase. Here it's just Timer's label inside the panel.
    { tool: 'timer', title: 'Rest Timer', probe: () => screen.getByText('Set Duration') },
    { tool: 'stopwatch', title: 'Stopwatch', probe: () => screen.getByText('Ready') },
  ];

  it.each(ROUTES)('routes activeTool="$tool" to its component under the "$title" title', ({ tool, title, probe }) => {
    render(<Harness startOpen startTool={tool} />);
    expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
    expect(probe()).toBeInTheDocument();
  });
});

describe("ToolsPanel — local master-detail focus effect", () => {
  it('moves focus to Back when entering a tool, and to the first menu item when returning', async () => {
    const user = userEvent.setup();
    render(<Harness startOpen />);
    await user.click(screen.getByRole('button', { name: /1RM Calculator/ }));
    // dispatch + routing landed, and the local effect moved focus to Back
    expect(screen.getByRole('dialog', { name: '1RM Calculator' })).toBeInTheDocument();
    expect(screen.getByLabelText('Weight (lbs)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to tools menu' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Back to tools menu' }));
    expect(screen.getByRole('dialog', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1RM Calculator/ })).toHaveFocus();
  });
});

describe('ToolsPanel — useModalA11y integration (not the hook internals)', () => {
  it('moves initial focus to the first menu item on open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Launch Tools' }));
    expect(screen.getByRole('button', { name: /1RM Calculator/ })).toHaveFocus();
  });

  it('traps Tab focus inside the dialog in both directions', async () => {
    const user = userEvent.setup();
    render(<Harness startOpen />);
    const first = screen.getByRole('button', { name: /1RM Calculator/ });
    const last = screen.getByRole('button', { name: /Stopwatch/ });
    expect(first).toHaveFocus(); // initial focus
    await user.keyboard('{Shift>}{Tab}{/Shift}'); // wrap backward off the first
    expect(last).toHaveFocus();
    await user.keyboard('{Tab}'); // wrap forward off the last
    expect(first).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness startOpen />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the trigger when closed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Launch Tools' });
    await user.click(trigger); // trigger focused + panel opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
});

describe('ToolsPanel — close affordances', () => {
  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness startOpen />);
    await user.click(screen.getByRole('button', { name: 'Close tools panel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ToolsPanel — accessibility (axe)', () => {
  // wcag22aa scope; region + heading-order disabled at component granularity per
  // docs/decisions.md#accessibility-testing (they apply at page level, not here).
  // No per-test rule suppressions beyond those two.
  const axeOpts = {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { region: { enabled: false }, 'heading-order': { enabled: false } },
  };

  it('has no violations on the tools menu', async () => {
    const { container } = render(<Harness startOpen />);
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it('has no violations on a tool detail view', async () => {
    const { container } = render(<Harness startOpen startTool="timer" />);
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});
