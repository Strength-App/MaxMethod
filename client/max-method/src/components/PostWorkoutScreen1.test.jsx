// Characterization tests for src/components/PostWorkoutScreen1.jsx.
//
// PostWorkoutScreen1 is D-classified and PURELY PRESENTATIONAL: it takes data
// via props (summaryData, streakStats, labels) and renders the post-workout
// summary screen. No context, no router, no focus management, no keyboard
// contract — so none of the Batch 7 test-design hazards (timer patterns,
// useModalA11y memoization) apply. Plain render() with prop objects is enough.
//
// What this file pins:
//   - The screen-reader contract. Every numeric stat is rendered twice: an
//     aria-hidden visual node and an `sr-only` text node that spells the value
//     out for assistive tech. The visual nodes have no accessible name, so the
//     tests assert on the sr-only text (Rule #19: assert what a screen-reader
//     user actually perceives, not raw DOM).
//   - The conditional blocks: the "By Exercise" breakdown and "Personal
//     Records" sections each render only when their array is non-empty.
//   - The Continue button's label/aria/disabled/aria-busy state machine, which
//     swaps text and aria-label while a save is in flight (`continuing`).
//   - Snapshots for the two structurally-distinct shapes (fully-populated vs.
//     empty) — PostWorkoutScreen1 is one of the three snapshot-listed
//     components (see docs/decisions.md#snapshot-conventions).
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostWorkoutScreen1 from './PostWorkoutScreen1.jsx';

// A fully-populated set of props. Individual tests override the slice they care
// about. Numbers chosen to exercise the toLocaleString thousands-separator path
// (12,345) and the singular/plural branches (thisMonth: 1).
const SUMMARY = {
  totalVolume: 12345,
  totalSets: 18,
  breakdown: [
    {
      name: 'Bench Press',
      sets: 3,
      volume: 4050,
      setDetails: [
        { reps: 5, weight: 135 },
        { reps: 5, weight: 135 },
        { reps: 8, weight: 150 },
      ],
    },
  ],
  prs: [
    { exercise: 'Squat', weight: 315, reps: 3 },
    { exercise: 'Deadlift', weight: 405 },
  ],
};

const STREAKS = { totalSessions: 12, weeksLogged: 4, thisMonth: 1, daysThisWeek: 3 };

function setup(props = {}) {
  const onContinue = props.onContinue ?? vi.fn();
  const utils = render(
    <PostWorkoutScreen1
      title="Upper Body A"
      summaryData={props.summaryData ?? SUMMARY}
      streakStats={props.streakStats ?? STREAKS}
      continuing={props.continuing ?? false}
      continueLabel={props.continueLabel}
      savingLabel={props.savingLabel}
      continueAriaLabel={props.continueAriaLabel}
      savingAriaLabel={props.savingAriaLabel}
      onContinue={onContinue}
      ariaIdPrefix={props.ariaIdPrefix}
    />,
  );
  return { onContinue, ...utils };
}

describe('PostWorkoutScreen1 — header', () => {
  it('renders the "Workout Complete" title and the passed title as the subtitle', () => {
    setup();
    expect(screen.getByText('Workout Complete')).toBeInTheDocument();
    expect(screen.getByText('Upper Body A')).toBeInTheDocument();
  });

  it('derives the title/subtitle element ids from ariaIdPrefix', () => {
    setup({ ariaIdPrefix: 'lg-post-workout' });
    // The ids are what PostWorkoutModal points aria-labelledby/-describedby at;
    // logger passes a disjoint prefix so the summary ids never collide with
    // PostWorkoutScreen2's hardcoded 'post-workout-screen2-*' ids.
    expect(screen.getByText('Workout Complete')).toHaveAttribute('id', 'lg-post-workout-title');
    expect(screen.getByText('Upper Body A')).toHaveAttribute('id', 'lg-post-workout-subtitle');
  });
});

describe('PostWorkoutScreen1 — streak row (screen-reader contract)', () => {
  it('spells out each streak metric for assistive tech', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Workout streaks' })).toBeInTheDocument();
    expect(screen.getByText('Total sessions: 12')).toBeInTheDocument();
    expect(screen.getByText('Weeks logged: 4')).toBeInTheDocument();
    expect(screen.getByText('Days this week: 3 of 7')).toBeInTheDocument();
  });

  it('uses the singular "session" when thisMonth is exactly 1', () => {
    setup();
    expect(screen.getByText('This month: 1 session')).toBeInTheDocument();
  });

  it('uses the plural "sessions" when thisMonth is not 1', () => {
    setup({ streakStats: { ...STREAKS, thisMonth: 5 } });
    expect(screen.getByText('This month: 5 sessions')).toBeInTheDocument();
  });
});

