import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { useUser } from '../context/UserContext';
import { API_URL } from '../config/api';

const MESSAGES = [
  'Analyzing your strength profile…',
  'Selecting optimal exercises…',
  'Structuring your training weeks…',
  'Calibrating progressive overload…',
  'Finalizing your program…',
];

function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserId, setActiveProgram } = useWorkout();
  const { user, setUser } = useUser();
  const [msgIndex, setMsgIndex] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const state = location.state;

    if (!state?.source) {
      navigate('/home');
      return;
    }

    const run = async () => {
      try {
        const { source } = state;

        if (source === 'onboarding') {
          const { userId, email, gender, benchPress, squat, deadlift, bodyWeight, daysPerWeek, goalSelection, isBeginner } = state;

          const classRes = await fetch(`${API_URL}/api/users/classification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, gender, benchPress, deadlift, squat, bodyWeight, isBeginner }),
          });
          if (!classRes.ok) throw new Error('Classification failed');
          const classData = await classRes.json();

          // Mirror server state into UserContext so home / settings / post-workout
          // displays render correctly without requiring log-out + log-in. Third
          // application of the established pattern (pickNewProgram.jsx,
          // day.jsx + logger.jsx handleContinue, here). Includes gender (onboarding
          // is the first flow to set it — not in pickNewProgram's precedent shape)
          // and onboarding_complete: true optimistically (server flips it inside
          // /goals which fires immediately next).
          setUser({
            ...user,
            gender,
            current_bodyweight: Number(bodyWeight),
            current_one_rep_maxes: {
              bench: Number(benchPress),
              squat: Number(squat),
              deadlift: Number(deadlift),
            },
            current_classification: classData.classification,
            onboarding_complete: true,
          });

          const goalsRes = await fetch(`${API_URL}/api/users/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, classification: classData.classification, daysPerWeek, goalSelection, isBeginner }),
          });
          if (!goalsRes.ok) throw new Error('Goals failed');
          const goalsData = await goalsRes.json();

          setUserId(userId);
          setActiveProgram(null);

          navigate('/review-program', {
            replace: true,
            state: {
              workoutLogId: goalsData.workoutId.toString(),
              weeks: goalsData.weeks,
              userId,
              classification: goalsData.classification,
            }
          });

        } else if (source === 'goals') {
          const { userId, classification, daysPerWeek, goalSelection } = state;

          const goalsRes = await fetch(`${API_URL}/api/users/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, classification, daysPerWeek, goalSelection }),
          });
          if (!goalsRes.ok) throw new Error('Goals failed');
          const data = await goalsRes.json();

          navigate('/review-program', {
            replace: true,
            state: {
              workoutLogId: data.workoutId.toString(),
              weeks: data.weeks,
              userId,
              classification: data.classification,
            }
          });

        } else {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        console.error(err);
        alert('Something went wrong. Please try again.');
        navigate(-1);
      }
    };

    run();
  }, []);

  return (
    <div className="loading-page" aria-busy="true">
      <div className="loading-content">
        <div className="loading-logo" aria-hidden="true">MaxMethod</div>
        <div className="loading-spinner-wrap" aria-hidden="true">
          <div className="loading-ring" />
          <div className="loading-ring loading-ring--delay" />
        </div>
        {/* Stable aria-live container so screen readers announce each new
            status message. The inner .loading-message is keyed so React
            re-mounts it for the fade-in animation; the outer container
            stays mounted so the live region remains subscribed. */}
        <div role="status" aria-live="polite" aria-atomic="true">
          <div className="loading-message" key={msgIndex}>
            {MESSAGES[msgIndex]}
          </div>
        </div>
        <div className="loading-sub">Building your personalized program</div>
      </div>
    </div>
  );
}

export default LoadingPage;

