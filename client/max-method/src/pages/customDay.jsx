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
                      <input
                        className="actual-input"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={s.reps}
                        onChange={e => updateSet(ei, si, { reps: e.target.value })}
                      />
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
        <button className="btn-complete" onClick={saveWorkout}>
          {saved ? '✓ Saved!' : 'Save Workout'}
        </button>
      </div>
    </div>
  );
}

export default CustomDay;
