import { collapseSetDetails, formatSetLine } from '../utils/setDisplay';

/**
 * The first screen a user sees after finishing a workout: a celebratory
 * "Workout Complete" summary. It shows how the workout went — streak stats
 * (how many sessions they've done, how consistent they've been), the totals
 * (how much weight they moved and how many sets they did), an optional
 * exercise-by-exercise breakdown, any personal records they hit, and a big
 * "Continue" button that takes them to the next screen (their strength
 * profile, PostWorkoutScreen2).
 *
 * This screen draws nothing on its own behalf — it is handed everything it
 * needs through its inputs (props) and just lays it out. It is shown by
 * PostWorkoutModal while the modal is on its "summary" step.
 *
 * Accessibility note: every number is shown twice. Once as a styled visual
 * (hidden from screen readers with aria-hidden) and once as plain spoken-out
 * text (the "sr-only" spans), e.g. "Total sessions: 12". That way a sighted
 * user sees the polished layout and a screen-reader user hears a full sentence.
 *
 * @param {string} title
 *   The subtitle shown under "Workout Complete". For a program day this is the
 *   day's name; for an ad-hoc logger session it's the quick-session title.
 * @param {{ totalVolume: number, totalSets: number,
 *   breakdown?: Array<{ name: string, sets: number, volume: number,
 *     setDetails?: Array<{ reps: number|string, weight: number|string }> }>,
 *   prs?: Array<{ exercise: string, weight: number, reps?: number }> }} summaryData
 *   The numbers for this workout. `breakdown` (per-exercise) and `prs`
 *   (personal records) are optional — each section is hidden when its list is
 *   empty or missing.
 * @param {{ totalSessions: number, weeksLogged: number, thisMonth: number,
 *   daysThisWeek: number }} streakStats
 *   The consistency stats shown in the top row. The parent computes these:
 *   day.jsx passes its workout history straight through; logger.jsx first adds
 *   a stand-in entry for today, because logger only saves the session after
 *   this screen is dismissed.
 * @param {boolean} continuing
 *   True while the "Continue" action is still saving/working. Disables the
 *   button and marks it busy so the user can't double-tap.
 * @param {string} [continueLabel='Continue']
 *   The normal button text.
 * @param {string} [savingLabel]
 *   Optional text to show on the button while `continuing` is true (e.g.
 *   "Saving…"). If omitted, the button keeps showing `continueLabel`.
 * @param {string} [continueAriaLabel]
 *   Optional spoken label for the button in its normal state (for screen
 *   readers), when the visible text alone isn't descriptive enough.
 * @param {string} [savingAriaLabel]
 *   Optional spoken label for the button while it's saving.
 * @param {() => void} onContinue
 *   What to run when the user taps Continue (the hook's handleContinue, which
 *   recomputes their classification and advances to the strength-profile screen).
 * @param {string} [ariaIdPrefix='post-workout']
 *   Prefix used to build the title/subtitle element ids. logger passes
 *   'lg-post-workout' so these ids never collide with PostWorkoutScreen2's
 *   fixed 'post-workout-screen2-*' ids (both screens can briefly coexist in
 *   the DOM during transitions, and duplicate ids would break the labelling).
 * @returns {JSX.Element} The summary screen.
 */
