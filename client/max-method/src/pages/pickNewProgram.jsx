import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';

const FEATURED = [
  { tag: 'Strength · 12 weeks', name: 'Power Builder',   meta: '4 days/week · Intermediate' },
  { tag: 'Hypertrophy · 8 weeks', name: 'Mass Protocol', meta: '5 days/week · Advanced' },
  { tag: 'Fat Loss · 6 weeks',  name: 'Shred Circuit',   meta: '3 days/week · Beginner' },
];

function PickNewProgram() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { workout } = useWorkout();

  const [formData, setFormData] = useState({ benchPress: '', deadlift: '', squat: '', bodyWeight: '' });

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert("Session error — please sign in again.");
      navigate('/');
      return;
    }

    try {
      const response = await fetch("http://localhost:5050/api/users/classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          gender: user.gender,
          benchPress: Number(formData.benchPress),
          deadlift:   Number(formData.deadlift),
          squat:      Number(formData.squat),
          bodyWeight: Number(formData.bodyWeight),
        }),
      });
      if (!response.ok) throw new Error("Failed to save classification");
      const data = await response.json();
      console.log("Reclassified:", data);

      navigate("/goals", {
        state: {
          classification: data.classification,
          totalOneRepMax: data.totalOneRepMax
        }
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="programs-page">
      <h1 className="programs-page-title">Programs</h1>

      <div className="programs-top-row">

        {/* Left column: classification banner + generate new program */}
        <div className="programs-left-col">
          {workout?.classification && (
            <div className="programs-classification-banner">
              <span className="programs-classification-label">Current Strength Classification</span>
              <span className="programs-classification-value">{workout.classification}</span>
            </div>
          )}

          {/* Section 1: Generate New Program */}
          <div className="programs-section-card programs-section-card--top">
            <div className="programs-section-title">Generate New Program</div>

            <form onSubmit={handleSubmit}>
              <div className="programs-inputs-grid">
                {[
                  { label: 'Bench Press', name: 'benchPress' },
                  { label: 'Deadlift',    name: 'deadlift' },
                  { label: 'Squat',       name: 'squat' },
                  { label: 'Body Weight', name: 'bodyWeight' },
                ].map(({ label, name }) => (
                  <div key={name} className="programs-input-group">
                    <div className="programs-field-label">{label}</div>
                    <div className="programs-input-wrap">
                      <input
                        type="number"
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        placeholder="Enter weight"
                        min="0"
                        required
                      />
                      <span className="programs-unit-tag">LBS</span>
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="programs-btn-primary">Submit</button>
            </form>
          </div>
        </div>{/* end left col */}

        {/* Section 3: Featured Programs */}
        <div className="programs-section-card programs-section-card--top">
          <div className="programs-section-title">Featured Programs</div>
          <div className="programs-grid programs-grid--col1">
            {FEATURED.map(p => (
              <div key={p.name} className="programs-program-card">
                <div className="programs-program-tag">{p.tag}</div>
                <div className="programs-program-name">{p.name}</div>
                <div className="programs-program-meta">{p.meta}</div>
              </div>
            ))}
          </div>
        </div>

      </div>{/* end top row */}

      {/* Section 2: Past Programs */}
      <div className="programs-section-card">
        <div className="programs-section-title">Past Programs</div>
        <div className="programs-empty-state">
          <svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="6" y="8" width="28" height="26" rx="3"/>
            <path d="M13 8V5M27 8V5M6 16h28"/>
            <path d="M13 23h14M13 29h8"/>
          </svg>
          No past programs yet — generate your first one above.
        </div>
      </div>

      {/* Section 4: Create Custom Workout */}
      <div className="programs-footer">
        <button className="programs-btn-secondary" onClick={() => navigate('/customWorkout')}>
          Create Custom Workout
        </button>
      </div>
    </div>
  );
}

export default PickNewProgram;