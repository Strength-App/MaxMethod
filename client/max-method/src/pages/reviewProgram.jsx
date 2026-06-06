import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import EquipmentSelect from '../components/EquipmentSelect';
import {
  EXERCISE_EQUIPMENT,
  MOVEMENT_PATTERNS as CANONICAL_MOVEMENT_PATTERNS,
} from '../config/exercises';

// Swap alternatives for the "Squat Pattern" slot.
//
// reviewProgram resolves alternatives by looking up the raw exercise name
// straight from the program data; unlike exerciseLibrary.jsx, it does NOT
// normalize names through an alias map first. So its squat swap list has to
// include the alias spellings 'Squats' and 'Back Squat'. The canonical map
// in config/exercises.js omits those on purpose, because exerciseLibrary
// iterates that map to build one library card per name and the aliases would
// show up as duplicate cards. We overlay the two aliases back on here so the
// swap list a user sees is unchanged from before this page consumed the
// shared config. The aliases' position in the list is not load-bearing.
// See docs/follow-ups.md#reviewprogram-movement-patterns-alias-strategy.
const MOVEMENT_PATTERNS = {
  ...CANONICAL_MOVEMENT_PATTERNS,
  'Squat Pattern': [
    ...CANONICAL_MOVEMENT_PATTERNS['Squat Pattern'],
    'Squats',
    'Back Squat',
  ],
};

// One exercise row inside a circuit. Shows the exercise (or a "Rest"
// placeholder) and, for non-rest moves that have alternatives, a Swap control
// that opens an equipment-aware picker. A pick here swaps just this one
// exercise within the circuit.
function CircuitExRow({ ex, exIdx, slotIdx, dayIdx, onSwap }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(ex.exercise ?? ex.fixed ?? ex.label);
  const isRest = ex.pattern == null && ex.fixed == null && ex.label === 'Rest';
  const dropdownId = `rp-circ-dd-${dayIdx}-${slotIdx}-${exIdx}`;

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

  const handleSelect = (val) => {
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
                aria-expanded={open}
                aria-controls={dropdownId}
                aria-label={open ? `Cancel swap for ${displayName}` : `Swap ${displayName} for an alternative`}
              >
                {open ? 'Cancel' : 'Swap'}
              </button>
            )}
          </div>
        )}
      </div>
      {open && (
        <div className="rp-swap-dropdown" id={dropdownId}>
          <EquipmentSelect
            id={`${dropdownId}-select`}
            value={selected}
            options={alternatives}
            equipment={EXERCISE_EQUIPMENT}
            onChange={handleSelect}
            ariaLabel={`Replacement for ${displayName}`}
          />
          <span className="rp-swap-hint">Pick a replacement — applied across all weeks</span>
        </div>
      )}
    </div>
  );
}

// A circuit block: a labeled header (name · type · total time) followed by
// its exercise rows.
function CircuitGroup({ slot, dayIdx, onSwap }) {
  const parts = [slot.label];
  if (slot.circuitType) parts.push(slot.circuitType);
  if (slot.totalTime) parts.push(slot.totalTime);
  const headerText = parts.join(' · ');

  return (
    <div className="rp-circuit-group" role="group" aria-label={`Circuit: ${headerText}`}>
      <div className="rp-circuit-header" aria-hidden="true">{headerText}</div>
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

// One ordinary (non-circuit) exercise row. `slot` is a *deduplicated* slot:
// it carries `slotIdxs: number[]` (every original slot that shared this
// exercise) instead of a single `slotIdx`, so a swap here applies to all of
// them at once. Shows the exercise name, its movement-pattern tag, an
// equipment pill, and a Swap control that opens the alternatives picker.
function SlotRow({ slot, dayIdx, onSwap }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(slot.exercise);
  const isFixed = !!slot.fixed;
  const dropdownId = `rp-slot-dd-${dayIdx}-${slot.slotIdxs.join('_')}`;

  // Work out the list of swap alternatives for this exercise. Try the
  // movement-pattern label first; if that misses, scan every pattern for one
  // that already contains this exercise; as a last resort (for fixed exercises
  // whose label is the exercise name rather than a pattern name) scan the
  // patterns for the label instead.
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

  const handleSelect = (val) => {
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
              aria-expanded={open}
              aria-controls={dropdownId}
              aria-label={open ? `Cancel swap for ${slot.exercise}` : `Swap ${slot.exercise} for an alternative`}
            >
              {open ? 'Cancel' : 'Swap'}
            </button>
          ) : null}
        </div>
      </div>
      {open && (
        <div className="rp-swap-dropdown" id={dropdownId}>
          <EquipmentSelect
            id={`${dropdownId}-select`}
            value={selected}
            options={alternatives}
            equipment={EXERCISE_EQUIPMENT}
            onChange={handleSelect}
            ariaLabel={`Replacement for ${slot.exercise}`}
          />
          <span className="rp-swap-hint">Pick a replacement — applied across all weeks</span>
        </div>
      )}
    </div>
  );
}

