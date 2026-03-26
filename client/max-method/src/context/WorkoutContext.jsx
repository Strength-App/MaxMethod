import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [userId, setUserIdState] = useState(() => localStorage.getItem('userId'));
  const [workout, setWorkout] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [log, setLog] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [personalBests, setPersonalBests] = useState({});
  // Holds the debounce timer for updateLog
  const updateLogTimer = useRef(null);

  // Saves userId to both localStorage and state
  const setUserId = useCallback((id) => {
    localStorage.setItem('userId', id);
    setUserIdState(id);
  }, []);

  // Explicitly fetch the workout — called by goals.jsx after workout is generated,
  // and on app load if a userId already exists in localStorage
  const fetchWorkout = useCallback(async (id) => {
    const resolvedId = id ?? userId;
    if (!resolvedId) return;

    setLoading(true);
    setError(null);

    try {
      const [res, pbRes] = await Promise.all([
          fetch(`http://localhost:5050/api/users/workout/${resolvedId}`),
          fetch(`http://localhost:5050/api/users/workout/${resolvedId}/personal-bests`)
      ])

      // No workout yet — not an error, user just hasn't completed onboarding
      if (res.status === 404) {
        setWorkout(null);
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch workout');

      const data = await res.json();
      setWorkout(data);

      // Seed assignments from week 1's resolved exercises
      const initialAssignments = {};
      data.weeks[0].days.forEach((day, di) => {
        initialAssignments[di] = {};
        day.slots.forEach((slot, si) => {
          initialAssignments[di][si] = slot.exercise ?? '';
        });
      });
      setAssignments(initialAssignments);

      // Seed log from all weeks -- this is what persists weights week to week
      const initialLog = {};
      data.weeks.forEach((week, wi) => {
        initialLog[wi] = {};
        week.days.forEach((day, di) => {
          initialLog[wi][di] = {};
          day.slots.forEach((slot, si) => {
            initialLog[wi][di][si] = {
              actualWeight: slot.actualWeight ?? '',
              notes: slot.notes ?? ''
            };
          });
        });
      });
      setLog(initialLog);
      console.log("Workout fetched:", data);

      // Set personal bests
      if (pbRes.ok) {
        const pbData = await pbRes.json();
        setPersonalBests(pbData.personal_bests);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // On app load, if a userId is already in localStorage, fetch their workout
  useEffect(() => {
    if (userId) {
      fetchWorkout(userId).then( value => {
        console.log("Workout fetched:", value);
      });
    }
  }, []); // intentionally runs once on mount only

  // Change exercise choice for a day/slot (shared across all weeks)
  const setExercise = useCallback((dayIdx, slotIdx, exerciseName) => {
    setAssignments(prev => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], [slotIdx]: exerciseName },
    }));
  }, []);

  // Update logged weight or notes — optimistic local update + debounced DB write
  const updateLog = useCallback(async (weekIdx, dayIdx, slotIdx, field, value) => {
    // Optimistic local update so the UI feels instant
    setLog(prev => ({
      ...prev,
      [weekIdx]: {
        ...prev[weekIdx],
        [dayIdx]: {
          ...prev[weekIdx]?.[dayIdx],
          [slotIdx]: { ...prev[weekIdx]?.[dayIdx]?.[slotIdx], [field]: value },
        },
      },
    }));

    // Debounce the DB write — wait 500ms after the last keystroke before saving
    clearTimeout(updateLogTimer.current);
    updateLogTimer.current = setTimeout(async () => {
      try {
        await fetch('http://localhost:5050/api/users/workout/log', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            weekNum: weekIdx + 1,
            dayNum: dayIdx + 1,
            slotIdx,
            [field]: value
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

  // Mark a day complete
  const completeDay = useCallback(async (weekIdx, dayIdx) => {
    // Optimistic local update
    setWorkout(prev => {
      const updated = structuredClone(prev);
      updated.weeks[weekIdx].days[dayIdx].completed = true;
      updated.weeks[weekIdx].days[dayIdx].completedAt = new Date().toISOString();
      return updated;
    });

    try {
      await fetch('http://localhost:5050/api/users/workout/complete-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weekNum: weekIdx + 1,
          dayNum: dayIdx + 1
        })
      });
    } catch (err) {
      console.error('Failed to mark day complete:', err);
    }
  }, [userId]);

  return (
    <WorkoutContext.Provider value={{
      workout,
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
      completeDay
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
