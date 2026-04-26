import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useUser();

  // add isBeginner
  const [formData, setFormData] = useState({
    gender: "",
    bodyWeight: "",
    benchPress: "",
    squat: "",
    deadlift: "",
    daysPerWeek: "",
    goalSelection: "",
    isBeginner: false,
  });

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (prev.isBeginner && name === "bodyWeight") {
        const bw = Number(value) || 0;
        next.benchPress = Math.round(bw * 0.30).toString();
        next.squat = Math.round(bw * 0.50).toString();
        next.deadlift = Math.round(bw * 0.75).toString();
      }
      return next;
    });
  };

  const handleFillDefaults = () => {
    setFormData((prev) => {
      if (prev.isBeginner) {
        return { ...prev, isBeginner: false };
      }
      const bw = prev.bodyWeight || "100";
      const bwNum = Number(bw);
      return {
        ...prev,
        isBeginner: true,
        bodyWeight: bw,
        benchPress: Math.round(bwNum * 0.30).toString(),
        squat: Math.round(bwNum * 0.50).toString(),
        deadlift: Math.round(bwNum * 0.75).toString(),
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const missing = [];
    if (!formData.gender)        missing.push("gender");
    if (!formData.bodyWeight)    missing.push("body weight");
    if (!formData.benchPress)    missing.push("bench press");
    if (!formData.squat)         missing.push("squat");
    if (!formData.deadlift)      missing.push("deadlift");
    if (!formData.daysPerWeek)   missing.push("training days");
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

    navigate("/loading", {
      state: {
        source: 'onboarding',
        userId,
        email: user.email,
        gender: formData.gender,
        benchPress: Number(formData.benchPress),
        squat: Number(formData.squat),
        deadlift: Number(formData.deadlift),
        bodyWeight: Number(formData.bodyWeight),
        daysPerWeek: formData.daysPerWeek,
        goalSelection: formData.goalSelection,
        isBeginner: formData.isBeginner,
      }
    });
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
          <div className="ob-section-header">
            <div className="ob-section-label">Body Stats &amp; 1-Rep Maxes</div>
            <button 
              type="button" 
              className={`ob-beginner-btn${formData.isBeginner ? " active" : ""}`} 
              onClick={handleFillDefaults}
            >
              {formData.isBeginner ? "Deactivate Beginner Mode" : "Beginner? Enter Body Weight. (Fill Defaults)"}
              {formData.isBeginner && formData.bodyWeight ? " (Body Weight: " + formData.bodyWeight + " lbs)" : ""}
            </button>
          </div>
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
                    readOnly={formData.isBeginner && (id === "benchPress" || id === "squat" || id === "deadlift")}
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
          <button type="submit" className="ob-submit-btn">
            Begin My Program
          </button>
        </div>

      </form>
    </div>
  );
}

export default Onboarding;
