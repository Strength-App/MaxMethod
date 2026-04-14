import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

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

function Goals() {
  const navigate = useNavigate();
  const location = useLocation();
  const classificationData = location.state;

  const [formData, setFormData] = useState({
    daysPerWeek: "",
    goalSelection: "",
  });

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    const missing = [];
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
        source: "goals",
        userId,
        classification: classificationData.classification,
        daysPerWeek: formData.daysPerWeek,
        goalSelection: formData.goalSelection,
      },
    });
  };

  return (
    <div className="onboarding-page">
      <h1 className="onboarding-title">Set Your Goals</h1>
      <p className="onboarding-subtitle">Customize your program before we build it</p>

      <form className="onboarding-card" onSubmit={handleSubmit}>

        {/* ── CLASSIFICATION RESULT ── */}
        {classificationData && (
          <>
            <div className="ob-section">
              <div className="ob-section-label">Your Strength Profile</div>
              <div className="rp-classification-banner">
                <span className="rp-classification-label">Classification</span>
                <span className="rp-classification-value">{classificationData.classification}</span>
              </div>
              {classificationData.totalOneRepMax != null && (
                <p style={{ marginTop: "0.5rem", color: "var(--text-secondary, #aaa)", fontSize: "0.85rem" }}>
                  Combined 1RM Total: <strong style={{ color: "var(--text-primary, #fff)" }}>{classificationData.totalOneRepMax} lbs</strong>
                </p>
              )}
            </div>
            <div className="ob-divider" />
          </>
        )}

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
            Build My Program
          </button>
        </div>

      </form>
    </div>
  );
}

export default Goals;
