import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

const movementPatterns = {
  "Horizontal Push": ["Bench Press", "Incline Bench Press", "Decline Bench Press", "Floor Press"],
  "Vertical Push": ["Military Press", "Seated Military Press", "Push Press"],
  "Unilateral Push": ["DB Incline Bench", "DB Flat Bench", "DB Shoulder Press", "Arnold Press", "DB Floor Press"],
  "Tricep Accessory": ["Dips", "Skullcrushers", "Tricep Pushdowns", "Tricep Extensions", "Dip Machine", "Overhead Tricep Extensions", "One Arm Extensions", "Close Grip Bench Press"],
  "Shoulder Accessory": ["Front Raises", "Lateral Raises", "Cable Lateral Raises", "Upright Rows", "Face Pulls", "Band Pull Aparts"],
  "Chest Accessory": ["Chest Fly Machine", "DB Chest Flys", "Pushups", "Weighted Pushups", "Floor Chest Flys", "Incline Chest Flys", "Cable Chest Flys", "Low to High Cable Flys"],
  "Push Machine": ["Chest Press Machine", "Shoulder Press Machine", "Decline Press Machine", "Incline Press Machine"],
  "Vertical Pull": ["Neutral Grip Pullups", "Pullups", "Chin Ups", "Lat Pulldowns", "Close Grip Lat Pulldowns", "Wide Grip Lat Pulldowns", "Single Arm Pulldowns"],
  "Vertical Pull Cable Only": ["Lat Pulldowns", "Close Grip Lat Pulldowns", "Wide Grip Lat Pulldowns", "Single Arm Pulldowns"],
  "Horizontal Pull": ["Barbell Row", "Underhand Barbell Row", "Cable Row", "T Bar Rows", "Single Arm Cable Rows", "Single Arm Dumbbell Rows", "Chest Supported Row", "Meadows Row", "Seal Row", "Pendlay Row"],
  "Posterior Upper Accessory": ["Scarecrows", "Rear Delt Flys", "Machine Rear Delt Flys", "Pullovers", "Cable Pullovers", "Shrugs", "DB Shrugs", "Trap Bar Shrugs", "YTWLs"],
  "Bicep Accessory": ["DB Curls", "Barbell Curls", "Ez Bar Curls", "Hammer Curls", "Preacher Curls", "Cable Curls", "Rope Curls", "Incline DB Curls", "Concentration Curls", "Cross Body Hammer Curls"],
  "Hinge": ["Hip Thrusts", "RDLs", "Trap Bar Deadlifts", "Barbell Glute Bridges", "Single Leg RDLs", "Sumo Deadlift", "Good Mornings"],
  "Squat Pattern": ["Front Squat", "SSB Squats", "Hack Squat Machine", "Pendulum Squat", "Leg Press", "Goblet Squat", "Zercher Squat"],
  "Posterior Chain Accessory": ["Back Extensions", "Nordics", "Reverse Hypers", "GHD Raises", "Single Leg Hip Thrusts"],
  "Unilateral Lower": ["Bulgarians", "Walking Lunges", "ATG Lunges", "Reverse Lunges", "Step Ups"],
  "Isolation Lower": ["Leg Extensions", "Single Leg Extensions", "Seated Leg Curls", "Lying Leg Curls", "Abductor Machine", "Adductor Machine"],
  "Calves & Shins": ["Single Leg Calf Raises", "Calf Raise Machine", "Seated Calf Raises", "Bodyweight Calf Raises", "Weighted Calf Raises", "Donkey Calf Raises", "Tibia Raises", "Tibia Curls", "Banded Tibia Curls"],
  "Machine Lower": ["Leg Press", "Hack Squat", "Pendulum Squat", "Reverse Hack Squat"],
  "Core": ["Plank", "Ab Wheel Rollouts", "Hanging Leg Raises", "Cable Crunches", "Decline Crunches", "Pallof Press", "Dead Bugs", "Suitcase Carries", "Farmer Carries"]
};

function resolveWeekValue(value, wi) {
  if (Array.isArray(value)) return value[wi] ?? null;
  return value ?? null;
}

