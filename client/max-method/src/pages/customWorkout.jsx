import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

function CustomWorkout() {
  // At the top of CustomWorkout(), read the existing workoutLogId if editing
  const { workoutLogId } = useParams(); // add this if editing routes use /:workoutLogId
  const navigate = useNavigate();
  const { fetchWorkout, setActiveProgram } = useWorkout();
  const [title, setTitle] = useState(() => localStorage.getItem('customWorkoutTitle') || '');
  const [weeks, setWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem('customWorkout');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'week'|'day', wi, di? }
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

  const finishWorkout = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/home'); return; }

    const weeksWithExercises = weeks.map((week, wi) => ({
      ...week,
      days: week.days.map((day, di) => {
        try {
          const saved = localStorage.getItem(`customDay-week${wi + 1}-day${di + 1}`);
          return { ...day, exercises: saved ? JSON.parse(saved) : [] };
        } catch { return day; }
      })
    }));

    try {
      if (workoutLogId) {
        // ── EDITING an existing workout ──────────────────────────────
        // 1. Update the weeks
        await fetch(`${import.meta.env.VITE_API_URL}/api/users/workout-log/${workoutLogId}/weeks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weeks: weeksWithExercises })
        });

        // 2. Update the title
        await fetch(`${import.meta.env.VITE_API_URL}/api/users/workout-log/${workoutLogId}/title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || 'Custom Workout' })
        });

      } else {
        // ── CREATING a new workout ───────────────────────────────────
        const res = await fetch('${import.meta.env.VITE_API_URL}/api/users/custom-workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, title: title || 'Custom Workout', weeks: weeksWithExercises })
        });
        if (!res.ok) throw new Error('Failed to save custom workout');
        await fetchWorkout(userId);
        setActiveProgram(null); // Only clear this on fresh create
      }

      localStorage.removeItem('customWorkout');
      localStorage.removeItem('customWorkoutTitle');
      // await fetchWorkout(userId);
      // setActiveProgram(null);
    } catch (err) {
      console.error('Error saving custom workout:', err);
    }

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
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ type: 'week', wi })}
                  title="Delete week"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', padding: '4px', lineHeight: 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
              <div className="week-days">
                {week.days.map((day, di) => (
                  <div key={di} style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                      type="button"
                      className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                      onClick={() => navigate(`/customDay/${weekNum}/${di + 1}`)}
                    >
                      {day.title ?? `Day ${di + 1}`}
                      {day.completed && <span className="completed-badge">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ type: 'day', wi, di })}
                      title="Delete day"
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', padding: '2px', lineHeight: 1 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
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

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '12px', padding: '28px 32px', maxWidth: '360px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--text)' }}>
              Delete {confirmDelete.type === 'week' ? `Week ${confirmDelete.wi + 1}` : `Day ${confirmDelete.di + 1}`}?
            </h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-muted, #888)', fontSize: '14px', lineHeight: 1.5 }}>
              All exercise data in this {confirmDelete.type} will be permanently lost.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-back"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-complete"
                style={{ background: 'var(--accent)' }}
                onClick={() => {
                  if (confirmDelete.type === 'week') {
                    setWeeks(prev => prev.filter((_, i) => i !== confirmDelete.wi));
                  } else {
                    setWeeks(prev => prev.map((w, i) =>
                      i === confirmDelete.wi ? { ...w, days: w.days.filter((_, j) => j !== confirmDelete.di) } : w
                    ));
                  }
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomWorkout;
