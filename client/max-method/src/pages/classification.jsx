import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';

function Classification() {
  const navigate = useNavigate()
  const { user } = useUser()

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevents page refresh

    // Convert string inputs to numbers before sending to backend
    const formattedData = {
      email: user.email,
      gender: formData.gender,
    ...formData,
    benchPress: Number(formData.benchPress),
    benchRep: Number(formData.benchRep),
    benchMax: Number(formData.benchMax),
    deadlift: Number(formData.deadlift),
    deadliftRep: Number(formData.deadliftRep),
    deadliftMax: Number(formData.deadliftMax),
    squat: Number(formData.squat),
    squatRep: Number(formData.squatRep),
    squatMax: Number(formData.squatMax),
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
    benchRep: "",
    benchMax: "",
    deadlift: "",
    deadliftRep: "",
    deadliftMax: "",
    squat: "",
    squatRep: "",
    squatMax: "",
    bodyWeight: ""
  });

  // Updates formData state when user inputs data
  const handleChange = (e) => {
    const updated = setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });


  const bench = Number(updated.benchPress);
  const benchRep = Number(updated.benchRep);

  const deadlift = Number(updated.deadlift);
  const deadliftRep = Number(updated.deadliftRep);

  const squat = Number(updated.squat);
  const squatRep = Number(updated.squatRep);

  // Calculate 1RM (only if values exist)
  updated.benchMax =
    bench && benchRep ? (bench * (1 + benchRep / 30)).toFixed(1) : "";

  updated.deadliftMax =
    deadlift && deadliftRep ? (deadlift * (1 + deadliftRep / 30)).toFixed(1) : "";

  updated.squatMax =
    squat && squatRep ? (squat * (1 + squatRep / 30)).toFixed(1) : "";

  setFormData(updated);
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
          <p>Bench Rep</p>
          <div className="input-unit">
          <input 
          type="number"
          name="benchPress"
          value={formData.benchRep}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Bench Max</p>
          <input type="text" value={formData.benchMax} readOnly />
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
          <p>Deadlift Rep</p>
          <div className="input-unit">
          <input
          type="number"
          name="deadlift"
          value={formData.deadliftRep}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>

         <div className="classification-data">
          <p>Deadlift Max</p>
          <input type="text" value={formData.deadliftMax} readOnly />
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
          <p>Squat Rep</p>
          <div className="input-unit">
          <input
          type="number"
          name="squat"
          value={formData.squatRep}
          onChange={handleChange}
          placeholder="Enter weight"
          min="0"
          required
          />
          <span>lbs</span>
          </div>
        </div>

         <div className="classification-data">
          <p>Squat Max</p>
          <input type="text" value={formData.squatMax} readOnly />
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