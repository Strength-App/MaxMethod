import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// Helper: if value is an array (progression-based), return the entry for this week.
// If it's a plain value, return it directly.
function resolveWeekValue(value, wi) {
  if (Array.isArray(value)) return value[wi] ?? null;
  return value ?? null;
}

function Day() {
  const { weekNum, dayNum } = useParams();
  const navigate = useNavigate();

  // Convert to 0-based indices
  const wi = parseInt(weekNum, 10) - 1;
  const di = parseInt(dayNum, 10) - 1;

  const { workout, assignments, setExercise, log, updateLog, completeDay, loading, error } = useWorkout();
  const [editingSlot, setEditingSlot] = useState(null);

  if (loading) return <div className="day-page"><p>Loading workout...</p></div>;
  if (error) return <div className="day-page"><p>Error loading workout: {error}</p></div>;

  const day = workout?.weeks?.[wi]?.days?.[di];

  if (!day) {
    return (
      <div className="day-page">
        <p>No workout found for Week {weekNum}, Day {dayNum}.</p>
        <button onClick={() => navigate('/home')}>← Back to Home</button>
      </div>
    );
  }

  const handleCompleteDay = async () => {
    await completeDay(wi, di);
    navigate('/home');
  };

  return (
    <div className="day-page">
      {/* Page header */}
      <div className="day-header">
        <div className="day-header-meta">
          <span className="week-badge">Week {weekNum}</span>
          <h1 className="day-title">{day.title ?? `Day ${dayNum}`}</h1>
        </div>
        <p className="progression-note">
          📈 Progression: Add 5 lbs when all sets and reps are completed
        </p>
      </div>

      {/* Workout table */}
      <div className="workout-table-wrapper">
        <table className="workout-table">
          <thead>
            <tr>
              <th className="col-exercise">Exercise</th>
              <th className="col-sets">Sets</th>
              <th className="col-reps">Reps</th>
              <th className="col-weight">Projected Wt</th>
              <th className="col-weight">Actual Wt</th>
              <th className="col-notes">Notes</th>
            </tr>
          </thead>
          <tbody>
            {day.slots.map((slot, si) => {
              // Use assignment override if set, otherwise use what the DB resolved
              const exercise = assignments[di]?.[si] ?? slot.exercise ?? '';
              const logEntry = log[wi]?.[di]?.[si] ?? { actualWeight: '', notes: '' };
              const isEditing = editingSlot === si;

              // For progression-based slots, read this week's values from the array
              const sets = resolveWeekValue(slot.sets, wi);
              const reps = resolveWeekValue(slot.reps, wi);
              const weightNote = resolveWeekValue(slot.weightNote, wi);

              // Options for the exercise swap dropdown
              const patternKey = slot.label;
              const options = patternKey ? (movementPatterns[patternKey] ?? [exercise]) : [exercise];

              return (
                <tr key={si} className={si % 2 === 0 ? 'row-even' : 'row-odd'}>
                  {/* Exercise cell */}
                  <td className="td-exercise">
                    {slot.fixed ? (
                      <span className="exercise-fixed">{exercise}</span>
                    ) : isEditing ? (
                      <select
                        autoFocus
                        className="exercise-select"
                        value={exercise}
                        onChange={e => {
                          setExercise(di, si, e.target.value);
                          setEditingSlot(null);
                        }}
                        onBlur={() => setEditingSlot(null)}
                      >
                        {options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        className="exercise-btn"
                        onClick={() => setEditingSlot(si)}
                        title="Tap to change exercise"
                      >
                        <span className="exercise-name">{exercise}</span>
                        <span className="exercise-edit-icon">✎</span>
                      </button>
                    )}
                    {slot.label && <div className="pattern-tag">{slot.label}</div>}
                  </td>

                  {/* Sets — show each set's rep scheme for progression slots */}
                  <td className="td-center">
                    {sets ?? '—'}
                  </td>

                  {/* Reps */}
                  <td className="td-center">
                    {reps ?? '—'}
                  </td>

                  {/* Projected weight */}
                  <td className="td-center">
                    {weightNote ? (
                      <span className="projected-badge">{weightNote}</span>
                    ) : (
                      <input
                        className="weight-input"
                        placeholder="—"
                        readOnly
                      />
                    )}
                  </td>

                  {/* Actual weight */}
                  <td className="td-center">
                    <input
                      className="weight-input"
                      placeholder="lbs"
                      value={logEntry.actualWeight}
                      onChange={e => updateLog(wi, di, si, 'actualWeight', e.target.value)}
                    />
                  </td>

                  {/* Notes */}
                  <td className="td-notes">
                    <input
                      className="notes-input"
                      placeholder="notes..."
                      value={logEntry.notes}
                      onChange={e => updateLog(wi, di, si, 'notes', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="day-footer">
        <button className="btn-back" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        {!day.completed && (
          <button className="btn-complete" onClick={handleCompleteDay}>
            ✓ Mark Day Complete
          </button>
        )}
        {day.completed && (
          <span className="day-completed-label">✓ Day Completed</span>
        )}
      </div>
    </div>
  );
}

export default Day;