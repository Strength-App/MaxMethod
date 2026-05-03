import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import { useModalA11y } from '../hooks/useModalA11y';

function ViewProgram() {
  const { programLogId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchWorkout } = useWorkout();

  const [program, setProgram] = useState(location.state?.program ?? null);
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingActive, setSettingActive] = useState(false);
  const [isEditing, setIsEditing] = useState(location.state?.isEditing ?? false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'week'|'day', wi, di? }
  const [editTitle, setEditTitle] = useState('');
  const titleTimer = useRef(null);
  const cancelDeleteBtnRef = useRef(null);
  const closeConfirm = useCallback(() => setConfirmDelete(null), []);
  // Modal a11y: focus trap, Esc to close, return focus on close. Initial
  // focus lands on the Cancel button (safer default for destructive action).
  const confirmModalRef = useModalA11y({
    isOpen: !!confirmDelete,
    onClose: closeConfirm,
    initialFocusRef: cancelDeleteBtnRef,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        let prog = program;
        if (!prog) {
          const userId = localStorage.getItem('userId');
          const res = await fetch(`${API_URL}/api/users/program-logs/${userId}`);
          if (!res.ok) throw new Error('Failed to fetch programs');
          const programs = await res.json();
          prog = programs.find(p => p._id === programLogId);
          if (!prog) throw new Error('Program not found');
          setProgram(prog);
        }

        const res = await fetch(`${API_URL}/api/users/workout-log/${prog.workoutLogId}`);
        if (!res.ok) throw new Error('Failed to fetch workout data');
        const data = await res.json();
        setWorkoutData(data);
        setEditTitle(data.title ?? '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [programLogId]);

  useEffect(() => {
    if (!program?.workoutLogId || !editTitle || editTitle === workoutData?.title) return;
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/users/workout-log/${program.workoutLogId}/title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle })
        });
      } catch (err) {
        console.error('Failed to update title:', err);
      }
    }, 500);
    return () => clearTimeout(titleTimer.current);
  }, [editTitle]);

  const handleSetActive = async () => {
    const userId = localStorage.getItem('userId');
    setSettingActive(true);
    try {
      await fetch(`${API_URL}/api/users/program-logs/set-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, programLogId })
      });
      await fetchWorkout(userId);
      navigate('/home');
    } catch (err) {
      console.error('Failed to set active program:', err);
      setSettingActive(false);
    }
  };

  const saveWeeks = async (newWeeks) => {
    try {
      await fetch(`${API_URL}/api/users/workout-log/${program.workoutLogId}/weeks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks: newWeeks })
      });
    } catch (err) {
      console.error('Failed to save workout structure:', err);
    }
  };

  const addDay = (wi) => {
    const newWeeks = workoutData.weeks.map((w, i) =>
      i === wi ? { ...w, days: [...w.days, { title: `Day ${w.days.length + 1}`, completed: false, exercises: [] }] } : w
    );
    setWorkoutData({ ...workoutData, weeks: newWeeks });
    saveWeeks(newWeeks);
  };

  const addWeek = () => {
    const newWeeks = [...workoutData.weeks, { days: [] }];
    setWorkoutData({ ...workoutData, weeks: newWeeks });
    saveWeeks(newWeeks);
  };

  const deleteWeek = (wi) => {
    const newWeeks = workoutData.weeks.filter((_, i) => i !== wi);
    setWorkoutData({ ...workoutData, weeks: newWeeks });
    saveWeeks(newWeeks);
  };

  const deleteDay = (wi, di) => {
    const newWeeks = workoutData.weeks.map((w, i) =>
      i === wi ? { ...w, days: w.days.filter((_, j) => j !== di) } : w
    );
    setWorkoutData({ ...workoutData, weeks: newWeeks });
    saveWeeks(newWeeks);
  };

  const handleDayClick = (weekNum, di) => {
    if (isEditing && isCustom) {
      navigate(`/customDay/${weekNum}/${di + 1}`, {
        state: {
          workoutLogId: program?.workoutLogId,
          exercises: workoutData.weeks[weekNum - 1]?.days[di]?.exercises ?? [],
          programLogId: programLogId,
          totalWeeks: workoutData.weeks.length,
          weekDayCounts: workoutData.weeks.map(w => w.days.filter(d => d?.title != null).length)
        }
      });
    } else {
      navigate(`/day/${weekNum}/${di + 1}`, {
        state: {
          viewWorkout: workoutData,
          programTitle: program?.title,
          editMode: isEditing,
          workoutLogId: program?.workoutLogId
        }
      });
    }
  };

  if (loading) return <p className="status-msg" role="status" aria-live="polite">Loading program…</p>;
  if (error) return <p className="status-msg status-msg--error" role="alert">Error: {error}</p>;
  if (!workoutData) return <p className="status-msg" role="alert">Program not found.</p>;

  const isCustom = workoutData.type === 'custom';
  const goalLabels = { strength: 'Strength', hypertrophy: 'Hypertrophy', loseWeight: 'Weight Loss' };
  let programTitle;
  if (isCustom) {
    programTitle = workoutData.title;
  } else {
    const days = workoutData.daysPerWeek ?? workoutData.weeks[0]?.days?.length;
    const goal = goalLabels[workoutData.goalSelection ?? workoutData.goal] ?? '';
    programTitle = [days && `${days} Day`, workoutData.classification, goal].filter(Boolean).join(' ');
  }

  let totalDays = 0, completedDays = 0;
  workoutData.weeks.forEach(week => {
    week.days.forEach(day => {
      totalDays++;
      if (day.completed) completedDays++;
    });
  });
  const overallPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <div className="home-page-container">
      <div className="viewing-past-banner" role="toolbar" aria-label="Program actions">
        {isCustom && (
          <button
            className={isEditing ? 'btn-complete' : 'btn-back'}
            style={{ marginLeft: '12px' }}
            onClick={() => setIsEditing(e => !e)}
            aria-pressed={isEditing}
            aria-label={isEditing ? 'Stop editing workout' : 'Edit workout structure'}
          >
            {isEditing ? 'Done Editing' : 'Edit Workout'}
          </button>
        )}
        {!program?.isActive && (
          <button
            className="btn-complete"
            style={{ marginLeft: '8px' }}
            onClick={handleSetActive}
            disabled={settingActive}
            aria-busy={settingActive || undefined}
            aria-label={settingActive ? 'Setting program as active' : 'Set this program as active'}
          >
            {settingActive ? 'Setting…' : 'Set as Active'}
          </button>
        )}
        <button
          className="btn-back"
          style={{ marginLeft: '8px' }}
          onClick={() => navigate('/pickNewProgram')}
          aria-label="Back to all programs"
        >
          Back to Programs
        </button>
      </div>

      {isEditing && isCustom ? (
        <>
          <label htmlFor="vp-edit-title" className="sr-only">Workout name</label>
          <input
            id="vp-edit-title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Workout name..."
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
        </>
      ) : (
        <h1>{editTitle || programTitle || 'Program'}</h1>
      )}
      {!isCustom && (
        <div className="fitness-level-container">
          <h2>Fitness Level: {workoutData.classification}</h2>
        </div>
      )}

      {!(isEditing && isCustom) && (
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
      )}

      <div className="schedule-table">
        {workoutData.weeks.map((week, wi) => {
          const weekNum = wi + 1;
          const weekTotal = week.days.length;
          const weekDone = week.days.filter(d => d.completed).length;
          const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

          return (
            <section key={weekNum} className="schedule-week" aria-labelledby={`vp-week-${weekNum}-h`}>
              <div className="week-heading-row">
                <h2 className="week-heading" id={`vp-week-${weekNum}-h`}>Week {weekNum}</h2>
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
                {isEditing && isCustom && (
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
                )}
              </div>
              <div className="week-days">
                {week.days.filter(d => d?.title != null).map((day, di) => {
                  const dayLabel = day.title ?? `Day ${di + 1}`;
                  return (
                    <div key={di} style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        type="button"
                        className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                        onClick={() => handleDayClick(weekNum, di)}
                        aria-label={`Open ${dayLabel} of week ${weekNum}${day.completed ? ', completed' : ''}${isEditing && isCustom ? ', edit mode' : ''}`}
                      >
                        {dayLabel}
                        {day.completed && (
                          <>
                            <span className="completed-badge" aria-hidden="true">✓</span>
                            <span className="sr-only">Completed</span>
                          </>
                        )}
                      </button>
                      {isEditing && isCustom && (
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
                      )}
                    </div>
                  );
                })}
                {isEditing && isCustom && week.days.length < 7 && (
                  <button
                    type="button"
                    className="btn-complete"
                    onClick={() => addDay(wi)}
                    aria-label={`Add a new day to week ${weekNum}`}
                  >
                    <span aria-hidden="true">+</span> Add Day
                  </button>
                )}
              </div>
            </section>
          );
        })}
        {isEditing && isCustom && (
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn-complete"
              onClick={addWeek}
              aria-label="Add a new week to the program"
            >
              <span aria-hidden="true">+</span> Add Week
            </button>
          </div>
        )}
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
            aria-labelledby="vp-confirm-title"
            aria-describedby="vp-confirm-desc"
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '12px', padding: '28px 32px', maxWidth: '360px', width: '90%', textAlign: 'center' }}
          >
            <h3 id="vp-confirm-title" style={{ margin: '0 0 10px', color: 'var(--text)' }}>
              Delete {confirmDelete.type === 'week' ? `Week ${confirmDelete.wi + 1}` : `Day ${confirmDelete.di + 1}`}?
            </h3>
            <p id="vp-confirm-desc" style={{ margin: '0 0 24px', color: 'var(--text-muted, #888)', fontSize: '14px', lineHeight: 1.5 }}>
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
                    deleteWeek(confirmDelete.wi);
                  } else {
                    deleteDay(confirmDelete.wi, confirmDelete.di);
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

export default ViewProgram;

