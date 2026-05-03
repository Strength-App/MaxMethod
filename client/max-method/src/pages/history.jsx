import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { API_URL } from '../config/api';
import { useModalA11y } from '../hooks/useModalA11y';

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

// ISO 8601 (YYYY-MM-DD) for <time dateTime>. Always pads to 4-2-2.
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Capitalized type label for screen readers — derived from typeFromTitle's
// `type` field so a11y labels follow the visible filter logic (single source
// of truth, per F3-A).
function typeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function History() {
  const [view, setView] = useState('timeline');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [modal, setModal] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const closeModalBtnRef = useRef(null);
  const closeModal = useCallback(() => setModal(null), []);
  // Modal a11y: focus trap, Esc to close, return focus on close. Initial
  // focus lands on the Close button (sole interactive control inside).
  const sessionModalRef = useModalA11y({
    isOpen: !!modal,
    onClose: closeModal,
    initialFocusRef: closeModalBtnRef,
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setLoading(false); return; }
    fetch(`${API_URL}/api/users/workout/${userId}/all-history`)
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
      <div className="hist-stats-row" role="group" aria-label="History summary">
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{totalSessions}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">Total Sessions</div>
          <span className="sr-only">Total sessions: {totalSessions}</span>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{totalWeeks}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">Weeks Logged</div>
          <span className="sr-only">Weeks logged: {totalWeeks}</span>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{thisMonth}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">This Month</div>
          <span className="sr-only">This month: {thisMonth} {thisMonth === 1 ? 'session' : 'sessions'}</span>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-val" aria-hidden="true"><span>{streak}</span></div>
          <div className="hist-stat-lbl" aria-hidden="true">Day Streak</div>
          <span className="sr-only">Day streak: {streak}</span>
        </div>
      </div>

      {/* View toggle — tablist; tabs are buttons in normal Tab order (no
          arrow-key roving for simplicity). Each tab points at its panel
          via aria-controls. */}
      <div className="hist-toggle-row" role="tablist" aria-label="History view">
        <button
          id="hist-tab-timeline"
          role="tab"
          aria-selected={view === 'timeline'}
          aria-controls="hist-panel-timeline"
          className={`hist-toggle-btn${view === 'timeline' ? ' hist-toggle-btn--active' : ''}`}
          onClick={() => setView('timeline')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
          Timeline
        </button>
        <button
          id="hist-tab-calendar"
          role="tab"
          aria-selected={view === 'calendar'}
          aria-controls="hist-panel-calendar"
          className={`hist-toggle-btn${view === 'calendar' ? ' hist-toggle-btn--active' : ''}`}
          onClick={() => setView('calendar')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendar
        </button>
      </div>

      {loading && <div className="hist-empty" role="status" aria-live="polite">Loading history…</div>}

      {/* Timeline View */}
      {!loading && view === 'timeline' && (
        <div
          className="hist-timeline-view"
          id="hist-panel-timeline"
          role="tabpanel"
          aria-labelledby="hist-tab-timeline"
        >
          {grouped.length === 0 && (
            <div className="hist-empty" role="status">No completed workouts yet — finish a day to see it here.</div>
          )}
          {grouped.map(group => (
            <section key={group.label} className="hist-month-block" aria-labelledby={`hist-month-${group.label.replace(/\s+/g, '-')}`}>
              <h2 id={`hist-month-${group.label.replace(/\s+/g, '-')}`} className="hist-month-heading">
                {group.label}
                <span className="hist-month-count">{group.items.length} session{group.items.length !== 1 ? 's' : ''}</span>
              </h2>
              <div className="hist-timeline">
                {group.items.map((s, i) => {
                  const tl = typeLabel(s.type);
                  const ariaLabel = `${s.dayTitle}, ${tl} day, ${DAYS_SHORT[s.date.getDay()]} ${MONTHS[s.date.getMonth()]} ${s.date.getDate()}, ${s.slots.length} ${s.slots.length === 1 ? 'exercise' : 'exercises'}`;
                  const onActivate = () => setModal(s);
                  const onKeyDown = (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onActivate();
                    }
                  };
                  return (
                    <div
                      key={i}
                      className="hist-tl-item"
                      onClick={onActivate}
                      onKeyDown={onKeyDown}
                      role="button"
                      tabIndex={0}
                      aria-label={ariaLabel}
                    >
                      <div className="hist-tl-dot" style={{ background: s.color }} aria-hidden="true" />
                      <div className="hist-tl-date" aria-hidden="true">
                        <div className="hist-tl-day-num">{s.date.getDate()}</div>
                        <div className="hist-tl-day-name">{DAYS_SHORT[s.date.getDay()]}</div>
                      </div>
                      <div className="hist-tl-divider" aria-hidden="true" />
                      <div className="hist-tl-content">
                        <div className="hist-tl-name">
                          <span className={`hist-type-tag hist-type-${s.type}`}>{s.dayTitle}</span>
                          {/* Color-coded type — sr-only text so SR users get
                              the same info as sighted users without seeing
                              the color. Derived from typeFromTitle.type. */}
                          <span className="sr-only"> ({tl} day)</span>
                        </div>
                        <div className="hist-tl-chips" aria-hidden="true">
                          {s.slots.slice(0, 3).map((slot, si) => (
                            <span key={si} className="hist-ex-chip">{slot.exercise ?? `Exercise ${si+1}`}</span>
                          ))}
                          {s.slots.length > 3 && <span className="hist-ex-chip">+{s.slots.length - 3} more</span>}
                        </div>
                      </div>
                      <div className="hist-tl-sets" aria-hidden="true">{s.slots.length} exercises</div>
                      <div className="hist-tl-arrow" aria-hidden="true">›</div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Calendar View — no role="grid" (would promise arrow-key navigation
          we don't implement; per agreed Option B, day cells with workouts are
          plain buttons reachable by Tab; empty cells stay non-interactive). */}
      {!loading && view === 'calendar' && (
        <div
          className="hist-calendar-view"
          id="hist-panel-calendar"
          role="tabpanel"
          aria-labelledby="hist-tab-calendar"
        >
          <div className="hist-cal-nav">
            <button className="hist-cal-arrow" onClick={calPrev} aria-label={`Previous month, ${MONTHS[calMonth === 0 ? 11 : calMonth - 1]} ${calMonth === 0 ? calYear - 1 : calYear}`}>
              <span aria-hidden="true">←</span>
            </button>
            <div className="hist-cal-month-title" aria-live="polite" aria-atomic="true">{MONTHS[calMonth]} {calYear}</div>
            <button className="hist-cal-arrow" onClick={calNext} aria-label={`Next month, ${MONTHS[calMonth === 11 ? 0 : calMonth + 1]} ${calMonth === 11 ? calYear + 1 : calYear}`}>
              <span aria-hidden="true">→</span>
            </button>
          </div>
          {/* Day-of-week row is aria-hidden — per-cell aria-labels include the
              full date ("March 15, 2026"), so a column-header readout would
              be redundant noise without grid context. */}
          <div className="hist-cal-dow-row" aria-hidden="true">
            {DAYS_SHORT.map(d => <div key={d} className="hist-cal-dow">{d}</div>)}
          </div>
          <div className="hist-cal-grid">
            {(() => {
              const firstDay = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const daysInPrev = new Date(calYear, calMonth, 0).getDate();
              const cells = [];

              for (let i = firstDay - 1; i >= 0; i--)
                cells.push(<div key={`prev-${i}`} className="hist-cal-day hist-cal-day--other" aria-hidden="true">{daysInPrev - i}</div>);

              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(calYear, calMonth, d);
                const key = dateKey(date);
                const session = sessionMap[key];
                const isToday = dateKey(date) === dateKey(today);
                const dateLabel = `${MONTHS[calMonth]} ${d}, ${calYear}${isToday ? ', today' : ''}`;

                if (session) {
                  // Interactive cell — opens session detail modal.
                  const tl = typeLabel(session.type);
                  const cellLabel = `${dateLabel}, ${session.dayTitle}, ${tl} day, ${session.slots.length} ${session.slots.length === 1 ? 'exercise' : 'exercises'}`;
                  const onActivate = () => setModal(session);
                  const onKeyDown = (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onActivate();
                    }
                  };
                  cells.push(
                    <div
                      key={d}
                      className={`hist-cal-day hist-cal-day--workout${isToday ? ' hist-cal-day--today' : ''}`}
                      onClick={onActivate}
                      onKeyDown={onKeyDown}
                      role="button"
                      tabIndex={0}
                      aria-label={cellLabel}
                    >
                      <div className="hist-cal-num" aria-hidden="true">{d}</div>
                      <div className="hist-cal-dot" style={{ background: session.color }} aria-hidden="true" />
                      <div className="hist-cal-label" aria-hidden="true">{session.dayTitle}</div>
                    </div>
                  );
                } else {
                  // Non-interactive cell — empty day. Keep date readable to AT
                  // (today is still notable; non-today empty days stay aria-hidden
                  // to keep the calendar from being announced as 31 separate items).
                  cells.push(
                    <div
                      key={d}
                      className={`hist-cal-day${isToday ? ' hist-cal-day--today' : ''}`}
                      aria-label={isToday ? dateLabel : undefined}
                      aria-hidden={isToday ? undefined : 'true'}
                    >
                      <div className="hist-cal-num">{d}</div>
                    </div>
                  );
                }
              }

              const totalCells = firstDay + daysInMonth;
              const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
              for (let i = 1; i <= remainder; i++)
                cells.push(<div key={`next-${i}`} className="hist-cal-day hist-cal-day--other" aria-hidden="true">{i}</div>);

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="hist-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div
            ref={sessionModalRef}
            className="hist-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hist-modal-title"
            aria-describedby="hist-modal-date"
          >
            <div className="hist-modal-handle" aria-hidden="true" />
            <div className="hist-modal-header">
              <div className="hist-modal-date" id="hist-modal-date">
                <time dateTime={isoDate(modal.date)}>
                  {DAYS_SHORT[modal.date.getDay()]}, {MONTHS[modal.date.getMonth()]} {modal.date.getDate()}, {modal.date.getFullYear()}
                </time>
              </div>
              <div className="hist-modal-title" id="hist-modal-title">
                {modal.dayTitle}
                <span className="sr-only"> ({typeLabel(modal.type)} day)</span>
              </div>
              {modal.programTitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted, #888)', marginTop: '2px' }}>
                  {modal.programTitle} · Week {modal.weekNumber}
                </div>
              )}
              <div className="hist-modal-stats" role="group" aria-label="Session totals">
                <div className="hist-modal-stat">
                  <div className="hist-modal-stat-val" aria-hidden="true">{modal.slots.length}</div>
                  <div className="hist-modal-stat-lbl" aria-hidden="true">Exercises</div>
                  <span className="sr-only">{modal.slots.length} {modal.slots.length === 1 ? 'exercise' : 'exercises'}</span>
                </div>
              </div>
            </div>
            <div className="hist-modal-body">
              <h3 className="hist-modal-section-title">Exercise Log</h3>
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
            <button
              ref={closeModalBtnRef}
              className="hist-modal-close"
              onClick={closeModal}
              aria-label="Close session details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

