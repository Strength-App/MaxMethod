import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_EXERCISES } from './exerciseLibrary';
import { useWorkout } from '../context/WorkoutContext';

const BIG_THREE = ['bench', 'squat', 'deadlift'];
function getRestSeconds(name) {
  const lower = (name || '').toLowerCase();
  return BIG_THREE.some(n => lower.includes(n)) ? 120 : 90;
}

function RestTimer({ initialSeconds, onSkip }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSeconds(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => { if (seconds === 0) onSkip(); }, [seconds]);

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

const ALL_EXERCISE_NAMES = [...new Set(ALL_EXERCISES.map(e => e.name))];
const getCustomExerciseNames = () => { try { return JSON.parse(localStorage.getItem('customExercises') || '[]'); } catch { return []; } };
const getAllExerciseNames = () => [...ALL_EXERCISE_NAMES, ...getCustomExerciseNames()];
const isValidExercise = name => getAllExerciseNames().some(n => n.toLowerCase() === name.toLowerCase());

const addToCustomExercises = (name) => {
  const existing = getCustomExerciseNames();
  if (existing.some(n => n.toLowerCase() === name.toLowerCase())) return;
  localStorage.setItem('customExercises', JSON.stringify([...existing, name]));
  const userId = localStorage.getItem('userId');
  if (userId) {
    fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}/custom-exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }
};

