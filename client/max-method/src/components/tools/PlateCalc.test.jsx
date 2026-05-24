// Characterization tests for src/components/tools/PlateCalc.jsx.
//
// PlateCalc is D-classified (plan: "Components — tools"); these tests pin its
// CURRENT observable behavior against unmodified source. The internal
// `computePlates` greedy packer is not exported, so behavior is characterized
// through the rendered output: the visible per-side breakdown note, the
// invalid-input message, the plate-stack <svg role="img"> accessible name, and
// the sr-only aria-live announcement.
//
// Risk #9 (plan Risk Register) asks this batch to "assert mathematically
// correct per-side breakdown" for the standard barbell targets and to confirm
// invalid inputs surface the documented fallback. The risk has no "(BUG)"
// marker (unlike Risk #8 / #11) and there is no recorded PlateCalc defect, so
// the expectation is that the tests PASS against unmodified source — i.e. the
// greedy algorithm is already optimal. They do (see the ground-truth note in
// the batch summary).
//
// Two-field table design (the load-bearing part of Risk #9):
//   - `observed` — what PlateCalc actually renders today. The
//     `getByText(observed)` query is the CHARACTERIZATION assertion: it fails
//     loudly (naming the missing string + dumping the DOM) if the component's
//     output ever changes.
//   - `optimal` — the mathematical minimum-plate breakdown, derived
//     independently of greedy. The `observed === optimal` assertion is the
//     OPTIMALITY finding: for these targets, greedy achieves the true minimum.
//     (Optimality was cross-checked with a DP minimum-coin solver during test
//     design; the seven standard targets were chosen to have unambiguous
//     minimal solutions, so there is no greedy-vs-DP tie to adjudicate.)
// Where the two coincide, every row yields two passing assertions; if either
// the component drifts or the hand-derived optimum is wrong, the failure names
// which field diverged.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention
// — the render() calls contain JSX.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlateCalc from './PlateCalc.jsx';

// Render PlateCalc and drive its inputs the way a user would. `bar` defaults to
// the component's own default of 45 (left untouched); pass `bar` to override,
// or `bar: ''` to clear it (exercises the non-finite-bar branch).
async function loadPlates(target, { bar } = {}) {
  const user = userEvent.setup();
  render(<PlateCalc />);
  if (bar !== undefined) {
    const barInput = screen.getByLabelText('Bar (lbs)');
    await user.clear(barInput);
    if (bar !== '') await user.type(barInput, String(bar));
  }
  if (target !== '') {
    await user.type(screen.getByLabelText('Target (lbs)'), String(target));
  }
  return { user };
}

