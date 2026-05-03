import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { useEffect } from 'react';

function Home() {
  const navigate = useNavigate();
  const { displayWorkout, loading, error, fetchWorkout } = useWorkout();
  const userId = localStorage.getItem('userId');
  
  // Re-fetch every time the home page is visited so title/data is always fresh
  useEffect(() => {
    if (userId) fetchWorkout(userId);
  }, []);

  if (loading) return <p className="status-msg" role="status" aria-live="polite">Loading your program…</p>;
  if (error) return <p className="status-msg status-msg--error" role="alert">Error loading workout: {error}</p>;
  if (!displayWorkout) {
    return (
      <div className="home-page-container">
        <div className="home-empty-state">
          <svg width="56" height="56" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }} aria-hidden="true" focusable="false">
            <rect x="6" y="8" width="28" height="26" rx="3"/>
            <path d="M13 8V5M27 8V5M6 16h28"/>
            <path d="M13 23h14M13 29h8"/>
          </svg>
          <h2 className="home-empty-state__title">No Active Program</h2>
          <p className="home-empty-state__subtitle">Pick a structured plan, or jump straight into a workout.</p>
          <div className="home-empty-state__actions">
            <button className="home-empty-state__cta" onClick={() => navigate('/pickNewProgram')}>
              Go to Programs
            </button>
            <button className="home-empty-state__cta home-empty-state__cta--outline" onClick={() => navigate('/logger')}>
              Start a Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCustom = displayWorkout?.type === 'custom';

  const goalLabels = { strength: 'Strength', hypertrophy: 'Hypertrophy', loseWeight: 'Weight Loss' };
  let programTitle;
  if (isCustom) {
    programTitle = displayWorkout.title;
  } else {
    const days = displayWorkout.daysPerWeek ?? displayWorkout.weeks[0]?.days?.length;
    const goal = goalLabels[displayWorkout.goalSelection ?? displayWorkout.goal] ?? '';
    programTitle = [days && `${days} Day`, displayWorkout.classification, goal].filter(Boolean).join(' ');
  }

  let totalDays = 0, completedDays = 0;
  displayWorkout.weeks.forEach(week => {
    week.days.forEach(day => {
      totalDays++;
      if (day.completed) completedDays++;
    });
  });
  const overallPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const handleDayClick = (weekNum, di) => {
    navigate(`/day/${weekNum}/${di + 1}`);
  };

  return (
    <div className="home-page-container">
      <h1>{programTitle || 'Current Program'}</h1>
      {!isCustom && (
        <div className="fitness-level-container">
          <h2>Current Fitness Level: {displayWorkout.classification}</h2>
        </div>
      )}

      {/* Program summary bar */}
      <div
        className="workout-summary-bar"
        role="group"
        aria-label="Program progress summary"
        style={{ marginBottom: '40px' }}
      >
        <div className="summary-pill">
          <div className="summary-pill-val" aria-hidden="true">{completedDays}</div>
          <div className="summary-pill-lbl" aria-hidden="true">Days Done</div>
          <span className="sr-only">{completedDays} days done</span>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--accent" aria-hidden="true">{totalDays}</div>
          <div className="summary-pill-lbl" aria-hidden="true">Total Days</div>
          <span className="sr-only">{totalDays} total days</span>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--green" aria-hidden="true">{overallPct}%</div>
          <div className="summary-pill-lbl" aria-hidden="true">Complete</div>
          <span className="sr-only">{overallPct} percent complete</span>
        </div>
      </div>

      <div className="schedule-table">
        {displayWorkout.weeks.map((week, wi) => {
          const weekNum = wi + 1;
          const weekTotal = week.days.length;
          const weekDone = week.days.filter(d => d.completed).length;
          const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

          return (
            <section key={weekNum} className="schedule-week" aria-labelledby={`home-week-${weekNum}-h`}>
              <div className="week-heading-row">
                <h2 className="week-heading" id={`home-week-${weekNum}-h`}>Week {weekNum}</h2>
                <div className="week-stats">
                  <span className="week-stat" aria-hidden="true">{weekDone}/{weekTotal} days</span>
                  <div
                    className="week-progress-bar"
                    role="progressbar"
                    aria-valuenow={weekPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Week ${weekNum} progress: ${weekDone} of ${weekTotal} days complete`}
                  >
                    <div
                      className={`week-progress-fill${weekDone === weekTotal && weekTotal > 0 ? ' week-progress-fill--full' : ''}`}
                      style={{ width: `${weekPct}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="week-days">
                {week.days.filter(d => d?.title != null).map((day, di) => {
                  const dayLabel = day.title ?? `Day ${di + 1}`;
                  return (
                    <button
                      key={di}
                      type="button"
                      className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                      onClick={() => handleDayClick(weekNum, di)}
                      aria-label={`Open ${dayLabel} of week ${weekNum}${day.completed ? ', completed' : ''}`}
                    >
                      {dayLabel}
                      {day.completed && (
                        <>
                          <span className="completed-badge" aria-hidden="true">✓</span>
                          <span className="sr-only">Completed</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default Home;