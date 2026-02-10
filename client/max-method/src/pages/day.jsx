import { useParams } from 'react-router-dom';

function Day() {
  const { weekNum, dayNum } = useParams();

  return (
    <div className="day-page">
      <h1>Week {weekNum} — Day {dayNum}</h1>
      <p>Workout or plan content for this day can go here.</p>
    </div>
  );
}

export default Day;