describe('PlateCalc — initial / empty state', () => {
  it('renders with bar defaulted to 45 and no target entered', () => {
    render(<PlateCalc />);
    expect(screen.getByLabelText('Target (lbs)')).toHaveValue(null);
    expect(screen.getByLabelText('Bar (lbs)')).toHaveValue(45);
  });

  it('shows the idle "Plate Loading" prompt and no plate diagram before input', () => {
    render(<PlateCalc />);
    expect(screen.getByText('Plate Loading')).toBeInTheDocument();
    expect(screen.getByText('Enter target weight to see plate loading')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    // No SVG diagram until the input resolves to a loadable weight. The
    // diagram lives inside an aria-hidden="true" wrapper (it's decorative —
    // the accessible channel is the sr-only aria-live region), so it never
    // enters the accessibility tree; query it with hidden:true to detect it.
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('treats target 0 as empty (idle prompt, not an error)', async () => {
    await loadPlates(0);
    expect(screen.getByText('Plate Loading')).toBeInTheDocument();
    expect(screen.getByText('Enter target weight to see plate loading')).toBeInTheDocument();
    expect(screen.queryByText('Per Side')).not.toBeInTheDocument();
  });
});

describe('PlateCalc — Risk #9: standard barbell targets (greedy == mathematical optimum)', () => {
  // bar = 45 (default) for every row. `observed` and `optimal` are equal for
  // all seven — that equality IS the Risk #9 finding (greedy is optimal here).
  const STANDARD = [
    { target: 45,  observed: 'Bar only — no plates', optimal: 'Bar only — no plates' },
    { target: 95,  observed: '1× 25',                optimal: '1× 25' },
    { target: 135, observed: '1× 45',                optimal: '1× 45' },
    { target: 185, observed: '1× 45, 1× 25',         optimal: '1× 45, 1× 25' },
    { target: 225, observed: '2× 45',                optimal: '2× 45' },
    { target: 315, observed: '3× 45',                optimal: '3× 45' },
    { target: 405, observed: '4× 45',                optimal: '4× 45' },
  ];

  it.each(STANDARD)(
    'loads $target lbs as $observed per side',
    async ({ target, observed, optimal }) => {
      await loadPlates(target);
      // Characterization: the DOM contains exactly the observed breakdown.
      expect(screen.getByText(observed)).toBeInTheDocument();
      // Optimality: the observed breakdown is the mathematical minimum.
      expect(observed).toBe(optimal);
      // A loadable weight is labelled "Per Side" (true even for bar-only).
      expect(screen.getByText('Per Side')).toBeInTheDocument();
    },
  );

  // The plate-stack diagram is decorative (aria-hidden), so it's queried with
  // hidden:true. Pinning its descriptive label anyway documents the count it
  // would announce if the diagram were ever surfaced to assistive tech.
  it('names the plate count on the diagram for a single-plate load (95 lbs)', async () => {
    await loadPlates(95);
    expect(
      screen.getByRole('img', { hidden: true, name: 'Plate stack diagram, 1 plate per side' }),
    ).toBeInTheDocument();
  });

  it('names the plate count on the diagram for a multi-plate load (185 lbs)', async () => {
    await loadPlates(185);
    expect(
      screen.getByRole('img', { hidden: true, name: 'Plate stack diagram, 2 plates per side' }),
    ).toBeInTheDocument();
  });
});

describe('PlateCalc — denomination coverage (25 / 10 / 5 / 2.5 plates)', () => {
  // The seven standard targets only exercise 45s and 25s. These targets reach
  // the smaller denominations so the greedy loop is characterized end to end.
  // Each was chosen to have a unique minimal solution (observed == optimal).
  const COVERAGE = [
    { target: 65, observed: '1× 10',                optimal: '1× 10' },
    { target: 55, observed: '1× 5',                 optimal: '1× 5' },
    { target: 50, observed: '1× 2.5',              optimal: '1× 2.5' },
    { target: 80, observed: '1× 10, 1× 5, 1× 2.5',  optimal: '1× 10, 1× 5, 1× 2.5' },
    { target: 250, observed: '2× 45, 1× 10, 1× 2.5', optimal: '2× 45, 1× 10, 1× 2.5' },
  ];

  it.each(COVERAGE)(
    'loads $target lbs as $observed per side',
    async ({ target, observed, optimal }) => {
      await loadPlates(target);
      expect(screen.getByText(observed)).toBeInTheDocument();
      expect(observed).toBe(optimal);
    },
  );
});

describe('PlateCalc — invalid and non-loadable inputs surface the documented fallback', () => {
  // For invalid input the message renders in BOTH the visible note and the
  // sr-only aria-live region, so each is asserted with getAllByText length 2.
  it('rejects a target below the bar weight', async () => {
    await loadPlates(30); // bar defaults to 45
    expect(screen.getByText('Invalid Weight')).toBeInTheDocument();
    expect(
      screen.getAllByText('Target weight must be at least the bar weight (45 lbs).'),
    ).toHaveLength(2);
  });

  it('rejects a non-5lb-loadable target and suggests the nearest loadable weights', async () => {
    await loadPlates(92); // 47 lbs of plates → not a 5 lb multiple
    expect(screen.getByText('Invalid Weight')).toBeInTheDocument();
    expect(
      screen.getAllByText("92 lbs can't be loaded — try 90 or 95 lbs."),
    ).toHaveLength(2);
  });

  it('rejects a cleared (non-finite) bar weight', async () => {
    await loadPlates(225, { bar: '' });
    expect(screen.getByText('Invalid Weight')).toBeInTheDocument();
    expect(
      screen.getAllByText('Bar weight must be a non-negative number.'),
    ).toHaveLength(2);
  });

  it('rejects a negative bar weight', async () => {
    await loadPlates(225, { bar: -5 });
    expect(screen.getByText('Invalid Weight')).toBeInTheDocument();
    expect(
      screen.getAllByText('Bar weight must be a non-negative number.'),
    ).toHaveLength(2);
  });
});

describe('PlateCalc — accessible announcement (aria-live)', () => {
  it('announces the full plate loading for a valid weight', async () => {
    await loadPlates(225);
    expect(
      screen.getByText('225 pounds loads as: 2 45 pound plates, per side'),
    ).toBeInTheDocument();
  });

  it('spells out the 2.5 lb plate in words', async () => {
    await loadPlates(50);
    expect(
      screen.getByText('50 pounds loads as: 1 two and a half pound plate, per side'),
    ).toBeInTheDocument();
  });

  it('announces the error message for an invalid weight', async () => {
    await loadPlates(30);
    // Message appears both in the visible note and the aria-live region.
    expect(
      screen.getAllByText('Target weight must be at least the bar weight (45 lbs).'),
    ).toHaveLength(2);
  });
});

describe('PlateCalc — reacts to input changes', () => {
  it('recomputes the breakdown as the target changes', async () => {
    const { user } = await loadPlates(135);
    expect(screen.getByText('1× 45')).toBeInTheDocument();
    // Append a digit: 135 -> 1350 is below... instead clear and retype.
    await user.clear(screen.getByLabelText('Target (lbs)'));
    await user.type(screen.getByLabelText('Target (lbs)'), '225');
    expect(screen.getByText('2× 45')).toBeInTheDocument();
    expect(screen.queryByText('1× 45')).not.toBeInTheDocument();
  });

  it('recomputes when the bar weight changes', async () => {
    // 135 with a 45 bar => 1× 45 per side; with a 35 bar => 50 lbs/side => 1× 45, 1× 5.
    const { user } = await loadPlates(135);
    expect(screen.getByText('1× 45')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Bar (lbs)'));
    await user.type(screen.getByLabelText('Bar (lbs)'), '35');
    expect(screen.getByText('1× 45, 1× 5')).toBeInTheDocument();
  });
});
