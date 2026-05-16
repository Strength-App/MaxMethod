import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import { fineLevel, mirrorClassificationResponse } from '../utils/classification';

// Post-workout modal lifecycle hook. Owns the state machine
// (closed → summary → classification), pre-session fine-level + total
// capture, the lazy /all-history fetch, the classification POST + setUser
// mirror, and close-and-navigate handlers.
//
// Consumed by day.jsx (live tracker) and logger.jsx (batch retro-logger).
// The two flows differ in HOW fresh PBs are produced (per-set context flush
// vs. batch-save-then-resolve); that asymmetry stays in the parents via the
// saveAndGetPBs callback. The hook itself is symmetric.
//
// Inputs:
//   saveAndGetPBs: async () => { bench, squat, deadlift } | null
//     Parent-provided. day.jsx returns from current personalBests state
//     (already fresh per per-set pbUpdate flush). logger.jsx awaits
//     saveSession() and resolves from its returned PBs. Return null to
//     abort the screen-1→screen-2 transition cleanly (e.g. workout-didn't-
//     save path); the hook's finally block still advances the screen on
//     abort, matching prior in-place behavior in both parents.
//   doneNavigate: '/home' | '/history'
//     Target for the Done button on screen 2 and for the screen-2 backdrop.
//   onSummaryBackdrop: () => void
//     Parent-defined backdrop behavior on the summary screen. day navigates
//     to /home (no save needed; completeDay already fired). logger calls
//     saveAndExit which commits the batch session via /quick-sessions and
//     navigates to /history.
//
// Returns: { postWorkoutData, modalScreen, continuing, preFineLevel,
//   preTotal, historySessions, open, close, handleContinue, handleDone,
//   handleSummaryBackdrop, handleScreen2Backdrop }
//
// Behavior preservation note: handleContinue's finally block always
// advances modalScreen to 'classification', including on the !oneRMs abort
// path. This matches the prior in-place behavior in both day.jsx and
// logger.jsx — the screen advance is unconditional once handleContinue
// starts. Errors propagate silently to console.error; UI gracefully
// degrades to the prior classification mirror or the user's stored maxes.
export function usePostWorkoutModal({ saveAndGetPBs, doneNavigate, onSummaryBackdrop }) {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { personalBests } = useWorkout();

  const [postWorkoutData, setPostWorkoutData] = useState(null);
  const [modalScreen, setModalScreen] = useState('summary');
  const [continuing, setContinuing] = useState(false);
  const [preFineLevel, setPreFineLevel] = useState(null);
  const [preTotal, setPreTotal] = useState(null);
  const [historySessions, setHistorySessions] = useState([]);

  // Capture pre-session fine-level + total ONCE on first valid render.
  // Gate (preFineLevel !== null) locks the snapshot in so subsequent state
  // updates (per-set PBs raising during the session, or estimated_one_rep_maxes
  // being patched in handleCompleteDay after the workout finishes) can't shift it.
  //
  // Post-Phase-6: pre-session math reads estimated_one_rep_maxes (the leveling
  // source) with per-lift fallback to current_one_rep_maxes for users whose
  // estimated is still null (pre-M1 migration / pre-first-workout). The lock
  // happens at page load — handleCompleteDay's setUser patch fires later and
  // doesn't move this captured value.
  useEffect(() => {
    if (preFineLevel !== null) return;
    if (!user?.gender || !user?.current_bodyweight) return;
    const bench    = user.estimated_one_rep_maxes?.bench    ?? user.current_one_rep_maxes?.bench    ?? 0;
    const squat    = user.estimated_one_rep_maxes?.squat    ?? user.current_one_rep_maxes?.squat    ?? 0;
    const deadlift = user.estimated_one_rep_maxes?.deadlift ?? user.current_one_rep_maxes?.deadlift ?? 0;
    const total = bench + squat + deadlift;
    if (total <= 0) return;
    setPreFineLevel(fineLevel({ sex: user.gender, bodyweight: user.current_bodyweight, total }));
    setPreTotal(total);
  }, [user, preFineLevel]);

  // Reset to screen 1 every time the modal newly opens.
  useEffect(() => {
    if (postWorkoutData) setModalScreen('summary');
  }, [postWorkoutData]);

  // Lazy-fetch all-history when the modal opens. Caller composes the streak
  // stats (day uses raw historySessions; logger applies a synthetic-today
  // patch via useMemo because saveAndExit fires post-dismiss).
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

  const open = (data) => setPostWorkoutData(data);
  const close = () => setPostWorkoutData(null);

  const handleContinue = async () => {
    setContinuing(true);
    try {
      // saveAndGetPBs (parent-provided) returns the POST-update estimated
      // values: in day.jsx flow, handleCompleteDay has already patched
      // user.estimated_one_rep_maxes via setUser BEFORE the modal opened;
      // in logger.jsx flow, the e1rmUpdates path is gap-blocked (documented
      // there) so the returned values are pre-update for quick sessions.
      const oneRMs = await saveAndGetPBs();
      if (!oneRMs) return;
      // mode: "reclassify-only" — the server computes a fresh classification
      // string from these maxes but does NOT write current_one_rep_maxes,
      // estimated_one_rep_maxes, or bodyweight_history. Estimated is the
      // canonical leveling source and was already raised (in day.jsx flow)
      // by processBig3Progression's dotted-path write inside the route.
      const res = await fetch(`${API_URL}/api/users/classification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          gender: user.gender,
          benchPress: oneRMs.bench,
          squat: oneRMs.squat,
          deadlift: oneRMs.deadlift,
          bodyWeight: user.current_bodyweight,
          mode: 'reclassify-only',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(mirrorClassificationResponse({
          user,
          classData: data,
          bodyweight: user.current_bodyweight,
          oneRMs,
          mode: 'reclassify-only',
        }));
      }
    } catch (err) {
      console.error('Post-workout classification flow failed:', err);
    } finally {
      setContinuing(false);
      setModalScreen('classification');
    }
  };

  const handleDone = () => {
    setPostWorkoutData(null);
    navigate(doneNavigate);
  };

  const handleSummaryBackdrop = () => {
    setPostWorkoutData(null);
    onSummaryBackdrop();
  };

  const handleScreen2Backdrop = () => {
    setPostWorkoutData(null);
    navigate(doneNavigate);
  };

  return {
    postWorkoutData,
    modalScreen,
    continuing,
    preFineLevel,
    preTotal,
    historySessions,
    open,
    close,
    handleContinue,
    handleDone,
    handleSummaryBackdrop,
    handleScreen2Backdrop,
  };
}
