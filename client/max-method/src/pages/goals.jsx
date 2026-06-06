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

/**
 * The "Set Your Goals" screen.
 *
 * This is the last step before the app builds a personalized program. It
 * arrives carrying the user's strength-test result (their classification, e.g.
 * "Intermediate", and optionally their combined one-rep-max total), which it
 * shows back to them as a "Your Strength Profile" banner.
 *
 * The user then makes two choices: how many days a week they want to train
 * (3, 4, or 5) and what their training focus is (muscle building, strength, or
 * calorie burning). When they press "Build My Program", the screen makes sure
 * both choices are filled in and that they're still signed in, then sends them
 * to the loading screen along with all of those answers so the program can be
 * generated. If something is missing it shows a reminder; if their sign-in has
 * been lost it sends them back to the start.
 */
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
              <div className="ob-section-label" id="goals-classification-label">Your Strength Profile</div>
              <div
                className="rp-classification-banner"
                role="group"
                aria-labelledby="goals-classification-label"
              >
                <span className="rp-classification-label">Classification</span>
                <span className="rp-classification-value">{classificationData.classification}</span>
              </div>
              {classificationData.totalOneRepMax != null && (
                <p style={{ marginTop: "0.5rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                  Combined 1RM Total: <strong style={{ color: "var(--text)" }}>{classificationData.totalOneRepMax} lbs</strong>
                </p>
              )}
            </div>
            <div className="ob-divider" aria-hidden="true" />
          </>
        )}

        {/* ── DAYS PER WEEK ── */}
        <div className="ob-section">
          <div className="ob-section-label" id="goals-days-label">How many days do you train each week?</div>
          <div
            className="ob-btn-group"
            role="radiogroup"
            aria-labelledby="goals-days-label"
          >
            {["3", "4", "5"].map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={formData.daysPerWeek === d}
                className={`ob-toggle-btn${formData.daysPerWeek === d ? " active" : ""}`}
                onClick={() => set("daysPerWeek", d)}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="ob-divider" aria-hidden="true" />

        {/* ── TRAINING FOCUS ── */}
        <div className="ob-section">
          <div className="ob-section-label" id="goals-focus-label">Training Focus</div>
          <div
            className="ob-focus-grid"
            role="radiogroup"
            aria-labelledby="goals-focus-label"
          >
            {focusOptions.map(({ val, label, icon, desc }) => {
              const selected = formData.goalSelection === val;
              const onActivate = () => set("goalSelection", val);
              const onKeyDown = (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onActivate();
                }
              };
              return (
                <div
                  key={val}
                  role="radio"
                  tabIndex={0}
                  aria-checked={selected}
                  aria-labelledby={`goals-focus-name-${val}`}
                  aria-describedby={`goals-focus-desc-${val}`}
                  className={`ob-focus-card${selected ? " active" : ""}`}
                  onClick={onActivate}
                  onKeyDown={onKeyDown}
                >
                  <div className="ob-focus-img">
                    <span className="ob-focus-icon" aria-hidden="true">{icon}</span>
                  </div>
                  <div className="ob-focus-body">
                    <div className="ob-focus-name" id={`goals-focus-name-${val}`}>{label}</div>
                    <p className="ob-focus-desc" id={`goals-focus-desc-${val}`}>{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ob-divider" aria-hidden="true" />

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
