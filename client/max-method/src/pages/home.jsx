import { useNavigate } from 'react-router-dom';

const WEEKS = 4;
const DAYS_PER_WEEK = 3;

function Home() {
  const navigate = useNavigate();

  const weeks = Array.from({ length: WEEKS }, (_, i) => i + 1);
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, i) => i + 1);

  const handleDayClick = (weekNum, dayNum) => {
    navigate(`/day/${weekNum}/${dayNum}`);
  };

  return (
    <div className="home-page-container">
      <h1>Current Program</h1>
      <div className = "fitness-level-container">
        <h2>Current Fitness Level:</h2>
      </div>
      <div className="schedule-table">
        {weeks.map((weekNum) => (
          <div key={weekNum} className="schedule-week">
            <h2 className="week-heading">Week {weekNum}</h2>
            <div className="week-days">
              {days.map((dayNum) => (
                <button
                  key={dayNum}
                  type="button"
                  className="day-cell"
                  onClick={() => handleDayClick(weekNum, dayNum)}
                >
                  Day {dayNum}
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
