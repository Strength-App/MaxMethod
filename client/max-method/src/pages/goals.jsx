import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Goals() {
  const navigate = useNavigate()
  const location = useLocation();
  const classificationData = location.state; // Access classification data passed from Classification page

  const [formData, setFormData] = useState({
        daysPerWeek: "",
        goalSelection: "",
      });
  
  // Updates formData state when user inputs data
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevents page refresh

    const response = await fetch("http://localhost:5050/api/users/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
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

    console.log(
      "Classification Level:", data.classification,
      "Days per Week:", data.daysPerWeek,
      "Goal Selection:", data.goalSelection
    );

        // Navigate to goals page with pick new program data
    navigate("/welcomepage", { state: data });
    };

  return (
    <div className="goals-page">

    {/* Goals Page Header */}
    <header>
      <h1>Goals</h1>
    </header>

    {classificationData && (
        <div className="classification-result">
          <p> Classification Level: {classificationData.classification}</p>
          <p> One Rep Max Total: {classificationData.totalOneRepMax} lbs</p>
        </div>
    )}


    {/* Form for user input */}
    <form onSubmit={handleSubmit}>

    {/* Workout Frequency Selection */}
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
        value="buildMuscle"
        onChange={handleChange}
        required
        /> Build Muscle
      </label>

      <label>
        <input 
        type="radio" 
        name="goalSelection" 
        value="getStronger"
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
  )
}

export default Goals;