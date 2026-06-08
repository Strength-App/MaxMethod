import { useState } from 'react';
import UserLevelBadge from '../ui/UserLevelBadge';
import { levelProgress } from '../../utils/classification';

// Map the canonical service keys (bench/squat/deadlift) to the user-facing
// display names rendered in the e1RM-delta block. e1rmUpdates uses the
// service's internal keys; we translate at render time rather than expanding
// the service contract.
const LIFT_DISPLAY_NAMES = {
  bench: 'Bench Press',
  squat: 'Squat',
  deadlift: 'Deadlift',
};

/**
 * The second screen after a workout: the user's "strength profile". It shows
 * their current strength level (the UserLevelBadge with a progress bar toward
 * the next level), a celebratory "LEVEL UP" banner if this workout pushed them
 * into a new level, a list of any estimated-1RM increases (their lifts got
 * stronger), and their big-3 total broken down by lift. It's shown by
 * PostWorkoutModal after the user taps Continue on PostWorkoutScreen1.
 *
 * Like Screen 1, this screen only lays out what it's given — it does no saving
 * or fetching of its own.
 *
 * How "did they level up?" is decided (this is the load-bearing part):
 *   - `preFineLevel` and `preTotal` are a SNAPSHOT of where the user stood
 *     BEFORE this workout, captured once by usePostWorkoutModal and passed in.
 *   - The CURRENT level is computed here from `oneRMs`.
 *   - If the snapshot level differs from the current level, it's a level-up.
 *   This screen never recomputes the "before" value from live data — it trusts
 *   the passed-in snapshot, which is what keeps the comparison stable even if
 *   the user's maxes change while the modal is open (Risk #7).
 *
 * @param {'female'|'male'|'other'|string} sex
 *   Used to pick the right strength-level table for the badge.
 * @param {number|string} bodyweight
 *   The user's bodyweight, also needed to pick their level table.
 * @param {{ squat?: number, bench?: number, deadlift?: number } | null} oneRMs
 *   The user's current one-rep maxes for the big three. Their sum is the big-3
 *   total shown on screen and used to compute the current level.
 * @param {boolean} nullState
 *   True when the user has no big-3 data yet. In that case the big-3 cards and
 *   deltas are hidden and the badge shows a "log a lift to start" prompt.
 * @param {number|null} beginner1Anchor
 *   Passed through to the badge; only matters for brand-new (Beginner 1) users,
 *   where it sets where their progress bar starts filling from.
 * @param {Array<{ lift: string, before?: number, after: number, delta: number }>} e1rmUpdates
 *   The lifts whose estimated 1RM went up this workout. Empty → the section is
 *   hidden. `lift` is an internal key (bench/squat/deadlift) translated to a
 *   display name at render time.
 * @param {string|null} preFineLevel
 *   The user's strength level BEFORE this workout (the captured snapshot).
 *   Drives the level-up comparison. Null when there's no snapshot (e.g. a
 *   null-state user) — in which case no banner is shown.
 * @param {number|null} preTotal
 *   The user's big-3 total BEFORE this workout (the captured snapshot). Handed
 *   to the badge as the point its progress bar animates up FROM.
 * @param {string} doneLabel
 *   Text (and spoken label) for the Done button. Default 'Done' is supplied by
 *   the modal.
 * @param {boolean} doneDisabled
 *   When true, the Done button can't be tapped.
 * @param {() => void} onDone
 *   What to run when the user taps Done (closes the modal and navigates away).
 * @returns {JSX.Element} The strength-profile screen.
 */
