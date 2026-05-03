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

        <section className="classification-section" aria-labelledby="cls-page-heading">
          <h2 id="cls-page-heading" className="sr-only">Strength baseline</h2>

          <h2 id="cls-gender-heading" className="subheading">Gender</h2>

          <div
            className="classification-gender-options"
            role="radiogroup"
            aria-labelledby="cls-gender-heading"
          >
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
            <div className="lift-row" role="group" aria-labelledby="cls-bench-group">
              <h3 id="cls-bench-group" className="sr-only">Bench press</h3>

              <div className="classification-data">
                <p id="cls-bp-weight">Bench Press Weight</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="benchPressWeight"
                    value={formData.benchPressWeight}
                    onChange={handleChange}
                    placeholder="Enter weight"
                    min="0"
                    inputMode="numeric"
                    aria-labelledby="cls-bp-weight"
                    aria-describedby="cls-bp-weight-unit"
                    required
                  />
                  <span id="cls-bp-weight-unit">lbs</span>
                </div>
              </div>

              <div className="classification-data">
                <p id="cls-bp-reps">Bench Press Reps</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="benchRep"
                    value={formData.benchRep}
                    onChange={handleChange}
                    placeholder="Enter reps"
                    min="0"
                    max="15"
                    inputMode="numeric"
                    aria-labelledby="cls-bp-reps"
                    aria-describedby="cls-bp-reps-unit"
                    required
                  />
                  <span id="cls-bp-reps-unit">reps</span>
                </div>
              </div>

              <div className="classification-data">
                <p id="cls-bp-1rm">Estimated Bench Press One Rep Max</p>
                <div className="input-unit">
                  <input
                    type="text"
                    value={formData.benchPress}
                    readOnly
                    aria-labelledby="cls-bp-1rm"
                    aria-describedby="cls-bp-1rm-unit"
                  />
                  <span id="cls-bp-1rm-unit">lbs</span>
                </div>
              </div>

            </div>


            <div className="lift-row" role="group" aria-labelledby="cls-dl-group">
              <h3 id="cls-dl-group" className="sr-only">Deadlift</h3>

              <div className="classification-data">
                <p id="cls-dl-weight">Deadlift Weight</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="deadliftWeight"
                    value={formData.deadliftWeight}
                    onChange={handleChange}
                    placeholder="Enter weight"
                    min="0"
                    inputMode="numeric"
                    aria-labelledby="cls-dl-weight"
                    aria-describedby="cls-dl-weight-unit"
                    required
                  />
                  <span id="cls-dl-weight-unit">lbs</span>
                </div>
              </div>

              <div className="classification-data">
                <p id="cls-dl-reps">Deadlift Reps</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="deadliftRep"
                    value={formData.deadliftRep}
                    onChange={handleChange}
                    placeholder="Enter reps"
                    min="0"
                    max="15"
                    inputMode="numeric"
                    aria-labelledby="cls-dl-reps"
                    aria-describedby="cls-dl-reps-unit"
                    required
                  />
                  <span id="cls-dl-reps-unit">reps</span>
                </div>
              </div>

              <div className="classification-data">
                <p id="cls-dl-1rm">Estimated Deadlift One Rep Max</p>
                <div className="input-unit">
                  <input
                    type="text"
                    value={formData.deadlift}
                    readOnly
                    aria-labelledby="cls-dl-1rm"
                    aria-describedby="cls-dl-1rm-unit"
                  />
                  <span id="cls-dl-1rm-unit">lbs</span>
                </div>
              </div>
            </div>

            <div className="lift-row" role="group" aria-labelledby="cls-sq-group">
              <h3 id="cls-sq-group" className="sr-only">Squat</h3>

              <div className="classification-data">
                <p id="cls-sq-weight">Squat Weight</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="squatWeight"
                    value={formData.squatWeight}
                    onChange={handleChange}
                    placeholder="Enter weight"
                    min="0"
                    inputMode="numeric"
                    aria-labelledby="cls-sq-weight"
                    aria-describedby="cls-sq-weight-unit"
                    required
                  />
                  <span id="cls-sq-weight-unit">lbs</span>
                </div>
              </div>

              <div className="classification-data">
                <p id="cls-sq-reps">Squat Reps</p>
                <div className="input-unit">
                  <input
                    type="number"
                    name="squatRep"
                    value={formData.squatRep}
                    onChange={handleChange}
                    placeholder="Enter reps"
                    min="0"
                    max="15"
                    inputMode="numeric"
                    aria-labelledby="cls-sq-reps"
                    aria-describedby="cls-sq-reps-unit"
                    required
                  />
                  <span id="cls-sq-reps-unit">reps</span>
                </div>
              </div>

              <div className="classification-data">
                <p id="cls-sq-1rm">Estimated Squat One Rep Max</p>
                <div className="input-unit">
                  <input
                    type="text"
                    value={formData.squat}
                    readOnly
                    aria-labelledby="cls-sq-1rm"
                    aria-describedby="cls-sq-1rm-unit"
                  />
                  <span id="cls-sq-1rm-unit">lbs</span>
                </div>
              </div>
            </div>

            <div className="classification-data">
              <p id="cls-bw-label">Body Weight</p>
              <div className="input-unit">
                <input
                  type="number"
                  name="bodyWeight"
                  value={formData.bodyWeight}
                  onChange={handleChange}
                  placeholder="Enter weight"
                  min="0"
                  inputMode="numeric"
                  aria-labelledby="cls-bw-label"
                  aria-describedby="cls-bw-unit"
                  required
                />
                <span id="cls-bw-unit">lbs</span>
              </div>
            </div>
          </div>

        </section>
    </div>
  );
}

export default Classification;