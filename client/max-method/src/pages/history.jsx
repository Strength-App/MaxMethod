import { useState, useEffect, useMemo } from 'react';

function resolveWeekValue(value, wi) {
  if (Array.isArray(value)) return value[wi] ?? null;
  return value ?? null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function typeFromTitle(title = '') {
  const t = title.toLowerCase();
  if (t.includes('push'))  return { type: 'push',  color: '#f97316' };
  if (t.includes('pull'))  return { type: 'pull',  color: '#38bdf8' };
  if (t.includes('leg'))   return { type: 'legs',  color: '#4ade80' };
  if (t.includes('arm'))   return { type: 'arms',  color: '#e879f9' };
  if (t.includes('upper')) return { type: 'upper', color: '#60a5fa' };
  if (t.includes('lower')) return { type: 'lower', color: '#4ade80' };
  if (t.includes('core'))  return { type: 'core',  color: '#c084fc' };
  return { type: 'full', color: '#cc0404' };
}

function dateKey(d) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

export default function History() {
  const [view, setView] = useState('timeline');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [modal, setModal] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    fetch(`${import.meta.env.VITE_API_URL}/api/users/workout/${userId}/all-history`)
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(data => {
        setSessions(
          (data.sessions ?? []).map(s => {
            const date = new Date(s.date);
            date.setHours(0, 0, 0, 0);
            const { type, color } = typeFromTitle(s.dayTitle);
            return { ...s, date, type, color };
          })
        );
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  // Build date lookup for calendar
  const sessionMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => { map[dateKey(s.date)] = s; });
    return map;
  }, [sessions]);

  // Stats
  const totalSessions = sessions.length;
  const totalWeeks = useMemo(() =>
    new Set(sessions.map(s => `${s.programTitle ?? 'default'}-${s.weekNumber}`)).size,
  [sessions]);
  const today = new Date(); today.setHours(0,0,0,0);
  const thisMonth = sessions.filter(s => s.date >= new Date(today.getFullYear(), today.getMonth(), 1)).length;

  const streak = useMemo(() => {
    if (!sessions.length) return 0;
    let count = 0;
    const check = new Date(today);
    const keys = new Set(sessions.map(s => dateKey(s.date)));
    while (keys.has(dateKey(check))) {
      count++;
      check.setDate(check.getDate() - 1);
    }
    return count;
  }, [sessions]);

  // Group sessions by month for timeline
  const grouped = useMemo(() => {
    const groups = {};
    sessions.forEach(s => {
      const key = `${s.date.getFullYear()}-${s.date.getMonth()}`;
      if (!groups[key]) groups[key] = { label: `${MONTHS[s.date.getMonth()]} ${s.date.getFullYear()}`, items: [] };
      groups[key].items.push(s);
    });
    return Object.values(groups);
  }, [sessions]);

  const calPrev = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const calNext = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

  return (
    <div className="hist-page">
      {/* Header */}
      <div className="hist-header">
        <h1 className="hist-title">Workout <span>History</span></h1>
        <p className="hist-sub">Every session logged — tap any day to review</p>
      </div>

      {/* Stats */}
      <div className="hist-stats-row">
        <div className="hist-stat-card">
          <div className="hist-stat-val"><span>{totalSessions}</span></div>
          <div className="hist-stat-lbl">Total Sessions</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val"><span>{totalWeeks}</span></div>
          <div className="hist-stat-lbl">Weeks Logged</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val"><span>{thisMonth}</span></div>
          <div className="hist-stat-lbl">This Month</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val"><span>{streak}</span></div>
          <div className="hist-stat-lbl">Day Streak</div>
        </div>
      </div>

      {/* View toggle */}
      <div className="hist-toggle-row">
        <button className={`hist-toggle-btn${view === 'timeline' ? ' hist-toggle-btn--active' : ''}`} onClick={() => setView('timeline')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
          Timeline
        </button>
        <button className={`hist-toggle-btn${view === 'calendar' ? ' hist-toggle-btn--active' : ''}`} onClick={() => setView('calendar')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendar
        </button>
      </div>

      {loading && <div className="hist-empty">Loading history…</div>}

      {/* Timeline View */}
      {!loading && view === 'timeline' && (
        <div className="hist-timeline-view">
          {grouped.length === 0 && (
            <div className="hist-empty">No completed workouts yet — finish a day to see it here.</div>
          )}
          {grouped.map(group => (
            <div key={group.label} className="hist-month-block">
              <div className="hist-month-heading">
                {group.label}
                <span className="hist-month-count">{group.items.length} session{group.items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="hist-timeline">
                {group.items.map((s, i) => (
                  <div key={i} className="hist-tl-item" onClick={() => setModal(s)}>
                    <div className="hist-tl-dot" style={{ background: s.color }} />
                    <div className="hist-tl-date">
                      <div className="hist-tl-day-num">{s.date.getDate()}</div>
                      <div className="hist-tl-day-name">{DAYS_SHORT[s.date.getDay()]}</div>
                    </div>
                    <div className="hist-tl-divider" />
                    <div className="hist-tl-content">
                      <div className="hist-tl-name">
                        <span className={`hist-type-tag hist-type-${s.type}`}>{s.dayTitle}</span>
                      </div>
                      <div className="hist-tl-chips">
                        {s.slots.slice(0, 3).map((slot, si) => (
                          <span key={si} className="hist-ex-chip">{slot.exercise ?? `Exercise ${si+1}`}</span>
                        ))}
                        {s.slots.length > 3 && <span className="hist-ex-chip">+{s.slots.length - 3} more</span>}
                      </div>
                    </div>
                    <div className="hist-tl-sets">{s.slots.length} exercises</div>
                    <div className="hist-tl-arrow">›</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {!loading && view === 'calendar' && (
        <div className="hist-calendar-view">
          <div className="hist-cal-nav">
            <button className="hist-cal-arrow" onClick={calPrev}>←</button>
            <div className="hist-cal-month-title">{MONTHS[calMonth]} {calYear}</div>
            <button className="hist-cal-arrow" onClick={calNext}>→</button>
          </div>
          <div className="hist-cal-dow-row">
            {DAYS_SHORT.map(d => <div key={d} className="hist-cal-dow">{d}</div>)}
          </div>
          <div className="hist-cal-grid">
            {(() => {
              const firstDay = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const daysInPrev = new Date(calYear, calMonth, 0).getDate();
              const cells = [];

              for (let i = firstDay - 1; i >= 0; i--)
                cells.push(<div key={`prev-${i}`} className="hist-cal-day hist-cal-day--other">{daysInPrev - i}</div>);

              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(calYear, calMonth, d);
                const key = dateKey(date);
                const session = sessionMap[key];
                const isToday = dateKey(date) === dateKey(today);
                cells.push(
                  <div
                    key={d}
                    className={`hist-cal-day${session ? ' hist-cal-day--workout' : ''}${isToday ? ' hist-cal-day--today' : ''}`}
                    onClick={() => session && setModal(session)}
                  >
                    <div className="hist-cal-num">{d}</div>
                    {session && <div className="hist-cal-dot" style={{ background: session.color }} />}
                    {session && <div className="hist-cal-label">{session.dayTitle}</div>}
                  </div>
                );
              }

              const totalCells = firstDay + daysInMonth;
              const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
              for (let i = 1; i <= remainder; i++)
                cells.push(<div key={`next-${i}`} className="hist-cal-day hist-cal-day--other">{i}</div>);

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="hist-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="hist-modal">
            <div className="hist-modal-handle" />
            <div className="hist-modal-header">
              <div className="hist-modal-date">{DAYS_SHORT[modal.date.getDay()]}, {MONTHS[modal.date.getMonth()]} {modal.date.getDate()}, {modal.date.getFullYear()}</div>
              <div className="hist-modal-title">{modal.dayTitle}</div>
              {modal.programTitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted, #888)', marginTop: '2px' }}>
                  {modal.programTitle} · Week {modal.weekNumber}
                </div>
              )}
              <div className="hist-modal-stats">
                <div className="hist-modal-stat">
                  <div className="hist-modal-stat-val">{modal.slots.length}</div>
                  <div className="hist-modal-stat-lbl">Exercises</div>
                </div>
              </div>
            </div>
            <div className="hist-modal-body">
              <div className="hist-modal-section-title">Exercise Log</div>
              <div className="hist-exercise-log">
                {modal.slots.map((slot, si) => {
                  const wi = modal.weekIndex ?? 0;
                  const setsVal = resolveWeekValue(slot.sets, wi);
                  const setCount = typeof setsVal === 'number' ? setsVal : (parseInt(setsVal) || 0);
                  const repsRaw = resolveWeekValue(slot.reps, wi);
                  const repsArray = Array.isArray(repsRaw)
                    ? repsRaw
                    : (typeof repsRaw === 'string' && repsRaw.includes(','))
                      ? repsRaw.split(',').map(r => r.trim())
                      : null;
                  const getReps = (j) => repsArray ? (repsArray[j] ?? repsArray[repsArray.length - 1]) : repsRaw;

                  return (
                    <div key={si} className="hist-log-item">
                      <div className="hist-log-name">
                        {slot.exercise ?? `Exercise ${si+1}`}
                        {slot.prHit && (
                          <span className="hist-pr-badge">PR · {slot.prWeight} lbs</span>
                        )}
                      </div>
                      <div className="hist-log-sets">
                        {Array.from({ length: setCount }, (_, j) => {
                          if (!slot.completedSets?.[j]) return null;
                          const isCardioSlot = slot.label === 'Cardio';
                          return (
                            <div key={j} className="hist-log-set-row">
                              <div className="hist-log-set-num">{j+1}</div>
                              {isCardioSlot ? (
                                <>
                                  <div className="hist-log-set-val"><span>{slot.cardioTimes?.[j] ?? '—'}</span> time</div>
                                  <div className="hist-log-set-val"><span>{slot.cardioIntensities?.[j] ?? '—'}</span> intensity</div>
                                  <div className="hist-log-set-val"><span>{slot.cardioDistances?.[j] ?? '—'}</span> dist</div>
                                </>
                              ) : (
                                <>
                                  <div className="hist-log-set-val"><span>{slot.actualReps?.[j] ?? getReps(j) ?? '—'}</span> reps</div>
                                  <div className="hist-log-set-val"><span>{slot.actualWeights?.[j] ?? slot.weightNote ?? '—'}</span> lbs</div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {modal.slots.length === 0 && <p className="hist-empty">No exercises logged.</p>}
              </div>
            </div>
            <button className="hist-modal-close" onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
