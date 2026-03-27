import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

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

  useEffect(() => {
    const loadData = async () => {
      try {
        let prog = program;
        if (!prog) {
          const userId = localStorage.getItem('userId');
          const res = await fetch(`http://localhost:5050/api/users/program-logs/${userId}`);
          if (!res.ok) throw new Error('Failed to fetch programs');
          const programs = await res.json();
          prog = programs.find(p => p._id === programLogId);
          if (!prog) throw new Error('Program not found');
          setProgram(prog);
        }

        const res = await fetch(`http://localhost:5050/api/users/workout-log/${prog.workoutLogId}`);
        if (!res.ok) throw new Error('Failed to fetch workout data');
        const data = await res.json();
        setWorkoutData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [programLogId]);

  const handleSetActive = async () => {
    const userId = localStorage.getItem('userId');
    setSettingActive(true);
    try {
      await fetch('http://localhost:5050/api/users/program-logs/set-active', {
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
      await fetch(`http://localhost:5050/api/users/workout-log/${program.workoutLogId}/weeks`, {
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

  const handleDayClick = (weekNum, di) => {
    if (isEditing && isCustom) {
      navigate(`/customDay/${weekNum}/${di + 1}`, {
        state: {
          workoutLogId: program?.workoutLogId,
          exercises: workoutData.weeks[weekNum - 1]?.days[di]?.exercises ?? [],
          programLogId: programLogId
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
        <span>Viewing: <strong>{program?.title ?? programTitle}</strong></span>
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

      <h1>{programTitle || 'Program'}</h1>
      {!isCustom && (
        <div className="fitness-level-container">
          <h2>Fitness Level: {workoutData.classification}</h2>
        </div>
      )}

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
              </div>
              <div className="week-days">
                {week.days.filter(d => d?.title != null).map((day, di) => (
                  <button
                    key={di}
                    type="button"
                    className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                    onClick={() => handleDayClick(weekNum, di)}
                  >
                    {day.title ?? `Day ${di + 1}`}
                    {day.completed && <span className="completed-badge">✓</span>}
                  </button>
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
    </div>
  );
}

export default ViewProgram;
