import PostWorkoutScreen1 from './PostWorkoutScreen1';
import PostWorkoutScreen2 from './PostWorkoutScreen2';
import { useModalA11y } from '../hooks/useModalA11y';

// Post-workout modal shell — backdrop overlay + dialog panel + screen
// routing between PostWorkoutScreen1 (summary) and PostWorkoutScreen2
// (post-recompute strength profile). Consumes the usePostWorkoutModal hook
// output via the `modal` prop. Backdrop behavior is screen-aware: summary
// backdrop runs the parent's onSummaryBackdrop (day → navigate to /home;
// logger → saveAndExit + navigate to /history); classification-screen
// backdrop is a plain close-and-navigate to doneNavigate.
//
// A11y (useModalA11y): Esc-to-close, focus-trap, initial-focus on first
// focusable, focus-restore-to-opener on close, body scroll lock. Esc routes
// to the same per-screen handler as backdrop click (handleSummaryBackdrop on
// summary, handleScreen2Backdrop on classification) — keyboard and pointer
// dismissal converge on the same intent. Notably this means Esc on logger's
// summary screen triggers saveAndExit (commits the batch session) — the same
// commit-on-dismiss semantic as backdrop click.
//
// Props:
//   modal — usePostWorkoutModal output (state + handlers)
//   title, streakStats — pass-throughs to PostWorkoutScreen1 (parent-specific)
//   user — pass-through to PostWorkoutScreen2 (sex, bodyweight, oneRMs)
//   continueLabel / savingLabel / continueAriaLabel / savingAriaLabel —
//     optional Screen 1 button label/aria overrides
//   ariaIdPrefix — optional Screen 1 title/subtitle id prefix override
//   doneLabel — optional Screen 2 Done-button label (default 'Done')
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
        ) : (
          <PostWorkoutScreen2
            sex={user?.gender}
            bodyweight={user?.current_bodyweight}
            oneRMs={user?.current_one_rep_maxes}
            preFineLevel={modal.preFineLevel}
            preTotal={modal.preTotal}
            doneLabel={doneLabel}
            doneDisabled={false}
            onDone={modal.handleDone}
          />
        )}
      </div>
    </div>
  );
}

export default PostWorkoutModal;
