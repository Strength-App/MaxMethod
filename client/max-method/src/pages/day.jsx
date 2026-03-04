import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { DAY_TEMPLATES, getSlotOptions } from '../data/workoutData';

function Day() {
  const { weekNum, dayNum } = useParams();
  const navigate = useNavigate();

  // Convert to 0-based indices
  const wi = parseInt(weekNum, 10) - 1;
  const di = parseInt(dayNum, 10) - 1;

  const { assignments, setExercise, log, updateLog } = useWorkout();
  const [editingSlot, setEditingSlot] = useState(null); // slotIdx being edited

  const template = DAY_TEMPLATES[di];

  // Guard: if invalid day
  if (!template) {
    return (
      <div className="day-page">
        <p>No template found for Day {dayNum}.</p>
        <button onClick={() => navigate('/home')}>← Back to Home</button>
      </div>
    );
  }

  return (
    <div className="day-page">
      {/* Page header */}
      <div className="day-header">
        <div className="day-header-meta">
          <span className="week-badge">Week {weekNum}</span>
          <h1 className="day-title">{template.title}</h1>
        </div>
        <p className="progression-note">
          📈 Progression: Add 5 lbs when all 5 sets × 5 reps are completed
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
            {template.slots.map((slot, si) => {
              const exercise = assignments[di]?.[si] ?? '';
              const logEntry = log[wi]?.[di]?.[si] ?? { actual: '', notes: '' };
              const isEditing = editingSlot === si;
              const options = getSlotOptions(di, si, assignments);

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
                    <div className="pattern-tag">{slot.pattern ?? 'Main Lift'}</div>
                  </td>

                  <td className="td-center">{slot.sets}</td>
                  <td className="td-center">{slot.reps}</td>

                  {/* Projected weight */}
                  <td className="td-center">
                    {slot.weightNote ? (
                      <span className="projected-badge">{slot.weightNote}</span>
                    ) : (
                      <input
                        className="weight-input"
                        placeholder="—"
                        readOnly
                      />
                    )}
                  </td>

                  {/* Actual weight (logged per week) */}
                  <td className="td-center">
                    <input
                      className="weight-input"
                      placeholder="lbs"
                      value={logEntry.actual}
                      onChange={e => updateLog(wi, di, si, 'actual', e.target.value)}
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
    </div>
  );
}

export default Day;