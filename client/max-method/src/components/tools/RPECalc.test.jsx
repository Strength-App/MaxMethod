// Characterization tests for src/components/tools/RPECalc.jsx.
//
// RPECalc is D-classified; these tests pin its current observable behavior
// against unmodified source. Unlike OneRMCalc (whose 1RM math lives in
// utils/epley.js, so its tests recompute from the imported util and pin only
// wiring), RPECalc's coefficient table (RPE × reps → %-of-1RM) and its
// prescribe-weight formula live INLINE in the component — there is no util to
// recompute from. Per Rule #21 the correct layer to pin a component-owned
// invariant is the component test itself, so these tests encode table values
// directly. The table (PERCENTAGES / RPE_VALUES) is a module-local const, not
// exported; per Rule #2 we do NOT add an export just to ease testing, so the
// sampled percentages below are transcribed by hand from the source. The
// consolidation question (table + the inline floor-to-5) is tracked at
// docs/follow-ups.md#rpe-coefficients-and-floor5-inline.
//
// Cell sampling is semantic, not "representative coverage" — pinning all 96
// cells would just re-encode the source data. We sample three slices:
//   - corners: the four extremes of the (RPE, reps) grid, which verify the
//     stepper-to-table indexing actually reaches every corner (off-by-one
//     clamp bugs hide in corners);
//   - canonical sanity: RPE 10 / 1 rep must be 100% (the definition of a 1RM) —
//     if it isn't, the table is mistranscribed and this fails loudly;
//   - interior diagonal: a few cells across both axes, confirming the
//     index-into-table wiring is consistent regardless of which stepper moved.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RPECalc from './RPECalc.jsx';

// RPECalc's stepper ladder (descending). Defaults: reps 5, RPE 8 (index 4).
const RPE_LADDER = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5];

// The component's prescribe formula, recomputed in-test from the (transcribed)
// table percentage so the floor-to-5 + percentage wiring is pinned, not a
// hand-computed final number.
function expectedPrescribed(oneRM, pct) {
  return Math.floor((oneRM * pct) / 100 / 5) * 5;
}
function expectedDisplay(oneRM, pct) {
  return `${expectedPrescribed(oneRM, pct).toLocaleString()} lbs`;
}

async function clickN(user, name, n) {
  for (let i = 0; i < n; i++) {
    await user.click(screen.getByRole('button', { name }));
  }
}

// Walk the steppers from the component's defaults (reps 5, RPE 8) to a target
// cell. Increase-RPE moves UP the ladder (toward index 0); decrease-RPE moves
// down. All target cells are reached with exact click counts (no over-clicking
// a disabled boundary button).
async function gotoCell(user, targetReps, targetRpe) {
  const repsDelta = targetReps - 5;
  await clickN(user, repsDelta > 0 ? 'Increase reps' : 'Decrease reps', Math.abs(repsDelta));
  const idxDelta = RPE_LADDER.indexOf(targetRpe) - 4;
  await clickN(user, idxDelta < 0 ? 'Increase RPE' : 'Decrease RPE', Math.abs(idxDelta));
}

describe('RPECalc — initial / default state', () => {
  it('defaults to 5 reps, RPE 8.0, an empty 1RM, and the idle prompt', () => {
    render(<RPECalc />);
    expect(screen.getByLabelText('1RM (lbs)')).toHaveValue(null);
    expect(screen.getByText('5')).toBeInTheDocument();   // reps stepper value
    expect(screen.getByText('8.0')).toBeInTheDocument(); // RPE stepper value
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Prescribed Weight')).toBeInTheDocument();
    expect(
      screen.getByText('Enter your one rep max to see prescribed weight'),
    ).toBeInTheDocument();
  });
});

describe('RPECalc — prescribed weight per table cell (corners + canonical + diagonal)', () => {
  // pct values transcribed from RPECalc.jsx PERCENTAGES (module-local, not
  // exported — see header). Consolidation tracked at
  // docs/follow-ups.md#rpe-coefficients-and-floor5-inline.
  const CELLS = [
    { reps: 1,  rpe: 10,  pct: 100.0, slice: 'corner + canonical sanity: RPE 10 / 1 rep = 100% (the 1RM definition)' },
    { reps: 12, rpe: 6.5, pct: 58.6,  slice: 'corner: RPE 6.5 / 12 reps (lowest RPE, most reps)' },
    { reps: 12, rpe: 10,  pct: 68.0,  slice: 'corner: RPE 10 / 12 reps (highest RPE, most reps)' },
    { reps: 1,  rpe: 6.5, pct: 87.8,  slice: 'corner: RPE 6.5 / 1 rep (lowest RPE, fewest reps)' },
    { reps: 5,  rpe: 8,   pct: 81.1,  slice: 'interior diagonal: RPE 8 / 5 reps' },
    { reps: 3,  rpe: 9,   pct: 89.2,  slice: 'interior diagonal: RPE 9 / 3 reps' },
    { reps: 10, rpe: 7,   pct: 65.3,  slice: 'interior diagonal: RPE 7 / 10 reps' },
  ];

  it.each(CELLS)('$slice', async ({ reps, rpe, pct }) => {
    const user = userEvent.setup();
    render(<RPECalc />);
    await user.type(screen.getByLabelText('1RM (lbs)'), '315');
    await gotoCell(user, reps, rpe);
    expect(screen.getByText(expectedDisplay(315, pct))).toBeInTheDocument();
    expect(screen.getByText(`${pct.toFixed(1)}% of 1RM`)).toBeInTheDocument();
  });
});

describe('RPECalc — formula and accessible announcement', () => {
  it('floors the prescribed weight down to the nearest 5 lb', async () => {
    const user = userEvent.setup();
    render(<RPECalc />);
    await user.type(screen.getByLabelText('1RM (lbs)'), '315');
    // Default RPE 8 / 5 reps = 81.1%; 315 × 81.1% = 255.465 → floored to 255.
    expect(screen.getByText('255 lbs')).toBeInTheDocument();
    expect(screen.queryByText('256 lbs')).not.toBeInTheDocument();
    expect(screen.queryByText('260 lbs')).not.toBeInTheDocument();
  });

  it('announces prescribed weight and percentage via the aria-live region', async () => {
    const user = userEvent.setup();
    render(<RPECalc />);
    await user.type(screen.getByLabelText('1RM (lbs)'), '315');
    expect(
      screen.getByText('Prescribed weight: 255 pounds, 81.1 percent of one rep max'),
    ).toBeInTheDocument();
  });

  it('shows the idle prompt when the 1RM is zero (invalid)', async () => {
    const user = userEvent.setup();
    render(<RPECalc />);
    await user.type(screen.getByLabelText('1RM (lbs)'), '0');
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(
      screen.getByText('Enter your one rep max to see prescribed weight'),
    ).toBeInTheDocument();
  });
});

describe('RPECalc — stepper navigation and clamping', () => {
  it('clamps reps to [1, 12]', async () => {
    const user = userEvent.setup();
    render(<RPECalc />);
    await clickN(user, 'Decrease reps', 4); // 5 → 1
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease reps' })).toBeDisabled();
    await clickN(user, 'Increase reps', 11); // 1 → 12
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase reps' })).toBeDisabled();
  });

  it('clamps RPE to the [6.5, 10] ladder', async () => {
    const user = userEvent.setup();
    render(<RPECalc />);
    await clickN(user, 'Increase RPE', 4); // 8.0 → 10.0
    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase RPE' })).toBeDisabled();
    await clickN(user, 'Decrease RPE', 7); // 10.0 → 6.5
    expect(screen.getByText('6.5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease RPE' })).toBeDisabled();
  });
});
