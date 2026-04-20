import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

const BIG_THREE = ['bench', 'squat', 'deadlift'];
function getRestSeconds(exerciseName) {
  const lower = (exerciseName || '').toLowerCase();
  return BIG_THREE.some(n => lower.includes(n)) ? 120 : 90;
}

function RestTimer({ initialSeconds, onSkip }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSeconds(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (seconds === 0) onSkip();
  }, [seconds]);

  const adjust = (delta) => setSeconds(s => Math.max(0, s + delta));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="rest-timer">
      <div className="rest-timer-label">Rest Timer</div>
      <div className="rest-timer-display">{mins}:{String(secs).padStart(2, '0')}</div>
      <div className="rest-timer-controls">
        <button className="rest-timer-btn" onClick={() => adjust(-30)}>-30s</button>
        <button className="rest-timer-btn rest-timer-btn--pause" onClick={() => setPaused(p => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="rest-timer-btn rest-timer-btn--skip" onClick={onSkip}>Skip</button>
        <button className="rest-timer-btn" onClick={() => adjust(30)}>+30s</button>
      </div>
    </div>
  );
}

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

// Which 1RM to apply when a weightNote is a percentage string (e.g. "75%")
const PERCENT_REF_1RM = {
  "Horizontal Push": "bench",
  "Vertical Push":   "bench",
  "Squat Pattern":   "squat",
  "Hinge":           "deadlift",
};

// Fallback for "Main Lift" slots where label doesn't identify the lift
const FIXED_EXERCISE_1RM = {
  "Bench Press": "bench",
  "Back Squat":  "squat",
  "Squat":       "squat",
  "Deadlift":    "deadlift",
};

