import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useWorkout } from "../context/WorkoutContext";

function Goals() {
  const navigate = useNavigate();
  const location = useLocation();
  const classificationData = location.state;
  const { setUserId, fetchWorkout } = useWorkout();

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem('userId');

    if (!userId) {
      console.error("No userId found in localStorage");
      alert("Session error — please sign in again.");
      navigate('/');
      return;
    }

    console.log(classificationData.classification, formData.daysPerWeek, formData.goalSelection);

    const response = await fetch("http://localhost:5050/api/users/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        classification: classificationData.classification,
        daysPerWeek: formData.daysPerWeek,
        goalSelection: formData.goalSelection
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Server error:", text);
      return;
    }

    const data = await response.json();
    console.log("Workout generated:", data);

    // Make sure userId is set in context, then fetch the
    // newly created workout so Home.jsx has it ready
    setUserId(userId);
    await fetchWorkout(userId);

    navigate("/home");
  };

  return (
    <div className="goals-page">

      {/* Goals Page Header */}
      <header>
        <h1>Goals</h1>
      </header>

      {classificationData && (
        <div className="classification-result">
          <p>Classification Level: {classificationData.classification}</p>
          <p>One Rep Max Total: {classificationData.totalOneRepMax} lbs</p>
        </div>
      )}

      {/* Form for user input */}
      <form onSubmit={handleSubmit}>
        <main>

          {/* Workout Frequency Selection */}
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

          {/* Goal Selection */}
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