describe('PostWorkoutScreen1 — totals (screen-reader contract)', () => {
  it('renders volume and sets with thousands separators for non-zero values', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Workout totals' })).toBeInTheDocument();
    expect(screen.getByText('Total volume: 12,345 pounds')).toBeInTheDocument();
    expect(screen.getByText('Total sets: 18')).toBeInTheDocument();
  });

  it('reads "none recorded" when totalVolume is 0', () => {
    setup({ summaryData: { ...SUMMARY, totalVolume: 0 } });
    expect(screen.getByText('Total volume: none recorded')).toBeInTheDocument();
  });

  it('reads "none recorded" when totalSets is null', () => {
    setup({ summaryData: { ...SUMMARY, totalSets: null } });
    expect(screen.getByText('Total sets: none recorded')).toBeInTheDocument();
  });
});

describe('PostWorkoutScreen1 — exercise breakdown (conditional)', () => {
  it('renders the breakdown with collapsed set lines when breakdown is non-empty', () => {
    setup();
    expect(screen.getByText('By Exercise')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('3 sets')).toBeInTheDocument();
    // setDetails [5@135, 5@135, 8@150] collapse to "2x5 @ 135 lbs" + "1x8 @ 150 lbs"
    const list = screen.getByRole('list', { name: 'Sets for Bench Press' });
    expect(list).toBeInTheDocument();
    expect(screen.getByText('2x5 @ 135 lbs')).toBeInTheDocument();
    expect(screen.getByText('1x8 @ 150 lbs')).toBeInTheDocument();
  });

  it('uses the singular "set" when an exercise has exactly one set', () => {
    setup({
      summaryData: {
        ...SUMMARY,
        breakdown: [{ name: 'Curl', sets: 1, volume: 250, setDetails: [{ reps: 10, weight: 25 }] }],
      },
    });
    expect(screen.getByText('1 set')).toBeInTheDocument();
  });

  it('does not render the breakdown section when breakdown is empty', () => {
    setup({ summaryData: { ...SUMMARY, breakdown: [] } });
    expect(screen.queryByText('By Exercise')).not.toBeInTheDocument();
  });

  it('does not render the breakdown section when breakdown is absent', () => {
    setup({ summaryData: { totalVolume: 100, totalSets: 2 } });
    expect(screen.queryByText('By Exercise')).not.toBeInTheDocument();
  });
});

describe('PostWorkoutScreen1 — personal records (conditional)', () => {
  it('renders PRs with and without a reps suffix', () => {
    setup();
    expect(screen.getByText('Personal Records')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('315 lbs x 3 reps')).toBeInTheDocument();
    // Deadlift PR has no reps → no "x N reps" suffix.
    expect(screen.getByText('405 lbs')).toBeInTheDocument();
  });

  it('does not render the PR section when prs is empty', () => {
    setup({ summaryData: { ...SUMMARY, prs: [] } });
    expect(screen.queryByText('Personal Records')).not.toBeInTheDocument();
  });
});

describe('PostWorkoutScreen1 — Continue button', () => {
  it('renders the default label and fires onContinue on click', async () => {
    const user = userEvent.setup();
    const { onContinue } = setup();
    const btn = screen.getByRole('button', { name: 'Continue' });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('uses a custom continueLabel when provided', () => {
    setup({ continueLabel: 'See Results' });
    expect(screen.getByRole('button', { name: 'See Results' })).toBeInTheDocument();
  });

  it('swaps to the saving label and disables + marks aria-busy while continuing', () => {
    setup({
      continuing: true,
      continueLabel: 'Continue',
      savingLabel: 'Saving…',
      continueAriaLabel: 'Continue to results',
      savingAriaLabel: 'Saving your workout',
    });
    const btn = screen.getByRole('button', { name: 'Saving your workout' });
    expect(btn).toHaveTextContent('Saving…');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps the continue label when continuing but no savingLabel is given', () => {
    setup({ continuing: true, continueLabel: 'Continue' });
    // buttonText = continuing && savingLabel ? savingLabel : continueLabel
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveTextContent('Continue');
  });
});

describe('PostWorkoutScreen1 — snapshots (static state; see #snapshot-conventions)', () => {
  it('matches the fully-populated summary (breakdown + PRs)', () => {
    const { asFragment } = setup();
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches the minimal summary (no breakdown, no PRs, zero volume)', () => {
    const { asFragment } = setup({
      summaryData: { totalVolume: 0, totalSets: 0, breakdown: [], prs: [] },
      streakStats: { totalSessions: 0, weeksLogged: 0, thisMonth: 0, daysThisWeek: 0 },
    });
    expect(asFragment()).toMatchSnapshot();
  });
});
