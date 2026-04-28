import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

// Equipment map (mirrors exerciseLibrary.jsx)
const EXERCISE_EQUIPMENT = {
  'Bench Press': 'Barbell', 'Incline Bench Press': 'Barbell', 'Decline Bench Press': 'Barbell', 'Floor Press': 'Barbell',
  'Military Press': 'Barbell', 'Seated Military Press': 'Barbell', 'Push Press': 'Barbell',
  'DB Incline Bench': 'Dumbbell', 'DB Flat Bench': 'Dumbbell', 'DB Shoulder Press': 'Dumbbell', 'Arnold Press': 'Dumbbell', 'DB Floor Press': 'Dumbbell',
  'Dips': 'Bodyweight', 'Weighted Dips': 'Dumbbell', 'Skullcrushers': 'Barbell', 'Tricep Pushdowns': 'Cable',
  'Tricep Extensions': 'Cable', 'Dip Machine': 'Machine', 'Overhead Tricep Extensions': 'Cable',
  'One Arm Extensions': 'Dumbbell', 'Close Grip Bench Press': 'Barbell',
  'Front Raises': 'Dumbbell', 'Lateral Raises': 'Dumbbell', 'Cable Lateral Raises': 'Cable',
  'Upright Rows': 'Barbell', 'Face Pulls': 'Cable', 'Band Pull Aparts': 'Dumbbell',
  'Chest Fly Machine': 'Machine', 'DB Chest Flys': 'Dumbbell', 'Pushups': 'Bodyweight', 'Weighted Pushups': 'Dumbbell',
  'Floor Chest Flys': 'Dumbbell', 'Incline Chest Flys': 'Dumbbell', 'Cable Chest Flys': 'Cable', 'Low to High Cable Flys': 'Cable',
  'Chest Press Machine': 'Machine', 'Shoulder Press Machine': 'Machine', 'Decline Press Machine': 'Machine', 'Incline Press Machine': 'Machine',
  'Neutral Grip Pullups': 'Bodyweight', 'Weighted Neutral Grip Pullups': 'Dumbbell', 'Pullups': 'Bodyweight', 'Weighted Pull Ups': 'Dumbbell',
  'Chin Ups': 'Bodyweight', 'Weighted Chin Ups': 'Dumbbell', 'Lat Pulldowns': 'Cable', 'Close Grip Lat Pulldowns': 'Cable',
  'Wide Grip Lat Pulldowns': 'Cable', 'Single Arm Pulldowns': 'Cable',
  'Barbell Row': 'Barbell', 'Underhand Barbell Row': 'Barbell', 'Cable Row': 'Cable', 'T Bar Rows': 'Barbell',
  'Single Arm Cable Rows': 'Cable', 'Single Arm Dumbbell Rows': 'Dumbbell', 'Chest Supported Row': 'Machine',
  'Seal Row': 'Barbell', 'Pendlay Row': 'Barbell',
  'Scarecrows': 'Dumbbell', 'Rear Delt Flys': 'Dumbbell', 'Machine Rear Delt Flys': 'Machine', 'Pullovers': 'Dumbbell',
  'Cable Pullovers': 'Cable', 'Shrugs': 'Barbell', 'DB Shrugs': 'Dumbbell', 'Trap Bar Shrugs': 'Barbell', 'YTWLs': 'Dumbbell',
  'DB Curls': 'Dumbbell', 'Barbell Curls': 'Barbell', 'Ez Bar Curls': 'Barbell', 'Hammer Curls': 'Dumbbell',
  'Preacher Curls': 'Barbell', 'Cable Curls': 'Cable', 'Rope Curls': 'Cable', 'Incline DB Curls': 'Dumbbell',
  'Concentration Curls': 'Dumbbell', 'Cross Body Hammer Curls': 'Dumbbell',
  'Hip Thrusts': 'Barbell', 'Bodyweight Hip Thrusts': 'Bodyweight', 'RDLs': 'Barbell', 'Trap Bar Deadlifts': 'Barbell',
  'Barbell Glute Bridges': 'Barbell', 'Bodyweight Glute Bridges': 'Bodyweight', 'Single Leg RDLs': 'Dumbbell',
  'Sumo Deadlift': 'Barbell', 'Good Mornings': 'Barbell',
  'Front Squat': 'Barbell', 'SSB Squats': 'Barbell', 'Squats': 'Barbell', 'Back Squat': 'Barbell', 'Box Squats': 'Barbell',
  'Bodyweight Squat': 'Bodyweight', 'Pendulum Squat': 'Machine', 'Leg Press': 'Machine', 'Goblet Squat': 'Dumbbell', 'Zercher Squat': 'Barbell',
  'Back Extensions': 'Machine', 'Bodyweight Back Extensions': 'Bodyweight', 'Nordics': 'Bodyweight', 'Reverse Hypers': 'Machine',
  'GHD Raises': 'Bodyweight', 'Single Leg Hip Thrusts': 'Barbell',
  'Bulgarians': 'Dumbbell', 'Bodyweight Bulgarians': 'Bodyweight', 'Walking Lunges': 'Dumbbell', 'Bodyweight Lunges': 'Bodyweight',
  'ATG Lunges': 'Dumbbell', 'Bodyweight ATG Lunges': 'Bodyweight', 'Reverse Lunges': 'Dumbbell', 'Step Ups': 'Dumbbell',
  'Leg Extensions': 'Machine', 'Single Leg Extensions': 'Machine', 'Seated Leg Curls': 'Machine', 'Lying Leg Curls': 'Machine',
  'Abductor Machine': 'Machine', 'Adductor Machine': 'Machine',
  'Single Leg Calf Raises': 'Dumbbell', 'Calf Raise Machine': 'Machine', 'Seated Calf Raises': 'Machine', 'Bodyweight Calf Raises': 'Bodyweight',
  'Weighted Calf Raises': 'Dumbbell', 'Donkey Calf Raises': 'Machine', 'Tibia Raises': 'Bodyweight', 'Tibia Curls': 'Machine', 'Banded Tibia Curls': 'Bodyweight',
  'Hack Squat': 'Machine', 'Hack Squat Machine': 'Machine', 'Reverse Hack Squat': 'Machine',
  'Plank': 'Bodyweight', 'Ab Wheel Rollouts': 'Bodyweight', 'Hanging Leg Raises': 'Bodyweight', 'Cable Crunches': 'Cable',
  'Decline Crunches': 'Bodyweight', 'Pallof Press': 'Cable', 'Dead Bugs': 'Bodyweight', 'Suitcase Carries': 'Dumbbell', 'Farmer Carries': 'Dumbbell',
  'Treadmill': 'Cardio Machine', 'Curved Treadmill': 'Cardio Machine', 'Assault Bike': 'Cardio Machine', 'Bike': 'Cardio Machine',
  'Recumbent Bike': 'Cardio Machine', 'Elliptical': 'Cardio Machine', 'Stairmaster': 'Cardio Machine', 'Rowing Machine': 'Cardio Machine', 'Ski Erg': 'Cardio Machine',
  // Fixed template exercises
  'Squat': 'Barbell', 'Deadlift': 'Barbell',
  // Additional bodyweight exercises from backend patterns
  'Incline Pushups': 'Bodyweight', 'Diamond Pushups': 'Bodyweight', 'Wide Pushups': 'Bodyweight',
  'Inverted Bodyweight Row': 'Bodyweight', 'Burpees': 'Bodyweight', 'Banded Tibia Raises': 'Bodyweight',
  'Bodyweight Squat': 'Bodyweight', 'Bodyweight Lunges': 'Bodyweight', 'Bodyweight ATG Lunges': 'Bodyweight',
  'Bodyweight Bulgarians': 'Bodyweight', 'Bodyweight Hip Thrusts': 'Bodyweight', 'Bodyweight Glute Bridges': 'Bodyweight',
  'Bodyweight Back Extensions': 'Bodyweight', 'Nordics': 'Bodyweight', 'GHD Raises': 'Bodyweight',
  'Bodyweight Calf Raises': 'Bodyweight',
};

