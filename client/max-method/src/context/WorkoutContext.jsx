import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [userId, setUserIdState] = useState(() => localStorage.getItem('userId'));
  const [workout, setWorkout] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [log, setLog] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateLogTimer = useRef(null);

  const setUserId = useCallback((id) => {
    localStorage.setItem('userId', id);
    setUserIdState(id);
  }, []);

  // Clears all workout state on logout
  const logoutWorkout = useCallback(() => {
    localStorage.removeItem('userId');
    setUserIdState(null);
    setWorkout(null);
    setLog({});
    setAssignments({});
  }, []);

  const fetchWorkout = useCallback(async (id) => {
    const resolvedId = id ?? userId;
    console.log('fetchWorkout called with:', resolvedId); // DEBUG
    if (!resolvedId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5050/api/users/workout/${resolvedId}`);

      if (res.status === 404) {
        setWorkout(null);
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch workout');

      const data = await res.json();
      console.log('fetchWorkout got data, weeks:', data.weeks?.length); // DEBUG
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

      // Seed log from all weeks
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
      console.log('fetchWorkout seeded log sample (w0,d0,s0):', initialLog[0]?.[0]?.[0]); // DEBUG
      setLog(initialLog);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Re-fetch whenever userId changes (covers both app load and login)
  useEffect(() => {
    console.log('userId effect fired, userId is:', userId); // DEBUG
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

  const updateLog = useCallback(async (weekIdx, dayIdx, slotIdx, field, value) => {
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
      } catch (err) {
        console.error('Failed to save log entry:', err);
      }
    }, 500);
  }, [userId]);

  const completeDay = useCallback(async (weekIdx, dayIdx) => {
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
      setUserId,
      fetchWorkout,
      setExercise,
      updateLog,
      completeDay,
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