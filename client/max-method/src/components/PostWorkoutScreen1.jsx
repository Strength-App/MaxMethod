import { collapseSetDetails, formatSetLine } from '../utils/setDisplay';

// Post-workout summary screen — streak row + volume/sets totals + breakdown
// + PRs + Continue button. Self-contained; consumes data via props. Sibling
// of PostWorkoutScreen2 (the post-recompute strength-profile view).
// Rendered by PostWorkoutModal when modalScreen === 'summary'.
//
// Props:
//   title — Screen 1 subtitle (day shows day.title; logger shows quick-session title)
//   summaryData — { totalVolume, totalSets, breakdown, prs }
//   streakStats — { totalSessions, weeksLogged, thisMonth, daysThisWeek }; parent-computed
//     (day passes raw historySessions through useWorkoutStats; logger applies a
//     synthetic-today patch first because saveAndExit fires post-dismiss)
//   continuing — drives Continue button disabled + aria-busy state
//   continueLabel (default 'Continue') / savingLabel (optional) — button text
//     swap when continuing && savingLabel; absent savingLabel keeps continueLabel
//   continueAriaLabel / savingAriaLabel — optional explicit aria-label overrides
//   onContinue — Continue-button click handler (hook's handleContinue)
//   ariaIdPrefix (default 'post-workout') — title/subtitle ID prefix; logger
//     passes 'lg-post-workout' to keep summary IDs disjoint from
//     PostWorkoutScreen2's hardcoded 'post-workout-screen2-*' IDs.
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