function Day() {
  const { weekNum, dayNum } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const wi = parseInt(weekNum, 10) - 1;
  const di = parseInt(dayNum, 10) - 1;

  const { displayWorkout, assignments, setExercise, log, updateLog, completeDay, loading, error } = useWorkout();
  const viewWorkout = location.state?.viewWorkout ?? null;
  const editMode = location.state?.editMode ?? false;
  const workoutLogId = location.state?.workoutLogId ?? null;
  const isExternalWorkout = !!viewWorkout;
  const isReadOnly = isExternalWorkout && !editMode;
  const isViewingPast = isReadOnly; // kept for existing read-only checks
  const workout = viewWorkout ?? displayWorkout;
  const isCustom = workout?.type === 'custom';
  const [editingSlot, setEditingSlot] = useState(null);
  const [openCards, setOpenCards] = useState({ 0: true });
  const [setData, setSetData] = useState({});

  const day = workout?.weeks?.[wi]?.days?.[di];

  // Custom workout exercise state
  const [customExercises, setCustomExercises] = useState(() =>
    isCustom ? (day?.exercises ?? []) : []
  );
  const saveTimerRef = useRef(null);

  // Load custom exercises from day if state is empty (handles delayed context load)
  useEffect(() => {
    if (!isCustom || !day) return;
    if (customExercises.length === 0 && day.exercises?.length > 0) {
      setCustomExercises(day.exercises);
    }
  }, [day]);

  // Save custom exercises to DB (debounced)
  useEffect(() => {
    if (!isCustom) return;
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const url = (editMode && workoutLogId)
          ? `http://localhost:5050/api/users/workout-log/${workoutLogId}/custom-day`
          : 'http://localhost:5050/api/users/workout/custom-day';
        const body = (editMode && workoutLogId)
          ? { weekNum: Number(weekNum), dayNum: Number(dayNum), exercises: customExercises }
          : { userId, weekNum: Number(weekNum), dayNum: Number(dayNum), exercises: customExercises };
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } catch (err) {
        console.error('Failed to save custom day:', err);
      }
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [customExercises, weekNum, dayNum, isCustom]);

  // Seed setData from persisted log when workout/log loads (generated workouts only)
  useEffect(() => {
    if (isCustom || !day) return;
    setSetData(prev => {
      const seeded = { ...prev };
      (day.slots ?? []).forEach((slot, si) => {
        const setsVal = resolveWeekValue(slot.sets, wi);
        const count = typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0);
        const savedWeight = log[wi]?.[di]?.[si]?.actualWeight ?? '';
        for (let j = 0; j < count; j++) {
          const key = `${si}-${j}`;
          if (!seeded[key]) {
            seeded[key] = { actual: savedWeight, done: false };
          }
        }
      });
      return seeded;
    });
  }, [workout, log]);

  if (loading) return <div className="day-page"><p className="status-msg">Loading workout...</p></div>;
  if (error) return <div className="day-page"><p className="status-msg status-msg--error">Error loading workout: {error}</p></div>;

  if (!day) return (
    <div className="day-page">
      <p>No workout found for Week {weekNum}, Day {dayNum}.</p>
      <button className="btn-back" onClick={() => navigate('/home')}>Back to Home</button>
    </div>
  );

  const getSet = (si, j) => setData[`${si}-${j}`] ?? { actual: '', done: false };

  const updateSet = (si, j, patch) =>
    setSetData(prev => ({
      ...prev,
      [`${si}-${j}`]: { ...(prev[`${si}-${j}`] ?? { actual: '', done: false }), ...patch },
    }));

  const toggleCard = (si) =>
    setOpenCards(prev => ({ ...prev, [si]: !prev[si] }));

  const updateCustomSet = (ei, si, patch) =>
    setCustomExercises(prev => prev.map((ex, i) =>
      i === ei ? { ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, ...patch } : s) } : ex
    ));

  // Summary counts
  let totalSets = 0, doneSets = 0;
  if (isCustom) {
    customExercises.forEach(ex => {
      totalSets += ex.sets.length;
      doneSets += ex.sets.filter(s => s.done).length;
    });
  } else {
    (day.slots ?? []).forEach((slot, si) => {
      const setsVal = resolveWeekValue(slot.sets, wi);
      const count = typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0);
      totalSets += count;
      for (let j = 0; j < count; j++) {
        if (getSet(si, j).done) doneSets++;
      }
    });
  }
  const completionPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  const handleCompleteDay = async () => {
    await completeDay(wi, di);
    navigate('/home');
  };

  return (
    <div className="day-page">
      {/* Header */}
      <div className="day-header">
        <div className="day-header-meta">
          <span className="week-badge">Week {weekNum}</span>
          <h1 className="day-title">{day.title ?? `Day ${dayNum}`}</h1>
        </div>
        {!isCustom && (
          <p className="progression-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Progression: Add 5 lbs when all sets and reps are completed
          </p>
        )}
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
        {isCustom ? customExercises.map((ex, ei) => {
          const doneCount = ex.sets.filter(s => s.done).length;
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length;
          const progPct = ex.sets.length > 0 ? Math.round((doneCount / ex.sets.length) * 100) : 0;
          const isOpen = openCards[ei] ?? true;
          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
              <div className="ex-card-header" onClick={() => toggleCard(ei)}>
                <div className="ex-card-title-block">
                  <div className="ex-card-name ex-card-name--fixed">{ex.name}</div>
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
              <div className="ex-progress-bar">
                <div className={`ex-progress-fill${allDone ? ' ex-progress-fill--full' : ''}`} style={{ width: `${progPct}%` }} />
              </div>
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
                      <div className="set-reps">{s.reps || '—'}</div>
                      <div className="set-target">
                        {s.target ? <><span className="target-wt">{s.target}</span><span className="target-unit"> lbs</span></> : <span className="target-dash">—</span>}
                      </div>
                      <input
                        className="actual-input"
                        type="number" min="0" step="5" placeholder="0"
                        value={s.actual}
                        onChange={e => updateCustomSet(ei, si, { actual: e.target.value })}
                      />
                      <button
                        className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                        onClick={() => updateCustomSet(ei, si, { done: !s.done })}
                        title="Mark set done"
                      >{s.done ? '✓' : ''}</button>
                    </div>
                  ))}
                  {allDone && <div className="ex-complete-banner"><span>✓</span> All sets complete — nice work!</div>}
                </div>
              )}
            </div>
          );
        }) : (day.slots ?? []).map((slot, si) => {
          const exercise = assignments[di]?.[si] ?? slot.exercise ?? '';
          const setsVal = resolveWeekValue(slot.sets, wi);
          const setCount = typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0);
          const repsRaw = resolveWeekValue(slot.reps, wi);
          const repsArray = Array.isArray(repsRaw)
            ? repsRaw
            : (typeof repsRaw === 'string' && repsRaw.includes(','))
              ? repsRaw.split(',').map(r => r.trim())
              : null;
          const getReps = (j) => repsArray ? (repsArray[j] ?? repsArray[repsArray.length - 1]) : repsRaw;
          const weightNoteRaw = resolveWeekValue(slot.weightNote, wi);
          const weightNoteArray = Array.isArray(weightNoteRaw)
            ? weightNoteRaw
            : (typeof weightNoteRaw === 'string' && weightNoteRaw.includes(','))
              ? weightNoteRaw.split(',').map(w => w.trim())
              : null;
          const getWeightNote = (j) => weightNoteArray ? (weightNoteArray[j] ?? weightNoteArray[weightNoteArray.length - 1]) : weightNoteRaw;
          const options = slot.label ? (movementPatterns[slot.label] ?? [exercise]) : [exercise];
          const isOpen = openCards[si] ?? false;
          const doneCount = Array.from({ length: setCount }, (_, j) => getSet(si, j).done).filter(Boolean).length;
          const allDone = setCount > 0 && doneCount === setCount;
          const progPct = setCount > 0 ? Math.round((doneCount / setCount) * 100) : 0;
          const isEditing = editingSlot === si;

          return (
            <div
              key={si}
              className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}
            >
              {/* Card Header */}
              <div
                className="ex-card-header"
                onClick={() => { setEditingSlot(null); toggleCard(si); }}
              >
                <div className="ex-card-title-block">
                  {slot.fixed || isViewingPast ? (
                    <div className="ex-card-name ex-card-name--fixed">{exercise}</div>
                  ) : isEditing ? (
                    <select
                      autoFocus
                      className="exercise-select"
                      value={exercise}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        setExercise(di, si, e.target.value);
                        setEditingSlot(null);
                        if (editMode && workoutLogId) {
                          fetch(`http://localhost:5050/api/users/workout-log/${workoutLogId}/slot-exercise`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ weekNum: wi + 1, dayNum: di + 1, slotIdx: si, exercise: e.target.value })
                          }).catch(err => console.error('Failed to save exercise:', err));
                        }
                      }}
                      onBlur={() => setEditingSlot(null)}
                    >
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <button
                      className="ex-card-name-btn"
                      onClick={e => { e.stopPropagation(); setEditingSlot(si); }}
                      title="Tap to change exercise"
                    >
                      <span className="ex-card-name">{exercise}</span>
                      <span className="exercise-edit-icon">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </span>
                    </button>
                  )}
                  {slot.label && <div className="ex-card-type">{slot.label}</div>}
                </div>

                <div className="ex-card-stats">
                  <div className="stat-chip">
                    <div className="stat-chip-val">{setCount}</div>
                    <div className="stat-chip-lbl">Sets</div>
                  </div>
                  <div className="stat-chip stat-chip--done">
                    <div className="stat-chip-val">{doneCount}/{setCount}</div>
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

                  {Array.from({ length: setCount }, (_, j) => {
                    const s = getSet(si, j);
                    const wn = getWeightNote(j);
                    const hasTarget = !!wn;
                    const matched = s.actual !== '' && (hasTarget
                      ? parseInt(s.actual) >= parseInt(wn)
                      : s.actual > 0);

                    return (
                      <div key={j} className={`ex-set-row${s.done ? ' ex-set-row--done' : ''}`}>
                        <div className={`set-num${s.done ? ' set-num--done' : ''}`}>{j + 1}</div>

                        <div className="set-reps">{getReps(j) ?? '—'}</div>

                        <div className="set-target">
                          {wn
                            ? <><span className="target-wt">{wn}</span><span className="target-unit"> lbs</span></>
                            : <span className="target-dash">—</span>
                          }
                        </div>

                        <input
                          className={`actual-input${matched ? ' actual-input--matched' : ''}`}
                          type="number"
                          min="0"
                          step="5"
                          placeholder="0"
                          value={s.actual}
                          disabled={isViewingPast}
                          onChange={e => {
                            updateSet(si, j, { actual: e.target.value });
                            updateLog(wi, di, si, 'actualWeight', e.target.value);
                          }}
                        />

                        <button
                          className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                          onClick={() => !isViewingPast && updateSet(si, j, { done: !s.done })}
                          disabled={isViewingPast}
                          title="Mark set done"
                        >
                          {s.done ? '✓' : ''}
                        </button>
                      </div>
                    );
                  })}

                  {allDone && (
                    <div className="ex-complete-banner">
                      <span>✓</span> All sets complete — nice work!
                    </div>
                  )}

                  <div className="ex-notes-row">
                    <span className="ex-notes-label">Notes</span>
                    <input
                      className="notes-input"
                      placeholder="notes..."
                      value={(log[wi]?.[di]?.[si] ?? {}).notes ?? ''}
                      onChange={e => updateLog(wi, di, si, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="day-footer">
        <button className="btn-back" onClick={() => isExternalWorkout ? navigate(-1) : navigate('/home')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          {isExternalWorkout ? 'Back' : 'Back to Home'}
        </button>
        {!day.completed && !isExternalWorkout && (
          <button className="btn-complete" onClick={handleCompleteDay}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Day Complete
          </button>
        )}
        {day.completed && (
          <span className="day-completed-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '5px', verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12"/></svg>
            Day Completed
          </span>
        )}
      </div>
    </div>
  );
}

export default Day;