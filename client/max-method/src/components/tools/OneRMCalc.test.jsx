// Characterization tests for src/components/tools/OneRMCalc.jsx.
//
// OneRMCalc is D-classified; these tests pin its current observable behavior
// against unmodified source. The 1RM math lives in utils/epley.js and was pinned
// in Batch 2 (Risk #2: reps===1 returns weight, the [1,15] rep window,
// non-finite/≤0 → null). Per Rule #21 this file does NOT re-pin that math at the
// component layer — instead it pins the WIRING: that OneRMCalc parses its inputs,
// routes them through estimateOneRepMax (with allowHighReps:true) + floorTo5, and
// renders the result. The valid-input assertions compute the expected value by
// calling the imported epley functions with the component's exact argument shape,
// so the test reads "OneRMCalc renders epley(input)'s output" — if any link in
// the wiring changes (the parse, the allowHighReps option, the floorTo5, the
// formatting) the render diverges from the recomputed value and the test fails,
// without duplicating the math contract. No hardcoded 1RM numbers.
//
// The number inputs are role="spinbutton"; queried here via getByLabelText
// (accessible name from the <label htmlFor>), which is role-agnostic and reads
// cleanly for two fields on one form.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OneRMCalc from './OneRMCalc.jsx';
import { estimateOneRepMax, floorTo5 } from '../../utils/epley';

// Mirror the component's exact call shape so the assertions pin the wiring, not
// a hand-computed number. estimateOneRepMax's own math is Batch 2's contract.
function expectedResult(weight, reps) {
  const e1RM = estimateOneRepMax(parseFloat(weight), parseInt(reps, 10), { allowHighReps: true });
  return e1RM == null ? null : floorTo5(e1RM);
}
function expectedDisplay(weight, reps) {
  const r = expectedResult(weight, reps);
  return r == null ? '—' : `${r.toLocaleString()} lbs`;
}
function expectedA11y(weight, reps) {
  const r = expectedResult(weight, reps);
  if (r == null) return 'Enter weight and reps to estimate one rep max';
  const parsedReps = parseInt(reps, 10);
  const lowAccuracy = Number.isInteger(parsedReps) && parsedReps > 10;
  return `Estimated one rep max: ${r.toLocaleString()} pounds${lowAccuracy ? '. Accuracy decreases beyond ten reps.' : ''}`;
}

async function loadCalc(weight, reps) {
  const user = userEvent.setup();
  render(<OneRMCalc />);
  if (weight !== '') await user.type(screen.getByLabelText('Weight (lbs)'), String(weight));
  if (reps !== '') await user.type(screen.getByLabelText('Reps'), String(reps));
  return { user };
}

describe('OneRMCalc — initial / empty state', () => {
  it('renders empty inputs, the "—" placeholder, and the idle prompt', () => {
    render(<OneRMCalc />);
    expect(screen.getByLabelText('Weight (lbs)')).toHaveValue(null);
    expect(screen.getByLabelText('Reps')).toHaveValue(null);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Estimated 1RM')).toBeInTheDocument();
    expect(
      screen.getByText('Enter weight and reps to estimate one rep max'),
    ).toBeInTheDocument();
  });
});

describe('OneRMCalc — renders the epley estimate for valid input (wiring, not math)', () => {
  // Rows are inputs only; the expected value is recomputed from the imported
  // epley functions, so these pin OneRMCalc → epley wiring, not the formula.
  const VALID = [
    { weight: 225, reps: 5 },
    { weight: 225, reps: 1 },  // reps===1 special case (estimateOneRepMax returns weight)
    { weight: 185, reps: 8 },
    { weight: 315, reps: 3 },
    { weight: 135, reps: 12 }, // high-rep (allowHighReps path)
    { weight: 900, reps: 5 },  // result ≥ 1000 → exercises toLocaleString grouping
  ];

  it.each(VALID)('weight $weight × $reps reps renders floorTo5(estimateOneRepMax(...))', async ({ weight, reps }) => {
    await loadCalc(weight, reps);
    const display = expectedDisplay(weight, reps);
    expect(display).not.toBe('—'); // guard: these rows are meant to be valid
    expect(screen.getByText(display)).toBeInTheDocument();
    expect(screen.getByText('Estimated 1RM')).toBeInTheDocument();
  });
});

describe('OneRMCalc — accessible announcement', () => {
  it('announces the estimate in pounds for valid input', async () => {
    await loadCalc(225, 5);
    expect(screen.getByText(expectedA11y(225, 5))).toBeInTheDocument();
  });

  it('announces the idle prompt when input is incomplete', async () => {
    await loadCalc(225, '');
    expect(screen.getByText(expectedA11y(225, ''))).toBeInTheDocument();
  });
});

describe('OneRMCalc — low-accuracy note above 10 reps', () => {
  it('hides the note at exactly 10 reps', async () => {
    await loadCalc(225, 10);
    expect(screen.queryByText('Estimates beyond 10 reps lose accuracy')).not.toBeInTheDocument();
    // a11y announcement carries no accuracy caveat at 10 reps
    expect(screen.getByText(expectedA11y(225, 10))).toBeInTheDocument();
  });

  it('shows the note above 10 reps, in both the visible note and the announcement', async () => {
    await loadCalc(225, 11);
    expect(screen.getByText('Estimates beyond 10 reps lose accuracy')).toBeInTheDocument();
    expect(screen.getByText(expectedA11y(225, 11))).toBeInTheDocument();
    expect(expectedA11y(225, 11)).toContain('Accuracy decreases beyond ten reps.');
  });
});

describe('OneRMCalc — invalid input falls back to the em-dash placeholder', () => {
  const INVALID = [
    { weight: '', reps: 5, why: 'no weight' },
    { weight: 225, reps: '', why: 'no reps' },
    { weight: 0, reps: 5, why: 'weight ≤ 0' },
    { weight: 225, reps: 0, why: 'reps < 1' },
  ];

  it.each(INVALID)('renders "—" when $why', async ({ weight, reps }) => {
    await loadCalc(weight, reps);
    expect(expectedResult(weight, reps)).toBeNull(); // guard: these rows are meant to be invalid
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(
      screen.getByText('Enter weight and reps to estimate one rep max'),
    ).toBeInTheDocument();
  });
});
