// Characterization tests for src/components/PostWorkoutModal.jsx.
//
// PostWorkoutModal is D-classified: the dialog shell that wraps the two
// post-workout screens. It takes the usePostWorkoutModal hook's output as the
// `modal` prop (plus `user`, `title`, `streakStats`) — no context, no router —
// so the harness builds a plain `modal` object with vi.fn() handlers.
//
// What this file pins (per Rule #21 — the COMPONENT-level wiring, not the
// invariants the hook test already owns):
//   - Open/closed gating off modal.postWorkoutData.
//   - Screen routing off modal.modalScreen (summary → Screen1, classification
//     → Screen2) and the aria-labelledby/-describedby id swap between them.
//   - Per-screen dismissal: the overlay backdrop click and Escape both route
//     to the SAME handler for that screen (handleSummaryBackdrop on summary,
//     handleScreen2Backdrop on classification) — the convergence the source
//     comment describes. stopPropagation keeps in-dialog clicks from dismissing.
//   - useModalA11y INTEGRATION (not its internals — those are pinned in
//     useModalA11y.test.jsx, Batch 4): initial focus lands in the dialog, Tab
//     is trapped, focus returns to the opener on close.
//   - The modal's own oneRMs-source selection for Screen2 (estimated maxes with
//     a fallback to current — PostWorkoutModal.jsx:87-89).
//   - Risk #7 FORWARDING: the modal threads modal.preFineLevel / modal.preTotal
//     into Screen2, so the captured snapshot drives the level-up banner.
//   - Axe on both screens (Batch 8 mandates axe on this modal).
//
// Test-design notes:
//   - Modal-consumer hazard: the harness wraps its callbacks in useCallback so
//     useModalA11y's effect (deps include onClose) doesn't re-run and thrash
//     focus on every render. (Canonical: ToolsPanel.test.jsx's Harness.)
//   - Effect-driven focus: initial focus and focus-return happen inside
//     useModalA11y's effect, so those assertions use `await waitFor` per
//     docs/follow-ups.md#waitfor-discipline-for-effect-driven-focus. The Tab-
//     trap focus is set synchronously in the keydown handler, so it asserts
//     directly.
//
// File extension is .test.jsx per docs/decisions.md#test-file-extension-convention.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState, useCallback } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import PostWorkoutModal from './PostWorkoutModal.jsx';
import { fineLevel, levelProgress } from '../utils/classification.js';

const MALE = { sex: 'male', bodyweight: 200 };
const NOVICE2_LEVEL = levelProgress({ ...MALE, total: 870 }).fineLevel;
const LOWER_LEVEL = fineLevel({ ...MALE, total: 650 });

// estimated maxes sum to 870 (Novice 2 at bodyweight 200).
const USER = {
  gender: 'male',
  current_bodyweight: 200,
  estimated_one_rep_maxes: { bench: 270, squat: 300, deadlift: 300 },
  current_one_rep_maxes: { bench: 90, squat: 90, deadlift: 90 },
  beginner_1_anchor: null,
};

const POSTDATA = { totalVolume: 5000, totalSets: 10, breakdown: [], prs: [], e1rmUpdates: [] };
const STREAKS = { totalSessions: 5, weeksLogged: 2, thisMonth: 3, daysThisWeek: 2 };

// Stateful harness. PostWorkoutModal is "open" when modal.postWorkoutData is
// truthy; the harness drives that via `open`. Callbacks are memoized so the
// useModalA11y effect stays scoped to open/close transitions. The "Open Modal"
// trigger gives focus-return a real element to come back to. summarySpy /
// screen2Spy let tests tell WHICH dismissal handler ran.
function Harness({
  startOpen = false,
  startScreen = 'summary',
  user = USER,
  preFineLevel = null,
  preTotal = null,
  summarySpy = () => {},
  screen2Spy = () => {},
}) {
  const [open, setOpen] = useState(startOpen);
  const handleSummaryBackdrop = useCallback(() => { summarySpy(); setOpen(false); }, [summarySpy]);
  const handleScreen2Backdrop = useCallback(() => { screen2Spy(); setOpen(false); }, [screen2Spy]);
  const handleContinue = useCallback(() => {}, []);
  const handleDone = useCallback(() => setOpen(false), []);

  const modal = {
    postWorkoutData: open ? POSTDATA : null,
    modalScreen: startScreen,
    continuing: false,
    preFineLevel,
    preTotal,
    handleContinue,
    handleDone,
    handleSummaryBackdrop,
    handleScreen2Backdrop,
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open Modal</button>
      <PostWorkoutModal modal={modal} title="Upper Body A" streakStats={STREAKS} user={user} />
    </>
  );
}

