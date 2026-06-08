// Characterization tests for src/components/PostWorkoutScreen2.jsx.
//
// PostWorkoutScreen2 is D-classified and presentational: it renders the
// post-workout "strength profile" — a UserLevelBadge, an optional LEVEL UP
// banner, an optional list of estimated-1RM increases, and the big-3 total +
// per-lift cards. It takes everything via props (no context, no router).
//
// What this file pins:
//   - Risk #7 at the COMPONENT layer. The hook (usePostWorkoutModal.test.jsx,
//     Batch 4) pins that the pre-session snapshot (preFineLevel / preTotal) is
//     captured once and never shifts. Here we pin the consuming half: the
//     level-up decision is driven by the preFineLevel / preTotal PROPS, not by
//     a recomputation from the current oneRMs. Two renders with identical
//     oneRMs but different pre-snapshot props produce different banner
//     outcomes — proving the passed-in snapshot is honored. (Rule #21: the
//     hook pins the invariant, the component pins the wiring.)
//   - The conditional sections: LEVEL UP banner (gated by isLevelUp AND the
//     badge's onPhaseTransition callback), the e1RM-deltas group, and the
//     big-3 cards (hidden for null-state users).
//   - The screen-reader text contract for the e1RM deltas and big-3 numbers.
//   - Snapshots (static state only) for the normal and null-state shapes —
//     PostWorkoutScreen2 is snapshot-listed (docs/decisions.md#snapshot-
//     conventions) and its snapshot also captures the `wide` UserLevelBadge,
//     the structural observation point deferred from Batch 7's UserLevelBadge
//     tests.
//
// Reduced motion: the LEVEL UP banner only reveals after UserLevelBadge fires
// onPhaseTransition. In the real (motion-on) path that fires mid-animation
// (rAF + transitionend — nondeterministic in jsdom). We force prefers-reduced-
// motion ON in the banner tests so the badge fires the callback synchronously
// on mount, making the banner deterministic. The default setup.js matchMedia
// mock (matches=false) is restored afterEach.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import PostWorkoutScreen2 from './PostWorkoutScreen2.jsx';
import { fineLevel, levelProgress } from '../../utils/classification.js';

const MALE = { sex: 'male', bodyweight: 200 };

// Totals chosen against the male/bodyweight-200 threshold table (see
// UserLevelBadge.test.jsx): 870 lands in Novice 2; 650 lands in a lower tier.
// We derive the expected tier strings from the util so the test stays correct
// if the labels ever change in lockstep with the backend mirror.
const NOVICE2_TOTAL = 870;   // oneRMs sum below
const LOWER_TOTAL = 650;
const NOVICE2_LEVEL = levelProgress({ ...MALE, total: NOVICE2_TOTAL }).fineLevel;
const LOWER_LEVEL = fineLevel({ ...MALE, total: LOWER_TOTAL });

// oneRMs that sum to NOVICE2_TOTAL (300 + 270 + 300 = 870).
const NOVICE2_ONERMS = { squat: 300, bench: 270, deadlift: 300 };

function setup(props = {}) {
  const onDone = props.onDone ?? vi.fn();
  const utils = render(
    <PostWorkoutScreen2
      sex={props.sex ?? MALE.sex}
      bodyweight={props.bodyweight ?? MALE.bodyweight}
      oneRMs={props.oneRMs ?? NOVICE2_ONERMS}
      nullState={props.nullState ?? false}
      beginner1Anchor={props.beginner1Anchor ?? null}
      e1rmUpdates={props.e1rmUpdates ?? []}
      preFineLevel={props.preFineLevel ?? null}
      preTotal={props.preTotal ?? null}
      doneLabel={props.doneLabel ?? 'Done'}
      doneDisabled={props.doneDisabled ?? false}
      onDone={onDone}
    />,
  );
  return { onDone, ...utils };
}

// Switch prefers-reduced-motion ON for the lifetime of a test, restoring the
// default setup.js mock afterward.
function useReducedMotion() {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('PostWorkoutScreen2 — header', () => {
  it('renders the strength-profile header with fixed ids', () => {
    setup();
    expect(screen.getByText('Workout Complete')).toHaveAttribute('id', 'post-workout-screen2-title');
    expect(screen.getByText('Your Strength Profile')).toHaveAttribute('id', 'post-workout-screen2-subtitle');
  });
});

describe('PostWorkoutScreen2 — big-3 cards (non-null state)', () => {
  it('renders the badge, big-3 total, and per-lift cards with the screen-reader contract', () => {
    setup({ oneRMs: { squat: 315, bench: 225, deadlift: 405 } }); // total 945
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Big 3 total: 945 pounds')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Big three lifts' })).toBeInTheDocument();
    expect(screen.getByText('Squat: 315 pounds')).toBeInTheDocument();
    expect(screen.getByText('Bench: 225 pounds')).toBeInTheDocument();
    expect(screen.getByText('Deadlift: 405 pounds')).toBeInTheDocument();
  });

  it('reads "none recorded" for a lift with no weight', () => {
    setup({ oneRMs: { squat: 0, bench: 225, deadlift: 405 } });
    expect(screen.getByText('Squat: none recorded')).toBeInTheDocument();
  });
});

