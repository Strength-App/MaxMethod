import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

function CustomDay() {
  const { weekNum, dayNum } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { workout } = useWorkout();
  const wi = Number(weekNum) - 1;
  const di = Number(dayNum) - 1;

  // When accessed from viewProgram edit mode, workoutLogId and exercises come from route state
  const externalWorkoutLogId = location.state?.workoutLogId ?? null;
  const isExternal = !!externalWorkoutLogId;
  const isDbWorkout = isExternal;

  const [exercises, setExercises] = useState(() => {
    // If accessed from viewProgram, use the passed exercises
    if (location.state?.exercises) return location.state.exercises;
    // localStorage first — valid during creation and same-session edits
    try {
      const saved = localStorage.getItem(`customDay-week${weekNum}-day${dayNum}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Fall back to DB data if workout is already loaded
    return workout?.weeks[wi]?.days[di]?.exercises ?? [];
  });
  const [openCards, setOpenCards] = useState({});
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);
  const initialised = useRef(false);

  // If exercises are still empty after mount and workout loads, pull from DB
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (exercises.length === 0 && isDbWorkout) {
      const dbExercises = workout.weeks[wi]?.days[di]?.exercises;
      if (Array.isArray(dbExercises) && dbExercises.length > 0) {
        setExercises(dbExercises);
      }
    }
  }, [workout]);

  // Keep localStorage in sync (only for active workout, not external edits)
  useEffect(() => {
    if (isExternal) return;
    localStorage.setItem(`customDay-week${weekNum}-day${dayNum}`, JSON.stringify(exercises));
  }, [exercises, weekNum, dayNum, isExternal]);

  // Save to DB when editing a saved custom workout (debounced)
  useEffect(() => {
    if (!isDbWorkout) return;
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const url = isExternal
          ? `http://localhost:5050/api/users/workout-log/${externalWorkoutLogId}/custom-day`
          : 'http://localhost:5050/api/users/workout/custom-day';
        const body = isExternal
          ? { weekNum: Number(weekNum), dayNum: Number(dayNum), exercises }
          : { userId, weekNum: Number(weekNum), dayNum: Number(dayNum), exercises };
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } catch (err) {
        console.error('Failed to save custom day:', err);
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [exercises, weekNum, dayNum, isDbWorkout]);

  const saveWorkout = () => {
    localStorage.setItem(`customDay-week${weekNum}-day${dayNum}`, JSON.stringify(exercises));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addExercise = () => {
    const idx = exercises.length;
    setExercises(prev => [...prev, {
      name: '',
      sets: [{ reps: '', target: '', actual: '', done: false }],
    }]);
    setOpenCards(prev => ({ ...prev, [idx]: true }));
  };

  const updateName = (ei, val) =>
    setExercises(prev => prev.map((ex, i) => i === ei ? { ...ex, name: val } : ex));

  const updateSet = (ei, si, patch) =>
    setExercises(prev => prev.map((ex, i) =>
      i === ei ? { ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, ...patch } : s) } : ex
    ));

  const addSet = (ei) =>
    setExercises(prev => prev.map((ex, i) =>
      i === ei ? { ...ex, sets: [...ex.sets, { reps: '', target: '', actual: '', done: false }] } : ex
    ));

  const toggleCard = (ei) =>
    setOpenCards(prev => ({ ...prev, [ei]: !prev[ei] }));

  const deleteExercise = (ei) =>
    setExercises(prev => prev.filter((_, i) => i !== ei));

  const applyToAllWeeks = async () => {
    const totalWeeks = isExternal
      ? workout?.weeks?.length ?? 0
      : (() => { try { return JSON.parse(localStorage.getItem('customWorkout') || '[]').length; } catch { return 0; } })();

    if (totalWeeks <= 1) return;

    const stripped = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s, actual: '', done: false })),
    }));

    if (isExternal) {
      const requests = [];
      for (let w = 1; w <= totalWeeks; w++) {
        if (w === Number(weekNum)) continue;
        requests.push(
          fetch(`http://localhost:5050/api/users/workout-log/${externalWorkoutLogId}/custom-day`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekNum: w, dayNum: Number(dayNum), exercises: stripped }),
          })
        );
      }
      await Promise.all(requests);
    } else {
      for (let w = 1; w <= totalWeeks; w++) {
        if (w === Number(weekNum)) continue;
        localStorage.setItem(`customDay-week${w}-day${dayNum}`, JSON.stringify(stripped));
      }
    }
  };

  const [applyConfirm, setApplyConfirm] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  // Summary counts
  let totalSets = 0, doneSets = 0;
  exercises.forEach(ex => {
    totalSets += ex.sets.length;
    doneSets += ex.sets.filter(s => s.done).length;
  });
  const completionPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <div className="day-page">
      {/* Header */}
      <div className="day-header">
        <div className="day-header-meta">
          <span className="week-badge">Week {weekNum}</span>
          <h1 className="day-title">Day {dayNum}</h1>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="workout-summary-bar">
        <div className="summary-pill">
          <div className="summary-pill-val">{doneSets}</div>
          <div className="summary-pill-lbl">Sets Done</div>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--accent">{totalSets}</div>
          <div className="summary-pill-lbl">Total Sets</div>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--green">{completionPct}%</div>
          <div className="summary-pill-lbl">Complete</div>
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="exercise-cards">
        {exercises.map((ex, ei) => {
          const isOpen = openCards[ei] ?? true;
          const doneCount = ex.sets.filter(s => s.done).length;
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length;
          const progPct = ex.sets.length > 0 ? Math.round((doneCount / ex.sets.length) * 100) : 0;

          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
              {/* Card Header */}
              <div className="ex-card-header" onClick={() => toggleCard(ei)}>
                <div className="ex-card-title-block">
                  <input
                    className="ex-card-name"
                    placeholder="Search exercise..."
                    value={ex.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateName(ei, e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: '1em', width: '100%' }}
                  />
                </div>
                <div className="ex-card-stats">
                  <div className="stat-chip">
                    <div className="stat-chip-val">{ex.sets.length}</div>
                    <div className="stat-chip-lbl">Sets</div>
                  </div>
                  <div className="stat-chip stat-chip--done">
                    <div className="stat-chip-val">{doneCount}/{ex.sets.length}</div>
                    <div className="stat-chip-lbl">Done</div>
                  </div>
                </div>
                <button
                  className="ex-card-delete"
                  onClick={e => { e.stopPropagation(); deleteExercise(ei); }}
                  title="Delete exercise"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', padding: '4px', lineHeight: 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
                <div className="ex-card-chevron" aria-hidden="true">▼</div>
              </div>

              {/* Progress Bar */}
              <div className="ex-progress-bar">
                <div
                  className={`ex-progress-fill${allDone ? ' ex-progress-fill--full' : ''}`}
                  style={{ width: `${progPct}%` }}
                />
              </div>

              {/* Sets Panel */}
              {isOpen && (
                <div className="ex-sets-panel">
                  <div className="ex-sets-col-header">
                    <span className="ex-col-lbl">Set</span>
                    <span className="ex-col-lbl">Reps</span>
                    <span className="ex-col-lbl">Target</span>
                    <span className="ex-col-lbl">Actual (lbs)</span>
                    <span className="ex-col-lbl">✓</span>
                  </div>

                  {ex.sets.map((s, si) => (
                    <div key={si} className={`ex-set-row${s.done ? ' ex-set-row--done' : ''}`}>
                      <div className={`set-num${s.done ? ' set-num--done' : ''}`}>{si + 1}</div>
                      <div className="actual-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => updateSet(ei, si, { reps: Math.max(0, (Number(s.reps) || 0) - 1) })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                        >−</button>
                        <span style={{ textAlign: 'center', fontSize: '14px', color: s.reps !== '' ? 'var(--text)' : 'var(--muted)' }}>
                          {s.reps !== '' ? s.reps : '0'}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateSet(ei, si, { reps: (Number(s.reps) || 0) + 1 })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                        >+</button>
                      </div>
                      <input
                        className="actual-input"
                        type="number"
                        min="0"
                        step="5"
                        placeholder="0"
                        value={s.target}
                        onChange={e => updateSet(ei, si, { target: e.target.value })}
                      />
                      <input
                        className="actual-input"
                        type="number"
                        min="0"
                        step="5"
                        placeholder="0"
                        value={s.actual}
                        onChange={e => updateSet(ei, si, { actual: e.target.value })}
                      />
                      <button
                        className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                        onClick={() => updateSet(ei, si, { done: !s.done })}
                        title="Mark set done"
                      >
                        {s.done ? '✓' : ''}
                      </button>
                    </div>
                  ))}

                  {allDone && (
                    <div className="ex-complete-banner">
                      <span>✓</span> All sets complete — nice work!
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-back"
                    style={{ marginTop: '10px' }}
                    onClick={() => addSet(ei)}
                  >
                    + Add Set
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button type="button" className="btn-complete" onClick={addExercise}>Add Exercise</button>
      </div>

      {/* Footer */}
      <div className="day-footer">
        <button className="btn-back" onClick={() => isExternal ? navigate(`/view-program/${location.state?.programLogId}`, { state: { isEditing: true } }) : navigate('/customWorkout')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <button type="button" className="btn-back" onClick={() => setApplyConfirm(true)}>
          Apply to All Weeks
        </button>
        <button className="btn-complete" onClick={saveWorkout}>
          {saved ? '✓ Saved!' : 'Save Workout'}
        </button>
      </div>

      {applyConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '12px', padding: '28px 32px', maxWidth: '360px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--text)' }}>Apply to All Weeks?</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-muted, #888)', fontSize: '14px', lineHeight: 1.5 }}>
              The exercises in Day {dayNum} will be copied to every other week, overwriting any existing data for that day.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button type="button" className="btn-back" onClick={() => setApplyConfirm(false)}>Cancel</button>
              <button
                type="button"
                className="btn-complete"
                onClick={async () => {
                  await applyToAllWeeks();
                  setApplyConfirm(false);
                  setApplyDone(true);
                  setTimeout(() => setApplyDone(false), 2000);
                }}
              >
                {applyDone ? '✓ Applied!' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomDay;