function Logger() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState([]);
  const [openCards, setOpenCards] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const { personalBests, refreshPersonalBests } = useWorkout();
  const userId = localStorage.getItem('userId');
  const defaultTitle = `Quick Workout · ${new Date().toLocaleDateString()}`;
  const [postWorkoutData, setPostWorkoutData] = useState(null);
  const [sessionPRs, setSessionPRs] = useState([]);
  const [timerState, setTimerState] = useState(null); // { cardKey, id }

  const recordPRIfBeaten = (exerciseName, weight, reps) => {
    const w = parseFloat(weight) || 0;
    if (!w || !exerciseName) return;
    const currentPB = personalBests?.[exerciseName] ?? 0;
    if (w > currentPB) {
      setSessionPRs(prev => {
        const existing = prev.find(p => p.exercise === exerciseName);
        if (existing && existing.weight >= w) return prev;
        return [...prev.filter(p => p.exercise !== exerciseName), { exercise: exerciseName, weight: w, reps: reps || '' }];
      });
    }
  };


  const addExercise = () => {
    const idx = exercises.length;
    setExercises(prev => [...prev, { name: '', sets: [{ reps: 0, weight: '', done: false }] }]);
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
      i === ei ? { ...ex, sets: [...ex.sets, { reps: 0, weight: '', done: false }] } : ex
    ));

  const deleteExercise = (ei) =>
    setExercises(prev => prev.filter((_, i) => i !== ei));

  const toggleCard = (ei) =>
    setOpenCards(prev => ({ ...prev, [ei]: !prev[ei] }));

  const saveAndExit = async () => {
    if (!userId) return;
    setFinishing(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/users/quick-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: title.trim() || defaultTitle, exercises })
      });
      await refreshPersonalBests();
      navigate('/history');
    } catch (err) {
      console.error('Failed to save session:', err);
      setFinishing(false);
    }
  };

  const handleFinishWorkout = () => {
    if (exercises.length === 0) return;
    const breakdown = [];
    exercises.forEach(ex => {
      let vol = 0, sets = 0;
      ex.sets.forEach(s => {
        if (!s.done) return;
        const reps = parseInt(s.reps) || 0;
        const weight = parseFloat(s.weight) || 0;
        vol += reps * weight;
        sets++;
      });
      if (sets > 0) breakdown.push({ name: ex.name, volume: vol, sets });
    });
    const totalVolume = breakdown.reduce((sum, e) => sum + e.volume, 0);
    const totalSetsCompleted = breakdown.reduce((sum, e) => sum + e.sets, 0);
    setPostWorkoutData({ totalVolume, totalSets: totalSetsCompleted, breakdown, prs: sessionPRs });
  };

  return (
    <div className="day-page">
      <div className="day-header">
        <div className="day-header-meta">
          <input
            className="logger-title-input"
            placeholder={defaultTitle}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="workout-summary-bar">
        <div className="summary-pill">
          <div className="summary-pill-val">{exercises.reduce((t, ex) => t + ex.sets.filter(s => s.done).length, 0)}</div>
          <div className="summary-pill-lbl">Sets Done</div>
        </div>
        <div className="summary-pill">
          <div className="summary-pill-val summary-pill-val--accent">{exercises.reduce((t, ex) => t + ex.sets.length, 0)}</div>
          <div className="summary-pill-lbl">Total Sets</div>
        </div>
      </div>

      <div className="exercise-cards">
        {exercises.length === 0 && (
          <div className="logger-empty-hint">Add your first exercise to start logging.</div>
        )}

        {exercises.map((ex, ei) => {
          const isOpen = openCards[ei] ?? true;
          const doneCount = ex.sets.filter(s => s.done).length;
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length;
          const progPct = ex.sets.length > 0 ? Math.round((doneCount / ex.sets.length) * 100) : 0;

          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
              <div className="ex-card-header" onClick={() => toggleCard(ei)}>
                <div className="ex-card-title-block" style={{ position: 'relative', flex: 1 }}>
                  <input
                    className="ex-card-name"
                    placeholder="Search exercise..."
                    value={ex.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { updateName(ei, e.target.value); setActiveDropdown(ei); }}
                    onFocus={() => setActiveDropdown(ei)}
                    onBlur={() => setTimeout(() => setActiveDropdown(null), 150)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: '1em', width: '100%' }}
                  />
                  {activeDropdown === ei && ex.name.length > 0 && (() => {
                    const q = ex.name.toLowerCase();
                    const matches = getAllExerciseNames().filter(n => n.toLowerCase().includes(q)).slice(0, 8);
                    return (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '8px', zIndex: 100, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
                      >
                        {matches.length > 0 ? matches.map(name => (
                          <div
                            key={name}
                            onMouseDown={() => { updateName(ei, name); setActiveDropdown(null); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)', borderBottom: '1px solid var(--border, #333)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--border, #333)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {name}
                          </div>
                        )) : (
                          <div style={{ padding: '10px 12px', fontSize: '13px' }}>
                            <div style={{ color: '#ff5555', marginBottom: '8px' }}>"{ex.name}" is not in the exercise library</div>
                            <div
                              onMouseDown={() => {
                                addToCustomExercises(ex.name.trim());
                                setActiveDropdown(null);
                              }}
                              style={{ display: 'inline-block', padding: '5px 12px', background: 'rgba(250,204,21,0.15)', color: '#facc15', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              + Add "{ex.name}" to Custom Exercises
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {ex.name.length > 0 && activeDropdown !== ei && !isValidExercise(ex.name) && (
                    <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#ff5555' }}>"{ex.name}" is not in the exercise library</span>
                      <span
                        onClick={e => {
                          e.stopPropagation();
                          addToCustomExercises(ex.name.trim());
                          setExercises(prev => [...prev]);
                        }}
                        style={{ color: '#facc15', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        + Add to Custom Exercises
                      </span>
                    </div>
                  )}
                </div>

                <div className="ex-card-stats">
                  <div className="stat-chip">
                    <div className="stat-chip-val">{ex.sets.length}</div>
                    <div className="stat-chip-lbl">Sets</div>
                  </div>
                </div>

                <button
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

              <div className="ex-progress-bar">
                <div className={`ex-progress-fill${allDone ? ' ex-progress-fill--full' : ''}`} style={{ width: `${progPct}%` }} />
              </div>

              {isOpen && (
                <div className="ex-sets-panel">
                  <div className="ex-sets-col-header" style={{ gridTemplateColumns: '36px 1fr 1fr 44px' }}>
                    <span className="ex-col-lbl">Set</span>
                    <span className="ex-col-lbl">Reps</span>
                    <span className="ex-col-lbl">Weight (lbs)</span>
                    <span className="ex-col-lbl">Done</span>
                  </div>

                  {ex.sets.map((s, si) => (
                    <div key={si} className="ex-set-row" style={{ gridTemplateColumns: '36px 1fr 1fr 44px' }}>
                      <div className="set-num">{si + 1}</div>

                      <div className="actual-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => updateSet(ei, si, { reps: Math.max(0, (Number(s.reps) || 0) - 1) })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                        >−</button>
                        <span style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text)' }}>{s.reps || 0}</span>
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
                        value={s.weight}
                        onChange={e => updateSet(ei, si, { weight: e.target.value })}
                      />

                      <button
                        type="button"
                        className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                        onClick={() => {
                          const markingDone = !s.done;
                          updateSet(ei, si, { done: markingDone });
                          if (markingDone) {
                            if (s.weight && ex.name) {
                              recordPRIfBeaten(ex.name, s.weight, s.reps);
                                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/workout/pb-check`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId, exercise: ex.name, actualWeight: Number(s.weight) })
                              }).catch(() => {});
                            }
                            if (localStorage.getItem('restTimerEnabled') !== 'false') {
                              setTimerState(prev => ({ cardKey: `ex-${ei}`, id: (prev?.id ?? 0) + 1 }));
                            }
                          }
                        }}
                        title="Mark set done"
                      >
                        {s.done ? '✓' : ''}
                      </button>
                    </div>
                  ))}

                  {timerState?.cardKey === `ex-${ei}` && (
                    <RestTimer
                      key={timerState.id}
                      initialSeconds={getRestSeconds(ex.name)}
                      onSkip={() => setTimerState(null)}
                    />
                  )}

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

        <button type="button" className="btn-complete" onClick={addExercise}>
          Add Exercise
        </button>
      </div>

      {postWorkoutData && (
        <div className="post-workout-overlay" onClick={() => { setPostWorkoutData(null); saveAndExit(); }}>
          <div className="post-workout-modal" onClick={e => e.stopPropagation()}>
            <div className="post-workout-handle" />
            <div className="post-workout-header">
              <div className="post-workout-title">Workout Complete</div>
              <div className="post-workout-subtitle">{title.trim() || defaultTitle}</div>
            </div>
            <div className="post-workout-stats-row">
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val">
                  {postWorkoutData.totalVolume > 0 ? postWorkoutData.totalVolume.toLocaleString() : '—'}
                </div>
                <div className="post-workout-volume-lbl">Total Volume (lbs)</div>
              </div>
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val">{postWorkoutData.totalSets ?? '—'}</div>
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
            <button className="post-workout-btn" onClick={saveAndExit} disabled={finishing}>
              {finishing ? 'Saving...' : 'Done'}
            </button>
          </div>
        </div>
      )}

      <div className="day-footer">
        <button className="btn-back" onClick={() => navigate('/home')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          Discard
        </button>
        <button
          className="btn-complete"
          onClick={handleFinishWorkout}
          disabled={exercises.length === 0}
        >
          Finish Workout
        </button>
      </div>
    </div>
  );
}

export default Logger;

