import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import { useModalA11y } from '../hooks/useModalA11y';

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
  const cancelDeleteBtnRef = useRef(null);
  const closeConfirm = useCallback(() => setConfirmDelete(null), []);
  // Modal a11y: focus trap, Esc to close, return focus on close. Initial focus
  // lands on the Cancel button by default (safer for destructive actions).
  const confirmModalRef = useModalA11y({
    isOpen: !!confirmDelete,
    onClose: closeConfirm,
    initialFocusRef: cancelDeleteBtnRef,
  });
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
        await fetch(`${API_URL}/api/users/workout-log/${workoutLogId}/weeks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weeks: weeksWithExercises })
        });

        // 2. Update the title
        await fetch(`${API_URL}/api/users/workout-log/${workoutLogId}/title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || 'Custom Workout' })
        });

      } else {
        // ── CREATING a new workout ───────────────────────────────────
        const res = await fetch(`${API_URL}/api/users/custom-workout`, {
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
      <label htmlFor="cw-title" className="sr-only">Workout name</label>
      <input
        id="cw-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Name your workout..."
        aria-label="Workout name"
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
        {workout.weeks.map((week, wi) => {
          const weekNum = wi + 1;
          const weekTotal = week.days.length;
          const weekDone = week.days.filter(d => d.completed).length;
          const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

          return (
            <section key={weekNum} className="schedule-week" aria-labelledby={`cw-week-${weekNum}-h`}>
              <div className="week-heading-row">
                <h2 className="week-heading" id={`cw-week-${weekNum}-h`}>Week {weekNum}</h2>
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
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ type: 'week', wi })}
                  aria-label={`Delete week ${weekNum}`}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', padding: '4px', lineHeight: 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
              <div className="week-days">
                {week.days.map((day, di) => {
                  const dayLabel = day.title ?? `Day ${di + 1}`;
                  return (
                    <div key={di} style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        type="button"
                        className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                        onClick={() => navigate(`/customDay/${weekNum}/${di + 1}`)}
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
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ type: 'day', wi, di })}
                        aria-label={`Delete ${dayLabel} of week ${weekNum}`}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', padding: '2px', lineHeight: 1 }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {week.days.length < 7 && (
                  <button
                    type="button"
                    className="btn-complete"
                    onClick={() => setWeeks(prev => prev.map((w, i) =>
                      i === wi ? { ...w, days: [...w.days, { title: `Day ${w.days.length + 1}`, completed: false }] } : w
                    ))}
                    aria-label={`Add a new day to week ${weekNum}`}
                  >
                    Add Day
                  </button>
                )}
              </div>
            </section>
          );
        })}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" className="btn-complete" onClick={() => setWeeks(prev => [...prev, { days: [] }])}>Add Week</button>
          {weeks.length > 0 && (
            <>
              <button
                type="button"
                className="btn-back"
                onClick={saveWorkout}
                aria-label={saved ? 'Workout saved' : 'Save workout draft'}
              >
                <span aria-hidden="true">{saved ? '✓ Saved!' : 'Save'}</span>
              </button>
              <button type="button" className="btn-complete" onClick={finishWorkout}>Finish Workout</button>
            </>
          )}
        </div>
        {/* Polite live region so screen readers announce save success without
            requiring focus on the Save button. */}
        <div role="status" aria-live="polite" className="sr-only">
          {saved ? 'Workout draft saved.' : ''}
        </div>
      </div>

      {confirmDelete && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={closeConfirm}
        >
          <div
            ref={confirmModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cw-confirm-title"
            aria-describedby="cw-confirm-desc"
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '12px', padding: '28px 32px', maxWidth: '360px', width: '90%', textAlign: 'center' }}
          >
            <h3 id="cw-confirm-title" style={{ margin: '0 0 10px', color: 'var(--text)' }}>
              Delete {confirmDelete.type === 'week' ? `Week ${confirmDelete.wi + 1}` : `Day ${confirmDelete.di + 1}`}?
            </h3>
            <p id="cw-confirm-desc" style={{ margin: '0 0 24px', color: 'var(--text-muted, #888)', fontSize: '14px', lineHeight: 1.5 }}>
              All exercise data in this {confirmDelete.type} will be permanently lost.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                ref={cancelDeleteBtnRef}
                type="button"
                className="btn-back"
                onClick={closeConfirm}
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

