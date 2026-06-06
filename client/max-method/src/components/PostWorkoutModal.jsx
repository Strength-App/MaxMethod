import PostWorkoutScreen1 from './PostWorkoutScreen1';
import PostWorkoutScreen2 from './PostWorkoutScreen2';
import { useModalA11y } from '../hooks/useModalA11y';
import { isNullState } from '../utils/classification';

/**
 * The pop-up ("modal") that appears after a workout. It's the frame around the
 * two post-workout screens: a dim backdrop covering the page, a centered panel,
 * and the logic for which screen to show — PostWorkoutScreen1 (the summary)
 * first, then PostWorkoutScreen2 (the strength profile) after the user taps
 * Continue.
 *
 * All of its state and behavior come from the usePostWorkoutModal hook, handed
 * in as the `modal` prop. The modal shows whenever `modal.postWorkoutData`
 * exists and renders nothing otherwise.
 *
 * Closing it: there are two ways out per screen, and they do the SAME thing —
 * tapping the dim backdrop OR pressing the Escape key. On the summary screen
 * both run the summary handler; on the strength-profile screen both run the
 * profile handler. (For the logger flow, dismissing the summary this way also
 * saves the session — the "leaving commits the workout" behavior the hook owns.)
 * Clicks INSIDE the panel are ignored so the user doesn't dismiss it by tapping
 * its own content.
 *
 * Accessibility is handled by the useModalA11y hook: keyboard focus is moved
 * into the panel when it opens, kept trapped inside while open (so Tab can't
 * wander onto the page behind it), Escape closes it, focus returns to whatever
 * opened it on close, and the page behind is locked from scrolling.
 *
 * @param {object} modal
 *   The usePostWorkoutModal hook's output — the current state (which screen,
 *   the workout data, the captured pre-session snapshot) plus the handlers for
 *   continuing, finishing, and dismissing.
 * @param {string} title
 *   Subtitle for the summary screen (passed straight to PostWorkoutScreen1).
 * @param {object} streakStats
 *   The consistency stats for the summary screen (passed to PostWorkoutScreen1).
 * @param {object} user
 *   The current user — supplies sex, bodyweight, and one-rep maxes to the
 *   strength-profile screen (PostWorkoutScreen2).
 * @param {string} [continueLabel]
 *   Optional override for the summary screen's Continue button text.
 * @param {string} [savingLabel]
 *   Optional text for the Continue button while it's working.
 * @param {string} [continueAriaLabel]
 *   Optional spoken label for the Continue button (normal state).
 * @param {string} [savingAriaLabel]
 *   Optional spoken label for the Continue button while it's working.
 * @param {string} [ariaIdPrefix='post-workout']
 *   Prefix for the summary screen's title/subtitle element ids (logger passes a
 *   distinct prefix to avoid id clashes).
 * @param {string} [doneLabel='Done']
 *   Optional override for the strength-profile screen's Done button text.
 * @returns {JSX.Element|null} The modal, or null when it's closed.
 */
function PostWorkoutModal({
  modal,
  title,
  streakStats,
  user,
  continueLabel,
  savingLabel,
  continueAriaLabel,
  savingAriaLabel,
  ariaIdPrefix = 'post-workout',
  doneLabel = 'Done',
}) {
  const isOpen = !!modal.postWorkoutData;
  const isSummary = modal.modalScreen === 'summary';
  const onEscClose = isSummary ? modal.handleSummaryBackdrop : modal.handleScreen2Backdrop;
  const modalRef = useModalA11y({ isOpen, onClose: onEscClose });

  if (!isOpen) return null;

  const titleIdSummary = `${ariaIdPrefix}-title`;
  const subtitleIdSummary = `${ariaIdPrefix}-subtitle`;
  const titleIdScreen2 = 'post-workout-screen2-title';
  const subtitleIdScreen2 = 'post-workout-screen2-subtitle';

  return (
    <div
      className="post-workout-overlay"
      onClick={isSummary ? modal.handleSummaryBackdrop : modal.handleScreen2Backdrop}
    >
      <div
        ref={modalRef}
        className="post-workout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={isSummary ? titleIdSummary : titleIdScreen2}
        aria-describedby={isSummary ? subtitleIdSummary : subtitleIdScreen2}
        onClick={e => e.stopPropagation()}
      >
        <div className="post-workout-handle" aria-hidden="true" />
        {isSummary ? (
          <PostWorkoutScreen1
            title={title}
            summaryData={modal.postWorkoutData}
            streakStats={streakStats}
            continuing={modal.continuing}
            continueLabel={continueLabel}
            savingLabel={savingLabel}
            continueAriaLabel={continueAriaLabel}
            savingAriaLabel={savingAriaLabel}
            onContinue={modal.handleContinue}
            ariaIdPrefix={ariaIdPrefix}
          />
        ) : (() => {
          // Pick which set of "one-rep max" numbers to show the user. We prefer
          // the ESTIMATED maxes (the values the leveling system tracks); if the
          // user has none of those yet, we fall back to their CURRENT maxes.
          //
          // Post-Phase-6: leveling reads from estimated_one_rep_maxes. Per-source
          // fallback (estimated → current) mirrors bigThreeTotalForUser's rule —
          // use estimated if ANY lift is non-null, otherwise fall back to current.
          // Keeps Screen2's UserLevelBadge total consistent with home/pickNewProgram.
          const est = user?.estimated_one_rep_maxes;
          const oneRMs = (est && (est.bench != null || est.squat != null || est.deadlift != null))
            ? est : user?.current_one_rep_maxes;
          return (
            <PostWorkoutScreen2
              sex={user?.gender}
              bodyweight={user?.current_bodyweight}
              oneRMs={oneRMs}
              nullState={isNullState(user)}
              beginner1Anchor={user?.beginner_1_anchor ?? null}
              e1rmUpdates={modal.postWorkoutData?.e1rmUpdates ?? []}
              preFineLevel={modal.preFineLevel}
              preTotal={modal.preTotal}
              doneLabel={doneLabel}
              doneDisabled={false}
              onDone={modal.handleDone}
            />
          );
        })()}
      </div>
    </div>
  );
}

export default PostWorkoutModal;
