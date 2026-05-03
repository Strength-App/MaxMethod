import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { API_URL } from "../config/api";

const REP_COEFFS = {
  1: 1.0, 2: 0.97, 3: 0.94, 4: 0.92, 5: 0.89,
  6: 0.86, 7: 0.83, 8: 0.81, 9: 0.78, 10: 0.75,
  11: 0.73, 12: 0.71, 13: 0.70, 14: 0.68, 15: 0.67,
};

function estimate1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!w || !r || r < 1 || r > 15) return "";
  return Math.round((w / REP_COEFFS[r]) / 5) * 5;
}

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [step, setStep] = useState(1);
  const [strengthMode, setStrengthMode] = useState(null);
  const [formData, setFormData] = useState({
    gender: "",
    bodyWeight: "",

    benchPressWeight: "",
    benchRep: "",

    deadliftWeight: "",
    deadliftRep: "",

    squatWeight: "",
    squatRep: "",

    daysPerWeek: "",
    goalSelection: "",
    isBeginner: false,
    skipped: false,
  });

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const computeOneRMs = () => {
    if (formData.isBeginner || formData.skipped) {
      const bw = Number(formData.bodyWeight) || 0;
      return {
        benchPress: Math.round(bw * 0.30),
        squat: Math.round(bw * 0.50),
        deadlift: Math.round(bw * 0.75),
      };
    }
    return {
      benchPress: estimate1RM(formData.benchPressWeight, formData.benchRep),
      squat: estimate1RM(formData.squatWeight, formData.squatRep),
      deadlift: estimate1RM(formData.deadliftWeight, formData.deadliftRep),
    };
  };

  const oneRMs = computeOneRMs();

  const selectMode = async (mode) => {
    if (mode === "skip") {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Session error — please sign in again.");
        navigate("/");
        return;
      }

      try {
        await fetch(`${API_URL}/api/users/update/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gender: formData.gender,
            bodyWeight: formData.bodyWeight,
          }),
        });
      } catch (err) {
        console.error("Failed to save profile on skip:", err);
      }

      navigate("/home", { replace: true });
      return;
    }
    setStrengthMode(mode);
    setFormData((prev) => ({
      ...prev,
      isBeginner: mode === "beginner",
      skipped: false,
    }));
  };

  const goNext = () => {
    if (step === 1) {
      const missing = [];
      if (!formData.gender) missing.push("gender");
      if (!formData.bodyWeight) missing.push("body weight");
      if (missing.length) {
        alert("Please complete: " + missing.join(", "));
        return;
      }
    }
    if (step === 2) {
      if (!strengthMode) {
        alert("Pick how you'd like to set your strength baseline.");
        return;
      }
      if (strengthMode === "bestset" && (!oneRMs.benchPress || !oneRMs.squat || !oneRMs.deadlift)) {
        alert("Enter weight and reps (1–15) for each lift.");
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const submitOnboarding = (overrides = {}) => {
    const merged = { ...formData, ...overrides };

    const isSkip = merged.skipped;
    const oneRMsForSubmit = isSkip || merged.isBeginner
      ? (() => {
          const bw = Number(merged.bodyWeight) || 0;
          return {
            benchPress: Math.round(bw * 0.30),
            squat: Math.round(bw * 0.50),
            deadlift: Math.round(bw * 0.75),
          };
        })()
      : {
          benchPress: estimate1RM(merged.benchPressWeight, merged.benchRep),
          squat: estimate1RM(merged.squatWeight, merged.squatRep),
          deadlift: estimate1RM(merged.deadliftWeight, merged.deadliftRep),
        };

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Session error — please sign in again.");
      navigate("/");
      return;
    }

    navigate("/loading", {
      state: {
        source: "onboarding",
        userId,
        email: user.email,
        gender: merged.gender,
        benchPress: Number(oneRMsForSubmit.benchPress),
        squat: Number(oneRMsForSubmit.squat),
        deadlift: Number(oneRMsForSubmit.deadlift),
        bodyWeight: Number(merged.bodyWeight),
        daysPerWeek: merged.daysPerWeek,
        goalSelection: merged.goalSelection,
        isBeginner: merged.isBeginner,
        skipped: merged.skipped,
      },
    });
  };

  const handleSubmit = () => {
    const missing = [];
    if (!formData.daysPerWeek) missing.push("training days");
    if (!formData.goalSelection) missing.push("training focus");
    if (missing.length) {
      alert("Please complete: " + missing.join(", "));
      return;
    }
    submitOnboarding();
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

  const lifts = [
    { key: "bench", label: "Bench Press", weightField: "benchPressWeight", repField: "benchRep", est: oneRMs.benchPress },
    { key: "squat", label: "Squat", weightField: "squatWeight", repField: "squatRep", est: oneRMs.squat },
    { key: "deadlift", label: "Deadlift", weightField: "deadliftWeight", repField: "deadliftRep", est: oneRMs.deadlift },
  ];

  const stepTitle = {
    1: "Tell us about yourself",
    2: "Your strength baseline",
    3: "How you want to train",
  }[step];

  return (
    <div className="onboarding-page">
      <h1 className="onboarding-title">Welcome!</h1>
      <p className="onboarding-subtitle">{stepTitle}</p>

      <ol className="ob-stepper" aria-label="Onboarding progress">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={`ob-step-dot${step === n ? " active" : ""}${step > n ? " done" : ""}`}
            aria-current={step === n ? 'step' : undefined}
          >
            <span aria-hidden="true">{n}</span>
            <span className="sr-only">
              Step {n} of 3{step === n ? ', current' : step > n ? ', completed' : ''}
            </span>
          </li>
        ))}
      </ol>

      <form className="onboarding-card" onSubmit={(e) => e.preventDefault()}>

        {step === 1 && (
          <>
            <div className="ob-section">
              <div className="ob-section-label" id="ob-gender-label">Gender</div>
              <div
                className="ob-btn-group"
                role="radiogroup"
                aria-labelledby="ob-gender-label"
              >
                {["male", "female", "other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={formData.gender === g}
                    className={`ob-toggle-btn${formData.gender === g ? " active" : ""}`}
                    onClick={() => set("gender", g)}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob-divider" aria-hidden="true" />

            <div className="ob-section">
              <div className="ob-section-label" id="ob-bw-label">Body Weight</div>
              <div className="ob-input-grid ob-input-grid--single">
                <div className="ob-input-group">
                  <div className="ob-input-wrap">
                    <input
                      type="number"
                      id="bodyWeight"
                      name="bodyWeight"
                      value={formData.bodyWeight}
                      onChange={handleInput}
                      placeholder="Enter weight"
                      min="0"
                      inputMode="numeric"
                      aria-labelledby="ob-bw-label"
                      aria-describedby="ob-bw-unit"
                    />
                    <span className="ob-input-unit" id="ob-bw-unit">LBS</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="ob-section">
            <div className="ob-section-label">Strength baseline</div>

            <div className="ob-mode-grid" role="radiogroup" aria-label="How to set your strength baseline">
              <button
                type="button"
                role="radio"
                aria-checked={strengthMode === "bestset"}
                className={`ob-mode-card${strengthMode === "bestset" ? " active" : ""}`}
                onClick={() => selectMode("bestset")}
              >
                <svg className="ob-mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 3v18h18" />
                  <rect x="7" y="13" width="3" height="5" />
                  <rect x="12" y="9" width="3" height="9" />
                  <rect x="17" y="5" width="3" height="13" />
                </svg>
                <div className="ob-mode-name">I know my numbers</div>
                <div className="ob-mode-desc">Enter a recent best set</div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={strengthMode === "beginner"}
                className={`ob-mode-card${strengthMode === "beginner" ? " active" : ""}`}
                onClick={() => selectMode("beginner")}
              >
                <svg className="ob-mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2l2.39 5.34L20 8l-4 4.06.94 5.94L12 15.27 7.06 18l.94-5.94L4 8l5.61-.66L12 2z" />
                </svg>
                <div className="ob-mode-name">I'm new to lifting</div>
                <div className="ob-mode-desc">Use bodyweight defaults</div>
              </button>

              {/* "Skip for now" is an action (immediately advances out of step 2),
                   not a baseline-mode toggle. Removed role="radio" so screen readers
                   announce it as a button rather than an unchecked option. */}
              <button
                type="button"
                className="ob-mode-card"
                onClick={() => selectMode("skip")}
                aria-label="Skip strength baseline and use generic defaults"
              >
                <svg className="ob-mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
                <div className="ob-mode-name">Skip for now</div>
                <div className="ob-mode-desc">Use generic defaults</div>
              </button>
            </div>

            {strengthMode === "bestset" && (
              <div className="ob-lift-list">
                {lifts.map((lift) => (
                  <div key={lift.key} className="ob-lift-row">
                    <div className="ob-lift-name">{lift.label}</div>
                    <div className="ob-lift-inputs">
                      <div className="ob-input-wrap ob-lift-input">
                        <input
                          type="number"
                          inputMode="numeric"
                          name={lift.weightField}
                          value={formData[lift.weightField]}
                          onChange={handleInput}
                          placeholder="Weight"
                          aria-label={`${lift.label} weight`}
                          min="0"
                        />
                        <span className="ob-input-unit">LBS</span>
                      </div>
                      <span className="ob-lift-x" aria-hidden="true">×</span>
                      <div className="ob-input-wrap ob-lift-input ob-lift-input--reps">
                        <input
                          type="number"
                          inputMode="numeric"
                          name={lift.repField}
                          value={formData[lift.repField]}
                          onChange={handleInput}
                          placeholder="Reps"
                          aria-label={`${lift.label} reps`}
                          min="1"
                          max="15"
                        />
                        <span className="ob-input-unit">REPS</span>
                      </div>
                    </div>
                    <div className="ob-lift-readout" aria-live="polite">
                      <span className="ob-lift-readout-value">{lift.est || "—"}</span>
                      <span className="ob-lift-readout-label">EST 1RM</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {step === 3 && (
          <>
            <div className="ob-section">
              <div className="ob-section-label" id="ob-days-label">How many days do you train each week?</div>
              <div
                className="ob-btn-group"
                role="radiogroup"
                aria-labelledby="ob-days-label"
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

            <div className="ob-section">
              <div className="ob-section-label" id="ob-focus-label">Training Focus</div>
              <div
                className="ob-focus-grid"
                role="radiogroup"
                aria-labelledby="ob-focus-label"
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
                      aria-labelledby={`ob-focus-name-${val}`}
                      aria-describedby={`ob-focus-desc-${val}`}
                      className={`ob-focus-card${selected ? " active" : ""}`}
                      onClick={onActivate}
                      onKeyDown={onKeyDown}
                    >
                      <div className="ob-focus-img">
                        <span className="ob-focus-icon" aria-hidden="true">{icon}</span>
                      </div>
                      <div className="ob-focus-body">
                        <div className="ob-focus-name" id={`ob-focus-name-${val}`}>{label}</div>
                        <p className="ob-focus-desc" id={`ob-focus-desc-${val}`}>{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="ob-step-nav">
          {step > 1 ? (
            <button type="button" className="ob-back-btn" onClick={goBack}>
              <span aria-hidden="true">←</span> Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          {step < 3 ? (
            <button key="ob-next" type="button" className="ob-submit-btn ob-next-btn" onClick={goNext}>
              Continue <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button key="ob-submit" type="button" className="ob-submit-btn" onClick={handleSubmit}>
              Begin My Program
            </button>
          )}
        </div>

      </form>
    </div>
  );
}

export default Onboarding;
