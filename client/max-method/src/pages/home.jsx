import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';

function Home() {
  const navigate = useNavigate();
  const { workout, loading, error } = useWorkout();

  if (loading) return <p>Loading your program...</p>;
  if (error) return <p>Error loading workout: {error}</p>;
  if (!workout) return <p>No workout found. Please complete onboarding first.</p>;

  const weeks = Array.from({ length: workout.weeks.length }, (_, i) => i + 1);

  return (
    <div className="home-page-container">
      <h1>Current Program</h1>
      <div className="fitness-level-container">
        <h2>Current Fitness Level: {workout.classification}</h2>
      </div>
      <div className="schedule-table">
        {weeks.map((weekNum) => (
          <div key={weekNum} className="schedule-week">
            <h2 className="week-heading">Week {weekNum}</h2>
            <div className="week-days">
              {workout.weeks[weekNum - 1].days.map((day, di) => (
                <button
                  key={di}
                  type="button"
                  className={`day-cell ${day.completed ? 'day-cell--completed' : ''}`}
                  onClick={() => navigate(`/day/${weekNum}/${di + 1}`)}
                >
                  {day.title ?? `Day ${di + 1}`}
                  {day.completed && <span className="completed-badge">✓</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;