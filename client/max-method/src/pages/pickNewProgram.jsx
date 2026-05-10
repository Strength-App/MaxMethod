import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { API_URL } from '../config/api';
import UserLevelBadge from '../components/UserLevelBadge';
import { bigThreeTotal, mirrorClassificationResponse } from '../utils/classification';

const FEATURED = [
  { tag: 'Strength · 12 weeks', name: 'Power Builder',   meta: '4 days/week · Intermediate' },
  { tag: 'Hypertrophy · 8 weeks', name: 'Mass Protocol', meta: '5 days/week · Advanced' },
  { tag: 'Fat Loss · 6 weeks',  name: 'Shred Circuit',   meta: '3 days/week · Beginner' },
];


function PickNewProgram() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
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

      // Refresh UserContext so live fine-level displays (home, settings) reflect
      // the new bodyweight + PRs without waiting for a re-login. Server already
      // persisted these fields; we mirror them client-side from the just-submitted form.
      setUser(mirrorClassificationResponse({
        user,
        classData: data,
        bodyweight: formData.bodyWeight,
        oneRMs: {
          bench: Number(formData.benchPress),
          squat: Number(formData.squat),
          deadlift: Number(formData.deadlift),
        },
      }));

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
        <div className="programs-deselect-bar" role="region" aria-label="Active program">
          <span className="programs-deselect-label">
            Active: <strong>{workout.title ?? 'Current Program'}</strong>
          </span>
          <button
            className="programs-btn-outline"
            onClick={deselectProgram}
            aria-label={`Deselect active program: ${workout.title ?? 'Current Program'}`}
          >
            Deselect Program
          </button>
        </div>
      )}

      {/* Generate New Program */}
      <section className="programs-section-card" aria-labelledby="programs-generate-title">
        {user?.current_bodyweight && (
          <div
            className="programs-classification-banner"
            role="group"
            aria-label="Current strength level"
            style={{ marginBottom: '20px' }}
          >
            <UserLevelBadge
              sex={user?.gender}
              bodyweight={user?.current_bodyweight}
              total={bigThreeTotal(user?.current_one_rep_maxes)}
              showProgress={false}
            />
          </div>
        )}
        <div className="programs-section-title" id="programs-generate-title">Generate New Program</div>

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting || undefined}
        >
          <div className="programs-inputs-grid">
            {[
              { label: 'Bench Press 1RM', name: 'benchPress', unit: 'lbs' },
              { label: 'Deadlift 1RM',   name: 'deadlift',   unit: 'lbs' },
              { label: 'Squat 1RM',      name: 'squat',      unit: 'lbs' },
              { label: 'Body Weight',    name: 'bodyWeight', unit: 'lbs' },
            ].map(({ label, name, unit }) => {
              const labelId = `pnp-label-${name}`;
              const unitId = `pnp-unit-${name}`;
              return (
                <div key={name} className="programs-input-group">
                  <div className="programs-field-label" id={labelId}>{label}</div>
                  <div className="programs-input-wrap">
                    <input
                      type="number"
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      placeholder="Enter Amount"
                      min="0"
                      inputMode="numeric"
                      aria-labelledby={labelId}
                      aria-describedby={unitId}
                      required
                    />
                    <span className="programs-unit-tag" id={unitId}>{unit.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="programs-btn-primary"
            disabled={submitting}
            aria-label={submitting ? 'Submitting program details' : 'Submit program details'}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </section>

      {/* My Programs */}
      <section className="programs-section-card" aria-labelledby="programs-mine-title">
        <div className="programs-section-title" id="programs-mine-title">My Programs</div>

        {loadingPrograms ? (
          <div className="programs-empty-state" role="status" aria-live="polite">Loading programs…</div>
        ) : myPrograms.length === 0 ? (
          <div className="programs-empty-state" role="status">
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
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
              const programType = p.type === 'custom' ? 'Custom' : 'Generated';
              const created = new Date(p.createdAt).toLocaleDateString();
              const cardLabel = `Open program: ${p.title}, ${programType}, created ${created}${isActive ? ', currently active' : ''}`;
              const onActivate = () => handleSelectProgram(p);
              const onCardKeyDown = (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onActivate();
                }
              };
              return (
                <div
                  key={p._id}
                  className="programs-program-card"
                  style={{ cursor: 'pointer', position: 'relative' }}
                  onClick={onActivate}
                  onKeyDown={onCardKeyDown}
                  role="button"
                  tabIndex={0}
                  aria-label={cardLabel}
                >
                  {isActive && (
                    <span
                      aria-label="Currently active"
                      role="img"
                      style={{
                        position: 'absolute', top: '8px', left: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'var(--accent, #e63946)',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  )}
                  {/* Real <button> nested inside role="button" parent — same
                      semantically-invalid-but-functional trade-off as the
                      exerciseLibrary custom card. Click + keydown stopPropagation
                      prevent Space/Enter on Delete from also activating the
                      parent. Restructure into sibling buttons logged as follow-up. */}
                  <button
                    onClick={(e) => deleteProgram(e, p._id)}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Delete program: ${p.title}`}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted, #888)', padding: '4px',
                      lineHeight: 1, borderRadius: '4px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <div className="programs-program-tag" aria-hidden="true" style={{ paddingLeft: '26px' }}>
                    {programType} · {created}
                  </div>
                  <div className="programs-program-name" aria-hidden="true">{p.title}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Programs — display-only previews, not interactive */}
      <section className="programs-section-card" aria-labelledby="programs-featured-title">
        <div className="programs-section-title" id="programs-featured-title">Featured Programs</div>
        <div className="programs-grid">
          {FEATURED.map(p => (
            <div
              key={p.name}
              className="programs-program-card"
              role="group"
              aria-label={`${p.name}, ${p.tag}, ${p.meta}`}
            >
              <div className="programs-program-tag" aria-hidden="true">{p.tag}</div>
              <div className="programs-program-name" aria-hidden="true">{p.name}</div>
              <div className="programs-program-meta" aria-hidden="true">{p.meta}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="programs-footer">
        <button className="programs-btn-secondary" onClick={() => navigate('/customWorkout')}>
          Create Custom Workout
        </button>
      </div>
    </div>
  );
}

export default PickNewProgram;