/**
 * ReviewProgram — the "Review Your Program" screen.
 *
 * Shown right after a new program is generated and before it becomes the
 * user's active program. It lists the days of week 1 and the exercises in
 * each, and lets the user trade any non-fixed exercise for an
 * equipment-appropriate alternative (for example, swapping a barbell movement
 * for a dumbbell one). A swap chosen here is applied to that exercise across
 * every week of the program. The core lifts ("fixed" exercises) can't be
 * changed.
 *
 * The program to review is handed in through the router's navigation state
 * (location.state), not fetched here:
 *   - workoutLogId   — which saved program to finalize (used in the save call).
 *   - weeks          — the generated weeks; only week 1's days are displayed.
 *   - userId         — whose program it is (used to refresh after finalizing).
 *   - classification — the user's strength tier, shown as a banner (optional).
 * If workoutLogId or weeks are missing (e.g. the page was opened directly
 * without going through generation) the user is sent back home rather than
 * shown an empty screen.
 *
 * Pressing "Finalize & Start Program" saves every pending swap to the backend,
 * refreshes the now-active workout, and returns the user to the home screen.
 *
 * @returns {JSX.Element|null} The review screen, or null while redirecting home.
 */
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

  // Record a chosen replacement and reflect it immediately in the on-screen
  // days. Swaps are tracked separately in `swaps`, keyed by day+slot (plus the
  // position inside a circuit, when relevant), so finalizing can replay each
  // one to the backend. A deduplicated row passes all of its slotIdxs, so a
  // single pick updates every slot that shared the exercise.
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

  // Persist every pending swap (one request per slot), refresh the active
  // workout, and go home. On any failure, stay on the page and let the user
  // retry rather than leaving them in a half-saved state.
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
        return fetch(`${API_URL}/api/users/workout-log/${workoutLogId}/swap-exercise-all-weeks`, {
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
          <div className="rp-classification-banner" role="group" aria-label="Strength classification">
            <span className="rp-classification-label" aria-hidden="true">Strength Classification</span>
            <span className="rp-classification-value">{classification}</span>
          </div>
        )}
      </div>

      <div className="rp-week-label" id="rp-overview-label">Exercise Overview</div>

      <div className="rp-days-grid" role="list" aria-labelledby="rp-overview-label">
        {processedDays.filter(d => d?.title != null).map((day, di) => (
          <section
            key={di}
            className="rp-day-card"
            role="listitem"
            aria-labelledby={`rp-day-${di}-title`}
          >
            <div className="rp-day-title" id={`rp-day-${di}-title`}>{day.title}</div>
            <div className="rp-slots-list">
              {(day.uniqueSlots ?? []).map((slot, si) =>
                slot.isCircuit ? (
                  <CircuitGroup key={si} slot={slot} dayIdx={di} onSwap={handleSwap} />
                ) : (
                  <SlotRow key={si} slot={slot} dayIdx={di} onSwap={handleSwap} />
                )
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="rp-footer">
        <div className="rp-footer-left">
          <div className="rp-footer-status" role="status" aria-live="polite">
            <span
              className={`rp-footer-dot${swapCount > 0 ? ' rp-footer-dot--changed' : ''}`}
              aria-hidden="true"
            />
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
          aria-busy={saving || undefined}
          aria-label={saving ? 'Saving program' : 'Finalize and start this program (replaces any currently active program)'}
        >
          {saving ? (
            <>
              <span className="rp-finalize-spinner" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              Finalize & Start Program
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
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

