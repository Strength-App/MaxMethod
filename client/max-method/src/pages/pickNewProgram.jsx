import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';

const FEATURED = [
  { tag: 'Strength · 12 weeks', name: 'Power Builder',   meta: '4 days/week · Intermediate' },
  { tag: 'Hypertrophy · 8 weeks', name: 'Mass Protocol', meta: '5 days/week · Advanced' },
  { tag: 'Fat Loss · 6 weeks',  name: 'Shred Circuit',   meta: '3 days/week · Beginner' },
];


function PickNewProgram() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { workout, deselectProgram } = useWorkout();

  const [formData, setFormData] = useState({
    benchPress: '',
    deadlift: '',
    squat: '',
    bodyWeight: '',
  });
  const [myPrograms, setMyPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch programs from DB on mount
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`${API_URL}/api/users/program-logs/${userId}`)
      .then(res => res.json())
      .then(data => {
        setMyPrograms(data);
        setLoadingPrograms(false);
      })
      .catch(err => {
        console.error("Failed to load programs:", err);
        setLoadingPrograms(false);
      });
  }, []);

  const deleteProgram = async (e, programLogId) => {
    e.stopPropagation();
    const userId = localStorage.getItem('userId');

    try {
      await fetch(`${API_URL}/api/users/program-logs/${programLogId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      setMyPrograms(prev => prev.filter(p => p._id !== programLogId));
    } catch (err) {
      console.error("Failed to delete program:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert("Session error — please sign in again.");
      navigate('/');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/users/classification`, {
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
      setSubmitting(false);
    }
  };

const handleSelectProgram = (p) => {
  navigate(`/view-program/${p._id}`, { state: { program: p } });
};

  return (
    <div className="programs-page">
      <h1 className="programs-page-title">Programs</h1>

      {/* Deselect banner — shown above generate form when a program is active */}
      {workout && (
        <div className="programs-deselect-bar">
          <span className="programs-deselect-label">
            Active: <strong>{workout.title ?? 'Current Program'}</strong>
          </span>
          <button className="programs-btn-outline" onClick={deselectProgram}>
            Deselect Program
          </button>
        </div>
      )}

      {/* Generate New Program */}
      <div className="programs-section-card">
        {workout?.classification && (
          <div className="programs-classification-banner" style={{ marginBottom: '20px' }}>
            <span className="programs-classification-label">Current Strength Classification</span>
            <span className="programs-classification-value">{workout.classification}</span>
          </div>
        )}
        <div className="programs-section-title">Generate New Program</div>

        <form onSubmit={handleSubmit}>
          <div className="programs-inputs-grid">
            {[
              { label: 'Bench Press 1RM', name: 'benchPress', unit: 'lbs' },
              { label: 'Deadlift 1RM',   name: 'deadlift',   unit: 'lbs' },
              { label: 'Squat 1RM',      name: 'squat',      unit: 'lbs' },
              { label: 'Body Weight',    name: 'bodyWeight', unit: 'lbs' },
            ].map(({ label, name, unit }) => (
              <div key={name} className="programs-input-group">
                <div className="programs-field-label">{label}</div>
                <div className="programs-input-wrap">
                  <input
                    type="number"
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder="Enter Amount"
                    min="0"
                    required
                  />
                  <span className="programs-unit-tag">{unit.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="programs-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>

      {/* My Programs */}
      <div className="programs-section-card">
        <div className="programs-section-title">My Programs</div>

        {loadingPrograms ? (
          <div className="programs-empty-state">Loading programs...</div>
        ) : myPrograms.length === 0 ? (
          <div className="programs-empty-state">
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="8" width="28" height="26" rx="3"/>
              <path d="M13 8V5M27 8V5M6 16h28"/>
              <path d="M13 23h14M13 29h8"/>
            </svg>
            No programs yet — generate your first one above.
          </div>
        ) : (
          <div className="programs-grid">
            {myPrograms.map((p) => {
              const isActive = p.isActive;
              return (
                <div
                  key={p._id}
                  className="programs-program-card"
                  style={{ cursor: 'pointer', position: 'relative' }}
                  onClick={() => handleSelectProgram(p)}
                >
                  {isActive && (
                    <span
                      title="Currently active"
                      style={{
                        position: 'absolute', top: '8px', left: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'var(--accent, #e63946)',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteProgram(e, p._id)}
                    title="Delete program"
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted, #888)', padding: '4px',
                      lineHeight: 1, borderRadius: '4px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <div className="programs-program-tag" style={{ paddingLeft: '26px' }}>
                    {p.type === 'custom' ? 'Custom' : 'Generated'} · {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                  <div className="programs-program-name">{p.title}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Programs — moved below My Programs */}
      <div className="programs-section-card">
        <div className="programs-section-title">Featured Programs</div>
        <div className="programs-grid">
          {FEATURED.map(p => (
            <div key={p.name} className="programs-program-card">
              <div className="programs-program-tag">{p.tag}</div>
              <div className="programs-program-name">{p.name}</div>
              <div className="programs-program-meta">{p.meta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="programs-footer">
        <button className="programs-btn-secondary" onClick={() => navigate('/customWorkout')}>
          Create Custom Workout
        </button>
      </div>
    </div>
  );
}

export default PickNewProgram;
