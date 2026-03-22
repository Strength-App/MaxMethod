import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';

function PickNewProgram() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [formData, setFormData] = useState({
    benchPress: "",
    deadlift: "",
    squat: "",
    bodyWeight: ""
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
      alert("Session error — please sign in again.");
      navigate('/');
      return;
    }

    const formattedData = {
      email: user.email,
      benchPress: Number(formData.benchPress),
      deadlift: Number(formData.deadlift),
      squat: Number(formData.squat),
      bodyWeight: Number(formData.bodyWeight),
    };

    try {
      const response = await fetch("http://localhost:5050/api/users/classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) throw new Error("Failed to save classification");

      const data = await response.json();
      console.log("Reclassified:", data);

      // Navigate to goals with classification data
      // Goals will handle generating the new workout and replacing the old one
      navigate("/goals", { 
      state: {
        classification: data.classification,        // ✅ NEW VALUE
        totalOneRepMax: data.totalOneRepMax         // ✅ NEW VALUE
      }
    });

    } catch (error) {
      console.error("Error saving data:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="pick-new-program-page">

      <header>
        <h1>Pick New Program</h1>
      </header>

      <form onSubmit={handleSubmit}>
        <main>

          <div className="pick-new-program-data-grid">
            <div className="pick-new-program-data-row">
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

            <div className="pick-new-program-data-row">
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

            <div className="pick-new-program-data-row">
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

            <div className="pick-new-program-data-row">
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

          <div className="pick-new-program-submit">
            <button type="submit">Submit</button>
          </div>

        </main>
      </form>
    </div>
  );
}

export default PickNewProgram;