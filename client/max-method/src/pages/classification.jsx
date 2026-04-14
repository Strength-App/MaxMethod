import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';

function Classification() {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert string inputs to numbers before sending to backend
    const formattedData = {
      email: user.email,
      gender: formData.gender,
      ...formData,
      benchMax: Number(formData.benchMax),
      deadliftMax: Number(formData.deadliftMax),
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

      // Navigate to goals page with classification data
      navigate("/onboarding", { state: data });
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
    const { name, value } = e.target;

    const updated = {
      ...formData,
      [name]: value
    };

    const benchPress = Number(updated.benchPress);
    const benchRep = Number(updated.benchRep);

    const deadlift = Number(updated.deadlift);
    const deadliftRep = Number(updated.deadliftRep);

    const squat = Number(updated.squat);
    const squatRep = Number(updated.squatRep);

    // Estiamted One Rep Max Calculations

    // Bench Press
    if (benchRep == 1) {
      updated.benchMax = Math.round((benchPress / 1.0) / 5) * 5;
    }
    else if (benchRep == 2) {
      updated.benchMax = Math.round((benchPress / 0.97) / 5) * 5;
    }
    else if (benchRep == 3) {
      updated.benchMax = Math.round((benchPress / 0.94) / 5) * 5;
    }
    else if (benchRep == 4) {
      updated.benchMax = Math.round((benchPress / 0.92) / 5) * 5;
    }
    else if (benchRep == 5) {
      updated.benchMax = Math.round((benchPress / 0.89) / 5) * 5;
    }
    else if (benchRep == 6) {
      updated.benchMax = Math.round((benchPress / 0.86) / 5) * 5;
    }
    else if (benchRep == 7) {
      updated.benchMax = Math.round((benchPress / 0.83) / 5) * 5;
    }
    else if (benchRep == 8) {
      updated.benchMax = Math.round((benchPress / 0.81) / 5) * 5;
    }
    else if (benchRep == 9) {
      updated.benchMax = Math.round((benchPress / 0.78) / 5) * 5;
    }
    else if (benchRep == 10) {
      updated.benchMax = Math.round((benchPress / 0.75) / 5) * 5;
    }
    else if (benchRep == 11) {
      updated.benchMax = Math.round((benchPress / 0.73) / 5) * 5;
    }
    else if (benchRep == 12) {
      updated.benchMax = Math.round((benchPress / 0.71) / 5) * 5;
    }
    else if (benchRep == 13) {
      updated.benchMax = Math.round((benchPress / 0.70) / 5) * 5;
    }
    else if (benchRep == 14) {
      updated.benchMax = Math.round((benchPress / 0.68) / 5) * 5;
    }
    else if (benchRep == 15) {
      updated.benchMax = Math.round((benchPress / 0.67) / 5) * 5;
    }

    // Deadlift
    if (deadliftRep == 1) {
      updated.deadliftMax = Math.round((deadlift / 1.0) / 5) * 5;
    }
    else if (deadliftRep == 2) {
      updated.deadliftMax = Math.round((deadlift / 0.97) / 5) * 5;
    }
    else if (deadliftRep == 3) {
      updated.deadliftMax = Math.round((deadlift / 0.94) / 5) * 5;
    }
    else if (deadliftRep == 4) {
      updated.deadliftMax = Math.round((deadlift / 0.92) / 5) * 5;
    }
    else if (deadliftRep == 5) {
      updated.deadliftMax = Math.round((deadlift / 0.89) / 5) * 5;
    }
    else if (deadliftRep == 6) {
      updated.deadliftMax = Math.round((deadlift / 0.86) / 5) * 5;
    }
    else if (deadliftRep == 7) {
      updated.deadliftMax = Math.round((deadlift / 0.83) / 5) * 5;
    }
    else if (deadliftRep == 8) {
      updated.deadliftMax = Math.round((deadlift / 0.81) / 5) * 5;
    }
    else if (deadliftRep == 9) {
      updated.deadliftMax = Math.round((deadlift / 0.78) / 5) * 5;
    }
    else if (deadliftRep == 10) {
      updated.deadliftMax = Math.round((deadlift / 0.75) / 5) * 5;
    }
    else if (deadliftRep == 11) {
      updated.deadliftMax = Math.round((deadlift / 0.73) / 5) * 5;
    }
    else if (deadliftRep == 12) {
      updated.deadliftMax = Math.round((deadlift / 0.71) / 5) * 5;
    }
    else if (deadliftRep == 13) {
      updated.deadliftMax = Math.round((deadlift / 0.70) / 5) * 5;
    }
    else if (deadliftRep == 14) {
      updated.deadliftMax = Math.round((deadlift / 0.68) / 5) * 5;
    }
    else if (deadliftRep == 15) {
      updated.deadliftMax = Math.round((deadlift / 0.67) / 5) * 5;
    }

    // Squat
    if (squatRep == 1) {
      updated.squatMax = Math.round((squat / 1.0) / 5) * 5;
    }
    else if (squatRep == 2) {
      updated.squatMax = Math.round((squat / 0.97) / 5) * 5;
    }
    else if (squatRep == 3) {
      updated.squatMax = Math.round((squat / 0.94) / 5) * 5;
    }
    else if (squatRep == 4) {
      updated.squatMax = Math.round((squat / 0.92) / 5) * 5;
    }
    else if (squatRep == 5) {
      updated.squatMax = Math.round((squat / 0.89) / 5) * 5;
    }
    else if (squatRep == 6) {
      updated.squatMax = Math.round((squat / 0.86) / 5) * 5;
    }
    else if (squatRep == 7) {
      updated.squatMax = Math.round((squat / 0.83) / 5) * 5;
    }
    else if (squatRep == 8) {
      updated.squatMax = Math.round((squat / 0.81) / 5) * 5;
    }
    else if (squatRep == 9) {
      updated.squatMax = Math.round((squat / 0.78) / 5) * 5;
    }
    else if (squatRep == 10) {
      updated.squatMax = Math.round((squat / 0.75) / 5) * 5;
    }
    else if (squatRep == 11) {
      updated.squatMax = Math.round((squat / 0.73) / 5) * 5;
    }
    else if (squatRep == 12) {
      updated.squatMax = Math.round((squat / 0.71) / 5) * 5;
    }
    else if (squatRep == 13) {
      updated.squatMax = Math.round((squat / 0.70) / 5) * 5;
    }
    else if (squatRep == 14) {
      updated.squatMax = Math.round((squat / 0.68) / 5) * 5;
    }
    else if (squatRep == 15) {
      updated.squatMax = Math.round((squat / 0.67) / 5) * 5;
    }

    setFormData(updated);
  };

  return (
    <div className="classification-page">
      <header>
        <h1>Classification</h1>
      </header>

      <form onSubmit={handleSubmit}>
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
            <div className="lift-row">

              <div className="classification-data">
                <p>Bench Press Weight</p>
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
                <p>Bench Press Reps</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="benchRep"
                    value={formData.benchRep}
                    onChange={handleChange}
                    placeholder="Enter reps"
                    min="0"
                    max="15"
                    required
                  />
                  <span>reps</span>
                </div>
              </div>

              <div className="classification-data">
                <p>Estimated Bench Press One Rep Max</p>
                <div className="input-unit">
                  <input type="text" value={formData.benchMax} readOnly />
                  <span>lbs</span>
                </div>
              </div>

            </div>
            

            <div className="lift-row">

              <div className="classification-data">
                <p>Deadlift Weight</p>
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
                <p>Deadlift Reps</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="deadliftRep"
                    value={formData.deadliftRep}
                    onChange={handleChange}
                    placeholder="Enter reps"
                    min="0"
                    max="15"
                    required
                  />
                  <span>reps</span>
                </div>
              </div>

              <div className="classification-data">
                <p>Estimated Deadlift One Rep Max</p>
                <div className="input-unit">
                  <input type="text" value={formData.deadliftMax} readOnly />
                  <span>lbs</span>
                </div>
              </div>
            </div>

            <div className="lift-row"> 
              <div className="classification-data">
                <p>Squat Weight</p>
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
                <p>Squat Reps</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="squatRep"
                    value={formData.squatRep}
                    onChange={handleChange}
                    placeholder="Enter reps"
                    min="0"
                    max="15"
                    required
                  />
                  <span>reps</span>
                </div>
              </div>

              <div className="classification-data">
                <p>Estimated Squat One Rep Max</p>
                <div className="input-unit">
                  <input type="text" value={formData.squatMax} readOnly />
                  <span>lbs</span>
                </div>
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
  );
}

export default Classification;