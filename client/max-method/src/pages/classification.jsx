import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';

function Classification({ formData, setFormData }) {
  const navigate = useNavigate();
  const { user } = useUser();

  // Updates formData state when user inputs data
  const handleChange = (e) => {
    const { name, value } = e.target;

    const updated = {
      ...formData,
      [name]: value
    };

    const benchPressWeight = Number(updated.benchPressWeight);
    const benchRep = Number(updated.benchRep);

    const deadliftWeight = Number(updated.deadliftWeight);
    const deadliftRep = Number(updated.deadliftRep);

    const squatWeight = Number(updated.squatWeight);
    const squatRep = Number(updated.squatRep);


    // Validation For Reps From 1-15
    const isValidBench = benchRep >= 1 && benchRep <= 15;
    const isValidDeadlift = deadliftRep >= 1 && deadliftRep <= 15;
    const isValidSquat = squatRep >= 1 && squatRep <= 15;

    // Estiamted One Rep Max Calculations

    // Bench Press
    if (isValidBench) {
      if (benchRep == 1) {
        updated.benchPress = Math.round((benchPressWeight / 1.0) / 5) * 5;
      }
      else if (benchRep == 2) {
        updated.benchPress = Math.round((benchPressWeight / 0.97) / 5) * 5;
      }
      else if (benchRep == 3) {
        updated.benchPress = Math.round((benchPressWeight / 0.94) / 5) * 5;
      }
      else if (benchRep == 4) {
        updated.benchPress = Math.round((benchPressWeight / 0.92) / 5) * 5;
      }
      else if (benchRep == 5) {
        updated.benchPress = Math.round((benchPressWeight / 0.89) / 5) * 5;
      }
      else if (benchRep == 6) {
        updated.benchPress = Math.round((benchPressWeight / 0.86) / 5) * 5;
      }
      else if (benchRep == 7) {
        updated.benchPress = Math.round((benchPressWeight / 0.83) / 5) * 5;
      }
      else if (benchRep == 8) {
        updated.benchPress = Math.round((benchPressWeight / 0.81) / 5) * 5;
      }
      else if (benchRep == 9) {
        updated.benchPress = Math.round((benchPressWeight / 0.78) / 5) * 5;
      }
      else if (benchRep == 10) {
        updated.benchPress = Math.round((benchPressWeight / 0.75) / 5) * 5;
      }
      else if (benchRep == 11) {
        updated.benchPress = Math.round((benchPressWeight / 0.73) / 5) * 5;
      }
      else if (benchRep == 12) {
        updated.benchPress = Math.round((benchPressWeight / 0.71) / 5) * 5;
      }
      else if (benchRep == 13) {
        updated.benchPress = Math.round((benchPressWeight / 0.70) / 5) * 5;
      }
      else if (benchRep == 14) {
        updated.benchPress = Math.round((benchPressWeight / 0.68) / 5) * 5;
      }
      else if (benchRep == 15) {
        updated.benchPress = Math.round((benchPressWeight / 0.67) / 5) * 5;
      }
    }
    else {
      updated.benchPress = "Please Enter Reps Between 1-15"
    }

    // Deadlift
    if (isValidDeadlift) {
      if (deadliftRep == 1) {
        updated.deadlift = Math.round((deadliftWeight / 1.0) / 5) * 5;
      }
      else if (deadliftRep == 2) {
        updated.deadlift = Math.round((deadliftWeight / 0.97) / 5) * 5;
      }
      else if (deadliftRep == 3) {
        updated.deadlift = Math.round((deadliftWeight / 0.94) / 5) * 5;
      }
      else if (deadliftRep == 4) {
        updated.deadlift = Math.round((deadliftWeight / 0.92) / 5) * 5;
      }
      else if (deadliftRep == 5) {
        updated.deadlift = Math.round((deadliftWeight / 0.89) / 5) * 5;
      }
      else if (deadliftRep == 6) {
        updated.deadlift = Math.round((deadliftWeight / 0.86) / 5) * 5;
      }
      else if (deadliftRep == 7) {
        updated.deadlift = Math.round((deadliftWeight / 0.83) / 5) * 5;
      }
      else if (deadliftRep == 8) {
        updated.deadlift = Math.round((deadliftWeight / 0.81) / 5) * 5;
      }
      else if (deadliftRep == 9) {
        updated.deadlift = Math.round((deadliftWeight / 0.78) / 5) * 5;
      }
      else if (deadliftRep == 10) {
        updated.deadlift = Math.round((deadliftWeight / 0.75) / 5) * 5;
      }
      else if (deadliftRep == 11) {
        updated.deadlift = Math.round((deadliftWeight / 0.73) / 5) * 5;
      }
      else if (deadliftRep == 12) {
        updated.deadlift = Math.round((deadliftWeight / 0.71) / 5) * 5;
      }
      else if (deadliftRep == 13) {
        updated.deadlift = Math.round((deadliftWeight / 0.70) / 5) * 5;
      }
      else if (deadliftRep == 14) {
        updated.deadlift = Math.round((deadliftWeight / 0.68) / 5) * 5;
      }
      else if (deadliftRep == 15) {
        updated.deadlift = Math.round((deadliftWeight / 0.67) / 5) * 5;
      }
    }
    else {
      updated.deadlift = "Please Enter Reps Between 1-15"
    }

    // Squat
    if (isValidSquat) {
      if (squatRep == 1) {
        updated.squat = Math.round((squatWeight / 1.0) / 5) * 5;
      }
      else if (squatRep == 2) {
        updated.squat = Math.round((squatWeight / 0.97) / 5) * 5;
      }
      else if (squatRep == 3) {
        updated.squat = Math.round((squatWeight / 0.94) / 5) * 5;
      }
      else if (squatRep == 4) {
        updated.squat = Math.round((squatWeight / 0.92) / 5) * 5;
      }
      else if (squatRep == 5) {
        updated.squat = Math.round((squatWeight / 0.89) / 5) * 5;
      }
      else if (squatRep == 6) {
        updated.squat = Math.round((squatWeight / 0.86) / 5) * 5;
      }
      else if (squatRep == 7) {
        updated.squat = Math.round((squatWeight / 0.83) / 5) * 5;
      }
      else if (squatRep == 8) {
        updated.squat = Math.round((squatWeight / 0.81) / 5) * 5;
      }
      else if (squatRep == 9) {
        updated.squat = Math.round((squatWeight / 0.78) / 5) * 5;
      }
      else if (squatRep == 10) {
        updated.squat = Math.round((squatWeight / 0.75) / 5) * 5;
      }
      else if (squatRep == 11) {
        updated.squat = Math.round((squatWeight / 0.73) / 5) * 5;
      }
      else if (squatRep == 12) {
        updated.squat = Math.round((squatWeight / 0.71) / 5) * 5;
      }
      else if (squatRep == 13) {
        updated.squat = Math.round((squatWeight / 0.70) / 5) * 5;
      }
      else if (squatRep == 14) {
        updated.squat = Math.round((squatWeight / 0.68) / 5) * 5;
      }
      else if (squatRep == 15) {
        updated.squat = Math.round((squatWeight / 0.67) / 5) * 5;
      }
    }
    else {
      updated.squat = "Please Enter Reps Between 1-15";
    }

    setFormData(updated);
  };

  return (
    <div className="classification-page">

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
                    name="benchPressWeight"
                    value={formData.benchPressWeight}
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
                  <input type="text" value={formData.benchPress} readOnly />
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
                    name="deadliftWeight"
                    value={formData.deadliftWeight}
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
                  <input type="text" value={formData.deadlift} readOnly />
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
                    name="squatWeight"
                    value={formData.squatWeight}
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
                  <input type="text" value={formData.squat} readOnly />
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

        </main>
    </div>
  );
}

export default Classification;