import { useState } from 'react';
import UserLevelBadge from './UserLevelBadge';
import { levelProgress } from '../utils/classification';

function PostWorkoutScreen2({ sex, bodyweight, oneRMs, preFineLevel, preTotal, doneLabel, doneDisabled, onDone }) {
  const squat = Number(oneRMs?.squat ?? 0);
  const bench = Number(oneRMs?.bench ?? 0);
  const deadlift = Number(oneRMs?.deadlift ?? 0);
  const total = squat + bench + deadlift;

  const post = total > 0 && sex && bodyweight
    ? levelProgress({ sex, bodyweight, total })
    : null;
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
          animateFromTotal={preTotal}
          showProgress
          wide
          onPhaseTransition={() => setBannerVisible(true)}
        />
      </div>

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
