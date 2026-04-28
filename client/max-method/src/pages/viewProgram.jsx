import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';

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

  if (loading) return <p className="status-msg">Loading program...</p>;
  if (error) return <p className="status-msg status-msg--error">Error: {error}</p>;
  if (!workoutData) return <p className="status-msg">Program not found.</p>;

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
      <div className="viewing-past-banner">
        {isCustom && (
          <button
            className={isEditing ? 'btn-complete' : 'btn-back'}
            style={{ marginLeft: '12px' }}
            onClick={() => setIsEditing(e => !e)}
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
          >
            {settingActive ? 'Setting...' : 'Set as Active'}
          </button>
        )}
        <button
          className="btn-back"
          style={{ marginLeft: '8px' }}
          onClick={() => navigate('/pickNewProgram')}
        >
          Back to Programs
        </button>
      </div>

      {isEditing && isCustom ? (
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Workout name..."
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
      ) : (
        <h1>{editTitle || programTitle || 'Program'}</h1>
      )}
      {!isCustom && (
        <div className="fitness-level-container">
          <h2>Fitness Level: {workoutData.classification}</h2>
        </div>
      )}

      {!(isEditing && isCustom) && (
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
      )}

      <div className="schedule-table">
        {workoutData.weeks.map((week, wi) => {
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
                {isEditing && isCustom && (
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
                )}
              </div>
              <div className="week-days">
                {week.days.filter(d => d?.title != null).map((day, di) => (
                  <div key={di} style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                      type="button"
                      className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                      onClick={() => handleDayClick(weekNum, di)}
                    >
                      {day.title ?? `Day ${di + 1}`}
                      {day.completed && <span className="completed-badge">✓</span>}
                    </button>
                    {isEditing && isCustom && (
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
                    )}
                  </div>
                ))}
                {isEditing && isCustom && week.days.length < 7 && (
                  <button
                    type="button"
                    className="btn-complete"
                    onClick={() => addDay(wi)}
                  >
                    + Add Day
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {isEditing && isCustom && (
          <div style={{ marginTop: '16px' }}>
            <button type="button" className="btn-complete" onClick={addWeek}>+ Add Week</button>
          </div>
        )}
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
              <button type="button" className="btn-back" onClick={() => setConfirmDelete(null)}>Cancel</button>
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

