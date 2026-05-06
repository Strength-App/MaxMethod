import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import { useWorkoutStats } from '../hooks/useWorkoutStats';
import { collapseSetDetails, formatSetLine } from '../utils/setDisplay';
import ContextMenu from '../components/ContextMenu';
import EquipmentSelect from '../components/EquipmentSelect';

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
    <div className="rest-timer" role="timer" aria-label={`Rest timer: ${mins} minutes ${secs} seconds remaining`}>
      <div className="rest-timer-label" aria-hidden="true">Rest Timer</div>
      {/* aria-live="off" intentional: announcing every second would spam SR.
          A 10-second milestone announcement would require new state — flagged
          as a post-audit follow-up. */}
      <div className="rest-timer-display" aria-live="off">{mins}:{String(secs).padStart(2, '0')}</div>
      <div className="rest-timer-controls">
        <button className="rest-timer-btn" onClick={() => adjust(-30)} aria-label="Subtract 30 seconds">
          <span aria-hidden="true">-30s</span>
        </button>
        <button
          className="rest-timer-btn rest-timer-btn--pause"
          onClick={() => setPaused(p => !p)}
          aria-label={paused ? 'Resume timer' : 'Pause timer'}
          aria-pressed={paused}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="rest-timer-btn rest-timer-btn--skip" onClick={onSkip} aria-label="Skip rest">Skip</button>
        <button className="rest-timer-btn" onClick={() => adjust(30)} aria-label="Add 30 seconds">
          <span aria-hidden="true">+30s</span>
        </button>
      </div>
    </div>
  );
}

const movementPatterns = {
  "Horizontal Push": ["Bench Press", "Incline Bench Press", "Decline Bench Press", "Floor Press"],
  "Vertical Push": ["Military Press", "Seated Military Press", "Push Press"],
  "Unilateral Push": ["DB Incline Bench", "DB Flat Bench", "DB Shoulder Press", "Arnold Press", "DB Floor Press"],
  "Tricep Accessory": ["Dips", "Weighted Dips", "Skullcrushers", "Tricep Pushdowns", "Tricep Extensions", "Dip Machine", "Overhead Tricep Extensions", "One Arm Extensions", "Close Grip Bench Press"],
  "Shoulder Accessory": ["Front Raises", "Lateral Raises", "Cable Lateral Raises", "Upright Rows", "Face Pulls", "Band Pull Aparts"],
  "Chest Accessory": ["Chest Fly Machine", "DB Chest Flys", "Pushups", "Weighted Pushups", "Floor Chest Flys", "Incline Chest Flys", "Cable Chest Flys", "Low to High Cable Flys"],
  "Push Machine": ["Chest Press Machine", "Shoulder Press Machine", "Decline Press Machine", "Incline Press Machine"],
  "Vertical Pull": ["Neutral Grip Pullups", "Weighted Neutral Grip Pullups", "Pullups", "Weighted Pull Ups", "Chin Ups", "Weighted Chin Ups", "Lat Pulldowns", "Close Grip Lat Pulldowns", "Wide Grip Lat Pulldowns", "Single Arm Pulldowns"],
  "Vertical Pull Cable Only": ["Lat Pulldowns", "Close Grip Lat Pulldowns", "Wide Grip Lat Pulldowns", "Single Arm Pulldowns"],
  "Horizontal Pull": ["Barbell Row", "Underhand Barbell Row", "Cable Row", "T Bar Rows", "Single Arm Cable Rows", "Single Arm Dumbbell Rows", "Chest Supported Row", "Seal Row", "Pendlay Row"],
  "Posterior Upper Accessory": ["Scarecrows", "Rear Delt Flys", "Machine Rear Delt Flys", "Pullovers", "Cable Pullovers", "Shrugs", "DB Shrugs", "Trap Bar Shrugs", "YTWLs"],
  "Bicep Accessory": ["DB Curls", "Barbell Curls", "Ez Bar Curls", "Hammer Curls", "Preacher Curls", "Cable Curls", "Rope Curls", "Incline DB Curls", "Concentration Curls", "Cross Body Hammer Curls"],
  "Hinge": ["Hip Thrusts", "Bodyweight Hip Thrusts", "RDLs", "Trap Bar Deadlifts", "Barbell Glute Bridges", "Bodyweight Glute Bridges", "Single Leg RDLs", "Sumo Deadlift", "Good Mornings"],
  "Squat Pattern": ["Front Squat", "SSB Squats", "Squats", "Back Squat", "Box Squats", "Bodyweight Squat", "Pendulum Squat", "Leg Press", "Goblet Squat", "Zercher Squat"],
  "Posterior Chain Accessory": ["Back Extensions", "Bodyweight Back Extensions", "Nordics", "Reverse Hypers", "GHD Raises", "Single Leg Hip Thrusts"],
  "Unilateral Lower": ["Bulgarians", "Bodyweight Bulgarians", "Walking Lunges", "Bodyweight Lunges", "ATG Lunges", "Bodyweight ATG Lunges", "Reverse Lunges", "Step Ups"],
  "Isolation Lower": ["Leg Extensions", "Single Leg Extensions", "Seated Leg Curls", "Lying Leg Curls", "Abductor Machine", "Adductor Machine"],
  "Calves & Shins": ["Single Leg Calf Raises", "Calf Raise Machine", "Seated Calf Raises", "Bodyweight Calf Raises", "Weighted Calf Raises", "Donkey Calf Raises", "Tibia Raises", "Tibia Curls", "Banded Tibia Curls"],
  "Machine Lower": ["Leg Press", "Hack Squat", "Hack Squat Machine", "Pendulum Squat", "Reverse Hack Squat"],
  "Core": ["Plank", "Ab Wheel Rollouts", "Hanging Leg Raises", "Cable Crunches", "Decline Crunches", "Pallof Press", "Dead Bugs", "Suitcase Carries", "Farmer Carries"],
  "Cardio": ["Treadmill", "Curved Treadmill", "Assault Bike", "Bike", "Recumbent Bike", "Elliptical", "Stairmaster", "Rowing Machine", "Ski Erg"],
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

const isCardioSlot = (slot) => slot.pattern === 'Cardio' || slot.label === 'Cardio';

const TIMED_EXERCISES = new Set(["Plank"]);
const DISTANCE_EXERCISES = new Set(["Farmer Carries", "Suitcase Carries"]);
const isTimedSlot = (slot) => slot.repsType === "time" || TIMED_EXERCISES.has(slot.exercise ?? '');
const isDistanceSlot = (slot) => slot.repsType === "distance" || DISTANCE_EXERCISES.has(slot.exercise ?? '');

// Mirrors reviewProgram.jsx EXERCISE_EQUIPMENT — duplicated intentionally per
// the no-refactor rule for this task. Powers the equipment pills shown in the
// "Swap for today" dropdown so the swap UX matches reviewProgram visually.
// If a third consumer appears, extract to a shared module then.
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
  'Squat': 'Barbell', 'Deadlift': 'Barbell',
  'Incline Pushups': 'Bodyweight', 'Diamond Pushups': 'Bodyweight', 'Wide Pushups': 'Bodyweight',
  'Inverted Bodyweight Row': 'Bodyweight', 'Burpees': 'Bodyweight', 'Banded Tibia Raises': 'Bodyweight',
};