// Exercise alternatives per movement pattern (mirrors exerciseLibrary.jsx)
const MOVEMENT_PATTERNS = {
  'Horizontal Push':             ['Bench Press','Incline Bench Press','Decline Bench Press','Floor Press'],
  'Vertical Push':               ['Military Press','Seated Military Press','Push Press'],
  'Unilateral Push':             ['DB Incline Bench','DB Flat Bench','DB Shoulder Press','Arnold Press','DB Floor Press'],
  'Tricep Accessory':            ['Dips','Weighted Dips','Skullcrushers','Tricep Pushdowns','Tricep Extensions','Dip Machine','Overhead Tricep Extensions','One Arm Extensions','Close Grip Bench Press'],
  'Shoulder Accessory':          ['Front Raises','Lateral Raises','Cable Lateral Raises','Upright Rows','Face Pulls','Band Pull Aparts'],
  'Chest Accessory':             ['Chest Fly Machine','DB Chest Flys','Pushups','Weighted Pushups','Floor Chest Flys','Incline Chest Flys','Cable Chest Flys','Low to High Cable Flys'],
  'Push Machine':                ['Chest Press Machine','Shoulder Press Machine','Decline Press Machine','Incline Press Machine'],
  'Vertical Pull':               ['Neutral Grip Pullups','Weighted Neutral Grip Pullups','Pullups','Weighted Pull Ups','Chin Ups','Weighted Chin Ups','Lat Pulldowns','Close Grip Lat Pulldowns','Wide Grip Lat Pulldowns','Single Arm Pulldowns'],
  'Horizontal Pull':             ['Barbell Row','Underhand Barbell Row','Cable Row','T Bar Rows','Single Arm Cable Rows','Single Arm Dumbbell Rows','Chest Supported Row','Seal Row','Pendlay Row'],
  'Posterior Upper Accessory':   ['Scarecrows','Rear Delt Flys','Machine Rear Delt Flys','Pullovers','Cable Pullovers','Shrugs','DB Shrugs','Trap Bar Shrugs','YTWLs'],
  'Bicep Accessory':             ['DB Curls','Barbell Curls','Ez Bar Curls','Hammer Curls','Preacher Curls','Cable Curls','Rope Curls','Incline DB Curls','Concentration Curls','Cross Body Hammer Curls'],
  'Hinge':                       ['Deadlift','Hip Thrusts','Bodyweight Hip Thrusts','RDLs','Trap Bar Deadlifts','Barbell Glute Bridges','Bodyweight Glute Bridges','Single Leg RDLs','Sumo Deadlift','Good Mornings'],
  'Squat Pattern':               ['Squat','Front Squat','SSB Squats','Squats','Back Squat','Box Squats','Bodyweight Squat','Pendulum Squat','Leg Press','Goblet Squat','Zercher Squat'],
  'Posterior Chain Accessory':   ['Back Extensions','Bodyweight Back Extensions','Nordics','Reverse Hypers','GHD Raises','Single Leg Hip Thrusts'],
  'Unilateral Lower':            ['Bulgarians','Bodyweight Bulgarians','Walking Lunges','Bodyweight Lunges','ATG Lunges','Bodyweight ATG Lunges','Reverse Lunges','Step Ups'],
  'Isolation Lower':             ['Leg Extensions','Single Leg Extensions','Seated Leg Curls','Lying Leg Curls','Abductor Machine','Adductor Machine'],
  'Calves & Shins':              ['Single Leg Calf Raises','Calf Raise Machine','Seated Calf Raises','Bodyweight Calf Raises','Weighted Calf Raises','Donkey Calf Raises','Tibia Raises','Tibia Curls','Banded Tibia Curls'],
  'Machine Lower':               ['Leg Press','Hack Squat','Hack Squat Machine','Pendulum Squat','Reverse Hack Squat'],
  'Core':                        ['Plank','Ab Wheel Rollouts','Hanging Leg Raises','Cable Crunches','Decline Crunches','Pallof Press','Dead Bugs','Suitcase Carries','Farmer Carries'],
  'Bodyweight Strength Upper':   ['Pushups','Incline Pushups','Diamond Pushups','Wide Pushups','Dips','Pullups','Chin Ups','Neutral Grip Pullups','Inverted Bodyweight Row','Burpees'],
  'Bodyweight Lower':            ['Bodyweight Squat','Bodyweight Lunges','Bodyweight ATG Lunges','Bodyweight Bulgarians','Bodyweight Hip Thrusts','Bodyweight Glute Bridges','Bodyweight Back Extensions','Nordics','GHD Raises','Bodyweight Calf Raises'],
  'Cardio':                      ['Treadmill','Curved Treadmill','Assault Bike','Bike','Recumbent Bike','Elliptical','Stairmaster','Rowing Machine','Ski Erg'],
};

