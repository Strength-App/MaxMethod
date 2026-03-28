import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useWorkout } from "../context/WorkoutContext";

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { setUserId, fetchWorkout, setActiveProgram } = useWorkout();

  const [formData, setFormData] = useState({
    gender: "",
    bodyWeight: "",
    benchPress: "",
    squat: "",
    deadlift: "",
    daysPerWeek: "",
    goalSelection: "",
  });

  const [loading, setLoading] = useState(false);

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleInput = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = [];
    if (!formData.gender)       missing.push("gender");
    if (!formData.bodyWeight)   missing.push("body weight");
    if (!formData.benchPress)   missing.push("bench press");
    if (!formData.squat)        missing.push("squat");
    if (!formData.deadlift)     missing.push("deadlift");
    if (!formData.daysPerWeek)  missing.push("training days");
    if (!formData.goalSelection) missing.push("training focus");

    if (missing.length) {
      alert("Please complete: " + missing.join(", "));
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Session error — please sign in again.");
      navigate("/");
      return;
    }

    setLoading(true);

    try {
      // Step 1: classify
      const classRes = await fetch("http://localhost:5050/api/users/classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          gender: formData.gender,
          benchPress: Number(formData.benchPress),
          deadlift: Number(formData.deadlift),
          squat: Number(formData.squat),
          bodyWeight: Number(formData.bodyWeight),
        }),
      });

      if (!classRes.ok) throw new Error("Classification failed");
      const classData = await classRes.json();

      // Step 2: goals
      const goalsRes = await fetch("http://localhost:5050/api/users/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          classification: classData.classification,
          daysPerWeek: formData.daysPerWeek,
          goalSelection: formData.goalSelection,
        }),
      });

      if (!goalsRes.ok) {
        const text = await goalsRes.text();
        console.error("Goals error:", text);
        throw new Error("Goals failed");
      }

      const goalsData = await goalsRes.json();
      console.log("Workout generated:", goalsData);

      setUserId(userId);
      setActiveProgram(null);

      const workoutSource =
        goalsData?.weeks?.length > 0
          ? {
              ...goalsData,
              classification: goalsData.classification ?? classData.classification,
              goalSelection: goalsData.goalSelection ?? formData.goalSelection,
              daysPerWeek: goalsData.daysPerWeek ?? Number(formData.daysPerWeek),
            }
          : null;

      await fetchWorkout(userId, workoutSource);
      navigate("/home");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const focusOptions = [
    {
      val: "hypertrophy",
      label: "Muscle Building",
      icon: "💪",
      desc: "Hypertrophy-centered programming built around moderate-to-heavy loading (8–12 reps), progressive overload, and strategic volume accumulation to maximize muscle growth.",
    },
    {
      val: "strength",
      label: "Strength",
      icon: "🏋️",
      desc: "Powerlifting-style periodization built around the squat, bench, and deadlift. Low-rep (1–5), high-intensity sets develop raw strength and improve your total.",
    },
    {
      val: "loseWeight",
      label: "Calorie Burning",
      icon: "🔥",
      desc: "HIIT circuit-based sessions that alternate explosive compound movements with minimal rest to spike heart rate and sustain elevated caloric burn long after the workout ends.",
    },
  ];

  return (
    <div className="onboarding-page">
      <h1 className="onboarding-title">Welcome!</h1>
      <p className="onboarding-subtitle">Tell us about yourself to get started</p>

      <form className="onboarding-card" onSubmit={handleSubmit}>

        {/* ── GENDER ── */}
        <div className="ob-section">
          <div className="ob-section-label">Gender</div>
          <div className="ob-btn-group">
            {["male", "female", "other"].map((g) => (
              <button
                key={g}
                type="button"
                className={`ob-toggle-btn${formData.gender === g ? " active" : ""}`}
                onClick={() => set("gender", g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="ob-divider" />

        {/* ── BODY STATS & 1RMs ── */}
        <div className="ob-section">
          <div className="ob-section-label">Body Stats &amp; 1-Rep Maxes</div>
          <div className="ob-input-grid">
            {[
              { id: "bodyWeight",  label: "Body Weight" },
              { id: "benchPress", label: "Bench Press 1RM" },
              { id: "squat",      label: "Squat 1RM" },
              { id: "deadlift",   label: "Deadlift 1RM" },
            ].map(({ id, label }) => (
              <div key={id} className="ob-input-group">
                <label htmlFor={id}>{label}</label>
                <div className="ob-input-wrap">
                  <input
                    type="number"
                    id={id}
                    name={id}
                    value={formData[id]}
                    onChange={handleInput}
                    placeholder="Enter weight"
                    min="0"
                  />
                  <span className="ob-input-unit">LBS</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ob-divider" />

        {/* ── DAYS PER WEEK ── */}
        <div className="ob-section">
          <div className="ob-section-label">How many days do you train each week?</div>
          <div className="ob-btn-group">
            {["3", "4", "5"].map((d) => (
              <button
                key={d}
                type="button"
                className={`ob-toggle-btn${formData.daysPerWeek === d ? " active" : ""}`}
                onClick={() => set("daysPerWeek", d)}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="ob-divider" />

        {/* ── TRAINING FOCUS ── */}
        <div className="ob-section">
          <div className="ob-section-label">Training Focus</div>
          <div className="ob-focus-grid">
            {focusOptions.map(({ val, label, icon, desc }) => (
              <div
                key={val}
                className={`ob-focus-card${formData.goalSelection === val ? " active" : ""}`}
                onClick={() => set("goalSelection", val)}
              >
                <div className="ob-focus-img">
                  <span className="ob-focus-icon">{icon}</span>
                </div>
                <div className="ob-focus-body">
                  <div className="ob-focus-name">{label}</div>
                  <p className="ob-focus-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ob-divider" />

        {/* ── SUBMIT ── */}
        <div className="ob-section">
          <button type="submit" className="ob-submit-btn" disabled={loading}>
            {loading ? "Building Your Program…" : "Begin My Program"}
          </button>
        </div>

      </form>
    </div>
  );
}

export default Onboarding;
