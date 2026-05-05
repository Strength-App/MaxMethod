import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_EXERCISES } from './exerciseLibrary';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import ContextMenu from '../components/ContextMenu';

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
    <div className="rest-timer" role="timer" aria-label={`Rest timer: ${mins} minutes ${secs} seconds remaining`}>
      <div className="rest-timer-label" aria-hidden="true">Rest Timer</div>
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
    fetch(`${API_URL}/api/users/${userId}/custom-exercises`, {
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
  // a11y: tracks the option highlighted by keyboard or hover within the open
  // listbox. Drives aria-activedescendant. Reset to null whenever the dropdown
  // closes or the typed query changes — see openDropdown / closeDropdown below.
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const { personalBests, refreshPersonalBests } = useWorkout();
  const userId = localStorage.getItem('userId');
  const defaultTitle = `Quick Workout · ${new Date().toLocaleDateString()}`;
  const [postWorkoutData, setPostWorkoutData] = useState(null);
  const [sessionPRs, setSessionPRs] = useState([]);
  const [timerState, setTimerState] = useState(null); // { cardKey, id }

  // ── Right-click / long-press menu state ─────────────────────────────────
  // Logger only offers "View in Exercise Library" (ad-hoc rows have no slot
  // template to swap from). Same long-press / right-click discipline as
  // day.jsx — see day.jsx for shared rationale.
  const [contextMenu, setContextMenu] = useState(null); // { x, y, ei, exerciseName }
  const cardHeaderRefs = useRef(new Map());
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const menuReturnFocusRef = useRef(null);

  // Combined options for the autocomplete listbox: matches OR (when none and
  // the user typed something) a single "+ Add to Custom Exercises" affordance.
  const optionsFor = useCallback((name) => {
    if (!name) return [];
    const q = name.toLowerCase();
    const matches = getAllExerciseNames()
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 8);
    if (matches.length > 0) return matches.map(n => ({ kind: 'match', name: n }));
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

  // WAI-ARIA combobox keydown handler. Empty-options guard: if optionsFor
  // returns [] (i.e. ex.name is empty), Arrow/Enter no-op so we never point
  // aria-activedescendant at a non-existent id.
  const handleComboKeyDown = useCallback((e, ei, name) => {
    const opts = optionsFor(name);
    const open = activeDropdown === ei;

    switch (e.key) {
      case 'ArrowDown': {
        if (opts.length === 0) return;
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
        if (open) closeDropdown();
        return;
      }
      default:
        return;
    }
  }, [activeDropdown, highlightedIndex, optionsFor, openDropdown, closeDropdown]);

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
      await fetch(`${API_URL}/api/users/quick-sessions`, {
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

  // ── Right-click / long-press menu handlers ──────────────────────────────
  const openContextMenu = (ei, exerciseName, x, y) => {
    if (!exerciseName) return; // empty input — nothing to look up
    menuReturnFocusRef.current = cardHeaderRefs.current.get(ei) ?? null;
    setContextMenu({ x, y, ei, exerciseName });
  };

  const handleViewInLibrary = (exerciseName) => {
    setContextMenu(null);
    navigate('/exerciseLibrary', { state: { focusExercise: exerciseName } });
  };

  // Same factory shape as day.jsx — see there for shared rationale.
  const makeRowMenuHandlers = (ei, exerciseName) => ({
    ref: (el) => {
      if (el) cardHeaderRefs.current.set(ei, el);
      else cardHeaderRefs.current.delete(ei);
    },
    onContextMenu: (e) => {
      // Preserve native text-editing context menu on inputs (copy/paste/etc.).
      if (e.target.closest('input, textarea')) return;
      if (!exerciseName) return;
      e.preventDefault();
      longPressFiredRef.current = false;
      openContextMenu(ei, exerciseName, e.clientX, e.clientY);
    },
    onPointerDown: () => { longPressFiredRef.current = false; },
    onTouchStart: (e) => {
      if (e.target.closest('input, textarea')) return;
      if (!exerciseName) return;
      const t = e.touches[0];
      const cx = t.clientX, cy = t.clientY;
      longPressFiredRef.current = false;
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        openContextMenu(ei, exerciseName, cx, cy);
      }, 500);
    },
    onTouchEnd: () => clearTimeout(longPressTimerRef.current),
    onTouchMove: () => clearTimeout(longPressTimerRef.current),
    onTouchCancel: () => clearTimeout(longPressTimerRef.current),
  });

  // Suppress the synthetic click iOS dispatches after a long-press fires.
  const wrapLongPressClick = (originalOnClick) => (e) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      e.preventDefault();
      return;
    }
    originalOnClick(e);
  };

  const menuItems = !contextMenu ? [] : [
    {
      label: 'View in Exercise Library',
      onSelect: () => handleViewInLibrary(contextMenu.exerciseName),
    },
  ];

  const TOUCH_NO_CALLOUT_STYLE = { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' };

  return (
    <div className="day-page">
      <div className="day-header">
        <div className="day-header-meta">
          <label htmlFor="logger-title" className="sr-only">Workout title</label>
          <input
            id="logger-title"
            className="logger-title-input"
            placeholder={defaultTitle}
            value={title}
            onChange={e => setTitle(e.target.value)}
            aria-label="Workout title"
          />
        </div>
      </div>

      {(() => {
        const setsDone = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.done).length, 0);
        const setsTotal = exercises.reduce((t, ex) => t + ex.sets.length, 0);
        return (
          <div className="workout-summary-bar" role="group" aria-label="Quick session progress summary">
            <div className="summary-pill">
              <div className="summary-pill-val" aria-hidden="true">{setsDone}</div>
              <div className="summary-pill-lbl" aria-hidden="true">Sets Done</div>
              <span className="sr-only">{setsDone} sets done</span>
            </div>
            <div className="summary-pill">
              <div className="summary-pill-val summary-pill-val--accent" aria-hidden="true">{setsTotal}</div>
              <div className="summary-pill-lbl" aria-hidden="true">Total Sets</div>
              <span className="sr-only">{setsTotal} total sets</span>
            </div>
          </div>
        );
      })()}

      <div className="exercise-cards">
        {exercises.length === 0 && (
          <div className="logger-empty-hint" role="status">Add your first exercise to start logging.</div>
        )}

        {exercises.map((ex, ei) => {
          const isOpen = openCards[ei] ?? true;
          const doneCount = ex.sets.filter(s => s.done).length;
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length;
          const progPct = ex.sets.length > 0 ? Math.round((doneCount / ex.sets.length) * 100) : 0;

          const isDropdownOpen = activeDropdown === ei && ex.name.length > 0;
          const options = isDropdownOpen ? optionsFor(ex.name) : [];
          const listboxId = `lg-listbox-${ei}`;
          const optionId = (idx) => `lg-option-${ei}-${idx}`;
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

          const rowMenuHandlers = makeRowMenuHandlers(ei, ex.name?.trim() || '');
          return (
            <div key={ei} className={`ex-card${isOpen ? ' ex-card--open' : ''}${allDone ? ' ex-card--done' : ''}`}>
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
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${exerciseLabel} card, ${doneCount} of ${ex.sets.length} sets done`}
                style={TOUCH_NO_CALLOUT_STYLE}
              >
                <div className="ex-card-title-block" style={{ position: 'relative', flex: 1 }}>
                  <label htmlFor={`lg-name-${ei}`} className="sr-only">Exercise name</label>
                  <input
                    id={`lg-name-${ei}`}
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
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: '1em', width: '100%' }}
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

              <div className="ex-progress-bar">
                <div className={`ex-progress-fill${allDone ? ' ex-progress-fill--full' : ''}`} style={{ width: `${progPct}%` }} />
              </div>

              {isOpen && (
                <div className="ex-sets-panel">
                  {/* Per-cell aria-labels below provide richer context than
                      generic column heads — hide the visual row from AT to
                      avoid duplicate "Set Set Reps Reps" announcements. */}
                  <div className="ex-sets-col-header" style={{ gridTemplateColumns: '36px 1fr 1fr 44px' }} aria-hidden="true">
                    <span className="ex-col-lbl">Set</span>
                    <span className="ex-col-lbl">Reps</span>
                    <span className="ex-col-lbl">Weight (lbs)</span>
                    <span className="ex-col-lbl">Done</span>
                  </div>

                  {ex.sets.map((s, si) => {
                    const setLabel = `${exerciseLabel}, set ${si + 1}`;
                    return (
                      <div key={si} className="ex-set-row" style={{ gridTemplateColumns: '36px 1fr 1fr 44px' }} role="group" aria-label={setLabel}>
                        <div className="set-num" aria-hidden="true">{si + 1}</div>

                        <div className="actual-input" role="group" aria-label={`Reps for ${setLabel}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => updateSet(ei, si, { reps: Math.max(0, (Number(s.reps) || 0) - 1) })}
                            aria-label={`Decrease reps for ${setLabel}`}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                          ><span aria-hidden="true">−</span></button>
                          <span style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text)' }} aria-live="off">{s.reps || 0}</span>
                          <button
                            type="button"
                            onClick={() => updateSet(ei, si, { reps: (Number(s.reps) || 0) + 1 })}
                            aria-label={`Increase reps for ${setLabel}`}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                          ><span aria-hidden="true">+</span></button>
                        </div>

                        <input
                          className="actual-input"
                          type="number"
                          min="0"
                          step="5"
                          placeholder="0"
                          inputMode="numeric"
                          aria-label={`Weight in pounds for ${setLabel}`}
                          value={s.weight}
                          onChange={e => updateSet(ei, si, { weight: e.target.value })}
                        />

                        <button
                          type="button"
                          className={`check-btn${s.done ? ' check-btn--checked' : ''}`}
                          aria-label={`Mark ${setLabel} ${s.done ? 'incomplete' : 'complete'}`}
                          aria-pressed={s.done}
                          onClick={() => {
                            const markingDone = !s.done;
                            updateSet(ei, si, { done: markingDone });
                            if (markingDone) {
                              if (s.weight && ex.name) {
                                recordPRIfBeaten(ex.name, s.weight, s.reps);
                                fetch(`${API_URL}/api/users/workout/pb-check`, {
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
                        >
                          <span aria-hidden="true">{s.done ? '✓' : ''}</span>
                        </button>
                      </div>
                    );
                  })}

                  {timerState?.cardKey === `ex-${ei}` && (
                    <RestTimer
                      key={timerState.id}
                      initialSeconds={getRestSeconds(ex.name)}
                      onSkip={() => setTimerState(null)}
                    />
                  )}

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

        <button type="button" className="btn-complete" onClick={addExercise}>
          Add Exercise
        </button>
      </div>

      {/* Post-workout modal — backdrop click closes; Esc + focus-trap need
          useModalA11y wiring (functional change) and are deferred as follow-up. */}
      {postWorkoutData && (
        <div className="post-workout-overlay" onClick={() => { setPostWorkoutData(null); saveAndExit(); }}>
          <div
            className="post-workout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lg-post-workout-title"
            aria-describedby="lg-post-workout-subtitle"
            onClick={e => e.stopPropagation()}
          >
            <div className="post-workout-handle" aria-hidden="true" />
            <div className="post-workout-header">
              <div className="post-workout-title" id="lg-post-workout-title">Workout Complete</div>
              <div className="post-workout-subtitle" id="lg-post-workout-subtitle">{title.trim() || defaultTitle}</div>
            </div>
            <div className="post-workout-stats-row" role="group" aria-label="Workout totals">
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val" aria-hidden="true">
                  {postWorkoutData.totalVolume > 0 ? postWorkoutData.totalVolume.toLocaleString() : '—'}
                </div>
                <div className="post-workout-volume-lbl" aria-hidden="true">Total Volume (lbs)</div>
                <span className="sr-only">Total volume: {postWorkoutData.totalVolume > 0 ? `${postWorkoutData.totalVolume.toLocaleString()} pounds` : 'none recorded'}</span>
              </div>
              <div className="post-workout-volume-block">
                <div className="post-workout-volume-val" aria-hidden="true">{postWorkoutData.totalSets ?? '—'}</div>
                <div className="post-workout-volume-lbl" aria-hidden="true">Total Sets</div>
                <span className="sr-only">Total sets: {postWorkoutData.totalSets ?? 'none recorded'}</span>
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
            <button
              className="post-workout-btn"
              onClick={saveAndExit}
              disabled={finishing}
              aria-busy={finishing || undefined}
              aria-label={finishing ? 'Saving session' : 'Done — save session'}
            >
              {finishing ? 'Saving…' : 'Done'}
            </button>
          </div>
        </div>
      )}

      <div className="day-footer">
        <button className="btn-back" onClick={() => navigate('/home')} aria-label="Discard session and return home">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><polyline points="15 18 9 12 15 6"/></svg>
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

export default Logger;