function PostWorkoutScreen2({ sex, bodyweight, oneRMs, nullState, beginner1Anchor, e1rmUpdates, preFineLevel, preTotal, doneLabel, doneDisabled, onDone }) {
  const squat = Number(oneRMs?.squat ?? 0);
  const bench = Number(oneRMs?.bench ?? 0);
  const deadlift = Number(oneRMs?.deadlift ?? 0);
  const total = squat + bench + deadlift;

  // Work out the user's CURRENT level from their current maxes (only possible
  // when we have a positive total plus sex + bodyweight to pick the table).
  const post = total > 0 && sex && bodyweight
    ? levelProgress({ sex, bodyweight, total })
    : null;
  // It's a level-up when we have a before-snapshot, we could compute an after,
  // and the two levels are different. (preFineLevel is the captured "before".)
  const isLevelUp = preFineLevel && post?.fineLevel && preFineLevel !== post.fineLevel;

  // Banner reveal coordinates with the badge's tier-transition moment via
  // onPhaseTransition. Non-level-up: callback never fires, banner never
  // renders. Level-up: callback fires at the snap (post-Phase-A); under
  // reduced motion, callback fires immediately on badge mount.
  const [bannerVisible, setBannerVisible] = useState(false);

  return (
    <>
      <div className="post-workout-header">
        <div className="post-workout-title" id="post-workout-screen2-title">Workout Complete</div>
        <div className="post-workout-subtitle" id="post-workout-screen2-subtitle">Your Strength Profile</div>
      </div>

      {isLevelUp && bannerVisible && (
        <div className="post-workout-levelup-banner" role="status" aria-live="polite">
          <div className="post-workout-levelup-line1">LEVEL UP</div>
          <div className="post-workout-levelup-line2">Reached {post.fineLevel}</div>
        </div>
      )}

      <div className="post-workout-classification-section">
        <UserLevelBadge
          sex={sex}
          bodyweight={bodyweight}
          total={total}
          nullState={nullState}
          beginner1Anchor={beginner1Anchor}
          animateFromTotal={preTotal}
          showProgress
          wide
          onPhaseTransition={() => setBannerVisible(true)}
        />
      </div>

      {e1rmUpdates && e1rmUpdates.length > 0 && (
        <div
          className="post-workout-e1rm-deltas"
          role="group"
          aria-label="Estimated 1RM updates"
        >
          {e1rmUpdates.map(u => {
            const before = u.before ?? 0;
            const displayName = LIFT_DISPLAY_NAMES[u.lift] ?? u.lift;
            return (
              <div key={u.lift} className="post-workout-e1rm-delta-row">
                <span aria-hidden="true">
                  {displayName} {before.toLocaleString()} → {Number(u.after).toLocaleString()} (+{Number(u.delta).toLocaleString()})
                </span>
                <span className="sr-only">
                  {displayName} estimated 1 rep max raised from {before.toLocaleString()} to {Number(u.after).toLocaleString()} pounds, an increase of {Number(u.delta).toLocaleString()} pounds.
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Big-3 total and per-lift cards only render for users with data.
          Null-state users see just the badge's empty-state message + Done
          button — no "— lbs" placeholder cards. Banner (above) is already
          gated by isLevelUp which fails for null-state (preFineLevel is
          null). e1rm-deltas block (above) is already gated by length > 0. */}
      {!nullState && (
        <>
          <div className="post-workout-big3-total">
            <div className="post-workout-volume-val" aria-hidden="true">
              <span>{total > 0 ? `${total.toLocaleString()} lbs` : '— lbs'}</span>
            </div>
            <div className="post-workout-volume-lbl" aria-hidden="true">Big 3 Total</div>
            <span className="sr-only">Big 3 total: {total > 0 ? `${total.toLocaleString()} pounds` : 'none recorded'}</span>
          </div>

          <div
            className="post-workout-streak-row"
            role="group"
            aria-label="Big three lifts"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
          >
            {[
              { label: 'Squat', val: squat },
              { label: 'Bench', val: bench },
              { label: 'Deadlift', val: deadlift },
            ].map(({ label, val }) => (
              <div key={label} className="post-workout-streak-card">
                <div className="post-workout-streak-val" aria-hidden="true">
                  <span>{val > 0 ? `${val.toLocaleString()} lbs` : '— lbs'}</span>
                </div>
                <div className="post-workout-streak-lbl" aria-hidden="true">{label}</div>
                <span className="sr-only">{label}: {val > 0 ? `${val.toLocaleString()} pounds` : 'none recorded'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        className="post-workout-btn"
        onClick={onDone}
        disabled={doneDisabled}
        aria-label={doneLabel}
      >
        {doneLabel}
      </button>
    </>
  );
}

export default PostWorkoutScreen2;
