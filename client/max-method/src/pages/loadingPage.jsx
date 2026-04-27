import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

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
          const { userId, email, gender, benchPress, squat, deadlift, bodyWeight, daysPerWeek, goalSelection } = state;

          const classRes = await fetch(`${import.meta.env.VITE_API_URL}/api/users/classification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, gender, benchPress, deadlift, squat, bodyWeight }),
          });
          if (!classRes.ok) throw new Error('Classification failed');
          const classData = await classRes.json();

          const goalsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/users/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, classification: classData.classification, daysPerWeek, goalSelection }),
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

          const goalsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/users/goals`, {
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
    <div className="loading-page">
      <div className="loading-content">
        <div className="loading-logo">MaxMethod</div>
        <div className="loading-spinner-wrap">
          <div className="loading-ring" />
          <div className="loading-ring loading-ring--delay" />
        </div>
        <div className="loading-message" key={msgIndex}>
          {MESSAGES[msgIndex]}
        </div>
        <div className="loading-sub">Building your personalized program</div>
      </div>
    </div>
  );
}

export default LoadingPage;
