import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

function Goals() {
  const navigate = useNavigate();
  const location = useLocation();
  const classificationData = location.state;

  const [formData, setFormData] = useState({
    daysPerWeek: "",
    goalSelection: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert("Session error — please sign in again.");
      navigate('/');
      return;
    }

    navigate('/loading', {
      state: {
        source: 'goals',
        userId,
        classification: classificationData.classification,
        daysPerWeek: formData.daysPerWeek,
        goalSelection: formData.goalSelection,
      }
    });
  };

  return (
    <div className="goals-page">

      <header>
        <h1>Goals</h1>
      </header>

      {classificationData && (
        <div className="classification-result">
          <p>Classification Level: {classificationData.classification}</p>
          <p>One Rep Max Total: {classificationData.totalOneRepMax} lbs</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <main>

          <p className="subheading">How Many Days Do You Workout Each Week?</p>
          <div className="goals-days-options">
            <label>
              <input
                type="radio"
                name="daysPerWeek"
                value="3"
                onChange={handleChange}
                required
              />
              3 Days
            </label>
            <label>
              <input
                type="radio"
                name="daysPerWeek"
                value="4"
                onChange={handleChange}
                required
              />
              4 Days
            </label>
            <label>
              <input
                type="radio"
                name="daysPerWeek"
                value="5"
                onChange={handleChange}
                required
              />
              5 Days
            </label>
          </div>

          <p className="subheading">What Is Your Fitness Goal?</p>
          <div className="goals-workout-options">
            <label>
              <input
                type="radio"
                name="goalSelection"
                value="loseWeight"
                onChange={handleChange}
                required
              /> Lose Weight
            </label>
            <label>
              <input
                type="radio"
                name="goalSelection"
                value="hypertrophy"
                onChange={handleChange}
                required
              /> Build Muscle
            </label>
            <label>
              <input
                type="radio"
                name="goalSelection"
                value="strength"
                onChange={handleChange}
                required
              /> Get Stronger
            </label>
          </div>

          <div className="goals-submit">
            <button type="submit">Submit</button>
          </div>

        </main>
      </form>
    </div>
  );
}

export default Goals;