function PostWorkoutScreen1({
  title,
  summaryData,
  streakStats,
  continuing,
  continueLabel = 'Continue',
  savingLabel,
  continueAriaLabel,
  savingAriaLabel,
  onContinue,
  ariaIdPrefix = 'post-workout',
}) {
  const { totalVolume, totalSets, breakdown, prs } = summaryData;
  const { totalSessions, weeksLogged, thisMonth, daysThisWeek } = streakStats;
  const titleId = `${ariaIdPrefix}-title`;
  const subtitleId = `${ariaIdPrefix}-subtitle`;
  // Pick what the button says and how it's announced. While saving, show the
  // saving text (only if one was provided) and the saving spoken-label;
  // otherwise show the normal text and spoken-label.
  const buttonText = continuing && savingLabel ? savingLabel : continueLabel;
  const buttonAria = continuing ? savingAriaLabel : continueAriaLabel;

  return (
    <>
      <div className="post-workout-header">
        <div className="post-workout-title" id={titleId}>Workout Complete</div>
        <div className="post-workout-subtitle" id={subtitleId}>{title}</div>
      </div>
      <div className="post-workout-streak-row" role="group" aria-label="Workout streaks">
        <div className="post-workout-streak-card">
          <div className="post-workout-streak-val" aria-hidden="true"><span>{totalSessions}</span></div>
          <div className="post-workout-streak-lbl" aria-hidden="true">Total Sessions</div>
          <span className="sr-only">Total sessions: {totalSessions}</span>
        </div>
        <div className="post-workout-streak-card">
          <div className="post-workout-streak-val" aria-hidden="true"><span>{weeksLogged}</span></div>
          <div className="post-workout-streak-lbl" aria-hidden="true">Weeks Logged</div>
          <span className="sr-only">Weeks logged: {weeksLogged}</span>
        </div>
        <div className="post-workout-streak-card">
          <div className="post-workout-streak-val" aria-hidden="true"><span>{thisMonth}</span></div>
          <div className="post-workout-streak-lbl" aria-hidden="true">This Month</div>
          <span className="sr-only">This month: {thisMonth} {thisMonth === 1 ? 'session' : 'sessions'}</span>
        </div>
        <div className="post-workout-streak-card">
          <div className="post-workout-streak-val" aria-hidden="true"><span>{daysThisWeek} / 7</span></div>
          <div className="post-workout-streak-lbl" aria-hidden="true">Days This Week</div>
          <span className="sr-only">Days this week: {daysThisWeek} of 7</span>
        </div>
      </div>
      <div className="post-workout-stats-row" role="group" aria-label="Workout totals">
        <div className="post-workout-volume-block">
          <div className="post-workout-volume-val" aria-hidden="true">
            {totalVolume > 0 ? totalVolume.toLocaleString() : '—'}
          </div>
          <div className="post-workout-volume-lbl" aria-hidden="true">Total Volume (lbs)</div>
          <span className="sr-only">Total volume: {totalVolume > 0 ? `${totalVolume.toLocaleString()} pounds` : 'none recorded'}</span>
        </div>
        <div className="post-workout-volume-block">
          <div className="post-workout-volume-val" aria-hidden="true">{totalSets ?? '—'}</div>
          <div className="post-workout-volume-lbl" aria-hidden="true">Total Sets</div>
          <span className="sr-only">Total sets: {totalSets ?? 'none recorded'}</span>
        </div>
      </div>
      {breakdown?.length > 0 && (
        <div className="post-workout-breakdown">
          <div className="post-workout-breakdown-title">By Exercise</div>
          {breakdown.map((e, i) => (
            <div key={i} className="post-workout-breakdown-exercise">
              <div className="post-workout-breakdown-row">
                <span className="post-workout-breakdown-name">{e.name}</span>
                <span className="post-workout-breakdown-sets">{e.sets} {e.sets === 1 ? 'set' : 'sets'}</span>
                <span className="post-workout-breakdown-vol">{e.volume > 0 ? `${e.volume.toLocaleString()} lbs` : '—'}</span>
              </div>
              {e.setDetails?.length > 0 && (
                <ul className="post-workout-breakdown-set-list" aria-label={`Sets for ${e.name}`}>
                  {collapseSetDetails(e.setDetails).map((g, gi) => (
                    <li key={gi} className="post-workout-breakdown-set-line">{formatSetLine(g)}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {prs?.length > 0 && (
        <div className="post-workout-breakdown post-workout-prs">
          <div className="post-workout-breakdown-title">Personal Records</div>
          {prs.map((pr, i) => (
            <div key={i} className="post-workout-breakdown-row">
              <span className="post-workout-breakdown-name">{pr.exercise}</span>
              <span className="post-workout-pr-detail">
                {pr.weight.toLocaleString()} lbs{pr.reps ? ` x ${pr.reps} reps` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        className="post-workout-btn"
        onClick={onContinue}
        disabled={continuing}
        aria-busy={continuing || undefined}
        aria-label={buttonAria}
      >
        {buttonText}
      </button>
    </>
  );
}

export default PostWorkoutScreen1;
