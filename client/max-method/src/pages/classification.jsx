import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Classification() {
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevents page refresh

    // Convert string inputs to numbers before sending to backend
    const formattedData = {
    ...formData,
    benchPress: Number(formData.benchPress),
    deadlift: Number(formData.deadlift),
    squat: Number(formData.squat),
    bodyWeight: Number(formData.bodyWeight),
    };

    try {
    const response = await fetch("http://localhost:5050/api/users/classification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      throw new Error("Failed to save data");
    }

    const data = await response.json();
    console.log("Saved:", data);
    
    // Navigate to goals page with classification data
    navigate("/goals", { state: data });

  } catch (error) {
    console.error("Error saving data:", error);
  }
  };

  // Saves user input one rep max data to state
  const [formData, setFormData] = useState({
    gender: "",
    benchPress: "",
    deadlift: "",
    squat: "",
    bodyWeight: ""
  });

  // Updates formData state when user inputs data
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="classification-page">

    {/* Classification Page Header */}
    <header>
      <h1>Classification</h1>
    </header>

    {/* Form for user input */}
    <form onSubmit={handleSubmit}>

    {/* Gender Selection and Data Input */}
    <main>
      <p className="subheading">Gender</p>

      <div className="classification-gender-options">
      <label>
        <input
        type="radio"
        name="gender"
        value="male"
        onChange={handleChange}
        required
        />
        Male
      </label>

      <label>
        <input
        type="radio"
        name="gender"
        value="female"
        onChange={handleChange}
        required
        />
        Female
      </label>

      <label>
        <input
        type="radio"
        name="gender"
        value="other"
        onChange={handleChange}
        required
        /> 
        Other
      </label>
      </div>


      <div className="classification-data-grid">
        <div className="classification-data">
          <p>Bench Press</p>
          <div className="input-unit">
          <input 
          type="number"
          name="benchPress"
          value={formData.benchPress}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Deadlift</p>
          <div className="input-unit">
          <input
          type="number"
          name="deadlift"
          value={formData.deadlift}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Squat</p>
          <div className="input-unit">
          <input
          type="number"
          name="squat"
          value={formData.squat}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Body Weight</p>
          <div className="input-unit">
          <input
          type="number"
          name="bodyWeight"
          value={formData.bodyWeight}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>
      </div>

      <div className="classification-submit">
        <button type="submit">Submit</button>
      </div>

    </main>
    </form>
    </div>
  )
}

export default Classification;