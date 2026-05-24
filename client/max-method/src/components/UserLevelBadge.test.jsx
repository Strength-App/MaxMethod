// Characterization tests for src/components/UserLevelBadge.jsx.
//
// UserLevelBadge is D-classified and PURELY PRESENTATIONAL: no focus management,
// no keyboard contract, no context — so none of the Batch 7 test-design hazards
// (timer pattern, useModalA11y memoization) apply here. It owns Risk #4
// (Beginner-1 anchor) and carries the FIRST snapshot in the codebase.
//
// Risk #4 (Q1 = both-sides + clamp): a Beginner-1 user's progress-bar origin is
// the beginner1Anchor (their big-3 total when they first reached Beginner 1), not
// the threshold-table floor. computePct (source lines 67-75) substitutes the
// anchor for currentThreshold as the left bound ONLY when fineLevel === 'Beginner
// 1' AND anchor != null; leftLabel (lines 208-209, rendered at 262) mirrors it.
// Pinned in three states: anchored (origin = anchor), un-anchored (origin =
// floor), and the anchor > total clamp (fill pinned to 0, origin still the
// anchor). The "fill = 0%" half is asserted via the progressbar's aria-valuenow
// (line 252), NOT the bar-fill's raw style width: the fill <div> has no
// role/label/text handle, the codebase forbids testing-library/no-node-access
// (no test reaches for DOM nodes), and in the static idle state aria-valuenow ===
// round(fill-width-%) exactly — so aria-valuenow is the Rule #19 (ARIA-over-DOM)
// mirror of the width.
//
// Snapshots (first in the codebase; see docs/decisions.md#snapshot-conventions):
// file-based via asFragment() → __snapshots__/UserLevelBadge.test.jsx.snap, STATIC
// STATE ONLY (no animateFromTotal — the rAF phase machine is nondeterministic
// mid-flight), one per structurally-distinct branch (null-state, normal, Elite,
// Beginner-1-with-anchor), full-DOM with prop tuples chosen for clean numeric
// output (totals at exact tier midpoints → width: 50%).
//
// matchMedia: the default setup.js mock (matches=false → prefers-reduced-motion
// off) is sufficient — reduced-motion only gates the animation path, which static
// renders skip; no per-test override needed.
//
// Animated path (the phase machine + onPhaseTransition) is OUT OF SCOPE this batch:
// not a Risk Register item, and snapshots are static-only. Documented as a located
// gap; if pinned later it would use fireEvent.transitionEnd, not snapshots.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserLevelBadge from './UserLevelBadge.jsx';

// MALE_THRESHOLDS[200] = [637,686,735,784,841,899,956,1019,1081,1144,1209,1274,1339]
// Picks (all male, bodyweight 200) chosen for clean numbers:
//  - Novice 2 mid-tier:   total 870  → midpoint of 841↔899 → 50% fill, 29 lbs to Novice 3
//  - Elite:               total 1400 → >= 1339 → Maxed Out (fill 100%)
//  - Beginner 1 + anchor: anchor 600, total 643 → (643-600)/(686-600) = 50%, origin 600
//  - Clamp edge:          anchor 650, total 620 → (620-650) clamps to 0%, origin still 650
const MALE = { sex: 'male', bodyweight: 200 };

describe('UserLevelBadge — Risk #4 (Beginner-1 anchor)', () => {
  it('uses the anchor as the progress origin for a Beginner-1 user, not the threshold floor', () => {
    render(<UserLevelBadge {...MALE} total={643} beginner1Anchor={600} />);
    expect(screen.getByText('600')).toBeInTheDocument();          // leftLabel = anchor
    expect(screen.queryByText('637')).not.toBeInTheDocument();    // NOT currentThreshold (637)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50'); // (643-600)/(686-600)
  });

  it('falls back to the threshold floor as the origin when no anchor is provided', () => {
    render(<UserLevelBadge {...MALE} total={643} />);
    expect(screen.getByText('637')).toBeInTheDocument();          // leftLabel = currentThreshold floor
    expect(screen.queryByText('600')).not.toBeInTheDocument();
  });

  it('clamps the fill to 0% but keeps the anchor as the origin when anchor > total', () => {
    render(<UserLevelBadge {...MALE} total={620} beginner1Anchor={650} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0'); // (620-650) → max(0,...)
    expect(screen.getByText('650')).toBeInTheDocument();          // origin label still the anchor
  });
});

describe('UserLevelBadge — normal mid-tier badge', () => {
  it('renders the progress contract for a Novice 2 user (exact 50%)', () => {
    render(<UserLevelBadge {...MALE} total={870} />);
    const pb = screen.getByRole('progressbar');
    expect(pb).toHaveAttribute('aria-valuenow', '50');
    expect(pb).toHaveAttribute('aria-label', '50% to Novice 3');
    expect(screen.getByText('29 lbs')).toBeInTheDocument();       // lbsToNext
    expect(screen.getByText('50%')).toBeInTheDocument();          // mid-percent
    expect(screen.getByText('841')).toBeInTheDocument();          // currentThreshold (left)
    expect(screen.getByText('899')).toBeInTheDocument();          // nextThreshold (right)
  });
});

describe('UserLevelBadge — Elite (maxed out)', () => {
  it('renders the maxed-out state with no next tier', () => {
    render(<UserLevelBadge {...MALE} total={1400} />);
    const pb = screen.getByRole('progressbar');
    expect(pb).toHaveAttribute('aria-label', 'Maxed out');
    expect(pb).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Maxed Out')).toBeInTheDocument();
  });
});

describe('UserLevelBadge — render gating', () => {
  it('hides the progress region when showProgress is false', () => {
    render(<UserLevelBadge {...MALE} total={870} showProgress={false} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Novice 2')).toBeInTheDocument();     // the label still renders
  });

  it('renders nothing when sex is missing (cannot pick a threshold table)', () => {
    render(<div data-testid="wrap"><UserLevelBadge bodyweight={200} total={870} /></div>);
    expect(screen.getByTestId('wrap')).toBeEmptyDOMElement();
  });

  it('renders nothing when bodyweight is missing', () => {
    render(<div data-testid="wrap"><UserLevelBadge sex="male" total={870} /></div>);
    expect(screen.getByTestId('wrap')).toBeEmptyDOMElement();
  });
});

describe('UserLevelBadge — snapshots (static state; see #snapshot-conventions)', () => {
  it('matches the null-state message', () => {
    const { asFragment } = render(<UserLevelBadge nullState />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches the normal mid-tier badge (Novice 2, 50% fill)', () => {
    const { asFragment } = render(<UserLevelBadge {...MALE} total={870} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches the Elite (maxed-out) badge', () => {
    const { asFragment } = render(<UserLevelBadge {...MALE} total={1400} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches the Beginner-1 anchored badge (origin = anchor)', () => {
    const { asFragment } = render(<UserLevelBadge {...MALE} total={643} beginner1Anchor={600} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