function CircuitExRow({ ex, exIdx, slotIdx, dayIdx, onSwap }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(ex.exercise ?? ex.fixed ?? ex.label);
  const isRest = ex.pattern == null && ex.fixed == null && ex.label === 'Rest';

  const alternatives = useMemo(() => {
    if (ex.label && MOVEMENT_PATTERNS[ex.label]) return MOVEMENT_PATTERNS[ex.label];
    const name = ex.exercise ?? ex.fixed;
    if (name) {
      for (const exs of Object.values(MOVEMENT_PATTERNS)) {
        if (exs.includes(name)) return exs;
      }
    }
    return [];
  }, [ex.label, ex.exercise, ex.fixed]);

  const handleSelect = (e) => {
    const val = e.target.value;
    setSelected(val);
    onSwap(dayIdx, [slotIdx], val, exIdx);
    setOpen(false);
  };

  const displayName = ex.exercise ?? ex.fixed ?? ex.label;

  return (
    <div className="rp-slot-row rp-slot-row--circuit-ex">
      <div className="rp-slot-main">
        <div className="rp-slot-info">
          <span className="rp-exercise-name">{displayName}</span>
          {!isRest && ex.label && <span className="rp-slot-pattern">{ex.label}</span>}
        </div>
        {!isRest && (
          <div className="rp-slot-meta">
            {alternatives.length > 0 && (
              <button
                className={`rp-swap-btn${open ? ' rp-swap-btn--active' : ''}`}
                onClick={() => setOpen(o => !o)}
                title="Swap exercise"
              >
                {open ? 'Cancel' : 'Swap'}
              </button>
            )}
          </div>
        )}
      </div>
      {open && (
        <div className="rp-swap-dropdown">
          <select value={selected} onChange={handleSelect} className="rp-select">
            {alternatives.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span className="rp-swap-hint">Pick a replacement — applied across all weeks</span>
        </div>
      )}
    </div>
  );
}

function CircuitGroup({ slot, dayIdx, onSwap }) {
  const parts = [slot.label];
  if (slot.circuitType) parts.push(slot.circuitType);
  if (slot.totalTime) parts.push(slot.totalTime);

  return (
    <div className="rp-circuit-group">
      <div className="rp-circuit-header">{parts.join(' · ')}</div>
      {(slot.exercises ?? []).map((ex, i) => (
        <CircuitExRow
          key={i}
          ex={ex}
          exIdx={i}
          slotIdx={slot.slotIdxs[0]}
          dayIdx={dayIdx}
          onSwap={onSwap}
        />
      ))}
    </div>
  );
}

// slot here is a deduplicated slot — it has `slotIdxs: number[]` instead of `slotIdx`
function SlotRow({ slot, dayIdx, onSwap }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(slot.exercise);
  const isFixed = !!slot.fixed;

  // Find alternatives: try label match, then scan all patterns for the exercise name.
  // Fixed exercises may have slot.label set to the exercise name rather than the
  // pattern name, so we also try resolving via FIXED_EXERCISE_PATTERN as a fallback.
  const alternatives = useMemo(() => {
    if (slot.label && MOVEMENT_PATTERNS[slot.label]) {
      return MOVEMENT_PATTERNS[slot.label];
    }
    for (const exercises of Object.values(MOVEMENT_PATTERNS)) {
      if (exercises.includes(slot.exercise)) return exercises;
    }
    // Last resort: fixed exercises whose label equals the exercise name
    for (const exercises of Object.values(MOVEMENT_PATTERNS)) {
      if (exercises.includes(slot.label)) return exercises;
    }
    return [];
  }, [slot.label, slot.exercise]);

  const handleSelect = (e) => {
    const val = e.target.value;
    setSelected(val);
    onSwap(dayIdx, slot.slotIdxs, val);
    setOpen(false);
  };

  return (
    <div className="rp-slot-row">
      <div className="rp-slot-main">
        <div className="rp-slot-info">
          <span className="rp-exercise-name">{slot.exercise}</span>
          <div className="rp-slot-tags">
            {slot.label && <span className="rp-slot-pattern">{slot.label}</span>}
            {EXERCISE_EQUIPMENT[selected] && (
              <span className={`rp-equipment-tag rp-equipment-tag--${EXERCISE_EQUIPMENT[selected].toLowerCase().replace(' ', '-')}`}>
                {EXERCISE_EQUIPMENT[selected]}
              </span>
            )}
          </div>
        </div>
        <div className="rp-slot-meta">
          {alternatives.length > 0 ? (
            <button
              className={`rp-swap-btn${open ? ' rp-swap-btn--active' : ''}`}
              onClick={() => setOpen(o => !o)}
              title="Swap exercise"
            >
              {open ? 'Cancel' : 'Swap'}
            </button>
          ) : null}
        </div>
      </div>
      {open && (
        <div className="rp-swap-dropdown">
          <select
            value={selected}
            onChange={handleSelect}
            className="rp-select"
          >
            {alternatives.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
          <span className="rp-swap-hint">Pick a replacement — applied across all weeks</span>
        </div>
      )}
    </div>
  );
}

function ReviewProgram() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchWorkout } = useWorkout();

  const { workoutLogId, weeks: initialWeeks, userId, classification } = location.state ?? {};

  // Local copy of week 1 days for display; we track swaps separately
  const [days, setDays] = useState(() => initialWeeks?.[0]?.days ?? []);
  const [swaps, setSwaps] = useState({}); // key: `${dayIdx}-${slotIdx}` → newExercise
  const [saving, setSaving] = useState(false);

  // Deduplicate slots by exercise name within each day.
  // Templates that define one slot per set produce many repeated rows — we collapse
  // them into one row per unique exercise, collecting all their slotIdxs for swapping.
  const processedDays = useMemo(() =>
    days.map(day => {
      const seen = new Map();
      const ordered = [];
      (day.slots ?? []).forEach(slot => {
        if (Array.isArray(slot.exercises) && slot.exercises.length > 0) {
          // Circuit slot — keep as-is with a unique key
          const key = `__circuit__${slot.slotIdx}`;
          if (!seen.has(key)) {
            const entry = { ...slot, isCircuit: true, slotIdxs: [slot.slotIdx] };
            seen.set(key, entry);
            ordered.push(entry);
          }
          return;
        }
        if (!seen.has(slot.exercise)) {
          const entry = { ...slot, slotIdxs: [slot.slotIdx] };
          seen.set(slot.exercise, entry);
          ordered.push(entry);
        } else {
          seen.get(slot.exercise).slotIdxs.push(slot.slotIdx);
        }
      });
      return { ...day, uniqueSlots: ordered };
    }),
  [days]);

  if (!workoutLogId || !initialWeeks) {
    navigate('/home', { replace: true });
    return null;
  }

  const handleSwap = (dayIdx, slotIdxs, newExercise, circuitExIdx = null) => {
    setSwaps(prev => {
      const next = { ...prev };
      if (circuitExIdx !== null) {
        slotIdxs.forEach(si => { next[`${dayIdx}-${si}-${circuitExIdx}`] = newExercise; });
      } else {
        slotIdxs.forEach(si => { next[`${dayIdx}-${si}`] = newExercise; });
      }
      return next;
    });
    setDays(prev =>
      prev.map((day, di) =>
        di !== dayIdx ? day : {
          ...day,
          slots: day.slots.map(s => {
            if (!slotIdxs.includes(s.slotIdx)) return s;
            if (circuitExIdx !== null) {
              return {
                ...s,
                exercises: s.exercises.map((ex, ei) =>
                  ei === circuitExIdx ? { ...ex, exercise: newExercise } : ex
                )
              };
            }
            return { ...s, exercise: newExercise };
          })
        }
      )
    );
  };

  const handleFinalize = async () => {
    setSaving(true);
    try {
      // Save each swap to the backend (applies across all weeks)
      const swapEntries = Object.entries(swaps);
      await Promise.all(swapEntries.map(([key, newExercise]) => {
        const parts = key.split('-').map(Number);
        const [dayIdx, slotIdx] = parts;
        const body = { dayIdx, slotIdx, newExercise };
        if (parts.length === 3) body.circuitExIdx = parts[2];
        return fetch(`${import.meta.env.VITE_API_URL}/api/users/workout-log/${workoutLogId}/swap-exercise-all-weeks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }));

      await fetchWorkout(userId);
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Failed to finalize program:', err);
      setSaving(false);
      alert('Something went wrong. Please try again.');
    }
  };

  const swapCount = Object.keys(swaps).length;

  return (
    <div className="rp-page">
      <div className="rp-header">
        <h1 className="rp-title">Review Your Program</h1>
        <p className="rp-subtitle">
          Swap out any exercises based on your available equipment.
          Fixed exercises are core lifts and cannot be changed.
        </p>
        {classification && (
          <div className="rp-classification-banner">
            <span className="rp-classification-label">Strength Classification</span>
            <span className="rp-classification-value">{classification}</span>
          </div>
        )}
      </div>

      <div className="rp-week-label">Exercise Overview</div>

      <div className="rp-days-grid">
        {processedDays.filter(d => d?.title != null).map((day, di) => (
          <div key={di} className="rp-day-card">
            <div className="rp-day-title">{day.title}</div>
            <div className="rp-slots-list">
              {(day.uniqueSlots ?? []).map((slot, si) =>
                slot.isCircuit ? (
                  <CircuitGroup key={si} slot={slot} dayIdx={di} onSwap={handleSwap} />
                ) : (
                  <SlotRow key={si} slot={slot} dayIdx={di} onSwap={handleSwap} />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rp-footer">
        <div className="rp-footer-left">
          <div className="rp-footer-status">
            <span className={`rp-footer-dot${swapCount > 0 ? ' rp-footer-dot--changed' : ''}`} />
            {swapCount > 0
              ? <span className="rp-footer-status-text">{swapCount} exercise{swapCount !== 1 ? 's' : ''} customized</span>
              : <span className="rp-footer-status-text">No changes — using generated exercises</span>
            }
          </div>
          <p className="rp-footer-hint">Your selections apply across all weeks of the program.</p>
        </div>

        <button
          className="rp-finalize-btn"
          onClick={handleFinalize}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="rp-finalize-spinner" />
              Saving…
            </>
          ) : (
            <>
              Finalize & Start Program
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ReviewProgram;

