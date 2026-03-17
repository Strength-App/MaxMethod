import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

function Home() {
  const navigate = useNavigate();
  const { workout, loading, error } = useWorkout();

  if (loading) return <p className="status-msg">Loading your program...</p>;
  if (error) return <p className="status-msg status-msg--error">Error loading workout: {error}</p>;
  if (!workout) return <p className="status-msg">No workout found. Please complete onboarding first.</p>;

  const weeks = Array.from({ length: workout.weeks.length }, (_, i) => i + 1);

  const goalLabels = { strength: 'Strength', hypertrophy: 'Hypertrophy', loseWeight: 'Weight Loss' };
  const days = workout.daysPerWeek ?? workout.weeks[0]?.days?.length;
  const goal = goalLabels[workout.goalSelection ?? workout.goal] ?? '';
  const programTitle = [days && `${days} Day`, workout.classification, goal].filter(Boolean).join(' ');

  // Overall program progress
  let totalDays = 0, completedDays = 0;
  workout.weeks.forEach(week => {
    week.days.forEach(day => {
      totalDays++;
      if (day.completed) completedDays++;
    });
  });
  const overallPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <div className="home-page-container">
      <h1>{programTitle || 'Current Program'}</h1>
      <div className="fitness-level-container">
        <h2>Current Fitness Level: {workout.classification}</h2>
      </div>

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
        {workout.weeks.map((week, wi) => {
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
                {week.days.map((day, di) => (
                  <button
                    key={di}
                    type="button"
                    className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                    onClick={() => navigate(`/day/${weekNum}/${di + 1}`)}
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