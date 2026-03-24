import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CustomWorkout() {
  const navigate = useNavigate();
  const [title, setTitle] = useState(() => localStorage.getItem('customWorkoutTitle') || '');
  const [weeks, setWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem('customWorkout');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [saved, setSaved] = useState(false);
  const workout = { title: title || 'Custom Workout', weeks };

  useEffect(() => {
    localStorage.setItem('customWorkout', JSON.stringify(weeks));
  }, [weeks]);

  useEffect(() => {
    localStorage.setItem('customWorkoutTitle', title);
  }, [title]);

  const saveWorkout = () => {
    localStorage.setItem('customWorkout', JSON.stringify(weeks));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const finishWorkout = () => {
    localStorage.setItem('customWorkout', JSON.stringify(weeks));
    navigate('/home');
  };

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
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Name your workout..."
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: '2px solid var(--accent)',
          outline: 'none',
          color: 'var(--text)',
          fontFamily: "'Permanent Marker', cursive",
          fontSize: '2rem',
          fontWeight: 700,
          width: '100%',
          marginBottom: '16px',
        }}
      />

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
                    onClick={() => navigate(`/customDay/${weekNum}/${di + 1}`)}
                  >
                    {day.title ?? `Day ${di + 1}`}
                    {day.completed && <span className="completed-badge">✓</span>}
                  </button>
                ))}
                {week.days.length < 7 && (
                  <button
                    type="button"
                    className="btn-complete"
                    onClick={() => setWeeks(prev => prev.map((w, i) =>
                      i === wi ? { ...w, days: [...w.days, { title: `Day ${w.days.length + 1}`, completed: false }] } : w
                    ))}
                  >
                    Add Day
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" className="btn-complete" onClick={() => setWeeks(prev => [...prev, { days: [] }])}>Add Week</button>
          {weeks.length > 0 && (
            <>
              <button type="button" className="btn-back" onClick={saveWorkout}>{saved ? '✓ Saved!' : 'Save'}</button>
              <button type="button" className="btn-complete" onClick={finishWorkout}>Finish Workout</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomWorkout;