function Day() {
  const { weekNum, dayNum } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const wi = parseInt(weekNum, 10) - 1;
  const di = parseInt(dayNum, 10) - 1;

  const { displayWorkout, assignments, setExercise, log, updateLog, completeDay, loading, error, personalBests } = useWorkout();
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
  const [userOneRMs, setUserOneRMs] = useState(null);
  const [timerState, setTimerState] = useState(null); // { cardKey, id }
  const [postWorkoutData, setPostWorkoutData] = useState(null); // { totalVolume, breakdown }
  const [sessionPRs, setSessionPRs] = useState([]);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    fetch(`http://localhost:5050/api/users/profile/${uid}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.current_one_rep_maxes) setUserOneRMs(data.current_one_rep_maxes); })
      .catch(() => {});
  }, []);

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
        const count = slot.label === 'Cardio'
          ? (slot.cardioSets?.length ?? 0)
          : (typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0));
        for (let j = 0; j < count; j++) {
          const key = `${si}-${j}`;
          const savedWeight = log[wi]?.[di]?.[si]?.actualWeights?.[j] ?? '';
          const savedActualReps = log[wi]?.[di]?.[si]?.actualReps?.[j] ?? '';
          if (!seeded[key]) {
            const savedDone = log[wi]?.[di]?.[si]?.completedSets?.[j] ?? false;
            seeded[key] = {
              actual: savedWeight,
              actualReps: savedActualReps,
              done: savedDone,
              cardioTime: log[wi]?.[di]?.[si]?.cardioTimes?.[j] ?? '',
              cardioIntensity: log[wi]?.[di]?.[si]?.cardioIntensities?.[j] ?? '',
              cardioDistance: log[wi]?.[di]?.[si]?.cardioDistances?.[j] ?? '',
            };
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

  const getSet = (si, j) => setData[`${si}-${j}`] ?? { actual: '', actualReps: '', done: false, cardioTime: '', cardioIntensity: '', cardioDistance: '' };

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

  const handleSetComplete = (exercise, actual, markingDone) => {
    if (markingDone && actual) {
      fetch('http://localhost:5050/api/users/workout/pb-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('userId'),
          exercise,
          actualWeight: Number(actual)
        })
      }).catch(err => console.error('Failed to check PB:', err));
    }
  };

  const recordPRIfBeaten = (exercise, weight, reps) => {
    const w = parseFloat(weight) || 0;
    if (!w || !exercise) return;
    const currentPB = personalBests?.[exercise] ?? 0;
    if (w > currentPB) {
      setSessionPRs(prev => {
        const existing = prev.find(p => p.exercise === exercise);
        if (existing && existing.weight >= w) return prev;
        return [...prev.filter(p => p.exercise !== exercise), { exercise, weight: w, reps: reps || '' }];
      });
    }
  };

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
      const count = slot.label === 'Cardio'
        ? (slot.cardioSets?.length ?? 0)
        : (typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0));
      totalSets += count;
      for (let j = 0; j < count; j++) {
        if (getSet(si, j).done) doneSets++;
      }
    });
  }
  const completionPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  const handleCompleteDay = async () => {
    await completeDay(wi, di);

    // Calculate total volume
    const breakdown = [];
    if (isCustom) {
      customExercises.forEach(ex => {
        let vol = 0;
        let sets = 0;
        ex.sets.forEach(s => {
          if (!s.done) return;
          const reps = parseInt(s.actualReps || s.reps) || 0;
          const weight = parseFloat(s.actual) || 0;
          vol += reps * weight;
          sets++;
        });
        if (sets > 0) breakdown.push({ name: ex.name, volume: vol, sets });
      });
    } else {
      groupedSlots.forEach(({ exercise, items }) => {
        let vol = 0;
        let sets = 0;
        items.forEach(({ slot, si }) => {
          const setsVal = resolveWeekValue(slot.sets, wi);
          const count = typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0);
          const repsRaw = resolveWeekValue(slot.reps, wi);
          const repsArray = Array.isArray(repsRaw)
            ? repsRaw
            : (typeof repsRaw === 'string' && repsRaw.includes(','))
              ? repsRaw.split(',').map(r => r.trim())
              : null;
          for (let j = 0; j < count; j++) {
            const s = getSet(si, j);
            if (!s.done) continue;
            const weight = parseFloat(s.actual) || 0;
            const targetRepsVal = repsArray ? (repsArray[j] ?? repsArray[repsArray.length - 1]) : repsRaw;
            const reps = parseInt(s.actualReps || targetRepsVal) || 0;
            vol += reps * weight;
            sets++;
          }
        });
        if (sets > 0) breakdown.push({ name: exercise, volume: vol, sets });
      });
    }
    const totalVolume = breakdown.reduce((sum, e) => sum + e.volume, 0);
    const totalSetsCompleted = breakdown.reduce((sum, e) => sum + e.sets, 0);
    setPostWorkoutData({ totalVolume, totalSets: totalSetsCompleted, breakdown, prs: sessionPRs });
  };

  // Group consecutive slots with the same exercise into one card (all slots, order preserved)
  const groupedSlots = (() => {
    if (isCustom) return [];
    const groups = [];
    (day.slots ?? []).forEach((slot, si) => {
      const exercise = assignments[di]?.[si] ?? slot.exercise ?? '';
      if (slot.label === 'Cardio') {
        // Cardio slots are always standalone — never merge with adjacent slots
        groups.push({ exercise, items: [{ slot, si }], superset: false, supersetGroup: null });
      } else {
        const last = groups[groups.length - 1];
        if (last && last.exercise === exercise && last.items[0]?.slot?.label !== 'Cardio') {
          last.items.push({ slot, si });
        } else {
          groups.push({ exercise, items: [{ slot, si }], superset: !!slot.superset, supersetGroup: slot.supersetGroup ?? null });
        }
      }
    });
    return groups;
  })();

  // Build render groups preserving original slot order
  const renderGroups = (() => {
    const result = [];
    let i = 0;
    while (i < groupedSlots.length) {
      const g = groupedSlots[i];
      if (g.items[0]?.slot?.label === 'Cardio') {
        result.push({ type: 'cardio', group: g, gi: i });
        i++;
        continue;
      }
      const ssLabel = (g.superset && g.supersetGroup) ? g.supersetGroup : null;
      if (ssLabel) {
        const ssItems = [];
        while (i < groupedSlots.length &&
               groupedSlots[i].superset &&
               groupedSlots[i].supersetGroup === ssLabel &&
               groupedSlots[i].items[0]?.slot?.label !== 'Cardio') {
          ssItems.push({ group: groupedSlots[i], gi: i });
          i++;
        }
        if (ssItems.length > 1) {
          result.push({ type: 'superset', label: ssLabel, items: ssItems });
        } else {
          result.push({ type: 'standalone', group: ssItems[0].group, gi: ssItems[0].gi });
        }
      } else {
        result.push({ type: 'standalone', group: g, gi: i });
        i++;
      }
    }
    return result;
  })();

  // ── renderCard — shared by strength and cardio sections ──────────────────────
  const renderCard = (group, gi) => {
    const { exercise, items } = group;
    const { slot: firstSlot, si: firstSi } = items[0];

    let groupSetCount = 0;
    let groupDoneCount = 0;
    items.forEach(({ slot, si }) => {
      const setsVal = resolveWeekValue(slot.sets, wi);
      const count = slot.label === 'Cardio'
        ? (slot.cardioSets?.length ?? 0)
        : (typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0));
      groupSetCount += count;
      for (let j = 0; j < count; j++) {
        if (getSet(si, j).done) groupDoneCount++;
      }
    });
    const allDone = groupSetCount > 0 && groupDoneCount === groupSetCount;
    const progPct = groupSetCount > 0 ? Math.round((groupDoneCount / groupSetCount) * 100) : 0;
    const isOpen = openCards[gi] ?? false;
    const isEditing = editingSlot === firstSi;
    const options = firstSlot.label ? (movementPatterns[firstSlot.label] ?? [exercise]) : [exercise];
    const isCardio = firstSlot.label === 'Cardio';

    const pb = personalBests?.[exercise];
    const maxActual = Math.max(
        ...items.flatMap(({ si }) =>
            Array.from({ length: groupSetCount }, (_, j) => Number(getSet(si, j).actual) || 0)
        )
    );
    const displayPb = maxActual > Number(pb ?? 0) ? maxActual : pb;
    const isNewPbThisSession = maxActual > Number(pb ?? 0);

    return (
      <div
        key={gi}
        className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}
      >
        {/* Card Header */}
        <div
          className="ex-card-header"
          onClick={() => { setEditingSlot(null); toggleCard(gi); }}
        >
          <div className="ex-card-title-block">
            {firstSlot.fixed || isViewingPast ? (
              <div className="ex-card-name ex-card-name--fixed">{exercise}</div>
            ) : isEditing ? (
              <select
                autoFocus
                className="exercise-select"
                value={exercise}
                onClick={e => e.stopPropagation()}
                onChange={e => {
                  items.forEach(({ si }) => setExercise(di, si, e.target.value));
                  setEditingSlot(null);
                  if (editMode && workoutLogId) {
                    items.forEach(({ si }) =>
                      fetch(`http://localhost:5050/api/users/workout-log/${workoutLogId}/slot-exercise`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ weekNum: wi + 1, dayNum: di + 1, slotIdx: si, exercise: e.target.value })
                      }).catch(err => console.error('Failed to save exercise:', err))
                    );
                  }
                }}
                onBlur={() => setEditingSlot(null)}
              >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <button
                className="ex-card-name-btn"
                onClick={e => { e.stopPropagation(); setEditingSlot(firstSi); }}
                title="Tap to change exercise"
              >
                <span className="ex-card-name">{exercise}</span>
                <span className="exercise-edit-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </span>
              </button>
            )}
          </div>

          <div className="ex-card-stats">
            <div className="stat-chip">
              <div className="stat-chip-val">{groupSetCount}</div>
              <div className="stat-chip-lbl">Sets</div>
            </div>
            <div className="stat-chip stat-chip--done">
              <div className="stat-chip-val">{groupDoneCount}/{groupSetCount}</div>
              <div className="stat-chip-lbl">Done</div>
            </div>
          </div>

          {!isCardio && (displayPb ? (
              <div className={`stat-chip stat-chip--pb${isNewPbThisSession ? ' stat-chip--pb-new' : ''}`}>
                <div className="stat-chip-val">🏆 {displayPb}</div>
                <div className="stat-chip-lbl">{isNewPbThisSession ? 'New PR!' : 'Current PR'}</div>
              </div>
          ) : (
              <div className="stat-chip stat-chip--pb">
                <div className="stat-chip-val">—</div>
                <div className="stat-chip-lbl">No PR yet</div>
              </div>
          ))}

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
            {isCardio && (firstSlot.cardioType || firstSlot.cardioNote) && (
              <div className="cardio-meta">
                {firstSlot.cardioType && <span className="cardio-type">{firstSlot.cardioType}</span>}
                {firstSlot.cardioNote && <span className="cardio-note">{firstSlot.cardioNote}</span>}
              </div>
            )}
            <div className={`ex-sets-col-header${isCardio ? ' ex-sets-col-header--cardio' : ''}`}>
              <span className="ex-col-lbl">Set</span>
              {isCardio ? (
                <>
                  <span className="ex-col-lbl">Time</span>
                  <span className="ex-col-lbl">Recovery</span>
                  <span className="ex-col-lbl">Intensity</span>
                </>
              ) : (
                <>
                  <span className="ex-col-lbl">Target Reps</span>
                  <span className="ex-col-lbl">Actual Reps</span>
                  <span className="ex-col-lbl">Target</span>
                  <span className="ex-col-lbl">Actual (lbs)</span>
                </>
              )}
              <span className="ex-col-lbl">✓</span>
            </div>

            {(() => {
              const rows = [];
              let globalSetNum = 0;
              items.forEach(({ slot, si }) => {
                const setsVal = resolveWeekValue(slot.sets, wi);
                const setCount = slot.label === 'Cardio'
                  ? (slot.cardioSets?.length ?? 0)
                  : (typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0));
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
                const projectedWeight = slot.projectedWeight ?? null;

                if (items.length > 1 && slot.label) {
                  rows.push(
                    <div key={`label-${si}`} className="slot-label-divider">{slot.label}</div>
                  );
                }

                for (let j = 0; j < setCount; j++) {
                  globalSetNum++;
                  const s = getSet(si, j);
                  let target = projectedWeight != null ? projectedWeight : getWeightNote(j);
                  if (typeof target === 'string' && /^\d+(\.\d+)?%/.test(target)) {
                    const pct = parseFloat(target) / 100;
                    const refKey = PERCENT_REF_1RM[slot.label]
                      ?? FIXED_EXERCISE_1RM[slot.fixed]
                      ?? FIXED_EXERCISE_1RM[exercise];
                    const ref1rm = userOneRMs?.[refKey];
                    target = ref1rm ? Math.max(45, Math.round((ref1rm * pct) / 5) * 5) : null;
                  }
                  const hasTarget = target != null && target !== '';
                  const matched = s.actual !== '' && (hasTarget
                    ? parseInt(s.actual) >= parseInt(target)
                    : s.actual > 0);

                  rows.push(
                    <div key={`${si}-${j}`} className={`ex-set-row${isCardio ? ' ex-set-row--cardio' : ''}${s.done ? ' ex-set-row--done' : ''}`}>
                      <div className={`set-num${s.done ? ' set-num--done' : ''}`}>{globalSetNum}</div>
                      {isCardio ? (
                        <>
                          <div className="cardio-prescribed">{slot.cardioSets?.[j]?.maxEffort ?? slot.cardioSets?.[j]?.time ?? '—'}</div>
                          <div className="cardio-prescribed">{slot.cardioSets?.[j]?.recovery ?? (slot.cardioSets?.[j]?.intensity === 'Max Effort' ? slot.cardioSets?.[j]?.time : '—')}</div>
                          <div className="cardio-prescribed">{slot.cardioSets?.[j]?.intensity ?? (slot.cardioSets?.[j]?.maxEffort ? 'Max Effort' : '—')}</div>
                        </>
                      ) : (
                        <>
                          <div className="set-reps">{getReps(j) ?? '—'}</div>
                          <div className="stepper-wrap">
                            <button
                              type="button"
                              className="stepper-btn stepper-btn--dec"
                              disabled={isViewingPast}
                              onClick={() => {
                                const next = Math.max(0, (Number(s.actualReps) || 0) - 1);
                                updateSet(si, j, { actualReps: next });
                                updateLog(wi, di, si, j, 'actualReps', next);
                              }}
                            >−</button>
                            <input
                              className="actual-input"
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={s.actualReps ?? ''}
                              disabled={isViewingPast}
                              onChange={e => {
                                const next = e.target.value;
                                updateSet(si, j, { actualReps: next });
                                updateLog(wi, di, si, j, 'actualReps', next);
                              }}
                            />
                            <button
                              type="button"
                              className="stepper-btn stepper-btn--inc"
                              disabled={isViewingPast}
                              onClick={() => {
                                const next = (Number(s.actualReps) || 0) + 1;
                                updateSet(si, j, { actualReps: next });
                                updateLog(wi, di, si, j, 'actualReps', next);
                              }}
                            >+</button>
                          </div>
                          <div className="set-target">
                            {hasTarget
                              ? <><span className="target-wt">{target}</span><span className="target-unit"> lbs</span></>
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
                              updateLog(wi, di, si, j, 'actualWeight', e.target.value);
                            }}
                          />
                        </>
                      )}
                      <button
                        className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                        onClick={() => {
                          if (isViewingPast) return;
                          const markingDone = !s.done;
                          updateSet(si, j, { done: markingDone });
                          updateLog(wi, di, si, j, 'setDone', markingDone);
                          handleSetComplete(exercise, isCardio ? null : s.actual, markingDone);
                          if (markingDone) {
                            if (!isCardio) recordPRIfBeaten(exercise, s.actual, s.actualReps);
                            if (groupDoneCount + 1 < groupSetCount
                              && localStorage.getItem('restTimerEnabled') !== 'false') {
                              setTimerState(prev => ({ cardKey: `g-${gi}`, id: (prev?.id ?? 0) + 1 }));
                            }
                          }
                        }}
                        disabled={isViewingPast}
                        title="Mark set done"
                      >
                        {s.done ? '✓' : ''}
                      </button>
                    </div>
                  );
                }
              });
              return rows;
            })()}

            {timerState?.cardKey === `g-${gi}` && !allDone && (
              <RestTimer
                key={timerState.id}
                initialSeconds={getRestSeconds(exercise)}
                onSkip={() => setTimerState(null)}
              />
            )}
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
                value={(log[wi]?.[di]?.[firstSi] ?? {}).notes ?? ''}
                onChange={e => updateLog(wi, di, firstSi, null, 'notes', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    );
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

      {/* Strength Exercise Cards */}
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
                    <span className="ex-col-lbl">Target Reps</span>
                    <span className="ex-col-lbl">Actual Reps</span>
                    <span className="ex-col-lbl">Target</span>
                    <span className="ex-col-lbl">Actual (lbs)</span>
                    <span className="ex-col-lbl">✓</span>
                  </div>
                  {ex.sets.map((s, si) => (
                    <div key={si} className={`ex-set-row${s.done ? ' ex-set-row--done' : ''}`}>
                      <div className={`set-num${s.done ? ' set-num--done' : ''}`}>{si + 1}</div>
                      <div className="set-reps">{s.reps || '—'}</div>
                      <div className="stepper-wrap">
                        <button
                          type="button"
                          className="stepper-btn stepper-btn--dec"
                          onClick={() => updateCustomSet(ei, si, { actualReps: Math.max(0, (Number(s.actualReps) || 0) - 1) })}
                        >−</button>
                        <input
                          className="actual-input"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={s.actualReps ?? ''}
                          onChange={e => updateCustomSet(ei, si, { actualReps: e.target.value })}
                        />
                        <button
                          type="button"
                          className="stepper-btn stepper-btn--inc"
                          onClick={() => updateCustomSet(ei, si, { actualReps: (Number(s.actualReps) || 0) + 1 })}
                        >+</button>
                      </div>
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
                        onClick={() => {
                          const markingDone = !s.done;
                          updateCustomSet(ei, si, { done: markingDone });
                          if (markingDone) {
                            recordPRIfBeaten(ex.name, s.actual, s.actualReps);
                            if (doneCount + 1 < ex.sets.length
                              && localStorage.getItem('restTimerEnabled') !== 'false') {
                              setTimerState(prev => ({ cardKey: `c-${ei}`, id: (prev?.id ?? 0) + 1 }));
                            }
                          }
                        }}
                        title="Mark set done"
                      >{s.done ? '✓' : ''}</button>
                    </div>
                  ))}
                  {timerState?.cardKey === `c-${ei}` && !allDone && (
                    <RestTimer
                      key={timerState.id}
                      initialSeconds={getRestSeconds(ex.name)}
                      onSkip={() => setTimerState(null)}
                    />
                  )}
                  {allDone && <div className="ex-complete-banner"><span>✓</span> All sets complete — nice work!</div>}
                </div>
              )}
            </div>
          );
        }) : renderGroups.map((renderItem) => {
          if (renderItem.type === 'superset') {
            const { label, items: ssItems } = renderItem;
            return (
              <div key={`ss-${label}`} className="superset-block">
                <div className="superset-block-label">
                  <span className="superset-tag">Superset {label}</span>
                </div>
                {ssItems.map(({ group, gi }) => renderCard(group, gi))}
              </div>
            );
          }
          if (renderItem.type === 'cardio') {
            return (
              <div key={`cardio-${renderItem.gi}`} className="cardio-inline-section">
                <div className="cardio-section-header">
                  <span className="cardio-section-title">Cardio</span>
                </div>
                {renderCard(renderItem.group, renderItem.gi)}
              </div>
            );
          }
          return renderCard(renderItem.group, renderItem.gi);
        })}
      </div>

      {/* Post-Workout Modal */}
      {postWorkoutData && (
        <div className="post-workout-overlay" onClick={() => { setPostWorkoutData(null); navigate('/home'); }}>
          <div className="post-workout-modal" onClick={e => e.stopPropagation()}>
            <div className="post-workout-handle" />
            <div className="post-workout-header">
              <div className="post-workout-title">Workout Complete</div>
              <div className="post-workout-subtitle">{day.title ?? `Day ${dayNum}`}</div>
            </div>
            <div className="post-workout-stats-row">
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val">
                  {postWorkoutData.totalVolume > 0
                    ? postWorkoutData.totalVolume.toLocaleString()
                    : '—'}
                </div>
                <div className="post-workout-volume-lbl">Total Volume (lbs)</div>
              </div>
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val">
                  {postWorkoutData.totalSets ?? '—'}
                </div>
                <div className="post-workout-volume-lbl">Total Sets</div>
              </div>
            </div>
            {postWorkoutData.breakdown.length > 0 && (
              <div className="post-workout-breakdown">
                <div className="post-workout-breakdown-title">By Exercise</div>
                {postWorkoutData.breakdown.map((e, i) => (
                  <div key={i} className="post-workout-breakdown-row">
                    <span className="post-workout-breakdown-name">{e.name}</span>
                    <span className="post-workout-breakdown-sets">{e.sets} {e.sets === 1 ? 'set' : 'sets'}</span>
                    <span className="post-workout-breakdown-vol">{e.volume > 0 ? `${e.volume.toLocaleString()} lbs` : '—'}</span>
                  </div>
                ))}
              </div>
            )}
            {postWorkoutData.prs?.length > 0 && (
              <div className="post-workout-breakdown post-workout-prs">
                <div className="post-workout-breakdown-title">Personal Records</div>
                {postWorkoutData.prs.map((pr, i) => (
                  <div key={i} className="post-workout-breakdown-row">
                    <span className="post-workout-breakdown-name">{pr.exercise}</span>
                    <span className="post-workout-pr-detail">
                      {pr.weight.toLocaleString()} lbs{pr.reps ? ` x ${pr.reps} reps` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button className="post-workout-btn" onClick={() => { setPostWorkoutData(null); navigate('/home'); }}>
              Done
            </button>
          </div>
        </div>
      )}

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
