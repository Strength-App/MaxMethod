import { createContext, useContext, useState } from 'react';
import { buildDefaultAssignments, buildBlankLog } from "../data/workoutData";

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  // assignments: which exercise is chosen per day/slot — shared across all weeks
  const [assignments, setAssignments] = useState(buildDefaultAssignments);

  // log: actual weights & notes per week/day/slot
  const [log, setLog] = useState(buildBlankLog);

  function setExercise(dayIdx, slotIdx, exerciseName) {
    setAssignments(prev => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], [slotIdx]: exerciseName },
    }));
  }

  function updateLog(weekIdx, dayIdx, slotIdx, field, value) {
    setLog(prev => ({
      ...prev,
      [weekIdx]: {
        ...prev[weekIdx],
        [dayIdx]: {
          ...prev[weekIdx][dayIdx],
          [slotIdx]: { ...prev[weekIdx][dayIdx][slotIdx], [field]: value },
        },
      },
    }));
  }

  return (
    <WorkoutContext.Provider value={{ assignments, setExercise, log, updateLog }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside <WorkoutProvider>');
  return ctx;
}