describe('PostWorkoutModal — open / closed gating', () => {
  it('renders nothing when postWorkoutData is null', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when postWorkoutData is present', () => {
    render(<Harness startOpen />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

describe('PostWorkoutModal — screen routing', () => {
  it('renders the summary screen (Screen1) when modalScreen is "summary"', () => {
    render(<Harness startOpen startScreen="summary" />);
    expect(screen.getByText('Upper Body A')).toBeInTheDocument();        // Screen1 subtitle
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    // aria-labelledby/-describedby point at the summary ids
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'post-workout-title');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'post-workout-subtitle');
  });

  it('renders the strength-profile screen (Screen2) when modalScreen is "classification"', () => {
    render(<Harness startOpen startScreen="classification" />);
    expect(screen.getByText('Your Strength Profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    // aria ids switch to the screen-2 ids
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'post-workout-screen2-title');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'post-workout-screen2-subtitle');
  });
});

describe('PostWorkoutModal — oneRMs source selection for Screen2', () => {
  it('uses estimated_one_rep_maxes for the big-3 total when any estimated lift is set', () => {
    render(<Harness startOpen startScreen="classification" />);
    // estimated sum 270+300+300 = 870, not the current sum (270).
    expect(screen.getByText('Big 3 total: 870 pounds')).toBeInTheDocument();
  });

  it('falls back to current_one_rep_maxes when all estimated lifts are null', () => {
    const user = {
      ...USER,
      estimated_one_rep_maxes: { bench: null, squat: null, deadlift: null },
      current_one_rep_maxes: { bench: 100, squat: 200, deadlift: 250 }, // 550
    };
    render(<Harness startOpen startScreen="classification" user={user} />);
    expect(screen.getByText('Big 3 total: 550 pounds')).toBeInTheDocument();
  });
});

describe('PostWorkoutModal — dismissal (Escape and backdrop converge per screen)', () => {
  it('Escape on the summary screen runs handleSummaryBackdrop', async () => {
    const user = userEvent.setup();
    const summarySpy = vi.fn();
    const screen2Spy = vi.fn();
    render(<Harness startOpen startScreen="summary" summarySpy={summarySpy} screen2Spy={screen2Spy} />);
    await user.keyboard('{Escape}');
    expect(summarySpy).toHaveBeenCalledOnce();
    expect(screen2Spy).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape on the classification screen runs handleScreen2Backdrop', async () => {
    const user = userEvent.setup();
    const summarySpy = vi.fn();
    const screen2Spy = vi.fn();
    render(<Harness startOpen startScreen="classification" summarySpy={summarySpy} screen2Spy={screen2Spy} />);
    await user.keyboard('{Escape}');
    expect(screen2Spy).toHaveBeenCalledOnce();
    expect(summarySpy).not.toHaveBeenCalled();
  });

  it('clicking the backdrop overlay runs the summary handler', () => {
    const summarySpy = vi.fn();
    render(<Harness startOpen startScreen="summary" summarySpy={summarySpy} />);
    const dialog = screen.getByRole('dialog');
    // The dim backdrop overlay is presentational (no ARIA role by design); the
    // dialog's parent is the only handle to it. Justified single node-access to
    // characterize click-outside-to-dismiss.
    // eslint-disable-next-line testing-library/no-node-access -- backdrop overlay has no role; parent is the only handle
    fireEvent.click(dialog.parentElement);
    expect(summarySpy).toHaveBeenCalledOnce();
  });

  it('does not dismiss when a click originates inside the dialog (stopPropagation)', () => {
    const summarySpy = vi.fn();
    render(<Harness startOpen startScreen="summary" summarySpy={summarySpy} />);
    // Clicking the dialog itself must not bubble to the overlay's click handler.
    fireEvent.click(screen.getByRole('dialog'));
    expect(summarySpy).not.toHaveBeenCalled();
  });
});

describe('PostWorkoutModal — useModalA11y integration (not the hook internals)', () => {
  it('moves initial focus to the Continue button on open', async () => {
    render(<Harness startOpen startScreen="summary" />);
    // Initial focus is set inside useModalA11y's effect → waitFor.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus());
  });

  it('traps Tab focus inside the dialog (does not escape to the outside trigger)', async () => {
    const user = userEvent.setup();
    render(<Harness startOpen startScreen="summary" />);
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    await waitFor(() => expect(continueBtn).toHaveFocus());
    // Continue is the only focusable inside the dialog, so Tab/Shift+Tab wrap
    // back to it — never to the "Open Modal" trigger outside the dialog.
    await user.keyboard('{Tab}');
    expect(continueBtn).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(continueBtn).toHaveFocus();
  });

  it('returns focus to the opener when the modal closes', async () => {
    const user = userEvent.setup();
    render(<Harness startScreen="summary" />);
    const trigger = screen.getByRole('button', { name: 'Open Modal' });
    await user.click(trigger);                 // opens; trigger is the captured opener
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');           // closes
    // Focus return happens in useModalA11y's cleanup → waitFor.
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('PostWorkoutModal — Risk #7 forwarding (snapshot drives the banner)', () => {
  afterEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });

  it('forwards modal.preFineLevel/preTotal into Screen2 so the level-up banner shows', async () => {
    // Reduced motion → the badge fires onPhaseTransition synchronously on mount,
    // making the banner deterministic.
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('reduce'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    render(
      <Harness
        startOpen
        startScreen="classification"
        preFineLevel={LOWER_LEVEL}   // captured pre-session (lower tier)
        preTotal={650}
      />,
    );
    // user's estimated total (870) → Novice 2; pre-snapshot was a lower tier.
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('LEVEL UP');
    expect(banner).toHaveTextContent(`Reached ${NOVICE2_LEVEL}`);
  });
});

describe('PostWorkoutModal — accessibility (axe)', () => {
  const axeOpts = {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { region: { enabled: false }, 'heading-order': { enabled: false } },
  };

  it('has no violations on the summary screen', async () => {
    const { container } = render(<Harness startOpen startScreen="summary" />);
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it('has no violations on the classification screen', async () => {
    const { container } = render(<Harness startOpen startScreen="classification" />);
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});
