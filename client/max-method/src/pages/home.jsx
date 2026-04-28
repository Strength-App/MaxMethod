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

  if (loading) return <p className="status-msg">Loading your program...</p>;
  if (error) return <p className="status-msg status-msg--error">Error loading workout: {error}</p>;
  if (!displayWorkout) {
    return (
      <div className="home-page-container">
        <div className="home-empty-state">
          <svg width="56" height="56" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
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
      <div className="workout-summary-bar" style={{ marginBottom: '40px' }}>
        <div className="summary-pill">
          <div className="summary-pill-val">{completedDays}</div>
          <div className="summary-pill-lbl">Days Done</div>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--accent">{totalDays}</div>
          <div className="summary-pill-lbl">Total Days</div>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--green">{overallPct}%</div>
          <div className="summary-pill-lbl">Complete</div>
        </div>
      </div>

      <div className="schedule-table">
        {displayWorkout.weeks.map((week, wi) => {
          const weekNum = wi + 1;
          const weekTotal = week.days.length;
          const weekDone = week.days.filter(d => d.completed).length;
          const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

          return (
            <div key={weekNum} className="schedule-week">
              <div className="week-heading-row">
                <h2 className="week-heading">Week {weekNum}</h2>
                <div className="week-stats">
                  <span className="week-stat">{weekDone}/{weekTotal} days</span>
                  <div className="week-progress-bar">
                    <div
                      className={`week-progress-fill${weekDone === weekTotal && weekTotal > 0 ? ' week-progress-fill--full' : ''}`}
                      style={{ width: `${weekPct}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="week-days">
                {week.days.filter(d => d?.title != null).map((day, di) => (
                  <button
                    key={di}
                    type="button"
                    className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                    onClick={() => handleDayClick(weekNum, di)}
                  >
                    {day.title ?? `Day ${di + 1}`}
                    {day.completed && <span className="completed-badge">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Home;