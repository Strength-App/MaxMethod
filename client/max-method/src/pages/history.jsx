import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { API_URL } from '../config/api';
import { useModalA11y } from '../hooks/useModalA11y';
import { useWorkoutStats } from '../hooks/useWorkoutStats';
import Toast from '../components/Toast';
import { ALL_EXERCISES } from './exerciseLibrary';

function resolveWeekValue(value, wi) {
  if (Array.isArray(value)) return value[wi] ?? null;
  return value ?? null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function typeFromTitle(title = '') {
  const t = title.toLowerCase();
  if (t.includes('push'))  return { type: 'push',  color: '#f97316' };
  if (t.includes('pull'))  return { type: 'pull',  color: '#38bdf8' };
  if (t.includes('leg'))   return { type: 'legs',  color: '#4ade80' };
  if (t.includes('arm'))   return { type: 'arms',  color: '#e879f9' };
  if (t.includes('upper')) return { type: 'upper', color: '#60a5fa' };
  if (t.includes('lower')) return { type: 'lower', color: '#4ade80' };
  if (t.includes('core'))  return { type: 'core',  color: '#c084fc' };
  return { type: 'full', color: '#cc0404' };
}

function dateKey(d) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

// ISO 8601 (YYYY-MM-DD) for <time dateTime>. Always pads to 4-2-2.
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Capitalized type label for screen readers — derived from typeFromTitle's
// `type` field so a11y labels follow the visible filter logic (single source
// of truth, per F3-A).
function typeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Standard trash glyph — inline SVG mirroring the path used in
// logger.jsx:534 / customWorkout.jsx. Keeps icon style consistent across
// the app without an icon library.
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// Custom-exercise helpers duplicated from logger.jsx per the project's
// "extract on third consumer" pattern. If a third place needs custom
// exercises, extract to src/utils/customExercises.js and have all three
// consumers import from there. ALL_EXERCISE_NAMES is computed once at
// module load (vs per-call) — small perf win for typeahead.
const ALL_EXERCISE_NAMES = [...new Set(ALL_EXERCISES.map(e => e.name))];
const getCustomExerciseNames = () => {
  try { return JSON.parse(localStorage.getItem('customExercises') || '[]'); }
  catch { return []; }
};
const getAllExerciseNames = () => [...ALL_EXERCISE_NAMES, ...getCustomExerciseNames()];
const addToCustomExercises = (name) => {
  const existing = getCustomExerciseNames();
  if (existing.some(n => n.toLowerCase() === name.toLowerCase())) return;
  localStorage.setItem('customExercises', JSON.stringify([...existing, name]));
  // Best-effort backend sync. .catch swallowed: localStorage is the
  // source-of-truth for current-device UX; sync failure means it won't
  // appear on other devices. Same trade-off as logger.jsx.
  const userId = localStorage.getItem('userId');
  if (userId) {
    fetch(`${API_URL}/api/users/${userId}/custom-exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }
};

// Frontend mirror of backend parsePresReps (userRoutes.js). Defaults a new
// set's reps from the slot's prescription; first-number-found-or-zero.
function parsePresRepsClient(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const str = String(value).trim();
  if (!str) return 0;
  if (/^\d+:\d+/.test(str)) return 0; // time format — cardio handled separately
  const m = str.match(/\d+/);
  return m ? Number(m[0]) : 0;
}

// Extract per-set values from a draft slot for a given key. Used by both
// adds (to compute backend-default vs user-edit overrides post-POST) and
// edits (cell diff). Returns the body fields the backend expects.
function extractSetValues(slot, key, isCardio, isQuick) {
  if (isCardio) {
    return {
      cardioTime: slot.cardioTimes?.[key] ?? '',
      cardioIntensity: slot.cardioIntensities?.[key] ?? '',
      cardioDistance: slot.cardioDistances?.[key] ?? '',
    };
  }
  if (isQuick) {
    return {
      reps: slot.actualReps?.[key] ?? 0,
      weight: Number(slot.actualWeights?.[key] ?? 0),
    };
  }
  return {
    actualReps: slot.actualReps?.[key] ?? 0,
    actualWeight: Number(slot.actualWeights?.[key] ?? 0),
  };
}

// Diff one set cell (existing slot, existing set) against original. Returns
// an edit cell or null. Mirror of the inner-loop logic from Pass A's
// diffCells, scoped to a single (slot, set).
function diffSetCell(o, d, key, isCardio, isQuick) {
  const before = {};
  const after = {};

  if (isCardio) {
    if ((o.cardioTimes?.[key] ?? '') !== (d.cardioTimes?.[key] ?? '')) {
      before.cardioTime = o.cardioTimes?.[key] ?? '';
      after.cardioTime = d.cardioTimes?.[key] ?? '';
    }
    if ((o.cardioIntensities?.[key] ?? '') !== (d.cardioIntensities?.[key] ?? '')) {
      before.cardioIntensity = o.cardioIntensities?.[key] ?? '';
      after.cardioIntensity = d.cardioIntensities?.[key] ?? '';
    }
    if ((o.cardioDistances?.[key] ?? '') !== (d.cardioDistances?.[key] ?? '')) {
      before.cardioDistance = o.cardioDistances?.[key] ?? '';
      after.cardioDistance = d.cardioDistances?.[key] ?? '';
    }
  } else {
    const oR = o.actualReps?.[key];
    const dR = d.actualReps?.[key];
    if (String(oR ?? '') !== String(dR ?? '')) {
      if (isQuick) { before.reps = oR ?? 0; after.reps = dR ?? 0; }
      else { before.actualReps = oR ?? 0; after.actualReps = dR ?? 0; }
    }
    const oW = Number(o.actualWeights?.[key] ?? 0);
    const dW = Number(d.actualWeights?.[key] ?? 0);
    if (oW !== dW) {
      if (isQuick) { before.weight = oW; after.weight = dW; }
      else { before.actualWeight = oW; after.actualWeight = dW; }
    }
  }

  if (Object.keys(after).length === 0) return null;
  return {
    kind: 'set',
    slotIdx: o.slotIdx,
    exerciseIdx: o.exerciseIdx ?? null,
    setIdx: Number(key),
    before,
    after,
  };
}

// Compute the override fields needed after a set/slot POST. Backend writes
// known defaults (reps from prescription, weight 0, cardio fields ''); if
// the user pre-edited those values, return only the differing fields. The
// '' vs undefined comparison is normalized via `?? ''` to avoid emitting
// no-op PATCHes for cardio sets the user didn't touch.
function computePostOverrides(values, isCardio, isQuick, defaultReps) {
  const overrides = {};
  if (isCardio) {
    if ((values.cardioTime ?? '') !== '') overrides.cardioTime = values.cardioTime;
    if ((values.cardioIntensity ?? '') !== '') overrides.cardioIntensity = values.cardioIntensity;
    if ((values.cardioDistance ?? '') !== '') overrides.cardioDistance = values.cardioDistance;
    return overrides;
  }
  if (isQuick) {
    // Quick-session backend default: reps 0, weight 0
    if ((values.reps ?? 0) !== 0) overrides.reps = values.reps;
    if ((values.weight ?? 0) !== 0) overrides.weight = values.weight;
    return overrides;
  }
  // Program backend default: reps = parsePresReps(slot.reps[wi]), weight 0
  if ((values.actualReps ?? 0) !== defaultReps) overrides.actualReps = values.actualReps;
  if ((values.actualWeight ?? 0) !== 0) overrides.actualWeight = values.actualWeight;
  return overrides;
}

// Diff editDraft vs originalSlots. Replaces Pass A's diffCells. Returns
// three buckets: deletes (set + slot), adds (set + slot), edits. Save
// handler dispatches each bucket in its own phase.
function diffOps(orig, draft, isQuick) {
  const deletes = { sets: [], slots: [] };
  const adds = { sets: [], slots: [] };
  const edits = [];

  for (let si = 0; si < draft.length; si++) {
    const d = draft[si];

    if (d._pending === 'remove') {
      // Slot removal — skip everything inside.
      deletes.slots.push({
        slotIdx: d.slotIdx,
        exerciseIdx: si,
        exerciseName: d.exercise,
      });
      continue;
    }

    const isAddedSlot = d._pending === 'add';
    const o = isAddedSlot ? null : orig[si];
    const isCardio = (o ?? d).label === 'Cardio';

    if (isAddedSlot) {
      adds.slots.push({
        slotSentinel: d.slotIdx,
        exerciseName: d.exercise,
        // Default set ("0") is created server-side; user-edit overrides on
        // that set feed Phase 4 PATCH after we know the real slotIdx.
        defaultSetValues: extractSetValues(d, '0', isCardio, isQuick),
      });
    } else {
      // Set-level removes — only valid on existing slots. Pending-add sets
      // get spliced from local state on trash; they don't reach this branch.
      for (const k of Object.keys(d._setRemovals ?? {})) {
        deletes.sets.push({
          slotIdx: d.slotIdx,
          exerciseIdx: si,
          setIdx: Number(k),
        });
      }
    }

    // Walk surviving set keys.
    for (const k of Object.keys(d.completedSets ?? {})) {
      if (d._setRemovals?.[k]) continue;
      const isAddedSet = String(k).startsWith('_new:');

      if (isAddedSet) {
        adds.sets.push({
          slotSentinel: isAddedSlot ? d.slotIdx : null,
          slotIdx: isAddedSlot ? null : d.slotIdx,
          exerciseIdx: si,
          setSentinel: k,
          values: extractSetValues(d, k, isCardio, isQuick),
        });
        continue;
      }

      // Existing set in existing slot — diff vs original.
      if (isAddedSlot) continue; // shouldn't happen — added slots can't have existing keys
      const editCell = diffSetCell(o, d, k, isCardio, isQuick);
      if (editCell) {
        editCell.exerciseIdx = si;
        edits.push(editCell);
      }
    }

    // Slot-level notes (program sessions only, existing slots only).
    if (!isQuick && !isAddedSlot && (o.notes ?? '') !== (d.notes ?? '')) {
      edits.push({
        kind: 'notes',
        slotIdx: d.slotIdx,
        before: { notes: o.notes ?? '' },
        after: { notes: d.notes ?? '' },
      });
    }
  }

  return { deletes, adds, edits };
}

// URL builders for the structural-edit endpoints (Pass C backend Layer 2).
const setUrl = (ref) => ref.isQuick
  ? `${API_URL}/api/users/quick-sessions/${ref.quickSessionId}/log/set`
  : `${API_URL}/api/users/workout-log/${ref.workoutLogId}/log/set`;
const slotUrl = (ref) => ref.isQuick
  ? `${API_URL}/api/users/quick-sessions/${ref.quickSessionId}/log/exercise`
  : `${API_URL}/api/users/workout-log/${ref.workoutLogId}/log/exercise`;
const editUrl = (ref) => ref.isQuick
  ? `${API_URL}/api/users/quick-sessions/${ref.quickSessionId}/log`
  : `${API_URL}/api/users/workout-log/${ref.workoutLogId}/log`;

const programIdxFields = (ref) => ({
  weekNum: (ref.weekIndex ?? 0) + 1,
  dayNum: (ref.dayIdx ?? 0) + 1,
});

// Body builders mirror endpoint contracts.
function buildSetDeleteBody(ref, d, userId) {
  if (ref.isQuick) return { userId, exerciseIdx: d.exerciseIdx, setIdx: d.setIdx };
  return { userId, ...programIdxFields(ref), slotIdx: d.slotIdx, setIdx: d.setIdx };
}
function buildSlotDeleteBody(ref, d, userId) {
  if (ref.isQuick) return { userId, exerciseIdx: d.exerciseIdx };
  return { userId, ...programIdxFields(ref), slotIdx: d.slotIdx };
}
function buildSlotPostBody(ref, a, userId) {
  if (ref.isQuick) return { userId, exerciseName: a.exerciseName };
  return { userId, ...programIdxFields(ref), exerciseName: a.exerciseName };
}
function buildSetPostBody(ref, a, realSlotIdx, userId) {
  if (ref.isQuick) return { userId, exerciseIdx: realSlotIdx };
  return { userId, ...programIdxFields(ref), slotIdx: realSlotIdx };
}
function buildEditPatchBody(ref, cell, userId) {
  if (ref.isQuick) {
    return { userId, exerciseIdx: cell.exerciseIdx, setIdx: cell.setIdx ?? 0, ...cell.after };
  }
  return {
    userId, ...programIdxFields(ref),
    slotIdx: cell.slotIdx, setIdx: cell.setIdx ?? 0, ...cell.after,
  };
}

// fetch wrapper returning normalized { ok, data }.
async function jsonFetch(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, data };
}

// Add Exercise typeahead — inline copy of logger.jsx's text-input combobox
// pattern. Self-contained state (query, highlightedIndex, dropdownOpen).
// WAI-ARIA Authoring Practices distinguish text-input combobox (Space is
// text entry) from button-trigger combobox (Space is select-action). This
// is text-input — see the keyDown handler comment about Space.
function AddExerciseTypeahead({ onSelect, onCancel, autoFocus }) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const listboxId = 'hist-add-ex-listbox';
  const optionId = (idx) => `hist-add-ex-option-${idx}`;

  // Mount: focus the input. autoFocus read on mount only — re-running on
  // prop change would steal focus during normal interaction.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    return () => clearTimeout(closeTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    const matches = getAllExerciseNames()
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 8);
    if (matches.length > 0) return matches.map(n => ({ kind: 'match', name: n }));
    return [{ kind: 'add', name: query.trim() }];
  }, [query]);

  const activeDescendant =
    dropdownOpen && highlightedIndex != null ? optionId(highlightedIndex) : undefined;

  const commit = (opt) => {
    if (!opt) return;
    if (opt.kind === 'add') addToCustomExercises(opt.name);
    onSelect(opt.name);
  };

  // WAI-ARIA text-input combobox keyboard handling. Mirrors logger.jsx.
  // Space is intentionally NOT handled — text-input combobox per WAI-ARIA,
  // Space is text entry. Diverges from EquipmentSelect's button-trigger
  // combobox where Space-to-select is correct. Do not "fix" for consistency.
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown': {
        if (options.length === 0) return;
        e.preventDefault();
        if (!dropdownOpen) { setDropdownOpen(true); setHighlightedIndex(0); return; }
        setHighlightedIndex(prev => prev == null ? 0 : (prev + 1) % options.length);
        return;
      }
      case 'ArrowUp': {
        if (options.length === 0) return;
        e.preventDefault();
        if (!dropdownOpen) { setDropdownOpen(true); setHighlightedIndex(options.length - 1); return; }
        setHighlightedIndex(prev => prev == null ? options.length - 1 : (prev - 1 + options.length) % options.length);
        return;
      }
      case 'Home': {
        if (!dropdownOpen || options.length === 0) return;
        e.preventDefault();
        setHighlightedIndex(0);
        return;
      }
      case 'End': {
        if (!dropdownOpen || options.length === 0) return;
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        return;
      }
      case 'Enter': {
        if (!dropdownOpen || options.length === 0 || highlightedIndex == null) return;
        e.preventDefault();
        commit(options[highlightedIndex]);
        return;
      }
      case 'Escape': {
        e.preventDefault();
        if (dropdownOpen) setDropdownOpen(false);
        else onCancel();
        return;
      }
      case 'Tab': {
        if (dropdownOpen) setDropdownOpen(false);
        return;
      }
      default:
        return;
    }
  };

  return (
    <div className="hist-edit-typeahead">
      <input
        ref={inputRef}
        type="text"
        className="hist-edit-typeahead-input"
        placeholder="Search exercise…"
        value={query}
        onChange={e => { setQuery(e.target.value); setDropdownOpen(true); setHighlightedIndex(null); }}
        onFocus={() => { if (query) setDropdownOpen(true); }}
        onBlur={() => {
          // 150ms delay so option onMouseDown (which fires before blur) gets
          // a chance to commit before dropdown unmounts. Same value as
          // logger.jsx — copying preserves the tuning.
          closeTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-label="Search for an exercise to add"
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
      />
      <button
        type="button"
        className="hist-edit-typeahead-cancel"
        onClick={onCancel}
        aria-label="Cancel adding exercise"
      >
        <span aria-hidden="true">×</span>
      </button>
      {dropdownOpen && options.length > 0 && (
        // WAI-ARIA combobox-with-listbox-popup: the listbox and options
        // intentionally aren't tab-focusable. Keyboard focus stays on the
        // input; aria-activedescendant points to the active option, and the
        // input's keyDown handler drives navigation. eslint's
        // jsx-a11y/interactive-supports-focus rule doesn't recognize this
        // valid pattern — suppress on the listbox + options.
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus
        <div
          id={listboxId}
          role="listbox"
          aria-label="Exercise suggestions"
          className="hist-edit-typeahead-listbox"
          // Keep input focus on scrollbar / dead-space drag — without this,
          // input blur fires, 150ms timer closes the dropdown mid-drag.
          // Selection still works because option onMouseDown fires first.
          onMouseDown={e => e.preventDefault()}
        >
          {options.map((opt, idx) => {
            const highlighted = highlightedIndex === idx;
            const isAdd = opt.kind === 'add';
            return (
              // eslint-disable-next-line jsx-a11y/interactive-supports-focus
              <div
                key={isAdd ? '__add__' : opt.name}
                id={optionId(idx)}
                role="option"
                aria-selected={highlighted}
                className={`hist-edit-typeahead-option${highlighted ? ' hist-edit-typeahead-option--highlighted' : ''}${isAdd ? ' hist-edit-typeahead-option--add' : ''}`}
                onMouseDown={() => commit(opt)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseLeave={() => setHighlightedIndex(null)}
              >
                {isAdd ? (
                  <>
                    <div className="hist-edit-typeahead-add-warn">"{opt.name}" is not in the exercise library</div>
                    <div className="hist-edit-typeahead-add-action">+ Add "{opt.name}" to Custom Exercises</div>
                  </>
                ) : (
                  opt.name
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function History() {
  const [view, setView] = useState('timeline');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [modal, setModal] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Edit-mode state — coexists with the read-only path. originalSlots is the
  // pre-edit snapshot used both for stable iteration during edit and for the
  // Undo path's inverse PATCH bodies.
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [originalSlots, setOriginalSlots] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pbToast, setPbToast] = useState(null);
  const [errorToast, setErrorToast] = useState(null);
  // Add Exercise picker state — null = not mounted; {} = picker mounted.
  // Atomic open/close. Picker manages its own internal state (query,
  // highlight, dropdown) — parent only tracks "is the picker open?".
  const [addExerciseState, setAddExerciseState] = useState(null);
  const addExerciseBtnRef = useRef(null);
  const saveButtonRef = useRef(null);
  const closeModalBtnRef = useRef(null);
  // Monotonic counter for pending-add sentinels. Reset on each entry into
  // edit mode so sentinels are scoped to a single edit session and never
  // leak across opens.
  const sentinelCounterRef = useRef(0);
  const nextSentinel = useCallback((kind) => {
    sentinelCounterRef.current += 1;
    return `_new:${kind}:${sentinelCounterRef.current}`;
  }, []);
  const closeModal = useCallback(() => {
    setModal(null);
    setEditing(false);
    setEditDraft(null);
    setOriginalSlots(null);
    setAddExerciseState(null);
  }, []);
  // Modal a11y: focus trap, Esc to close, return focus on close. Initial
  // focus lands on the Close button (sole interactive control inside).
  const sessionModalRef = useModalA11y({
    isOpen: !!modal,
    onClose: closeModal,
    initialFocusRef: closeModalBtnRef,
  });

  const loadHistory = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/workout/${userId}/all-history`);
      const data = res.ok ? await res.json() : { sessions: [] };
      setSessions(
        (data.sessions ?? []).map(s => {
          const date = new Date(s.date);
          date.setHours(0, 0, 0, 0);
          const { type, color } = typeFromTitle(s.dayTitle);
          return { ...s, date, type, color };
        })
      );
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Build date lookup for calendar
  const sessionMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => { map[dateKey(s.date)] = s; });
    return map;
  }, [sessions]);

  // today stays — the calendar grid below uses it for isToday checks. The
  // four headline stats moved into useWorkoutStats so day.jsx and logger.jsx
  // can share the same Sunday-start / dateKey-dedup conventions.
  const today = new Date(); today.setHours(0,0,0,0);
  const { totalSessions, weeksLogged, thisMonth, daysThisWeek } = useWorkoutStats(sessions);

  // Group sessions by month for timeline
  const grouped = useMemo(() => {
    const groups = {};
    sessions.forEach(s => {
      const key = `${s.date.getFullYear()}-${s.date.getMonth()}`;
      if (!groups[key]) groups[key] = { label: `${MONTHS[s.date.getMonth()]} ${s.date.getFullYear()}`, items: [] };
      groups[key].items.push(s);
    });
    return Object.values(groups);
  }, [sessions]);

  const calPrev = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const calNext = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

  // Reactive diff bucketed by op kind. Save dispatches each bucket in its
  // own phase. Single source of truth for both disabled-state and handler.
  const editOps = useMemo(() => {
    if (!editing || !originalSlots || !editDraft) {
      return { deletes: { sets: [], slots: [] }, adds: { sets: [], slots: [] }, edits: [] };
    }
    return diffOps(originalSlots, editDraft, !!modal?.isQuickSession);
  }, [editing, originalSlots, editDraft, modal?.isQuickSession]);

  const hasPendingOps = useMemo(() => (
    editOps.deletes.sets.length + editOps.deletes.slots.length +
    editOps.adds.sets.length + editOps.adds.slots.length +
    editOps.edits.length > 0
  ), [editOps]);

  // ── Edit-mode handlers ──────────────────────────────────────────────────
  const startEditing = useCallback(() => {
    if (!modal) return;
    sentinelCounterRef.current = 0;
    setOriginalSlots(structuredClone(modal.slots));
    setEditDraft(structuredClone(modal.slots));
    setEditing(true);
  }, [modal]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditDraft(null);
    setOriginalSlots(null);
    setAddExerciseState(null);
  }, []);

  // updateDraft mutates one cell in editDraft. For per-set fields, key into
  // the slot's keyed map (actualWeights, actualReps, completedSets, cardio*).
  // For slot-level fields (notes), pass field='notes' and j=null.
  const updateDraft = useCallback((si, j, field, value) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const next = [...prev];
      const slot = { ...next[si] };
      if (j == null) {
        slot[field] = value;
      } else {
        const map = { ...(slot[field] ?? {}) };
        map[j] = value;
        slot[field] = map;
      }
      next[si] = slot;
      return next;
    });
  }, []);

  // Trash on a backend slot toggles _pending: 'remove'. Trash on a
  // pending-add slot splices it from local state entirely (asymmetry per
  // 4.D: backend items get marked for save-time DELETE; pending adds just
  // discard with no backend round-trip needed since they never existed
  // server-side).
  const toggleSlotPendingRemove = useCallback((si) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const next = [...prev];
      const slot = { ...next[si] };
      if (slot._pending === 'add') {
        next.splice(si, 1);
        return next;
      }
      slot._pending = slot._pending === 'remove' ? undefined : 'remove';
      next[si] = slot;
      return next;
    });
  }, []);

  // Same asymmetry at the set level. Pending-add sets (sentinel keys) get
  // their entries deleted from all six per-set maps (ensures no orphaned ''
  // values linger in cardio maps for sentinels that disappear).
  const toggleSetPendingRemove = useCallback((si, key) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const next = [...prev];
      const slot = { ...next[si] };
      if (String(key).startsWith('_new:')) {
        const cleaned = (mapName) => {
          if (!slot[mapName]) return slot[mapName];
          const m = { ...slot[mapName] };
          delete m[key];
          return m;
        };
        slot.actualWeights = cleaned('actualWeights');
        slot.actualReps = cleaned('actualReps');
        slot.completedSets = cleaned('completedSets');
        slot.cardioTimes = cleaned('cardioTimes');
        slot.cardioIntensities = cleaned('cardioIntensities');
        slot.cardioDistances = cleaned('cardioDistances');
        next[si] = slot;
        return next;
      }
      const removals = { ...(slot._setRemovals ?? {}) };
      if (removals[key]) delete removals[key];
      else removals[key] = true;
      slot._setRemovals = removals;
      next[si] = slot;
      return next;
    });
  }, []);

  // Locally seed a new set with frontend defaults that mirror the backend
  // POST endpoint (reps from prescription via parsePresRepsClient, weight 0
  // for non-cardio; '' for cardio fields). The backend POST creates with the
  // same defaults — Phase 4 PATCHes only the differences after save.
  const addSet = useCallback((si) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const next = [...prev];
      const slot = { ...next[si] };
      const sentinelKey = nextSentinel('set');
      const isCardio = slot.label === 'Cardio';

      const wi = modal?.weekIndex ?? 0;
      const presReps = Array.isArray(slot.reps) ? (slot.reps[wi] ?? slot.reps[slot.reps.length - 1]) : slot.reps;
      const defaultReps = parsePresRepsClient(presReps);

      slot.completedSets = { ...(slot.completedSets ?? {}), [sentinelKey]: true };
      if (isCardio) {
        slot.cardioTimes = { ...(slot.cardioTimes ?? {}), [sentinelKey]: '' };
        slot.cardioIntensities = { ...(slot.cardioIntensities ?? {}), [sentinelKey]: '' };
        slot.cardioDistances = { ...(slot.cardioDistances ?? {}), [sentinelKey]: '' };
      } else {
        slot.actualReps = { ...(slot.actualReps ?? {}), [sentinelKey]: defaultReps };
        slot.actualWeights = { ...(slot.actualWeights ?? {}), [sentinelKey]: 0 };
      }
      next[si] = slot;
      return next;
    });
  }, [modal, nextSentinel]);

  // Append a new pending-add slot to editDraft when the user picks an
  // exercise from the typeahead. Seeded values mirror backend POST defaults
  // exactly so frontend seed and post-fetch state are identical (no jarring
  // "wait, that's not what I had" after save).
  const addExercise = useCallback((exerciseName) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      const sentinelSlot = nextSentinel('slot');
      const isQuick = !!modal?.isQuickSession;
      // Literal fallback defaults — no prescription exists for newly-added
      // slots, so 8 (program) / 0 (quick) is the seeded reps value, not a
      // derivation. Mirrors backend POST endpoint defaults.
      const defaultReps = isQuick ? 0 : 8;
      const newSlot = {
        slotIdx: sentinelSlot,
        _pending: 'add',
        label: null,
        fixed: false,
        exercise: exerciseName,
        sets: isQuick ? 1 : 3,
        reps: isQuick ? null : 8,
        weightNote: null,
        projectedWeight: null,
        note: null,
        actualWeights: { '0': 0 },
        actualReps: { '0': defaultReps },
        completedSets: { '0': true },
        cardioTimes: {},
        cardioIntensities: {},
        cardioDistances: {},
        notes: '',
      };
      return [...prev, newSlot];
    });
    setAddExerciseState(null);
    // B.7 refinement: focus Save button after commit. Signals "your change
    // is staged; save when ready." RAF defers past commit-phase so picker
    // unmount + Add-Exercise-button remount + Save mount all settle first.
    requestAnimationFrame(() => saveButtonRef.current?.focus());
  }, [modal, nextSentinel]);

  // Save (forward) and Undo (backward) share the same dispatch pipeline.
  // Promise.allSettled so partial failures don't lose successful saves; the
  // refetch reconciles whatever state the server actually committed.
  const dispatchPatches = useCallback(async (sessionRef, cells, direction) => {
    const url = sessionRef.isQuickSession
      ? `${API_URL}/api/users/quick-sessions/${sessionRef.quickSessionId}/log`
      : `${API_URL}/api/users/workout-log/${sessionRef.workoutLogId}/log`;
    const userId = localStorage.getItem('userId');

    const requests = cells.map(async cell => {
      const fields = direction === 'forward' ? cell.after : cell.before;
      const body = sessionRef.isQuickSession
        ? { userId, exerciseIdx: cell.exerciseIdx, setIdx: cell.setIdx ?? 0, ...fields }
        : {
            userId,
            weekNum: (sessionRef.weekIndex ?? 0) + 1,
            dayNum: (sessionRef.dayIdx ?? 0) + 1,
            slotIdx: cell.slotIdx,
            setIdx: cell.setIdx ?? 0,
            ...fields,
          };
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data;
      try { data = await r.json(); } catch { data = {}; }
      return { ok: r.ok, data };
    });
    const results = await Promise.allSettled(requests);

    const pbChanges = new Map();
    let anyFailed = false;
    for (const r of results) {
      if (r.status === 'rejected' || !r.value.ok) { anyFailed = true; continue; }
      const pb = r.value.data?.pbUpdate;
      if (pb && pb.pbChanged) {
        const existing = pbChanges.get(pb.exercise);
        if (!existing || Math.abs(pb.newPB - pb.oldPB) > Math.abs(existing.newPB - existing.oldPB)) {
          pbChanges.set(pb.exercise, pb);
        }
      }
    }
    return { pbChanges: Array.from(pbChanges.values()), anyFailed };
  }, []);

  const handleSave = useCallback(async () => {
    if (!modal || !originalSlots || !editDraft) return;
    setSaving(true);
    try {
      if (!hasPendingOps) {
        setEditing(false);
        setEditDraft(null);
        setOriginalSlots(null);
        return;
      }

      const ref = {
        isQuick: !!modal.isQuickSession,
        quickSessionId: modal.quickSessionId,
        workoutLogId: modal.workoutLogId,
        weekIndex: modal.weekIndex,
        dayIdx: modal.dayIdx,
      };
      const isQuick = ref.isQuick;
      const userId = localStorage.getItem('userId');
      const hasStructuralOps =
        editOps.deletes.sets.length + editOps.deletes.slots.length +
        editOps.adds.sets.length + editOps.adds.slots.length > 0;

      const pbAggregator = new Map();
      let anyFailed = false;
      const collectPb = (r) => {
        if (r.status === 'rejected' || !r.value.ok) { anyFailed = true; return; }
        const pb = r.value.data?.pbUpdate;
        if (pb && pb.pbChanged) {
          const existing = pbAggregator.get(pb.exercise);
          if (!existing || Math.abs(pb.newPB - pb.oldPB) > Math.abs(existing.newPB - existing.oldPB)) {
            pbAggregator.set(pb.exercise, pb);
          }
        }
      };

      // ── Phase 1: DELETEs (set + slot, all parallel) ──────────────────
      const deleteResults = await Promise.allSettled([
        ...editOps.deletes.sets.map(d =>
          jsonFetch(setUrl(ref), 'DELETE', buildSetDeleteBody(ref, d, userId))
        ),
        ...editOps.deletes.slots.map(d =>
          jsonFetch(slotUrl(ref), 'DELETE', buildSlotDeleteBody(ref, d, userId))
        ),
      ]);
      for (const r of deleteResults) collectPb(r);

      // ── Phase 2a: Slot POSTs (parallel), build sentinel→realSlotIdx ──
      const slotIdxMap = new Map();
      const slotPostResults = await Promise.allSettled(
        editOps.adds.slots.map(a =>
          jsonFetch(slotUrl(ref), 'POST', buildSlotPostBody(ref, a, userId))
            .then(r => ({ ...r, addRecord: a }))
        )
      );
      for (const r of slotPostResults) {
        if (r.status === 'rejected' || !r.value.ok) { anyFailed = true; continue; }
        const real = isQuick ? r.value.data?.newExerciseIdx : r.value.data?.newSlotIdx;
        if (real != null) slotIdxMap.set(r.value.addRecord.slotSentinel, real);
      }

      // ── Phase 2b: Set POSTs. Skip if parent slot's POST failed. ──────
      const eligibleSetAdds = editOps.adds.sets.filter(a =>
        a.slotSentinel == null || slotIdxMap.has(a.slotSentinel)
      );
      const setIdxMap = new Map();
      const setPostResults = await Promise.allSettled(
        eligibleSetAdds.map(async a => {
          const realSlotIdx = a.slotSentinel ? slotIdxMap.get(a.slotSentinel) : a.slotIdx;
          const r = await jsonFetch(setUrl(ref), 'POST', buildSetPostBody(ref, a, realSlotIdx, userId));
          return { ...r, addRecord: a, realSlotIdx };
        })
      );
      for (const r of setPostResults) {
        if (r.status === 'rejected' || !r.value.ok) { anyFailed = true; continue; }
        const newSetIdx = r.value.data?.newIndex;
        if (newSetIdx != null) {
          setIdxMap.set(r.value.addRecord.setSentinel, {
            setIdx: newSetIdx,
            slotIdx: r.value.realSlotIdx,
          });
        }
      }

      // ── Phase 3: PATCHes (parallel) ──────────────────────────────────
      // Combines: existing-set edits, added-set value overrides (where
      // the user pre-edited beyond backend defaults), and added-slot
      // default-set overrides (the "0" key on a freshly-POSTed slot).
      const patchCells = [];
      // (a) Edits on existing items.
      for (const e of editOps.edits) patchCells.push(e);
      // (b) Added-set overrides for sets whose POST resolved.
      for (const a of eligibleSetAdds) {
        if (!setIdxMap.has(a.setSentinel)) continue;
        const real = setIdxMap.get(a.setSentinel);
        const slot = editDraft.find(s => s.slotIdx === a.slotSentinel) ?? editDraft[a.exerciseIdx];
        const isCardio = slot?.label === 'Cardio';
        const wi = modal.weekIndex ?? 0;
        const presReps = Array.isArray(slot?.reps) ? (slot.reps[wi] ?? slot.reps[slot.reps.length - 1]) : slot?.reps;
        const defaultReps = parsePresRepsClient(presReps);
        const overrides = computePostOverrides(a.values, isCardio, isQuick, defaultReps);
        if (Object.keys(overrides).length === 0) continue;
        patchCells.push({
          kind: 'addOverride',
          slotIdx: real.slotIdx,
          setIdx: real.setIdx,
          exerciseIdx: real.slotIdx, // for quick — same value
          after: overrides,
        });
      }
      // (c) Added-slot default-set overrides ("0" key on each new slot).
      for (const a of editOps.adds.slots) {
        if (!slotIdxMap.has(a.slotSentinel)) continue;
        const realSlotIdx = slotIdxMap.get(a.slotSentinel);
        const draftSlot = editDraft.find(s => s.slotIdx === a.slotSentinel);
        const isCardio = draftSlot?.label === 'Cardio';
        // New program slots default `reps: 8`, weight 0; quick default reps/weight 0.
        const defaultReps = isQuick ? 0 : 8;
        const overrides = computePostOverrides(a.defaultSetValues, isCardio, isQuick, defaultReps);
        if (Object.keys(overrides).length === 0) continue;
        patchCells.push({
          kind: 'slotDefaultOverride',
          slotIdx: realSlotIdx,
          setIdx: 0,
          exerciseIdx: realSlotIdx,
          after: overrides,
        });
      }

      const patchResults = await Promise.allSettled(
        patchCells.map(cell =>
          jsonFetch(editUrl(ref), 'PATCH', buildEditPatchBody(ref, cell, userId))
        )
      );
      for (const r of patchResults) collectPb(r);

      // Final reconciliation
      await loadHistory();
      setModal(null);
      setEditing(false);
      setEditDraft(null);
      setOriginalSlots(null);

      const pbChanges = Array.from(pbAggregator.values());
      if (pbChanges.length > 0) {
        // structural=true suppresses the Undo button (per A.3.1) — inverting
        // a save that included DELETEs/POSTs is bidirectional structural
        // complexity beyond Pass C scope. Toast still surfaces the PR change.
        // For edit-only saves, ship cells + sessionRef so handleUndo can
        // dispatch backward PATCHes through dispatchPatches.
        const undoSessionRef = {
          isQuickSession: ref.isQuick,
          quickSessionId: ref.quickSessionId,
          workoutLogId: ref.workoutLogId,
          weekIndex: ref.weekIndex,
          dayIdx: ref.dayIdx,
        };
        setPbToast({
          changes: pbChanges,
          structural: hasStructuralOps,
          cells: hasStructuralOps ? null : editOps.edits,
          sessionRef: hasStructuralOps ? null : undoSessionRef,
        });
      } else if (anyFailed) {
        setErrorToast({ message: 'Some edits failed to save.' });
      }
    } catch (err) {
      console.error('Save failed:', err);
      setErrorToast({ message: 'Failed to save edits.' });
    } finally {
      setSaving(false);
    }
  }, [modal, originalSlots, editDraft, editOps, hasPendingOps, loadHistory]);

  const handleUndo = useCallback(async () => {
    if (!pbToast || pbToast.structural) return; // Undo unavailable for structural saves
    const { sessionRef, cells } = pbToast;
    if (!sessionRef || !cells) return;
    setPbToast(null);
    try {
      await dispatchPatches(sessionRef, cells, 'backward');
      await loadHistory();
    } catch (err) {
      console.error('Undo failed:', err);
      setErrorToast({ message: 'Undo failed.' });
    }
  }, [pbToast, loadHistory, dispatchPatches]);

  return (
    <div className="hist-page">
      {/* Header */}
      <div className="hist-header">
        <h1 className="hist-title">Workout <span>History</span></h1>
        <p className="hist-sub">Every session logged — tap any day to review</p>
      </div>

      {/* Stats */}
      <div className="hist-stats-row" role="group" aria-label="History summary">
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{totalSessions}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">Total Sessions</div>
          <span className="sr-only">Total sessions: {totalSessions}</span>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{weeksLogged}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">Weeks Logged</div>
          <span className="sr-only">Weeks logged: {weeksLogged}</span>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{thisMonth}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">This Month</div>
          <span className="sr-only">This month: {thisMonth} {thisMonth === 1 ? 'session' : 'sessions'}</span>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{daysThisWeek} / 7</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">Days This Week</div>
          <span className="sr-only">Days this week: {daysThisWeek} of 7</span>
        </div>
      </div>

      {/* View toggle — tablist; tabs are buttons in normal Tab order (no
          arrow-key roving for simplicity). Each tab points at its panel
          via aria-controls. */}
      <div className="hist-toggle-row" role="tablist" aria-label="History view">
        <button
          id="hist-tab-timeline"
          role="tab"
          aria-selected={view === 'timeline'}
          aria-controls="hist-panel-timeline"
          className={`hist-toggle-btn${view === 'timeline' ? ' hist-toggle-btn--active' : ''}`}
          onClick={() => setView('timeline')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
          Timeline
        </button>
        <button
          id="hist-tab-calendar"
          role="tab"
          aria-selected={view === 'calendar'}
          aria-controls="hist-panel-calendar"
          className={`hist-toggle-btn${view === 'calendar' ? ' hist-toggle-btn--active' : ''}`}
          onClick={() => setView('calendar')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendar
        </button>
      </div>

      {loading && <div className="hist-empty" role="status" aria-live="polite">Loading history…</div>}

      {/* Timeline View */}
      {!loading && view === 'timeline' && (
        <div
          className="hist-timeline-view"
          id="hist-panel-timeline"
          role="tabpanel"
          aria-labelledby="hist-tab-timeline"
        >
          {grouped.length === 0 && (
            <div className="hist-empty" role="status">No completed workouts yet — finish a day to see it here.</div>
          )}
          {grouped.map(group => (
            <section key={group.label} className="hist-month-block" aria-labelledby={`hist-month-${group.label.replace(/\s+/g, '-')}`}>
              <h2 id={`hist-month-${group.label.replace(/\s+/g, '-')}`} className="hist-month-heading">
                {group.label}
                <span className="hist-month-count">{group.items.length} session{group.items.length !== 1 ? 's' : ''}</span>
              </h2>
              <div className="hist-timeline">
                {group.items.map((s, i) => {
                  const tl = typeLabel(s.type);
                  const ariaLabel = `${s.dayTitle}, ${tl} day, ${DAYS_SHORT[s.date.getDay()]} ${MONTHS[s.date.getMonth()]} ${s.date.getDate()}, ${s.slots.length} ${s.slots.length === 1 ? 'exercise' : 'exercises'}`;
                  const onActivate = () => setModal(s);
                  const onKeyDown = (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onActivate();
                    }
                  };
                  return (
                    <div
                      key={i}
                      className="hist-tl-item"
                      onClick={onActivate}
                      onKeyDown={onKeyDown}
                      role="button"
                      tabIndex={0}
                      aria-label={ariaLabel}
                    >
                      <div className="hist-tl-dot" style={{ background: s.color }} aria-hidden="true" />
                      <div className="hist-tl-date" aria-hidden="true">
                        <div className="hist-tl-day-num">{s.date.getDate()}</div>
                        <div className="hist-tl-day-name">{DAYS_SHORT[s.date.getDay()]}</div>
                      </div>
                      <div className="hist-tl-divider" aria-hidden="true" />
                      <div className="hist-tl-content">
                        <div className="hist-tl-name">
                          <span className={`hist-type-tag hist-type-${s.type}`}>{s.dayTitle}</span>
                          {/* Color-coded type — sr-only text so SR users get
                              the same info as sighted users without seeing
                              the color. Derived from typeFromTitle.type. */}
                          <span className="sr-only"> ({tl} day)</span>
                        </div>
                        <div className="hist-tl-chips" aria-hidden="true">
                          {s.slots.slice(0, 3).map((slot, si) => (
                            <span key={si} className="hist-ex-chip">{slot.exercise ?? `Exercise ${si+1}`}</span>
                          ))}
                          {s.slots.length > 3 && <span className="hist-ex-chip">+{s.slots.length - 3} more</span>}
                        </div>
                      </div>
                      <div className="hist-tl-sets" aria-hidden="true">{s.slots.length} exercises</div>
                      <div className="hist-tl-arrow" aria-hidden="true">›</div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Calendar View — no role="grid" (would promise arrow-key navigation
          we don't implement; per agreed Option B, day cells with workouts are
          plain buttons reachable by Tab; empty cells stay non-interactive). */}
      {!loading && view === 'calendar' && (
        <div
          className="hist-calendar-view"
          id="hist-panel-calendar"
          role="tabpanel"
          aria-labelledby="hist-tab-calendar"
        >
          <div className="hist-cal-nav">
            <button className="hist-cal-arrow" onClick={calPrev} aria-label={`Previous month, ${MONTHS[calMonth === 0 ? 11 : calMonth - 1]} ${calMonth === 0 ? calYear - 1 : calYear}`}>
              <span aria-hidden="true">←</span>
            </button>
            <div className="hist-cal-month-title" aria-live="polite" aria-atomic="true">{MONTHS[calMonth]} {calYear}</div>
            <button className="hist-cal-arrow" onClick={calNext} aria-label={`Next month, ${MONTHS[calMonth === 11 ? 0 : calMonth + 1]} ${calMonth === 11 ? calYear + 1 : calYear}`}>
              <span aria-hidden="true">→</span>
            </button>
          </div>
          {/* Day-of-week row is aria-hidden — per-cell aria-labels include the
              full date ("March 15, 2026"), so a column-header readout would
              be redundant noise without grid context. */}
          <div className="hist-cal-dow-row" aria-hidden="true">
            {DAYS_SHORT.map(d => <div key={d} className="hist-cal-dow">{d}</div>)}
          </div>
          <div className="hist-cal-grid">
            {(() => {
              const firstDay = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const daysInPrev = new Date(calYear, calMonth, 0).getDate();
              const cells = [];

              for (let i = firstDay - 1; i >= 0; i--)
                cells.push(<div key={`prev-${i}`} className="hist-cal-day hist-cal-day--other" aria-hidden="true">{daysInPrev - i}</div>);

              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(calYear, calMonth, d);
                const key = dateKey(date);
                const session = sessionMap[key];
                const isToday = dateKey(date) === dateKey(today);
                const dateLabel = `${MONTHS[calMonth]} ${d}, ${calYear}${isToday ? ', today' : ''}`;

                if (session) {
                  // Interactive cell — opens session detail modal.
                  const tl = typeLabel(session.type);
                  const cellLabel = `${dateLabel}, ${session.dayTitle}, ${tl} day, ${session.slots.length} ${session.slots.length === 1 ? 'exercise' : 'exercises'}`;
                  const onActivate = () => setModal(session);
                  const onKeyDown = (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onActivate();
                    }
                  };
                  cells.push(
                    <div
                      key={d}
                      className={`hist-cal-day hist-cal-day--workout${isToday ? ' hist-cal-day--today' : ''}`}
                      onClick={onActivate}
                      onKeyDown={onKeyDown}
                      role="button"
                      tabIndex={0}
                      aria-label={cellLabel}
                    >
                      <div className="hist-cal-num" aria-hidden="true">{d}</div>
                      <div className="hist-cal-dot" style={{ background: session.color }} aria-hidden="true" />
                      <div className="hist-cal-label" aria-hidden="true">{session.dayTitle}</div>
                    </div>
                  );
                } else {
                  // Non-interactive cell — empty day. Keep date readable to AT
                  // (today is still notable; non-today empty days stay aria-hidden
                  // to keep the calendar from being announced as 31 separate items).
                  cells.push(
                    <div
                      key={d}
                      className={`hist-cal-day${isToday ? ' hist-cal-day--today' : ''}`}
                      aria-label={isToday ? dateLabel : undefined}
                      aria-hidden={isToday ? undefined : 'true'}
                    >
                      <div className="hist-cal-num">{d}</div>
                    </div>
                  );
                }
              }

              const totalCells = firstDay + daysInMonth;
              const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
              for (let i = 1; i <= remainder; i++)
                cells.push(<div key={`next-${i}`} className="hist-cal-day hist-cal-day--other" aria-hidden="true">{i}</div>);

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="hist-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div
            ref={sessionModalRef}
            className={`hist-modal${editing ? ' hist-modal--editing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hist-modal-title"
            aria-describedby="hist-modal-date"
          >
            <div className="hist-modal-handle" aria-hidden="true" />
            <div className="hist-modal-header">
              <div className="hist-modal-date" id="hist-modal-date">
                <time dateTime={isoDate(modal.date)}>
                  {DAYS_SHORT[modal.date.getDay()]}, {MONTHS[modal.date.getMonth()]} {modal.date.getDate()}, {modal.date.getFullYear()}
                </time>
              </div>
              <div className="hist-modal-title" id="hist-modal-title">
                {modal.dayTitle}
                <span className="sr-only"> ({typeLabel(modal.type)} day)</span>
                {editing && <span className="hist-editing-tag">Editing</span>}
              </div>
              {modal.programTitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted, #888)', marginTop: '2px' }}>
                  {modal.programTitle} · Week {modal.weekNumber}
                </div>
              )}
              <div className="hist-modal-stats" role="group" aria-label="Session totals">
                <div className="hist-modal-stat">
                  <div className="hist-modal-stat-val" aria-hidden="true">{modal.slots.length}</div>
                  <div className="hist-modal-stat-lbl" aria-hidden="true">Exercises</div>
                  <span className="sr-only">{modal.slots.length} {modal.slots.length === 1 ? 'exercise' : 'exercises'}</span>
                </div>
              </div>
            </div>
            <div className="hist-modal-body">
              <div className="hist-exercise-log">
                {(editing && editDraft ? editDraft : modal.slots).map((origSlot, si) => {
                  // In edit mode iterate the draft so added slots (sentinel
                  // slotIdx) and pending-remove slots render. In read mode
                  // iterate modal.slots (no pending state exists). The active
                  // slot reference is `slot`; `origSlot` and `slot` point to
                  // the same object in read mode and to draft entries in edit.
                  const slot = origSlot;
                  const isAddedSlot = slot._pending === 'add';
                  const isPendingRemoveSlot = slot._pending === 'remove';
                  const wi = modal.weekIndex ?? 0;
                  const setsVal = resolveWeekValue(slot.sets, wi);
                  const setCount = typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0);
                  const repsRaw = resolveWeekValue(slot.reps, wi);
                  const repsArray = Array.isArray(repsRaw)
                    ? repsRaw
                    : (typeof repsRaw === 'string' && repsRaw.includes(','))
                      ? repsRaw.split(',').map(r => r.trim())
                      : null;
                  const getReps = (j) => repsArray ? (repsArray[j] ?? repsArray[repsArray.length - 1]) : repsRaw;
                  const isCardioSlot = slot.label === 'Cardio';
                  const exerciseName = slot.exercise ?? `Exercise ${si+1}`;
                  const setRemovals = slot._setRemovals ?? {};

                  // Visible set keys: in edit mode, all keys from draft's
                  // completedSets (sentinels render after numeric keys per JS
                  // iteration order — additions naturally sort to the end).
                  // In read mode, only completed sets within prescribed count.
                  const visibleSetKeys = editing
                    ? Object.keys(slot.completedSets ?? {})
                    : Array.from({ length: setCount }, (_, j) => String(j))
                        .filter(k => slot.completedSets?.[k] === true);

                  return (
                    <div
                      key={si}
                      className={`hist-log-item${isPendingRemoveSlot ? ' hist-log-item--pending-remove' : ''}${isAddedSlot ? ' hist-log-item--added' : ''}`}
                    >
                      <div className="hist-log-name">
                        {exerciseName}
                        {origSlot.prHit && (
                          <span className="hist-pr-badge">PR · {origSlot.prWeight} lbs</span>
                        )}
                        {editing && (
                          <button
                            type="button"
                            className="hist-edit-trash-btn hist-edit-trash-btn--exercise"
                            onClick={() => toggleSlotPendingRemove(si)}
                            aria-label={isPendingRemoveSlot ? `Restore exercise ${exerciseName}` : `Remove exercise ${exerciseName}`}
                            aria-pressed={isPendingRemoveSlot}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                      <div className="hist-log-sets">
                        {visibleSetKeys.map((k, displayIdx) => {
                          const setLabel = `${exerciseName}, set ${displayIdx + 1}`;
                          const isPendingRemoveSet = !!setRemovals[k];
                          const rowMods = editing
                            ? `${isCardioSlot ? ' hist-log-set-row--editing-cardio' : ' hist-log-set-row--editing'}${isPendingRemoveSet ? ' hist-log-set-row--pending-remove' : ''}`
                            : '';
                          return (
                            <div key={k} className={`hist-log-set-row${rowMods}`}>
                              <div className="hist-log-set-num">{displayIdx + 1}</div>
                              {isCardioSlot ? (
                                editing ? (
                                  <>
                                    <div className="hist-log-set-val">
                                      <input
                                        className="actual-input"
                                        aria-label={`Time for ${setLabel}`}
                                        value={slot.cardioTimes?.[k] ?? ''}
                                        onChange={e => updateDraft(si, k, 'cardioTimes', e.target.value)}
                                        disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                      /> time
                                    </div>
                                    <div className="hist-log-set-val">
                                      <input
                                        className="actual-input"
                                        aria-label={`Intensity for ${setLabel}`}
                                        value={slot.cardioIntensities?.[k] ?? ''}
                                        onChange={e => updateDraft(si, k, 'cardioIntensities', e.target.value)}
                                        disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                      /> intensity
                                    </div>
                                    <div className="hist-log-set-val">
                                      <input
                                        className="actual-input"
                                        aria-label={`Distance for ${setLabel}`}
                                        value={slot.cardioDistances?.[k] ?? ''}
                                        onChange={e => updateDraft(si, k, 'cardioDistances', e.target.value)}
                                        disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                      /> dist
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="hist-log-set-val"><span>{slot.cardioTimes?.[k] ?? '—'}</span> time</div>
                                    <div className="hist-log-set-val"><span>{slot.cardioIntensities?.[k] ?? '—'}</span> intensity</div>
                                    <div className="hist-log-set-val"><span>{slot.cardioDistances?.[k] ?? '—'}</span> dist</div>
                                  </>
                                )
                              ) : (
                                editing ? (
                                  <>
                                    <div className="hist-log-set-val">
                                      <div className="stepper-wrap" role="group" aria-label={`Reps for ${setLabel}`}>
                                        <button
                                          type="button"
                                          className="stepper-btn stepper-btn--dec"
                                          aria-label={`Decrease reps for ${setLabel}`}
                                          disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                          onClick={() => updateDraft(si, k, 'actualReps', Math.max(0, (Number(slot.actualReps?.[k]) || 0) - 1))}
                                        ><span aria-hidden="true">−</span></button>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          inputMode="numeric"
                                          className="actual-input"
                                          aria-label={`Reps for ${setLabel}`}
                                          disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                          value={slot.actualReps?.[k] ?? ''}
                                          onChange={e => updateDraft(si, k, 'actualReps', e.target.value)}
                                        />
                                        <button
                                          type="button"
                                          className="stepper-btn stepper-btn--inc"
                                          aria-label={`Increase reps for ${setLabel}`}
                                          disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                          onClick={() => updateDraft(si, k, 'actualReps', (Number(slot.actualReps?.[k]) || 0) + 1)}
                                        ><span aria-hidden="true">+</span></button>
                                      </div> reps
                                    </div>
                                    <div className="hist-log-set-val">
                                      <div className="stepper-wrap" role="group" aria-label={`Weight in pounds for ${setLabel}`}>
                                        <button
                                          type="button"
                                          className="stepper-btn stepper-btn--dec"
                                          aria-label={`Decrease weight for ${setLabel}`}
                                          disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                          onClick={() => updateDraft(si, k, 'actualWeights', Math.max(0, (Number(slot.actualWeights?.[k]) || 0) - 5))}
                                        ><span aria-hidden="true">−</span></button>
                                        <input
                                          type="number"
                                          min="0"
                                          step="5"
                                          inputMode="numeric"
                                          className="actual-input"
                                          aria-label={`Weight in pounds for ${setLabel}`}
                                          disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                          value={slot.actualWeights?.[k] ?? ''}
                                          onChange={e => updateDraft(si, k, 'actualWeights', e.target.value)}
                                        />
                                        <button
                                          type="button"
                                          className="stepper-btn stepper-btn--inc"
                                          aria-label={`Increase weight for ${setLabel}`}
                                          disabled={isPendingRemoveSlot || isPendingRemoveSet}
                                          onClick={() => updateDraft(si, k, 'actualWeights', (Number(slot.actualWeights?.[k]) || 0) + 5)}
                                        ><span aria-hidden="true">+</span></button>
                                      </div> lbs
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="hist-log-set-val"><span>{slot.actualReps?.[k] ?? getReps(Number(k)) ?? '—'}</span> reps</div>
                                    <div className="hist-log-set-val"><span>{slot.actualWeights?.[k] ?? origSlot.weightNote ?? '—'}</span> lbs</div>
                                  </>
                                )
                              )}
                              {editing && (
                                <button
                                  type="button"
                                  className="hist-edit-trash-btn"
                                  onClick={() => toggleSetPendingRemove(si, k)}
                                  aria-label={isPendingRemoveSet ? `Restore set ${displayIdx + 1}` : `Remove set ${displayIdx + 1}`}
                                  aria-pressed={isPendingRemoveSet}
                                  disabled={isPendingRemoveSlot}
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {editing && !isPendingRemoveSlot && (
                          <button
                            type="button"
                            className="hist-edit-add-set-btn"
                            onClick={() => addSet(si)}
                            aria-label={`Add set to ${exerciseName}`}
                          >
                            + Add set
                          </button>
                        )}
                      </div>
                      {editing && !modal.isQuickSession && !isPendingRemoveSlot && !isAddedSlot && (
                        <>
                          <label className="hist-edit-notes-label" htmlFor={`hist-edit-notes-${si}`}>Notes</label>
                          <textarea
                            id={`hist-edit-notes-${si}`}
                            className="hist-edit-notes"
                            placeholder="notes…"
                            value={slot.notes ?? ''}
                            onChange={e => updateDraft(si, null, 'notes', e.target.value)}
                          />
                        </>
                      )}
                      {!editing && !modal.isQuickSession && (origSlot.notes ?? '').trim() && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                          <span style={{ fontWeight: 600 }}>Notes: </span>{origSlot.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
                {modal.slots.length === 0 && <p className="hist-empty">No exercises logged.</p>}
                {editing && (
                  addExerciseState === null ? (
                    <button
                      ref={addExerciseBtnRef}
                      type="button"
                      className="hist-edit-add-exercise-btn"
                      onClick={() => setAddExerciseState({})}
                      aria-label="Add a new exercise to this session"
                    >
                      <span aria-hidden="true" className="hist-edit-add-exercise-plus">+</span>
                      Add exercise
                    </button>
                  ) : (
                    <AddExerciseTypeahead
                      onSelect={addExercise}
                      onCancel={() => {
                        setAddExerciseState(null);
                        requestAnimationFrame(() => addExerciseBtnRef.current?.focus());
                      }}
                      // Picker is mounted on user action ("Add Exercise"
                      // click); landing focus on the search input is the
                      // expected UX. eslint's no-autofocus rule flags the
                      // prop name regardless of the underlying mechanism.
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                    />
                  )
                )}
              </div>
            </div>
            <div className="hist-modal-footer">
              {editing ? (
                <>
                  <button
                    type="button"
                    className="hist-modal-footer-btn hist-modal-footer-btn--ghost"
                    onClick={cancelEditing}
                    disabled={saving}
                    aria-label="Cancel edit"
                  >
                    Cancel
                  </button>
                  <button
                    ref={saveButtonRef}
                    type="button"
                    className="hist-modal-footer-btn hist-modal-footer-btn--primary"
                    onClick={handleSave}
                    disabled={saving || !hasPendingOps}
                    aria-busy={saving || undefined}
                    aria-label={saving ? 'Saving edits' : 'Save changes'}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="hist-modal-footer-btn"
                    onClick={startEditing}
                    aria-label="Edit this session"
                  >
                    Edit
                  </button>
                  <button
                    ref={closeModalBtnRef}
                    type="button"
                    className="hist-modal-footer-btn"
                    onClick={closeModal}
                    aria-label="Close session details"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast
        open={!!pbToast}
        onDismiss={() => setPbToast(null)}
        autoDismissMs={15000}
      >
        {pbToast && (
          <>
            <strong>Personal best updated</strong>
            <div style={{ marginTop: '4px' }}>
              {pbToast.changes.map(c => (
                <div key={c.exercise}>
                  {c.exercise}: <strong>{c.oldPB} → {c.newPB} lbs</strong>
                </div>
              ))}
            </div>
            {pbToast.structural ? (
              // Structural saves (DELETEs/POSTs) can't be auto-inverted — see
              // A.3.1. Toast still surfaces the PR change for awareness; per-op
              // Undo is logged as a follow-up.
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                Undo unavailable for edits that include structural changes
              </div>
            ) : (
              <button type="button" className="toast-action" onClick={handleUndo}>
                Undo edit
              </button>
            )}
          </>
        )}
      </Toast>

      <Toast
        open={!!errorToast}
        onDismiss={() => setErrorToast(null)}
        autoDismissMs={6000}
        role="alert"
      >
        {errorToast?.message}
      </Toast>
    </div>
  );
}

