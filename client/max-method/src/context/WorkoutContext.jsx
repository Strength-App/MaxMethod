import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../config/api';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [userId, setUserIdState] = useState(() => localStorage.getItem('userId'));
  const [workout, setWorkout] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [log, setLog] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeProgram, setActiveProgramState] = useState(null);
  const [personalBests, setPersonalBests] = useState({});

  const setActiveProgram = useCallback((program) => {
    setActiveProgramState(program);
  }, []);

  // displayWorkout always uses live fetched data — no more localStorage snapshot
  const displayWorkout = workout;

  const updateLogTimer = useRef(null);

  const setUserId = useCallback((id) => {
    localStorage.setItem('userId', id);
    setUserIdState(id);
  }, []);

  const logoutWorkout = useCallback(() => {
    localStorage.removeItem('userId');
    setUserIdState(null);
    setWorkout(null);
    setLog({});
    setAssignments({});
    setActiveProgramState(null);
  }, []);

  const fetchWorkout = useCallback(async (id, preloadedData = null) => {
    const resolvedId = id ?? userId;
    console.log('fetchWorkout called with:', resolvedId);
    if (!resolvedId && !preloadedData) return;

    setLoading(true);
    setError(null);

      try {
        let data;
        if (preloadedData) {
          data = preloadedData;
        } else {
            const [res, pbRes] = await Promise.all([
            fetch(`${API_URL}/api/users/workout/${resolvedId}`),
            fetch(`${API_URL}/api/users/workout/${resolvedId}/personal-bests`)
          ])

          if (res.status === 404) {
            setWorkout(null);
            return;
          }

          if (!res.ok) throw new Error('Failed to fetch workout');

          data = await res.json();
          if (pbRes.ok) {
            const pbData = await pbRes.json();
            setPersonalBests(pbData.personal_bests ?? {});
          }
        }

        console.log('fetchWorkout got data, weeks:', data.weeks?.length);
        setWorkout(data);

        // Seed assignments from week 1's resolved exercises
        const initialAssignments = {};
        data.weeks[0].days.forEach((day, di) => {
          initialAssignments[di] = {};
          (day.slots ?? []).forEach((slot, si) => {
            initialAssignments[di][si] = slot.exercise ?? '';
          });
        });
        setAssignments(initialAssignments);

        // Seed log from all weeks
        const initialLog = {};
        data.weeks.forEach((week, wi) => {
          initialLog[wi] = {};
          week.days.forEach((day, di) => {
            initialLog[wi][di] = {};
            (day.slots ?? []).forEach((slot, si) => {
              initialLog[wi][di][si] = {
                actualWeights: slot.actualWeights ?? [],
                actualReps: slot.actualReps ?? [],
                completedSets: slot.completedSets ?? [],
                cardioTimes: slot.cardioTimes ?? [],
                cardioIntensities: slot.cardioIntensities ?? [],
                cardioDistances: slot.cardioDistances ?? [],
                notes: slot.notes ?? ''
              };
            });
          });
        });
        console.log('fetchWorkout seeded log sample (w0,d0,s0):', initialLog[0]?.[0]?.[0]);
        setLog(initialLog);

        return data;

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },  [userId]);

  // Re-fetch whenever userId changes (covers both app load and login)
  useEffect(() => {
    console.log('userId effect fired, userId is:', userId);
    if (userId) {
      fetchWorkout(userId);
    }
  }, [userId]);

  const setExercise = useCallback((dayIdx, slotIdx, exerciseName) => {
    setAssignments(prev => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], [slotIdx]: exerciseName },
    }));
  }, []);

  const updateLog = useCallback(async (weekIdx, dayIdx, slotIdx, setIdx, field, value) => {
    setLog(prev => {
      const prevSlot = prev[weekIdx]?.[dayIdx]?.[slotIdx] ?? {};
      const updatedSlot = field === 'actualWeight'
        ? { ...prevSlot, actualWeights: { ...prevSlot.actualWeights, [setIdx]: Number(value) } }
        : field === 'actualReps'
        ? { ...prevSlot, actualReps: { ...prevSlot.actualReps, [setIdx]: value } }
        : field === 'setDone'
        ? { ...prevSlot, completedSets: { ...prevSlot.completedSets, [setIdx]: value } }
        : field === 'cardioTime'
        ? { ...prevSlot, cardioTimes: { ...prevSlot.cardioTimes, [setIdx]: value } }
        : field === 'cardioIntensity'
        ? { ...prevSlot, cardioIntensities: { ...prevSlot.cardioIntensities, [setIdx]: value } }
        : field === 'cardioDistance'
        ? { ...prevSlot, cardioDistances: { ...prevSlot.cardioDistances, [setIdx]: value } }
        : { ...prevSlot, [field]: value };

      return {
        ...prev,
        [weekIdx]: {
          ...prev[weekIdx],
          [dayIdx]: {
            ...prev[weekIdx]?.[dayIdx],
            [slotIdx]: updatedSlot,
          }
        }
      };
    });

    clearTimeout(updateLogTimer.current);
    updateLogTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/workout/log`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            weekNum: weekIdx + 1,
            dayNum: dayIdx + 1,
            slotIdx,
            setIdx,
            [field]: field === 'actualWeight' ? Number(value) : value
          })
        });

        const data = await res.json();


        if (data.pbUpdate?.isPersonalBest) {
          setPersonalBests(prev => ({
            ...prev,
            [data.pbUpdate.exercise]: data.pbUpdate.newPersonalBest
          }));
        }

      } catch (err) {
        console.error('Failed to save log entry:', err);
      }
    }, 500);
  }, [userId]);

  // Refreshes WorkoutContext's personalBests state AND returns the freshly-
  // fetched personal_bests object. State-updater AND value-returner contract:
  // callers that need immediate fresh values in the same closure (logger.jsx
  // saveSession → handleContinue) consume the return; callers that just want
  // a UI refresh can ignore it. Returns undefined on no-userId, non-OK
  // response, or thrown fetch error (state stays stale on failure, matching
  // prior behavior). Eliminates the closure-staleness double-fetch workaround
  // that previously lived in logger.jsx handleContinue.
  const refreshPersonalBests = useCallback(async () => {
    const resolvedId = userId;
    if (!resolvedId) return;
    try {
      const res = await fetch(`${API_URL}/api/users/workout/${resolvedId}/personal-bests`);
      if (res.ok) {
        const data = await res.json();
        const pbs = data.personal_bests ?? {};
        setPersonalBests(pbs);
        return pbs;
      }
    } catch (err) {
      console.error('Failed to refresh personal bests:', err);
    }
  }, [userId]);

  const deselectProgram = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch(`${API_URL}/api/users/program-logs/deselect`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.error('Failed to deselect program:', err);
    }
    setWorkout(null);
    setLog({});
    setAssignments({});
  }, [userId]);

  const completeDay = useCallback(async (weekIdx, dayIdx) => {
    setWorkout(prev => {
      const updated = structuredClone(prev);
      updated.weeks[weekIdx].days[dayIdx].completed = true;
      updated.weeks[weekIdx].days[dayIdx].completedAt = new Date().toISOString();
      return updated;
    });

    try {
      const res = await fetch(`${API_URL}/api/users/workout/complete-day`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weekNum: weekIdx + 1,
          dayNum: dayIdx + 1
        })
      });
      await fetchWorkout(userId);
      // Surface the server's e1rmUpdates so day.jsx can patch user.estimated_one_rep_maxes
      // via setUser before the post-workout modal opens (the modal's pre-session
      // capture has already locked in by then; setUser only updates the post-session
      // level math, not pre).
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { e1rmUpdates: data.e1rmUpdates ?? [] };
      }
      return { e1rmUpdates: [] };
    } catch (err) {
      console.error('Failed to mark day complete:', err);
      return { e1rmUpdates: [] };
    }
  }, [userId, fetchWorkout]);

  return (
    <WorkoutContext.Provider value={{
      workout,
      displayWorkout,
      activeProgram,
      setActiveProgram,
      assignments,
      log,
      loading,
      error,
      personalBests,
      setPersonalBests,
      setUserId,
      fetchWorkout,
      setExercise,
      updateLog,
      completeDay,
      deselectProgram,
      refreshPersonalBests,
      logoutWorkout
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside <WorkoutProvider>');
  return ctx;
}
