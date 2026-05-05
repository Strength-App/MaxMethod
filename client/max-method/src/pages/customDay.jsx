import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { ALL_EXERCISES } from './exerciseLibrary';
import { API_URL } from '../config/api';
import { useModalA11y } from '../hooks/useModalA11y';

const ALL_EXERCISE_NAMES = [...new Set(ALL_EXERCISES.map(e => e.name))];
const getCustomExerciseNames = () => { try { return JSON.parse(localStorage.getItem('customExercises') || '[]'); } catch { return []; } };
const getAllExerciseNames = () => [...ALL_EXERCISE_NAMES, ...getCustomExerciseNames()];
const isValidExercise = name => getAllExerciseNames().some(n => n.toLowerCase() === name.toLowerCase());

const addToCustomExercises = (name) => {
  const existing = getCustomExerciseNames();
  if (existing.some(n => n.toLowerCase() === name.toLowerCase())) return;
  const updated = [...existing, name];
  localStorage.setItem('customExercises', JSON.stringify(updated));
  const userId = localStorage.getItem('userId');
  if (userId) {
    fetch(`${API_URL}/api/users/${userId}/custom-exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }
};

function CustomDay() {
  const { weekNum, dayNum } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { workout, fetchWorkout } = useWorkout();
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
  const [activeDropdown, setActiveDropdown] = useState(null);
  // a11y: tracks the option highlighted by keyboard or hover within the open
  // listbox. Single number scoped to whichever card has activeDropdown set.
  // Reset to null whenever the dropdown closes or the typed query changes
  // so aria-activedescendant never points at a stale option id.
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);
  const initialised = useRef(false);

  // Combined options for the autocomplete listbox: either matching exercise
  // names OR (when nothing matches and the user typed something) a single
  // "add to custom exercises" affordance. Mirrors the existing UI branches
  // at lines ~265-278; consolidating here lets keyboard nav treat both as
  // selectable options.
  const optionsFor = useCallback((name) => {
    if (!name) return [];
    const q = name.toLowerCase();
    const matches = getAllExerciseNames()
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 8);
    if (matches.length > 0) {
      return matches.map(n => ({ kind: 'match', name: n }));
    }
    return [{ kind: 'add', name: name.trim() }];
  }, []);

  // Centralized open/close so highlightedIndex resets are guaranteed.
  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
    setHighlightedIndex(null);
  }, []);
  const openDropdown = useCallback((ei, idx = null) => {
    setActiveDropdown(ei);
    setHighlightedIndex(idx);
  }, []);

  // Combobox keydown handler — implements the WAI-ARIA combobox pattern.
  // Keys: ArrowDown/Up move highlight (open if closed), Home/End jump to
  // first/last, Enter selects, Esc closes, Tab closes without preventing.
  // No-op when ex.name is empty (no options exist).
  const handleComboKeyDown = useCallback((e, ei, name) => {
    const opts = optionsFor(name);
    const open = activeDropdown === ei;

    switch (e.key) {
      case 'ArrowDown': {
        if (opts.length === 0) return; // empty input — nothing to navigate
        e.preventDefault();
        if (!open) { openDropdown(ei, 0); return; }
        setHighlightedIndex(prev => prev == null ? 0 : (prev + 1) % opts.length);
        return;
      }
      case 'ArrowUp': {
        if (opts.length === 0) return;
        e.preventDefault();
        if (!open) { openDropdown(ei, opts.length - 1); return; }
        setHighlightedIndex(prev => prev == null ? opts.length - 1 : (prev - 1 + opts.length) % opts.length);
        return;
      }
      case 'Home': {
        if (!open || opts.length === 0) return;
        e.preventDefault();
        setHighlightedIndex(0);
        return;
      }
      case 'End': {
        if (!open || opts.length === 0) return;
        e.preventDefault();
        setHighlightedIndex(opts.length - 1);
        return;
      }
      // Note: Space is intentionally NOT handled here. This is a text-input-
      // trigger combobox per WAI-ARIA — Space is text entry, not a UI command.
      // Enter alone selects the highlighted option (matches Google search,
      // browser address bars, IDE autocomplete). Diverges from EquipmentSelect's
      // button-trigger combobox where Space-to-select is correct.
      case 'Enter': {
        if (!open || opts.length === 0 || highlightedIndex == null) return;
        const opt = opts[highlightedIndex];
        if (!opt) return;
        e.preventDefault();
        if (opt.kind === 'match') {
          updateName(ei, opt.name);
        } else {
          addToCustomExercises(opt.name);
        }
        closeDropdown();
        return;
      }
      case 'Escape': {
        if (!open) return;
        e.preventDefault();
        closeDropdown();
        return;
      }
      case 'Tab': {
        // Don't preventDefault — let Tab move focus naturally; just close.
        if (open) closeDropdown();
        return;
      }
      default:
        return;
    }
  }, [activeDropdown, highlightedIndex, optionsFor, openDropdown, closeDropdown]);

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
          ? `${API_URL}/api/users/workout-log/${externalWorkoutLogId}/custom-day`
          : `${API_URL}/api/users/workout/custom-day`;
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

  const saveToDbNow = async (currentExercises) => {
    if (!isExternal) return;
    clearTimeout(saveTimer.current);
    try {
      await fetch(`${API_URL}/api/users/workout-log/${externalWorkoutLogId}/custom-day`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNum: Number(weekNum), dayNum: Number(dayNum), exercises: currentExercises })
      });
      const userId = localStorage.getItem('userId');
      if (userId) await fetchWorkout(userId);
    } catch (err) {
      console.error('Failed to save custom day:', err);
    }
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

  const deleteExercise = (ei) =>
    setExercises(prev => prev.filter((_, i) => i !== ei));

  const applyToAllWeeks = async () => {
    const totalWeeks = isExternal
      ? location.state?.totalWeeks ?? 0
      : (() => { try { return JSON.parse(localStorage.getItem('customWorkout') || '[]').length; } catch { return 0; } })();

    if (totalWeeks <= 1) return;

    const stripped = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s, actual: '', done: false })),
    }));

    if (isExternal) {
      const weekDayCounts = location.state?.weekDayCounts ?? [];
      const requests = [];
      for (let w = 1; w <= totalWeeks; w++) {
        if (w === Number(weekNum)) continue;
        // Only apply to weeks that already have a day at this index
        if ((weekDayCounts[w - 1] ?? 0) < Number(dayNum)) continue;
        requests.push(
          fetch(`${API_URL}/api/users/workout-log/${externalWorkoutLogId}/custom-day`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekNum: w, dayNum: Number(dayNum), exercises: stripped }),
          })
        );
      }
      await Promise.all(requests);
    } else {
      for (let w = 1; w <= totalWeeks; w++) {
        if (w === Number(weekNum)) continue;
        localStorage.setItem(`customDay-week${w}-day${dayNum}`, JSON.stringify(stripped));
      }
    }
  };

  const [applyConfirm, setApplyConfirm] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const cancelApplyBtnRef = useRef(null);
  const closeApplyConfirm = useCallback(() => setApplyConfirm(false), []);
  // Modal a11y: focus trap, Esc to close, return focus on close. Initial
  // focus lands on Cancel (safer default for a destructive overwrite).
  const applyModalRef = useModalA11y({
    isOpen: applyConfirm,
    onClose: closeApplyConfirm,
    initialFocusRef: cancelApplyBtnRef,
  });

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
      <div
        className="workout-summary-bar"
        role="group"
        aria-label="Day progress summary"
      >
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

      {/* Exercise Cards */}
      <div className="exercise-cards">
        {exercises.map((ex, ei) => {
          const isOpen = openCards[ei] ?? true;
          const doneCount = ex.sets.filter(s => s.done).length;
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length;
          const progPct = ex.sets.length > 0 ? Math.round((doneCount / ex.sets.length) * 100) : 0;

          const isDropdownOpen = activeDropdown === ei && ex.name.length > 0;
          const options = isDropdownOpen ? optionsFor(ex.name) : [];
          const listboxId = `cd-listbox-${ei}`;
          const optionId = (idx) => `cd-option-${ei}-${idx}`;
          const activeOptionId = isDropdownOpen && highlightedIndex != null
            ? optionId(highlightedIndex)
            : undefined;
          const headerToggle = () => toggleCard(ei);
          const headerKeyDown = (e) => {
            // Only handle keys dispatched directly to the header — ignore events
            // bubbled up from child elements (the typeahead input, dropdown options,
            // delete button, etc.). Without this guard, Space typed in the search
            // input would preventDefault here and collapse the card instead of
            // typing a space character. Future-proof: any future child elements
            // won't need their own stopPropagation handshake to coexist.
            if (e.target !== e.currentTarget) return;
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              headerToggle();
            }
          };
          const exerciseLabel = ex.name?.trim() || `unnamed exercise ${ei + 1}`;

          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
              {/* Card Header — keyboard-accessible toggle (mirrors existing onClick).
                  Inner controls (input, delete button) stop propagation so they don't
                  trigger the toggle. */}
              <div
                className="ex-card-header"
                onClick={headerToggle}
                onKeyDown={headerKeyDown}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} exercise: ${exerciseLabel}`}
              >
                <div className="ex-card-title-block" style={{ position: 'relative', flex: 1 }}>
                  <label htmlFor={`cd-name-${ei}`} className="sr-only">Exercise name</label>
                  <input
                    id={`cd-name-${ei}`}
                    className="ex-card-name"
                    placeholder="Search exercise..."
                    value={ex.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { updateName(ei, e.target.value); openDropdown(ei, null); }}
                    onFocus={() => openDropdown(ei, null)}
                    onBlur={() => setTimeout(() => closeDropdown(), 150)}
                    onKeyDown={e => handleComboKeyDown(e, ei, ex.name)}
                    role="combobox"
                    aria-label="Exercise name"
                    aria-autocomplete="list"
                    aria-expanded={isDropdownOpen}
                    aria-controls={listboxId}
                    aria-activedescendant={activeOptionId}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontWeight: 700, fontSize: '1em', width: '100%' }}
                  />
                  {isDropdownOpen && (
                    // onMouseDown preventDefault on listbox wrapper — keeps focus on
                    // the input when user clicks the scrollbar or dead space inside
                    // the listbox. Without this, the input's blur fires, the 150ms
                    // timeout in onBlur closes the dropdown, and the user can't drag.
                    // Option selection still works because each option has its own
                    // onMouseDown that fires first via event bubbling order; this
                    // wrapper-level preventDefault then runs on a focus shift that's
                    // already moot (listbox is unmounting). Click-outside closes
                    // still work because clicks outside the wrapper never reach this
                    // handler at all.
                    <div
                      id={listboxId}
                      role="listbox"
                      aria-label="Exercise suggestions"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.preventDefault()}
                      style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--border, #333)', borderRadius: '8px', zIndex: 100, maxHeight: '280px', overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
                    >
                      {options.map((opt, optIdx) => {
                        const highlighted = highlightedIndex === optIdx;
                        if (opt.kind === 'match') {
                          return (
                            <div
                              key={opt.name}
                              id={optionId(optIdx)}
                              role="option"
                              aria-selected={highlighted}
                              onMouseDown={() => { updateName(ei, opt.name); closeDropdown(); }}
                              onMouseEnter={() => setHighlightedIndex(optIdx)}
                              onMouseLeave={() => setHighlightedIndex(null)}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)', borderBottom: '1px solid var(--border, #333)', background: highlighted ? 'var(--surface-hover)' : 'transparent' }}
                            >
                              {opt.name}
                            </div>
                          );
                        }
                        // 'add' kind — no matches; offer to add typed name to custom exercises.
                        return (
                          <div
                            key="__add__"
                            id={optionId(optIdx)}
                            role="option"
                            aria-selected={highlighted}
                            onMouseDown={() => { addToCustomExercises(opt.name); closeDropdown(); }}
                            onMouseEnter={() => setHighlightedIndex(optIdx)}
                            onMouseLeave={() => setHighlightedIndex(null)}
                            style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer', background: highlighted ? 'var(--surface-hover)' : 'transparent' }}
                          >
                            <div style={{ color: '#ff5555', marginBottom: '8px' }}>"{ex.name}" is not in the exercise library</div>
                            <div style={{ display: 'inline-block', padding: '5px 12px', background: 'rgba(250,204,21,0.15)', color: '#facc15', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                              + Add "{ex.name}" to Custom Exercises
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {ex.name.length > 0 && activeDropdown !== ei && !isValidExercise(ex.name) && (
                    <div
                      role="status"
                      aria-live="polite"
                      style={{ fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                    >
                      <span style={{ color: '#ff5555' }}>"{ex.name}" is not in the exercise library</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          addToCustomExercises(ex.name.trim());
                          setExercises(prev => [...prev]);
                        }}
                        style={{ color: '#facc15', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', background: 'transparent', border: 'none', padding: 0, font: 'inherit' }}
                      >
                        + Add to Custom Exercises
                      </button>
                    </div>
                  )}
                </div>
                <div className="ex-card-stats">
                  <div className="stat-chip">
                    <div className="stat-chip-val" aria-hidden="true">{ex.sets.length}</div>
                    <div className="stat-chip-lbl" aria-hidden="true">Sets</div>
                    <span className="sr-only">{ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}</span>
                  </div>
                </div>
                <button
                  className="ex-card-delete"
                  onClick={e => { e.stopPropagation(); deleteExercise(ei); }}
                  onKeyDown={e => e.stopPropagation()}
                  aria-label={`Delete exercise: ${exerciseLabel}`}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', padding: '4px', lineHeight: 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
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
                  <div className="ex-sets-col-header" style={{ gridTemplateColumns: '36px repeat(3, 1fr)' }} aria-hidden="true">
                    <span className="ex-col-lbl">Set</span>
                    <span className="ex-col-lbl">Reps</span>
                    <span className="ex-col-lbl">Target</span>
                    <span className="ex-col-lbl">Actual (lbs)</span>
                  </div>

                  {ex.sets.map((s, si) => {
                    const setLabel = `${exerciseLabel}, set ${si + 1}`;
                    return (
                      <div key={si} className="ex-set-row" style={{ gridTemplateColumns: '36px repeat(3, 1fr)' }}>
                        <div className="set-num" aria-hidden="true">{si + 1}</div>
                        <div className="stepper-wrap" role="group" aria-label={`${setLabel} reps`}>
                          <button
                            type="button"
                            className="stepper-btn stepper-btn--dec"
                            aria-label={`Decrease reps for ${setLabel}`}
                            onClick={() => updateSet(ei, si, { reps: Math.max(0, (Number(s.reps) || 0) - 1) })}
                          ><span aria-hidden="true">−</span></button>
                          <input
                            className="actual-input"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            inputMode="numeric"
                            aria-label={`Reps for ${setLabel}`}
                            value={s.reps ?? ''}
                            onChange={e => updateSet(ei, si, { reps: e.target.value })}
                          />
                          <button
                            type="button"
                            className="stepper-btn stepper-btn--inc"
                            aria-label={`Increase reps for ${setLabel}`}
                            onClick={() => updateSet(ei, si, { reps: (Number(s.reps) || 0) + 1 })}
                          ><span aria-hidden="true">+</span></button>
                        </div>
                        <input
                          className="actual-input"
                          type="number"
                          min="0"
                          step="5"
                          placeholder="0"
                          value={s.target}
                          onChange={e => updateSet(ei, si, { target: e.target.value })}
                          aria-label={`Target weight in pounds for ${setLabel}`}
                          inputMode="numeric"
                        />
                        <input
                          className="actual-input"
                          type="number"
                          min="0"
                          step="5"
                          placeholder="0"
                          value={s.actual}
                          onChange={e => updateSet(ei, si, { actual: e.target.value })}
                          aria-label={`Actual weight in pounds for ${setLabel}`}
                          inputMode="numeric"
                        />
                      </div>
                    );
                  })}

                  {allDone && (
                    <div className="ex-complete-banner" role="status" aria-live="polite">
                      <span aria-hidden="true">✓</span> All sets complete — nice work!
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-back"
                    style={{ marginTop: '10px' }}
                    onClick={() => addSet(ei)}
                    aria-label={`Add a set to ${exerciseLabel}`}
                  >
                    <span aria-hidden="true">+</span> Add Set
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
        <button
          className="btn-back"
          onClick={async () => { if (isExternal) { await saveToDbNow(exercises); navigate(`/view-program/${location.state?.programLogId}`, { state: { isEditing: true } }); } else { navigate('/customWorkout'); } }}
          aria-label="Back to workout"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <button
          type="button"
          className="btn-back"
          onClick={() => setApplyConfirm(true)}
          aria-label={applyDone ? 'Exercises applied to all weeks' : 'Apply this day’s exercises to all other weeks'}
        >
          <span aria-hidden="true">{applyDone ? '✓ Applied!' : 'Apply to All Weeks'}</span>
        </button>
        <button
          className="btn-complete"
          onClick={saveWorkout}
          aria-label={saved ? 'Workout saved' : 'Save workout'}
        >
          <span aria-hidden="true">{saved ? '✓ Saved!' : 'Save Workout'}</span>
        </button>
      </div>

      {/* Polite live region — announces save / apply success without
          requiring focus on the corresponding button. */}
      <div role="status" aria-live="polite" className="sr-only">
        {saved ? 'Workout saved.' : ''}
        {applyDone ? 'Exercises applied to all other weeks.' : ''}
      </div>

      {applyConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={closeApplyConfirm}
        >
          <div
            ref={applyModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cd-apply-title"
            aria-describedby="cd-apply-desc"
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '12px', padding: '28px 32px', maxWidth: '360px', width: '90%', textAlign: 'center' }}
          >
            <h3 id="cd-apply-title" style={{ margin: '0 0 10px', color: 'var(--text)' }}>Apply to All Weeks?</h3>
            <p id="cd-apply-desc" style={{ margin: '0 0 24px', color: 'var(--text-muted, #888)', fontSize: '14px', lineHeight: 1.5 }}>
              The exercises in Day {dayNum} will be copied to every other week, overwriting any existing data for that day.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                ref={cancelApplyBtnRef}
                type="button"
                className="btn-back"
                onClick={closeApplyConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-complete"
                onClick={async () => {
                  await applyToAllWeeks();
                  setApplyConfirm(false);
                  setApplyDone(true);
                  setTimeout(() => setApplyDone(false), 2000);
                }}
              >
                {applyDone ? '✓ Applied!' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomDay;