describe('PostWorkoutScreen2 — null-state user', () => {
  it('shows the badge empty-state and hides the big-3 cards, e1RM deltas, and banner', () => {
    setup({ nullState: true, oneRMs: { squat: 0, bench: 0, deadlift: 0 } });
    // Big-3 cards gated out
    expect(screen.queryByText('Big 3 Total')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Big three lifts' })).not.toBeInTheDocument();
    // Badge renders its empty-state prompt instead of a progressbar
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText(/Log a workout with a Bench Press, Squat, or Deadlift/)).toBeInTheDocument();
    // Done button still present
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('PostWorkoutScreen2 — estimated 1RM deltas (conditional)', () => {
  it('renders one row per update with the spelled-out screen-reader sentence', () => {
    setup({
      e1rmUpdates: [
        { lift: 'bench', before: 200, after: 210, delta: 10 },
        { lift: 'squat', before: 300, after: 315, delta: 15 },
      ],
    });
    expect(screen.getByRole('group', { name: 'Estimated 1RM updates' })).toBeInTheDocument();
    expect(screen.getByText(
      'Bench Press estimated 1 rep max raised from 200 to 210 pounds, an increase of 10 pounds.',
    )).toBeInTheDocument();
    expect(screen.getByText(
      'Squat estimated 1 rep max raised from 300 to 315 pounds, an increase of 15 pounds.',
    )).toBeInTheDocument();
  });

  it('falls back to 0 for a missing "before" value', () => {
    setup({ e1rmUpdates: [{ lift: 'deadlift', after: 405, delta: 5 }] });
    expect(screen.getByText(
      'Deadlift estimated 1 rep max raised from 0 to 405 pounds, an increase of 5 pounds.',
    )).toBeInTheDocument();
  });

  it('falls back to the raw lift key when it is not one of bench/squat/deadlift', () => {
    setup({ e1rmUpdates: [{ lift: 'overhead_press', before: 100, after: 110, delta: 10 }] });
    expect(screen.getByText(
      'overhead_press estimated 1 rep max raised from 100 to 110 pounds, an increase of 10 pounds.',
    )).toBeInTheDocument();
  });

  it('does not render the deltas group when the list is empty', () => {
    setup({ e1rmUpdates: [] });
    expect(screen.queryByRole('group', { name: 'Estimated 1RM updates' })).not.toBeInTheDocument();
  });
});

describe('PostWorkoutScreen2 — LEVEL UP banner (Risk #7 component wiring)', () => {
  afterEach(() => {
    // Restore the default (matches=false) setup.js mock so other tests are unaffected.
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });

  it('reveals the banner when the pre-snapshot tier is below the post tier', async () => {
    useReducedMotion();
    setup({
      oneRMs: NOVICE2_ONERMS,        // current total → Novice 2
      preFineLevel: LOWER_LEVEL,     // captured pre-session, a lower tier
      preTotal: LOWER_TOTAL,
    });
    // Banner reveals after the badge's onPhaseTransition fires (synchronous on
    // mount under reduced motion). findBy waits for that effect-driven update.
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('LEVEL UP');
    expect(banner).toHaveTextContent(`Reached ${NOVICE2_LEVEL}`);
  });

  it('does NOT reveal the banner when the pre-snapshot tier equals the post tier', () => {
    useReducedMotion();
    setup({
      oneRMs: NOVICE2_ONERMS,        // current → Novice 2
      preFineLevel: NOVICE2_LEVEL,   // same tier captured pre-session
      preTotal: 850,                 // still Novice 2
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('LEVEL UP')).not.toBeInTheDocument();
  });

  it('the banner outcome is driven by the pre-snapshot props, not the current oneRMs', async () => {
    // Risk #7 wiring: IDENTICAL oneRMs, different pre-snapshot props → different
    // banner outcome. This proves the component honors the passed-in captured
    // snapshot rather than recomputing "before" from the live maxes.
    useReducedMotion();

    // Same-tier snapshot → no banner.
    const { unmount } = setup({
      oneRMs: NOVICE2_ONERMS,
      preFineLevel: NOVICE2_LEVEL,
      preTotal: 850,
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    // Lower-tier snapshot, SAME oneRMs → banner appears.
    setup({
      oneRMs: NOVICE2_ONERMS,
      preFineLevel: LOWER_LEVEL,
      preTotal: LOWER_TOTAL,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('LEVEL UP');
  });

  it('does not reveal the banner when there is no pre-snapshot (preFineLevel null)', () => {
    useReducedMotion();
    setup({ oneRMs: NOVICE2_ONERMS, preFineLevel: null, preTotal: null });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('PostWorkoutScreen2 — Done button', () => {
  it('fires onDone on click', async () => {
    const user = userEvent.setup();
    const { onDone } = setup();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('uses a custom doneLabel and can be disabled', () => {
    setup({ doneLabel: 'Finish', doneDisabled: true });
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();
  });
});

describe('PostWorkoutScreen2 — snapshots (static state; see #snapshot-conventions)', () => {
  // No preTotal → no animation → deterministic structure. The `wide`
  // UserLevelBadge (rendered by Screen2) is captured here — the observation
  // point Batch 7 deferred from UserLevelBadge.test.jsx.
  it('matches the normal strength profile with e1RM deltas', () => {
    const { asFragment } = setup({
      oneRMs: { squat: 315, bench: 225, deadlift: 405 },
      e1rmUpdates: [{ lift: 'bench', before: 200, after: 225, delta: 25 }],
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches the null-state profile', () => {
    const { asFragment } = setup({ nullState: true, oneRMs: { squat: 0, bench: 0, deadlift: 0 } });
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('PostWorkoutScreen2 — accessibility (axe)', () => {
  const axeOpts = {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { region: { enabled: false }, 'heading-order': { enabled: false } },
  };

  it('has no violations in the normal profile with deltas', async () => {
    const { container } = setup({
      oneRMs: { squat: 315, bench: 225, deadlift: 405 },
      e1rmUpdates: [{ lift: 'bench', before: 200, after: 225, delta: 25 }],
    });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it('has no violations in the null-state profile', async () => {
    const { container } = setup({ nullState: true, oneRMs: { squat: 0, bench: 0, deadlift: 0 } });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});
