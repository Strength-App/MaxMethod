import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

// Exercise alternatives per movement pattern (mirrors exerciseLibrary.jsx)
const MOVEMENT_PATTERNS = {
  'Horizontal Push':             ['Bench Press','Incline Bench Press','Decline Bench Press','Floor Press'],
  'Vertical Push':               ['Military Press','Seated Military Press','Push Press'],
  'Unilateral Push':             ['DB Incline Bench','DB Flat Bench','DB Shoulder Press','Arnold Press','DB Floor Press'],
  'Tricep Accessory':            ['Dips','Skullcrushers','Tricep Pushdowns','Tricep Extensions','Dip Machine','Overhead Tricep Extensions','One Arm Extensions','Close Grip Bench Press'],
  'Shoulder Accessory':          ['Front Raises','Lateral Raises','Cable Lateral Raises','Upright Rows','Face Pulls','Band Pull Aparts'],
  'Chest Accessory':             ['Chest Fly Machine','DB Chest Flys','Pushups','Weighted Pushups','Floor Chest Flys','Incline Chest Flys','Cable Chest Flys','Low to High Cable Flys'],
  'Push Machine':                ['Chest Press Machine','Shoulder Press Machine','Decline Press Machine','Incline Press Machine'],
  'Vertical Pull':               ['Neutral Grip Pullups','Pullups','Chin Ups','Lat Pulldowns','Close Grip Lat Pulldowns','Wide Grip Lat Pulldowns','Single Arm Pulldowns'],
  'Horizontal Pull':             ['Barbell Row','Underhand Barbell Row','Cable Row','T Bar Rows','Single Arm Cable Rows','Single Arm Dumbbell Rows','Chest Supported Row','Meadows Row','Seal Row','Pendlay Row'],
  'Posterior Upper Accessory':   ['Scarecrows','Rear Delt Flys','Machine Rear Delt Flys','Pullovers','Cable Pullovers','Shrugs','DB Shrugs','Trap Bar Shrugs','YTWLs'],
  'Bicep Accessory':             ['DB Curls','Barbell Curls','Ez Bar Curls','Hammer Curls','Preacher Curls','Cable Curls','Rope Curls','Incline DB Curls','Concentration Curls','Cross Body Hammer Curls'],
  'Hinge':                       ['Hip Thrusts','RDLs','Trap Bar Deadlifts','Barbell Glute Bridges','Single Leg RDLs','Sumo Deadlift','Good Mornings'],
  'Squat Pattern':               ['Front Squat','SSB Squats','Hack Squat Machine','Pendulum Squat','Leg Press','Goblet Squat','Zercher Squat'],
  'Posterior Chain Accessory':   ['Back Extensions','Nordics','Reverse Hypers','GHD Raises','Single Leg Hip Thrusts'],
  'Unilateral Lower':            ['Bulgarians','Walking Lunges','ATG Lunges','Reverse Lunges','Step Ups'],
  'Isolation Lower':             ['Leg Extensions','Single Leg Extensions','Seated Leg Curls','Lying Leg Curls','Abductor Machine','Adductor Machine'],
  'Calves & Shins':              ['Single Leg Calf Raises','Calf Raise Machine','Seated Calf Raises','Bodyweight Calf Raises','Weighted Calf Raises','Donkey Calf Raises','Tibia Raises','Tibia Curls','Banded Tibia Curls'],
  'Machine Lower':               ['Leg Press','Hack Squat','Pendulum Squat','Reverse Hack Squat'],
  'Core':                        ['Plank','Ab Wheel Rollouts','Hanging Leg Raises','Cable Crunches','Decline Crunches','Pallof Press','Dead Bugs','Suitcase Carries','Farmer Carries'],
};

function formatReps(reps) {
  if (!reps) return '';
  if (Array.isArray(reps)) return reps[0];
  if (typeof reps === 'string' && reps.includes(',')) return reps.split(',')[0].trim();
  return reps;
}


// slot here is a deduplicated slot — it has `slotIdxs: number[]` instead of `slotIdx`
function SlotRow({ slot, dayIdx, onSwap }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(slot.exercise);
  const isFixed = !!slot.fixed;
  const sets = Array.isArray(slot.sets) ? slot.sets[0] : slot.sets;
  const reps = formatReps(slot.reps);
  const weight = slot.projectedWeight;

  // Find alternatives: try exact label match first, then scan all patterns for
  // the current exercise name as a fallback (handles pattern vs label mismatch)
  const alternatives = useMemo(() => {
    if (isFixed) return [];
    if (slot.label && MOVEMENT_PATTERNS[slot.label]) {
      return MOVEMENT_PATTERNS[slot.label];
    }
    for (const exercises of Object.values(MOVEMENT_PATTERNS)) {
      if (exercises.includes(slot.exercise)) return exercises;
    }
    return [];
  }, [slot.label, slot.exercise, isFixed]);

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
          {slot.label && <span className="rp-slot-pattern">{slot.label}</span>}
        </div>
        <div className="rp-slot-meta">
          {sets && reps && (
            <span className="rp-sets-reps">{sets} × {reps}</span>
          )}
          {weight != null && weight !== '' && (
            <span className="rp-weight-pill">
              {typeof weight === 'number' ? `${weight} lbs` : weight}
            </span>
          )}
          {isFixed ? (
            <span className="rp-fixed-tag">Fixed</span>
          ) : alternatives.length > 0 ? (
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
      const seen = new Map(); // exercise name → deduplicated slot
      (day.slots ?? []).forEach(slot => {
        if (!seen.has(slot.exercise)) {
          seen.set(slot.exercise, { ...slot, slotIdxs: [slot.slotIdx] });
        } else {
          seen.get(slot.exercise).slotIdxs.push(slot.slotIdx);
        }
      });
      return { ...day, uniqueSlots: [...seen.values()] };
    }),
  [days]);

  if (!workoutLogId || !initialWeeks) {
    navigate('/home', { replace: true });
    return null;
  }

  const handleSwap = (dayIdx, slotIdxs, newExercise) => {
    setSwaps(prev => {
      const next = { ...prev };
      slotIdxs.forEach(si => { next[`${dayIdx}-${si}`] = newExercise; });
      return next;
    });
    setDays(prev =>
      prev.map((day, di) =>
        di !== dayIdx ? day : {
          ...day,
          slots: day.slots.map(s =>
            slotIdxs.includes(s.slotIdx) ? { ...s, exercise: newExercise } : s
          )
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
        const [dayIdx, slotIdx] = key.split('-').map(Number);
        return fetch(`http://localhost:5050/api/users/workout-log/${workoutLogId}/swap-exercise-all-weeks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayIdx, slotIdx, newExercise })
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
              {(day.uniqueSlots ?? []).map((slot, si) => (
                <SlotRow
                  key={si}
                  slot={slot}
                  dayIdx={di}
                  onSwap={handleSwap}
                />
              ))}
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