// localStorage-backed per-week+day exercise overrides. Persistence model for
// "Swap for today": a swap on Week 1 Day 1 affects only Week 1 Day 1, not the
// program template or other weeks. Key includes workoutLogId so multiple
// programs (or read-only views of past logs) keep their overrides distinct.
const swapKey = (workoutLogId, wi, di) => `swapForToday:${workoutLogId}:w${wi}:d${di}`;
const readDayOverrides = (workoutLogId, wi, di) => {
  if (!workoutLogId) return {};
  try { return JSON.parse(localStorage.getItem(swapKey(workoutLogId, wi, di)) || '{}'); }
  catch { return {}; }
};
const writeDayOverride = (workoutLogId, wi, di, slotIdxs, replacementName, originalName) => {
  if (!workoutLogId) return {};
  const cur = readDayOverrides(workoutLogId, wi, di);
  slotIdxs.forEach((si) => {
    // Picking the original exercise reverts to template — drop the entry
    // entirely so the override map stays clean.
    if (replacementName === originalName) delete cur[si];
    else cur[si] = replacementName;
  });
  localStorage.setItem(swapKey(workoutLogId, wi, di), JSON.stringify(cur));
  return cur;
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
  // Loaded only when the post-workout modal opens — see effect below.
  // Powers the streak row's totalSessions / weeksLogged / thisMonth / daysThisWeek.
  const [historySessions, setHistorySessions] = useState([]);

  // ── Right-click / long-press menu + swap-for-today state ────────────────
  // Active workout-log id for the localStorage override key. Falls back through
  // editMode's explicit id, the externally-viewed log, then the active program's
  // log doc. If none exists (shouldn't happen for a real day view), persistence
  // helpers no-op by checking for null.
  const activeLogId = workoutLogId ?? viewWorkout?._id ?? displayWorkout?._id ?? null;
  const [dayOverrides, setDayOverrides] = useState(() => readDayOverrides(activeLogId, wi, di));
  const [contextMenu, setContextMenu] = useState(null); // { x, y, cardKey, exercise, slotIdxs|null, isFixed }
  const [swapPanel, setSwapPanel] = useState(null);     // { cardKey, exercise, slotIdxs, alternatives }

  const cardHeaderRefs = useRef(new Map());
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  // Mutated synchronously to suppress menu's return-focus when the action that
  // closes the menu will move focus elsewhere itself (e.g. opening the swap
  // panel — its EquipmentSelect autoFocuses the trigger).
  const menuReturnFocusRef = useRef(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    fetch(`${API_URL}/api/users/profile/${uid}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.current_one_rep_maxes) setUserOneRMs(data.current_one_rep_maxes); })
      .catch(() => {});
  }, []);

  // Lazy-fetch all-history when the post-workout modal opens. day.jsx awaits
  // completeDay() before opening the modal, so the just-finished session is
  // already persisted by the time this fires — no synthetic patch needed
  // (logger.jsx is the asymmetric case and handles its own patch).
  useEffect(() => {
    if (!postWorkoutData) return;
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    let cancelled = false;
    fetch(`${API_URL}/api/users/workout/${uid}/all-history`)
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(data => {
        if (cancelled) return;
        setHistorySessions((data.sessions ?? []).map(s => {
          const date = new Date(s.date);
          date.setHours(0, 0, 0, 0);
          return { ...s, date };
        }));
      })
      // Fall through to empty state — streaks render as 0s, no error UI in celebration moment.
      .catch(() => { if (!cancelled) setHistorySessions([]); });
    return () => { cancelled = true; };
  }, [postWorkoutData]);

  const { totalSessions, weeksLogged, thisMonth, daysThisWeek } = useWorkoutStats(historySessions);

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
          ? `${API_URL}/api/users/workout-log/${workoutLogId}/custom-day`
          : `${API_URL}/api/users/workout/custom-day`;
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
        if (slot.exercises?.length) {
          if (slot.circuitType === 'AMRAP') {
            const key = `${si}-circuit`;
            if (!seeded[key]) seeded[key] = { done: false, rounds: '' };
          } else {
            slot.exercises.forEach((ex, ei) => {
              const setCount = typeof ex.sets === 'number' ? ex.sets : (parseInt(ex.sets) || 0);
              for (let j = 0; j < setCount; j++) {
                const key = `${si}-${ei}-${j}`;
                if (!seeded[key]) seeded[key] = { done: false, actual: '', actualReps: '' };
              }
            });
          }
          return;
        }
        const setsVal = resolveWeekValue(slot.sets, wi);
        const count = isCardioSlot(slot)
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

  // Re-load per-day-instance swap overrides when log/week/day changes. Keeps
  // the in-memory copy in sync with localStorage if the user navigates between
  // days during a session.
  useEffect(() => {
    setDayOverrides(readDayOverrides(activeLogId, wi, di));
  }, [activeLogId, wi, di]);

  if (loading) return <div className="day-page"><p className="status-msg" role="status" aria-live="polite">Loading workout…</p></div>;
  if (error) return <div className="day-page"><p className="status-msg status-msg--error" role="alert">Error loading workout: {error}</p></div>;

  if (!day) return (
    <div className="day-page">
      <p role="alert">No workout found for Week {weekNum}, Day {dayNum}.</p>
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

  const handleSetComplete = async (exercise, actual, markingDone) => {
    if (markingDone && actual) {
      const res = async
      await fetch(`${API_URL}/api/users/workout/pb-check`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
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

  // ── Right-click / long-press menu handlers ──────────────────────────────
  const openContextMenu = (cardKey, exerciseName, slotIdxs, isFixedRow, x, y) => {
    if (!exerciseName || exerciseName === 'Rest') return;
    menuReturnFocusRef.current = cardHeaderRefs.current.get(cardKey) ?? null;
    setContextMenu({ x, y, cardKey, exercise: exerciseName, slotIdxs, isFixed: isFixedRow });
  };

  const handleViewInLibrary = (exerciseName) => {
    setContextMenu(null);
    navigate('/exerciseLibrary', { state: { focusExercise: exerciseName } });
  };

  const handleOpenSwap = (cardKey, exerciseName, slotIdxs) => {
    // Resolve alternatives the same way reviewProgram does: try slot.label
    // against movementPatterns first, then scan all patterns for the current
    // exercise name as a fallback. Empty alternatives → no panel (we still
    // gate on slotIdxs in the menu items so this should never be empty here).
    const slot = day.slots?.[slotIdxs[0]];
    let alternatives = [];
    if (slot?.label && movementPatterns[slot.label]) {
      alternatives = movementPatterns[slot.label];
    } else {
      for (const exs of Object.values(movementPatterns)) {
        if (exs.includes(exerciseName)) { alternatives = exs; break; }
      }
    }
    // Suppress menu's default return-focus — the swap panel's EquipmentSelect
    // autoFocus will move focus directly onto the trigger.
    menuReturnFocusRef.current = null;
    setContextMenu(null);
    setSwapPanel({ cardKey, exercise: exerciseName, slotIdxs, alternatives });
  };

  const handleSwapSelect = (replacementName) => {
    if (!swapPanel) return;
    const { slotIdxs, exercise: original, cardKey } = swapPanel;
    const next = writeDayOverride(activeLogId, wi, di, slotIdxs, replacementName, original);
    setDayOverrides(next);
    setSwapPanel(null);
    cardHeaderRefs.current.get(cardKey)?.focus();
  };

  const cancelSwap = () => {
    const cardKey = swapPanel?.cardKey;
    setSwapPanel(null);
    if (cardKey) cardHeaderRefs.current.get(cardKey)?.focus();
  };

  // Right-click / long-press handler factory for card headers. cardKey is the
  // refs-map key (string or number); slotIdxs is null for circuit rows (no
  // swap available).
  const makeRowMenuHandlers = (cardKey, exerciseName, slotIdxs, isFixedRow) => ({
    ref: (el) => {
      if (el) cardHeaderRefs.current.set(cardKey, el);
      else cardHeaderRefs.current.delete(cardKey);
    },
    onContextMenu: (e) => {
      // Preserve native text-editing context menu on inputs (copy/paste/etc.).
      if (e.target.closest('input, textarea')) return;
      if (!exerciseName || exerciseName === 'Rest') return;
      e.preventDefault();
      longPressFiredRef.current = false;
      openContextMenu(cardKey, exerciseName, slotIdxs, isFixedRow, e.clientX, e.clientY);
    },
    onPointerDown: () => { longPressFiredRef.current = false; },
    onTouchStart: (e) => {
      if (e.target.closest('input, textarea')) return;
      if (!exerciseName || exerciseName === 'Rest') return;
      const t = e.touches[0];
      const cx = t.clientX, cy = t.clientY;
      longPressFiredRef.current = false;
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        openContextMenu(cardKey, exerciseName, slotIdxs, isFixedRow, cx, cy);
      }, 500);
    },
    onTouchEnd: () => clearTimeout(longPressTimerRef.current),
    onTouchMove: () => clearTimeout(longPressTimerRef.current),
    onTouchCancel: () => clearTimeout(longPressTimerRef.current),
  });

  // Wrap an existing onClick to suppress the synthetic click iOS dispatches
  // after a long-press fires. One-shot: the flag is also cleared on the next
  // pointerdown so subsequent clicks land normally.
  const wrapLongPressClick = (originalOnClick) => (e) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      e.preventDefault();
      return;
    }
    originalOnClick(e);
  };

  // Build menu items based on the currently-open menu's row context. Circuit
  // rows (slotIdxs == null) and read-only views (history navigation) drop
  // "Swap for today". Fixed core lifts (slot.fixed) DO get swap — matches
  // reviewProgram's actual behavior, where the swap button is gated only on
  // alternatives.length > 0, not on slot.fixed. ReviewProgram's subtitle
  // claims fixed lifts can't be swapped, but the code doesn't enforce that —
  // tracked as a follow-up to reconcile copy vs. behavior.
  const menuItems = !contextMenu ? [] : [
    {
      label: 'View in Exercise Library',
      onSelect: () => handleViewInLibrary(contextMenu.exercise),
    },
    ...((contextMenu.slotIdxs && !isReadOnly) ? [{
      label: 'Swap for today',
      onSelect: () => handleOpenSwap(contextMenu.cardKey, contextMenu.exercise, contextMenu.slotIdxs),
    }] : []),
  ];

  const TOUCH_NO_CALLOUT_STYLE = { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' };

  // Summary counts
  let totalSets = 0, doneSets = 0;
  if (isCustom) {
    customExercises.forEach(ex => {
      totalSets += ex.sets.length;
      doneSets += ex.sets.filter(s => s.done).length;
    });
  } else {
    (day.slots ?? []).forEach((slot, si) => {
      if (slot.exercises?.length) {
        if (slot.circuitType === 'AMRAP') {
          totalSets += 1;
          if (setData[`${si}-circuit`]?.done) doneSets++;
        } else {
          slot.exercises.forEach((ex, ei) => {
            const setCount = typeof ex.sets === 'number' ? ex.sets : (parseInt(ex.sets) || 0);
            totalSets += setCount;
            for (let j = 0; j < setCount; j++) {
              if (setData[`${si}-${ei}-${j}`]?.done) doneSets++;
            }
          });
        }
        return;
      }
      const setsVal = resolveWeekValue(slot.sets, wi);
      const count = isCardioSlot(slot)
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
        const setDetails = [];
        ex.sets.forEach(s => {
          if (!s.done) return;
          const reps = parseInt(s.actualReps || s.reps) || 0;
          const weight = parseFloat(s.actual) || 0;
          vol += reps * weight;
          sets++;
          setDetails.push({ reps, weight });
        });
        if (sets > 0) breakdown.push({ name: ex.name, volume: vol, sets, setDetails });
      });
    } else {
      groupedSlots.forEach(({ exercise, items }) => {
        let vol = 0;
        let sets = 0;
        const setDetails = [];
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
            setDetails.push({ reps, weight });
          }
        });
        if (sets > 0) breakdown.push({ name: exercise, volume: vol, sets, setDetails });
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
      if (slot.exercises?.length) {
        // Circuit slot — always standalone
        groups.push({ circuit: true, slot, si, items: [] });
        return;
      }
      // Override resolution: per-day swap > in-memory edit > template default.
      // dayOverrides is the localStorage-backed map keyed by slotIdx.
      const exercise = dayOverrides[si] ?? assignments[di]?.[si] ?? slot.exercise ?? '';
      if (isCardioSlot(slot)) {
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
      if (g.circuit) {
        result.push({ type: 'circuit', slot: g.slot, si: g.si, gi: i });
        i++;
        continue;
      }
      if (isCardioSlot(g.items[0]?.slot ?? {})) {
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
      const count = isCardioSlot(slot)
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
    const isCardio = isCardioSlot(firstSlot);
    const isTimed = !isCardio && isTimedSlot(firstSlot);
    const isDistance = !isCardio && isDistanceSlot(firstSlot);

    const pb = personalBests?.[exercise];
    const maxActual = Math.max(
        ...items.flatMap(({ si }) =>
            Array.from({ length: groupSetCount }, (_, j) => Number(getSet(si, j).actual) || 0)
        )
    );
    const displayPb = maxActual > Number(pb ?? 0) ? maxActual : pb;
    const isNewPbThisSession = maxActual > Number(pb ?? 0);

    const headerToggle = () => { setEditingSlot(null); toggleCard(gi); };
    // Only handle keys dispatched directly to the header — ignore events
    // bubbled up from child elements. Future-proof: any future child with
    // its own keyboard handlers (inline picker, input, button) won't need
    // a stopPropagation handshake to coexist.
    const headerKeyDown = (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        headerToggle();
      }
    };

    const cardKey = `g-${gi}`;
    const slotIdxs = items.map(({ si }) => si);
    const isFixedRow = !!firstSlot.fixed;
    const rowMenuHandlers = makeRowMenuHandlers(cardKey, exercise, slotIdxs, isFixedRow);

    return (
      <div
        key={gi}
        className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}
      >
        {/* Card Header — keyboard-accessible toggle (mirrors existing onClick).
            onKeyDown adds Space/Enter activation; existing onClick preserved
            verbatim. Right-click + long-press open the row context menu. */}
        <div
          className="ex-card-header"
          ref={rowMenuHandlers.ref}
          onClick={wrapLongPressClick(headerToggle)}
          onKeyDown={headerKeyDown}
          onContextMenu={rowMenuHandlers.onContextMenu}
          onPointerDown={rowMenuHandlers.onPointerDown}
          onTouchStart={rowMenuHandlers.onTouchStart}
          onTouchEnd={rowMenuHandlers.onTouchEnd}
          onTouchMove={rowMenuHandlers.onTouchMove}
          onTouchCancel={rowMenuHandlers.onTouchCancel}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${exercise || 'exercise'} card, ${groupDoneCount} of ${groupSetCount} sets done`}
          style={TOUCH_NO_CALLOUT_STYLE}
        >
          <div className="ex-card-title-block">
            {firstSlot.fixed || isViewingPast ? (
              <div className="ex-card-name ex-card-name--fixed">{exercise}</div>
            ) : isEditing ? (
              // Wrapper detects "focus left the entire EquipmentSelect subtree"
              // (relatedTarget pattern) to preserve the implicit click-outside-
              // to-cancel UX the native <select>'s onBlur provided. Gap: clicks
              // on truly inert (non-focusable) elements don't trigger blur, so
              // the picker collapses to its trigger but edit mode persists.
              // Most clickable surface here is focusable, so the gap is rare.
              <div
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingSlot(null); }}
              >
                <EquipmentSelect
                  id={`day-edit-${cardKey}`}
                  value={exercise}
                  options={options}
                  equipment={EXERCISE_EQUIPMENT}
                  ariaLabel={`Choose exercise for ${firstSlot.label || 'slot'}`}
                  onChange={(value) => {
                    items.forEach(({ si }) => setExercise(di, si, value));
                    setEditingSlot(null);
                    if (editMode && workoutLogId) {
                      items.forEach(({ si }) =>
                        fetch(`${API_URL}/api/users/workout-log/${workoutLogId}/slot-exercise`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ weekNum: wi + 1, dayNum: di + 1, slotIdx: si, exercise: value })
                        }).catch(err => console.error('Failed to save exercise:', err))
                      );
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>
            ) : (
              <button
                className="ex-card-name-btn"
                onClick={e => { e.stopPropagation(); setEditingSlot(firstSi); }}
                onKeyDown={e => e.stopPropagation()}
                aria-label={`Change exercise (currently ${exercise})`}
              >
                <span className="ex-card-name">{exercise}</span>
                <span className="exercise-edit-icon" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </span>
              </button>
            )}
          </div>

          <div className="ex-card-stats">
            <div className="stat-chip">
              <div className="stat-chip-val" aria-hidden="true">{groupSetCount}</div>
              <div className="stat-chip-lbl" aria-hidden="true">Sets</div>
              <span className="sr-only">{groupSetCount} {groupSetCount === 1 ? 'set' : 'sets'}</span>
            </div>
            <div className="stat-chip stat-chip--done">
              <div className="stat-chip-val" aria-hidden="true">{groupDoneCount}/{groupSetCount}</div>
              <div className="stat-chip-lbl" aria-hidden="true">Done</div>
              <span className="sr-only">{groupDoneCount} of {groupSetCount} done</span>
            </div>
          </div>

          {!isCardio && (displayPb ? (
              <div className={`stat-chip stat-chip--pb${isNewPbThisSession ? ' stat-chip--pb-new' : ''}`}>
                <div className="stat-chip-val" aria-hidden="true"><span aria-hidden="true">🏆 </span>{displayPb}</div>
                <div className="stat-chip-lbl" aria-hidden="true">{isNewPbThisSession ? 'New PR!' : 'Current PR'}</div>
                <span className="sr-only">{isNewPbThisSession ? 'New personal record' : 'Personal record'}: {displayPb} pounds</span>
              </div>
          ) : (
              <div className="stat-chip stat-chip--pb">
                <div className="stat-chip-val" aria-hidden="true">—</div>
                <div className="stat-chip-lbl" aria-hidden="true">No PR yet</div>
                <span className="sr-only">No personal record yet</span>
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

        {/* Swap-for-today panel — opened from the row context menu's
            "Swap for today" item. Reuses reviewProgram's .rp-swap-dropdown
            class and EquipmentSelect; copy distinguishes "today only" from
            reviewProgram's "across all weeks". */}
        {swapPanel?.cardKey === cardKey && (
          <div className="rp-swap-dropdown" id={`day-swap-dd-${cardKey}`}>
            <EquipmentSelect
              id={`day-swap-${cardKey}`}
              value={swapPanel.exercise}
              options={swapPanel.alternatives}
              equipment={EXERCISE_EQUIPMENT}
              onChange={handleSwapSelect}
              ariaLabel={`Replacement for ${swapPanel.exercise} (today only)`}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <span className="rp-swap-hint">Pick a replacement — applied to today only</span>
            <button
              type="button"
              className="btn-back"
              style={{ marginTop: '8px' }}
              onClick={cancelSwap}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Sets Panel */}
        {isOpen && (
          <div className="ex-sets-panel">
            {isCardio && (firstSlot.cardioType || firstSlot.cardioNote) && (
              <div className="cardio-meta">
                {firstSlot.cardioType && <span className="cardio-type">{firstSlot.cardioType}</span>}
                {firstSlot.cardioNote && <span className="cardio-note">{firstSlot.cardioNote}</span>}
              </div>
            )}
            {/* Column header is visual reference; per-cell aria-labels below
                give screen readers richer context, so we hide this row from AT
                to avoid duplicate "Set Set Reps Reps Target Target" announcements. */}
            <div className={`ex-sets-col-header${isCardio ? ' ex-sets-col-header--cardio' : ''}`} aria-hidden="true">
              <span className="ex-col-lbl">Set</span>
              {isCardio ? (
                <>
                  <span className="ex-col-lbl">Time/Distance</span>
                  <span className="ex-col-lbl">Recovery</span>
                  <span className="ex-col-lbl">Intensity</span>
                </>
              ) : (
                <>
                  <span className="ex-col-lbl">{isTimed ? 'Duration' : isDistance ? 'Distance' : 'Target Reps'}</span>
                  <span className="ex-col-lbl">{isTimed ? 'Actual (s)' : isDistance ? 'Actual' : 'Actual Reps'}</span>
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
                const setCount = isCardioSlot(slot)
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

                  const setLabel = `${exercise}, set ${globalSetNum}`;
                  rows.push(
                    <div key={`${si}-${j}`} className={`ex-set-row${isCardio ? ' ex-set-row--cardio' : ''}${s.done ? ' ex-set-row--done' : ''}`} role="group" aria-label={setLabel}>
                      <div className={`set-num${s.done ? ' set-num--done' : ''}`} aria-hidden="true">{globalSetNum}</div>
                      {isCardio ? (
                        <>
                          <div className="cardio-prescribed" aria-label={`Time or distance: ${slot.cardioSets?.[j]?.distance ?? slot.cardioSets?.[j]?.maxEffort ?? slot.cardioSets?.[j]?.time ?? 'not set'}`}>{slot.cardioSets?.[j]?.distance ?? slot.cardioSets?.[j]?.maxEffort ?? slot.cardioSets?.[j]?.time ?? '—'}</div>
                          <div className="cardio-prescribed" aria-label={`Recovery: ${slot.cardioSets?.[j]?.recovery ?? (slot.cardioSets?.[j]?.intensity === 'Max Effort' ? slot.cardioSets?.[j]?.time : 'not set')}`}>{slot.cardioSets?.[j]?.recovery ?? (slot.cardioSets?.[j]?.intensity === 'Max Effort' ? slot.cardioSets?.[j]?.time : '—')}</div>
                          <div className="cardio-prescribed" aria-label={`Intensity: ${slot.cardioSets?.[j]?.intensity ?? (slot.cardioSets?.[j]?.maxEffort ? 'Max Effort' : 'not set')}`}>{slot.cardioSets?.[j]?.intensity ?? (slot.cardioSets?.[j]?.maxEffort ? 'Max Effort' : '—')}</div>
                        </>
                      ) : (
                        <>
                          <div className="set-reps" aria-label={`Target reps: ${getReps(j) ?? 'not set'}`}>{getReps(j) ?? '—'}</div>
                          <div className="stepper-wrap" role="group" aria-label={`Actual reps for ${setLabel}`}>
                            <button
                              type="button"
                              className="stepper-btn stepper-btn--dec"
                              disabled={isViewingPast}
                              aria-label={`Decrease actual reps for ${setLabel}`}
                              onClick={() => {
                                const next = Math.max(0, (Number(s.actualReps) || 0) - 1);
                                updateSet(si, j, { actualReps: next });
                                updateLog(wi, di, si, j, 'actualReps', next);
                              }}
                            ><span aria-hidden="true">−</span></button>
                            <input
                              className="actual-input"
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              inputMode="numeric"
                              aria-label={`Actual reps for ${setLabel}`}
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
                              aria-label={`Increase actual reps for ${setLabel}`}
                              onClick={() => {
                                const next = (Number(s.actualReps) || 0) + 1;
                                updateSet(si, j, { actualReps: next });
                                updateLog(wi, di, si, j, 'actualReps', next);
                              }}
                            ><span aria-hidden="true">+</span></button>
                          </div>
                          <div className="set-target" aria-label={hasTarget ? `Target weight: ${target} pounds` : 'No target weight set'}>
                            {hasTarget
                              ? <><span className="target-wt">{target}</span><span className="target-unit"> lbs</span></>
                              : <span className="target-dash" aria-hidden="true">—</span>
                            }
                          </div>
                          <input
                            className={`actual-input${matched ? ' actual-input--matched' : ''}`}
                            type="number"
                            min="0"
                            step="5"
                            placeholder="0"
                            inputMode="numeric"
                            aria-label={`Actual weight in pounds for ${setLabel}`}
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
                        aria-label={`Mark ${setLabel} ${s.done ? 'incomplete' : 'complete'}`}
                        aria-pressed={s.done}
                      >
                        <span aria-hidden="true">{s.done ? '✓' : ''}</span>
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
              <div className="ex-complete-banner" role="status" aria-live="polite">
                <span aria-hidden="true">✓</span> All sets complete — nice work!
              </div>
            )}

            <div className="ex-notes-row">
              <label className="ex-notes-label" htmlFor={`notes-${gi}`}>Notes</label>
              <input
                id={`notes-${gi}`}
                className="notes-input"
                placeholder="notes..."
                aria-label={`Notes for ${exercise}`}
                value={(log[wi]?.[di]?.[firstSi] ?? {}).notes ?? ''}
                onChange={e => updateLog(wi, di, firstSi, null, 'notes', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCircuitCard = (slot, si, gi) => {
    const exercises = slot.exercises ?? [];

    const badgeParts = [slot.label];
    if (slot.circuitType) badgeParts.push(slot.circuitType);
    if (slot.totalTime) badgeParts.push(slot.totalTime);

    // AMRAP circuits: no discrete sets — rounds tracked at circuit level, per-exercise cards for reference
    if (slot.circuitType === 'AMRAP') {
      const circuitState = setData[`${si}-circuit`] ?? { done: false, rounds: '' };

      return (
        <div key={gi} className="superset-block">
          <div className="superset-block-label">
            <span className="superset-tag">{badgeParts.join(' · ')}</span>
          </div>
          {slot.circuitNote && (
            <div className="circuit-block-note">{slot.circuitNote}</div>
          )}

          {/* Rounds completed tracker */}
          <div className="amrap-rounds-row" role="group" aria-label="Rounds completed">
            <label className="amrap-rounds-label" htmlFor={`amrap-rounds-${si}`}>Rounds Completed</label>
            <div className="stepper-wrap" role="group" aria-label="Rounds counter">
              <button
                type="button"
                className="stepper-btn stepper-btn--dec"
                disabled={isViewingPast}
                aria-label="Decrease rounds"
                onClick={() => {
                  const next = Math.max(0, (Number(circuitState.rounds) || 0) - 1);
                  setSetData(prev => ({ ...prev, [`${si}-circuit`]: { ...(prev[`${si}-circuit`] ?? {}), rounds: next } }));
                }}
              ><span aria-hidden="true">−</span></button>
              <input
                id={`amrap-rounds-${si}`}
                className="actual-input"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                inputMode="numeric"
                aria-label="Rounds completed"
                value={circuitState.rounds ?? ''}
                disabled={isViewingPast}
                onChange={e => setSetData(prev => ({ ...prev, [`${si}-circuit`]: { ...(prev[`${si}-circuit`] ?? {}), rounds: e.target.value } }))}
              />
              <button
                type="button"
                className="stepper-btn stepper-btn--inc"
                disabled={isViewingPast}
                aria-label="Increase rounds"
                onClick={() => {
                  const next = (Number(circuitState.rounds) || 0) + 1;
                  setSetData(prev => ({ ...prev, [`${si}-circuit`]: { ...(prev[`${si}-circuit`] ?? {}), rounds: next } }));
                }}
              ><span aria-hidden="true">+</span></button>
            </div>
            <button
              className={`check-btn${circuitState.done ? ' check-btn--checked' : ''}`}
              disabled={isViewingPast}
              aria-label={`Mark circuit ${circuitState.done ? 'incomplete' : 'complete'}`}
              aria-pressed={circuitState.done}
              onClick={() => {
                if (isViewingPast) return;
                setSetData(prev => ({ ...prev, [`${si}-circuit`]: { ...(prev[`${si}-circuit`] ?? {}), done: !circuitState.done } }));
              }}
            >
              <span aria-hidden="true">{circuitState.done ? '✓' : ''}</span>
            </button>
          </div>

          {/* Per-exercise cards (same pattern as EMOM) */}
          {exercises.map((ex, ei) => {
            const cardKey = `${si}-amrap-${ei}`;
            const exName = ex.exercise ?? ex.fixed ?? ex.label;
            const isOpen = openCards[cardKey] ?? false;
            const exState = setData[`${si}-amrap-${ei}`] ?? { actual: '', actualReps: '' };
            const exTarget = ex.projectedWeight ?? (ex.weightNote || null);
            const hasTarget = exTarget != null && exTarget !== '';
            const matched = exState.actual !== '' && hasTarget && parseInt(exState.actual) >= parseInt(exTarget);
            const updateExState = (patch) =>
              setSetData(prev => ({ ...prev, [`${si}-amrap-${ei}`]: { ...(prev[`${si}-amrap-${ei}`] ?? {}), ...patch } }));

            const amrapHeaderToggle = () => toggleCard(cardKey);
            // Only handle keys dispatched directly to the header — ignore events
            // bubbled up from child elements. Future-proof: any future child with
            // its own keyboard handlers (inline picker, input, button) won't need
            // a stopPropagation handshake to coexist.
            const amrapHeaderKeyDown = (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); amrapHeaderToggle(); }
            };
            // Circuits don't get "Swap for today" — slotIdxs=null gates it off
            // in menuItems; "View in Library" still works.
            const amrapMenuHandlers = makeRowMenuHandlers(`c-amrap-${si}-${ei}`, exName, null, true);
            return (
              <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${circuitState.done ? ' ex-card--done' : ''}`}>
                <div
                  className="ex-card-header"
                  ref={amrapMenuHandlers.ref}
                  onClick={wrapLongPressClick(amrapHeaderToggle)}
                  onKeyDown={amrapHeaderKeyDown}
                  onContextMenu={amrapMenuHandlers.onContextMenu}
                  onPointerDown={amrapMenuHandlers.onPointerDown}
                  onTouchStart={amrapMenuHandlers.onTouchStart}
                  onTouchEnd={amrapMenuHandlers.onTouchEnd}
                  onTouchMove={amrapMenuHandlers.onTouchMove}
                  onTouchCancel={amrapMenuHandlers.onTouchCancel}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${exName} card`}
                  style={TOUCH_NO_CALLOUT_STYLE}
                >
                  <div className="ex-card-title-block">
                    <div className="ex-card-name ex-card-name--fixed">{exName}</div>
                  </div>
                  <div className="ex-card-chevron" aria-hidden="true">▼</div>
                </div>

                <div className="ex-progress-bar">
                  <div
                    className={`ex-progress-fill${circuitState.done ? ' ex-progress-fill--full' : ''}`}
                    style={{ width: circuitState.done ? '100%' : '0%' }}
                  />
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
                    <div className="ex-set-row">
                      <div className="set-num">1</div>
                      <div className="set-reps">{ex.reps}{ex.note ? ` (${ex.note})` : ''}</div>
                      <div className="stepper-wrap">
                        <button
                          type="button"
                          className="stepper-btn stepper-btn--dec"
                          disabled={isViewingPast}
                          onClick={() => updateExState({ actualReps: Math.max(0, (Number(exState.actualReps) || 0) - 1) })}
                        >−</button>
                        <input
                          className="actual-input"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={exState.actualReps ?? ''}
                          disabled={isViewingPast}
                          onChange={e => updateExState({ actualReps: e.target.value })}
                        />
                        <button
                          type="button"
                          className="stepper-btn stepper-btn--inc"
                          disabled={isViewingPast}
                          onClick={() => updateExState({ actualReps: (Number(exState.actualReps) || 0) + 1 })}
                        >+</button>
                      </div>
                      <div className="set-target">
                        {hasTarget
                          ? <><span className="target-wt">{exTarget}</span><span className="target-unit"> lbs</span></>
                          : <span className="target-dash">—</span>
                        }
                      </div>
                      <input
                        className={`actual-input${matched ? ' actual-input--matched' : ''}`}
                        type="number"
                        min="0"
                        step="5"
                        placeholder="0"
                        value={exState.actual ?? ''}
                        disabled={isViewingPast}
                        onChange={e => updateExState({ actual: e.target.value })}
                      />
                      <div />
                    </div>
                    {circuitState.done && (
                      <div className="ex-complete-banner"><span>✓</span> Circuit complete — nice work!</div>
                    )}
                    <div className="ex-notes-row">
                      <span className="ex-notes-label">Notes</span>
                      <input
                        className="notes-input"
                        placeholder="notes..."
                        value={exState.notes ?? ''}
                        disabled={isViewingPast}
                        onChange={e => updateExState({ notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div key={gi} className="superset-block">
        <div className="superset-block-label">
          <span className="superset-tag">{badgeParts.join(' · ')}</span>
        </div>
        {slot.circuitNote && (
          <div className="circuit-block-note">{slot.circuitNote}</div>
        )}

        {exercises.map((ex, ei) => {
          const cardKey = `${gi}-${ei}`;
          const exName = ex.exercise ?? ex.fixed ?? ex.label;
          const setCount = typeof ex.sets === 'number' ? ex.sets : (parseInt(ex.sets) || 0);

          let doneCount = 0;
          for (let j = 0; j < setCount; j++) {
            if (setData[`${si}-${ei}-${j}`]?.done) doneCount++;
          }
          const allDone = setCount > 0 && doneCount === setCount;
          const progPct = setCount > 0 ? Math.round((doneCount / setCount) * 100) : 0;
          const isOpen = openCards[cardKey] ?? false;

          const pb = personalBests?.[exName];
          const maxActual = Math.max(
            ...Array.from({ length: setCount }, (_, j) => Number(setData[`${si}-${ei}-${j}`]?.actual) || 0)
          );
          const displayPb = maxActual > Number(pb ?? 0) ? maxActual : pb;
          const isNewPb = maxActual > Number(pb ?? 0);

          const cTog = () => toggleCard(cardKey);
          // Only handle keys dispatched directly to the header — ignore events
          // bubbled up from child elements. Future-proof: any future child with
          // its own keyboard handlers (inline picker, input, button) won't need
          // a stopPropagation handshake to coexist.
          const cKey = (e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cTog(); }
          };
          // Circuits don't get "Swap for today" — slotIdxs=null gates it off.
          const circMenuHandlers = makeRowMenuHandlers(`c-circ-${gi}-${ei}`, exName, null, true);
          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
              <div
                className="ex-card-header"
                ref={circMenuHandlers.ref}
                onClick={wrapLongPressClick(cTog)}
                onKeyDown={cKey}
                onContextMenu={circMenuHandlers.onContextMenu}
                onPointerDown={circMenuHandlers.onPointerDown}
                onTouchStart={circMenuHandlers.onTouchStart}
                onTouchEnd={circMenuHandlers.onTouchEnd}
                onTouchMove={circMenuHandlers.onTouchMove}
                onTouchCancel={circMenuHandlers.onTouchCancel}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${exName} card, ${doneCount} of ${setCount} sets done`}
                style={TOUCH_NO_CALLOUT_STYLE}
              >
                <div className="ex-card-title-block">
                  <div className="ex-card-name ex-card-name--fixed">{exName}</div>
                </div>
                <div className="ex-card-stats">
                  <div className="stat-chip">
                    <div className="stat-chip-val" aria-hidden="true">{setCount}</div>
                    <div className="stat-chip-lbl" aria-hidden="true">Sets</div>
                    <span className="sr-only">{setCount} {setCount === 1 ? 'set' : 'sets'}</span>
                  </div>
                  <div className="stat-chip stat-chip--done">
                    <div className="stat-chip-val" aria-hidden="true">{doneCount}/{setCount}</div>
                    <div className="stat-chip-lbl" aria-hidden="true">Done</div>
                    <span className="sr-only">{doneCount} of {setCount} done</span>
                  </div>
                </div>
                {displayPb ? (
                  <div className={`stat-chip stat-chip--pb${isNewPb ? ' stat-chip--pb-new' : ''}`}>
                    <div className="stat-chip-val" aria-hidden="true"><span aria-hidden="true">🏆 </span>{displayPb}</div>
                    <div className="stat-chip-lbl" aria-hidden="true">{isNewPb ? 'New PR!' : 'Current PR'}</div>
                    <span className="sr-only">{isNewPb ? 'New personal record' : 'Personal record'}: {displayPb} pounds</span>
                  </div>
                ) : (
                  <div className="stat-chip stat-chip--pb">
                    <div className="stat-chip-val" aria-hidden="true">—</div>
                    <div className="stat-chip-lbl" aria-hidden="true">No PR yet</div>
                    <span className="sr-only">No personal record yet</span>
                  </div>
                )}
                <div className="ex-card-chevron" aria-hidden="true">▼</div>
              </div>

              <div className="ex-progress-bar">
                <div
                  className={`ex-progress-fill${allDone ? ' ex-progress-fill--full' : ''}`}
                  style={{ width: `${progPct}%` }}
                />
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

                  {Array.from({ length: setCount }, (_, j) => {
                    const s = setData[`${si}-${ei}-${j}`] ?? { done: false, actual: '', actualReps: '' };
                    const exTarget = ex.projectedWeight ?? (ex.weightNote || null);
                    const hasTarget = exTarget != null && exTarget !== '';
                    const matched = s.actual !== '' && hasTarget && parseInt(s.actual) >= parseInt(exTarget);

                    return (
                      <div key={j} className={`ex-set-row${s.done ? ' ex-set-row--done' : ''}`}>
                        <div className={`set-num${s.done ? ' set-num--done' : ''}`}>{j + 1}</div>
                        <div className="set-reps">{(() => { const parts = typeof ex.reps === 'string' && ex.reps.includes(',') ? ex.reps.split(',').map(r => r.trim()) : null; return parts ? (parts[j] ?? parts[parts.length - 1]) : (ex.reps ?? '—'); })()}</div>
                        <div className="stepper-wrap">
                          <button
                            type="button"
                            className="stepper-btn stepper-btn--dec"
                            disabled={isViewingPast}
                            onClick={() => {
                              const next = Math.max(0, (Number(s.actualReps) || 0) - 1);
                              setSetData(prev => ({ ...prev, [`${si}-${ei}-${j}`]: { ...(prev[`${si}-${ei}-${j}`] ?? {}), actualReps: next } }));
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
                            onChange={e => setSetData(prev => ({ ...prev, [`${si}-${ei}-${j}`]: { ...(prev[`${si}-${ei}-${j}`] ?? {}), actualReps: e.target.value } }))}
                          />
                          <button
                            type="button"
                            className="stepper-btn stepper-btn--inc"
                            disabled={isViewingPast}
                            onClick={() => {
                              const next = (Number(s.actualReps) || 0) + 1;
                              setSetData(prev => ({ ...prev, [`${si}-${ei}-${j}`]: { ...(prev[`${si}-${ei}-${j}`] ?? {}), actualReps: next } }));
                            }}
                          >+</button>
                        </div>
                        <div className="set-target">
                          {hasTarget
                            ? <><span className="target-wt">{exTarget}</span><span className="target-unit"> lbs</span></>
                            : <span className="target-dash">—</span>
                          }
                        </div>
                        <input
                          className={`actual-input${matched ? ' actual-input--matched' : ''}`}
                          type="number"
                          min="0"
                          step="5"
                          placeholder="0"
                          value={s.actual ?? ''}
                          disabled={isViewingPast}
                          onChange={e => setSetData(prev => ({ ...prev, [`${si}-${ei}-${j}`]: { ...(prev[`${si}-${ei}-${j}`] ?? {}), actual: e.target.value } }))}
                        />
                        <button
                          className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                          disabled={isViewingPast}
                          onClick={() => {
                            if (isViewingPast) return;
                            const marking = !s.done;
                            setSetData(prev => ({ ...prev, [`${si}-${ei}-${j}`]: { ...(prev[`${si}-${ei}-${j}`] ?? {}), done: marking } }));
                            if (marking) recordPRIfBeaten(exName, s.actual, s.actualReps);
                          }}
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
                      value={setData[`${si}-${ei}-notes`] ?? ''}
                      disabled={isViewingPast}
                      onChange={e => setSetData(prev => ({ ...prev, [`${si}-${ei}-notes`]: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
        {!isCustom && workout?.progression_note && (
          <p className="progression-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            {workout.progression_note}
          </p>
        )}
      </div>

      {/* Summary Bar */}
      <div className="workout-summary-bar" role="group" aria-label="Day progress summary">
        <div className="summary-pill">
          <div className="summary-pill-val" aria-hidden="true">{doneSets}</div>
          <div className="summary-pill-lbl" aria-hidden="true">Sets Done</div>
          <span className="sr-only">{doneSets} sets done</span>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--accent" aria-hidden="true">{totalSets}</div>
          <div className="summary-pill-lbl" aria-hidden="true">Total Sets</div>
          <span className="sr-only">{totalSets} total sets</span>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--green" aria-hidden="true">{completionPct}%</div>
          <div className="summary-pill-lbl" aria-hidden="true">Complete</div>
          <span className="sr-only">{completionPct} percent complete</span>
        </div>
      </div>

      {/* Strength Exercise Cards */}
      <div className="exercise-cards">
        {isCustom ? customExercises.map((ex, ei) => {
          const doneCount = ex.sets.filter(s => s.done).length;
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length;
          const progPct = ex.sets.length > 0 ? Math.round((doneCount / ex.sets.length) * 100) : 0;
          const isOpen = openCards[ei] ?? true;
          const cwTog = () => toggleCard(ei);
          // Only handle keys dispatched directly to the header — ignore events
          // bubbled up from child elements. Future-proof: any future child with
          // its own keyboard handlers (inline picker, input, button) won't need
          // a stopPropagation handshake to coexist.
          const cwKey = (e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cwTog(); }
          };
          const cwMenuHandlers = makeRowMenuHandlers(`c-cw-${ei}`, ex.name, null, true);
          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
              <div
                className="ex-card-header"
                ref={cwMenuHandlers.ref}
                onClick={wrapLongPressClick(cwTog)}
                onKeyDown={cwKey}
                onContextMenu={cwMenuHandlers.onContextMenu}
                onPointerDown={cwMenuHandlers.onPointerDown}
                onTouchStart={cwMenuHandlers.onTouchStart}
                onTouchEnd={cwMenuHandlers.onTouchEnd}
                onTouchMove={cwMenuHandlers.onTouchMove}
                onTouchCancel={cwMenuHandlers.onTouchCancel}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${ex.name} card, ${doneCount} of ${ex.sets.length} sets done`}
                style={TOUCH_NO_CALLOUT_STYLE}
              >
                <div className="ex-card-title-block">
                  <div className="ex-card-name ex-card-name--fixed">{ex.name}</div>
                </div>
                <div className="ex-card-stats">
                  <div className="stat-chip">
                    <div className="stat-chip-val" aria-hidden="true">{ex.sets.length}</div>
                    <div className="stat-chip-lbl" aria-hidden="true">Sets</div>
                    <span className="sr-only">{ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}</span>
                  </div>
                  <div className="stat-chip stat-chip--done">
                    <div className="stat-chip-val" aria-hidden="true">{doneCount}/{ex.sets.length}</div>
                    <div className="stat-chip-lbl" aria-hidden="true">Done</div>
                    <span className="sr-only">{doneCount} of {ex.sets.length} done</span>
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
          if (renderItem.type === 'circuit') {
            return renderCircuitCard(renderItem.slot, renderItem.si, renderItem.gi);
          }
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

      {/* Post-Workout Modal — backdrop click closes; Esc + focus-trap need
          useModalA11y wiring (functional change) and are deferred as follow-up. */}
      {postWorkoutData && (
        <div className="post-workout-overlay" onClick={() => { setPostWorkoutData(null); navigate('/home'); }}>
          <div
            className="post-workout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-workout-title"
            aria-describedby="post-workout-subtitle"
            onClick={e => e.stopPropagation()}
          >
            <div className="post-workout-handle" aria-hidden="true" />
            <div className="post-workout-header">
              <div className="post-workout-title" id="post-workout-title">Workout Complete</div>
              <div className="post-workout-subtitle" id="post-workout-subtitle">{day.title ?? `Day ${dayNum}`}</div>
            </div>
            <div className="post-workout-streak-row" role="group" aria-label="Workout streaks">
              <div className="post-workout-streak-card">
                <div className="post-workout-streak-val" aria-hidden="true"><span>{totalSessions}</span></div>
                <div className="post-workout-streak-lbl" aria-hidden="true">Total Sessions</div>
                <span className="sr-only">Total sessions: {totalSessions}</span>
              </div>
              <div className="post-workout-streak-card">
                <div className="post-workout-streak-val" aria-hidden="true"><span>{weeksLogged}</span></div>
                <div className="post-workout-streak-lbl" aria-hidden="true">Weeks Logged</div>
                <span className="sr-only">Weeks logged: {weeksLogged}</span>
              </div>
              <div className="post-workout-streak-card">
                <div className="post-workout-streak-val" aria-hidden="true"><span>{thisMonth}</span></div>
                <div className="post-workout-streak-lbl" aria-hidden="true">This Month</div>
                <span className="sr-only">This month: {thisMonth} {thisMonth === 1 ? 'session' : 'sessions'}</span>
              </div>
              <div className="post-workout-streak-card">
                <div className="post-workout-streak-val" aria-hidden="true"><span>{daysThisWeek} / 7</span></div>
                <div className="post-workout-streak-lbl" aria-hidden="true">Days This Week</div>
                <span className="sr-only">Days this week: {daysThisWeek} of 7</span>
              </div>
            </div>
            <div className="post-workout-stats-row" role="group" aria-label="Workout totals">
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val" aria-hidden="true">
                  {postWorkoutData.totalVolume > 0
                    ? postWorkoutData.totalVolume.toLocaleString()
                    : '—'}
                </div>
                <div className="post-workout-volume-lbl" aria-hidden="true">Total Volume (lbs)</div>
                <span className="sr-only">Total volume: {postWorkoutData.totalVolume > 0 ? `${postWorkoutData.totalVolume.toLocaleString()} pounds` : 'none recorded'}</span>
              </div>
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val" aria-hidden="true">
                  {postWorkoutData.totalSets ?? '—'}
                </div>
                <div className="post-workout-volume-lbl" aria-hidden="true">Total Sets</div>
                <span className="sr-only">Total sets: {postWorkoutData.totalSets ?? 'none recorded'}</span>
              </div>
            </div>
            {postWorkoutData.breakdown.length > 0 && (
              <div className="post-workout-breakdown">
                <div className="post-workout-breakdown-title">By Exercise</div>
                {postWorkoutData.breakdown.map((e, i) => (
                  <div key={i} className="post-workout-breakdown-exercise">
                    <div className="post-workout-breakdown-row">
                      <span className="post-workout-breakdown-name">{e.name}</span>
                      <span className="post-workout-breakdown-sets">{e.sets} {e.sets === 1 ? 'set' : 'sets'}</span>
                      <span className="post-workout-breakdown-vol">{e.volume > 0 ? `${e.volume.toLocaleString()} lbs` : '—'}</span>
                    </div>
                    {e.setDetails?.length > 0 && (
                      <ul className="post-workout-breakdown-set-list" aria-label={`Sets for ${e.name}`}>
                        {collapseSetDetails(e.setDetails).map((g, gi) => (
                          <li key={gi} className="post-workout-breakdown-set-line">{formatSetLine(g)}</li>
                        ))}
                      </ul>
                    )}
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><polyline points="15 18 9 12 15 6"/></svg>
          {isExternalWorkout ? 'Back' : 'Back to Home'}
        </button>
        {!day.completed && !isExternalWorkout && (
          <button className="btn-complete" onClick={handleCompleteDay}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Day Complete
          </button>
        )}
        {day.completed && (
          <span className="day-completed-label" role="status">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ marginRight: '5px', verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12"/></svg>
            Day Completed
          </span>
        )}
      </div>

      <ContextMenu
        open={!!contextMenu}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={menuItems}
        onClose={() => setContextMenu(null)}
        returnFocusRef={menuReturnFocusRef}
      />
    </div>
  );
}

export default Day;

