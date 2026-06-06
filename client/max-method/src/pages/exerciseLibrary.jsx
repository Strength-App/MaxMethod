import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MuxPlayer from '@mux/mux-player-react'
import { useWorkout } from '../context/WorkoutContext'
import './exerciseLibrary.css'
import { API_URL } from '../config/api';
import { getPersonalBest } from '../utils/exerciseNameNormalize';
import { ALL_EXERCISES, VIDEO_NAME_ALIASES } from '../config/exercises';

// ─── Library Video Lookup ─────────────────────────────────────────────────────

// MongoDB and the frontend's hardcoded exercise list disagree on plurals,
// spaces in compound words, and word order. Two normalized keys per name —
// one strict (handles compounds like "Goodmornings" vs "Good Mornings"), one
// token-sorted (handles re-orderings like "DB Incline Curls" vs "Incline DB
// Curls") — let us match without maintaining a full alias table.
function normKey(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')
}
function sortedKey(name) {
  return (name || '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(Boolean)
    .map(t => t.replace(/s$/, ''))
    .sort()
    .join('')
}

// Legacy / synonymous exercise names that should resolve to a single canonical
// library card. Applied when navigating into the library (e.g. from a workout
// day) so that older program entries like "Squats" or "Back Squat" still land
// on the consolidated "Squat" card.
const EXERCISE_NAME_ALIASES = {
  'squats':     'Squat',
  'back squat': 'Squat',
}

function buildVideoLookup(videos) {
  const byNorm = {}
  const bySorted = {}
  for (const v of videos) {
    if (!v?.mux_playback_id) continue
    byNorm[normKey(v.exercise_name)] = v.mux_playback_id
    bySorted[sortedKey(v.exercise_name)] = v.mux_playback_id
  }
  return (exerciseName) => {
    const aliased = VIDEO_NAME_ALIASES[exerciseName] || exerciseName
    return byNorm[normKey(aliased)] || bySorted[sortedKey(aliased)] || null
  }
}

// ─── Muscle Diagram SVG ───────────────────────────────────────────────────────

function BodyDiagram({ muscles = {} }) {
  const c  = (k) => muscles[k] || 'transparent'
  const b  = 'rgba(0,0,0,0.35)'
  const ol = 'rgba(255,255,255,0.08)'
  // Derive a dynamic SR label listing which muscle groups are highlighted
  // for this exercise. Static labels would lie about the diagram contents.
  const highlightedMuscles = Object.entries(muscles)
    .filter(([, color]) => color && color !== 'transparent')
    .map(([key]) => key)
  const diagramLabel = highlightedMuscles.length > 0
    ? `Body diagram highlighting: ${highlightedMuscles.join(', ')}`
    : 'Body diagram'
  const svg = `<svg viewBox="0 0 80 160" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="12" rx="9" ry="10" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <rect x="36" y="21" width="8" height="7" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <path d="M28 28 Q40 24 52 28 L54 36 Q40 32 26 36Z" fill="${c('traps')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M26 36 Q33 33 39 35 L39 50 Q31 52 26 49Z" fill="${c('chest')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M54 36 Q47 33 41 35 L41 50 Q49 52 54 49Z" fill="${c('chest')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="22" cy="38" rx="6" ry="8" fill="${c('shoulders')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="58" cy="38" rx="6" ry="8" fill="${c('shoulders')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M26 49 L24 62 L30 68 L39 62 L39 50Z" fill="${c('lats')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M54 49 L56 62 L50 68 L41 62 L41 50Z" fill="${c('lats')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M33 50 L47 50 L47 68 L33 68Z" fill="${c('abs')}" stroke="${ol}" stroke-width=".5"/>
  <line x1="40" y1="50" x2="40" y2="68" stroke="${ol}" stroke-width=".5"/>
  <line x1="33" y1="56" x2="47" y2="56" stroke="${ol}" stroke-width=".5"/>
  <line x1="33" y1="62" x2="47" y2="62" stroke="${ol}" stroke-width=".5"/>
  <path d="M16 46 Q12 52 13 60 Q17 62 20 60 Q22 52 22 46Z" fill="${c('biceps')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M64 46 Q68 52 67 60 Q63 62 60 60 Q58 52 58 46Z" fill="${c('biceps')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M22 46 Q20 40 22 36 Q26 36 26 40Z" fill="${c('triceps')}" stroke="${ol}" stroke-width=".4"/>
  <path d="M58 46 Q60 40 58 36 Q54 36 54 40Z" fill="${c('triceps')}" stroke="${ol}" stroke-width=".4"/>
  <path d="M13 60 Q10 68 11 76 Q15 77 18 76 Q20 68 20 60Z" fill="${c('forearms')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M67 60 Q70 68 69 76 Q65 77 62 76 Q60 68 60 60Z" fill="${c('forearms')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="12" cy="79" rx="4" ry="5" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="68" cy="79" rx="4" ry="5" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <path d="M30 68 L50 68 L52 80 L28 80Z" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <path d="M28 80 Q34 78 39 80 L39 90 Q32 93 28 90Z" fill="${c('glutes')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M52 80 Q46 78 41 80 L41 90 Q48 93 52 90Z" fill="${c('glutes')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M28 90 Q24 100 25 114 Q30 116 34 114 Q36 100 39 90Z" fill="${c('quads')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M52 90 Q56 100 55 114 Q50 116 46 114 Q44 100 41 90Z" fill="${c('quads')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M25 114 Q25 124 27 130 Q31 131 34 130 Q34 124 34 114Z" fill="${c('hamstrings')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M55 114 Q55 124 53 130 Q49 131 46 130 Q46 124 46 114Z" fill="${c('hamstrings')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M27 130 Q26 140 28 148 Q31 149 33 148 Q34 140 34 130Z" fill="${c('calves')}" stroke="${ol}" stroke-width=".5"/>
  <path d="M53 130 Q54 140 52 148 Q49 149 47 148 Q46 140 46 130Z" fill="${c('calves')}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="30" cy="151" rx="5" ry="3" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  <ellipse cx="50" cy="151" rx="5" ry="3" fill="${b}" stroke="${ol}" stroke-width=".5"/>
  </svg>`
  return (
    <div
      role="img"
      aria-label={diagramLabel}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onSelect }) {
  const bodyLabel = exercise.body === 'upper' ? 'Upper' : exercise.body === 'lower' ? 'Lower' : exercise.body === 'cardio' ? 'Cardio' : 'Core'
  const onActivate = () => onSelect(exercise)
  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onActivate()
    }
  }
  const equipmentLabel = exercise.equipment ? `, ${exercise.equipment}` : ''
  const cardLabel = `${exercise.name} — ${bodyLabel}, ${exercise.pattern}${equipmentLabel}, primary muscle: ${exercise.primary}`
  return (
    <div
      className="el-card"
      onClick={onActivate}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
    >
      <div className="el-card-body">
        <div className="el-muscle-icon">
          <BodyDiagram muscles={exercise.muscles} />
        </div>
        <div className="el-card-info">
          <div className="el-card-name" aria-hidden="true">{exercise.name}</div>
          <div className="el-card-tags" aria-hidden="true">
            <span className={`el-tag ${exercise.body}`}>{bodyLabel}</span>
            <span className="el-tag pattern">{exercise.pattern}</span>
            {exercise.equipment && (
              <span className={`el-tag equipment equipment--${exercise.equipment.toLowerCase().replace(' ', '-')}`}>{exercise.equipment}</span>
            )}
          </div>
        </div>
      </div>
      <div className="el-card-footer" aria-hidden="true">
        <span className="el-card-muscle">{exercise.primary}</span>
        <span className="el-card-arrow">→</span>
      </div>
    </div>
  )
}

// ─── Detail View ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_SHORT_EL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function DetailView({ exercise, onBack, playbackId }) {
  const { personalBests } = useWorkout()
  const [detailTab, setDetailTab] = useState('cues')
  const [exerciseHistory, setExerciseHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const bodyLabel = exercise.body === 'upper' ? 'Upper Body' : exercise.body === 'lower' ? 'Lower Body' : exercise.body === 'cardio' ? 'Cardio' : 'Core'

  // Fetch all-time exercise history across every program
  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    setHistoryLoading(true)
    fetch(`${API_URL}/api/users/workout/${userId}/exercise-history?exercise=${encodeURIComponent(exercise.name)}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => {
        setExerciseHistory(
          (data.history ?? []).map(entry => {
            const repsRaw = entry.reps
            const repsArr = Array.isArray(repsRaw)
              ? repsRaw
              : typeof repsRaw === 'string' && repsRaw.includes(',')
                ? repsRaw.split(',').map(r => r.trim())
                : null
            return {
              ...entry,
              date: new Date(entry.date),
              getReps: (j) => repsArr ? (repsArr[j] ?? repsArr[repsArr.length - 1]) : repsRaw,
            }
          })
        )
      })
      .catch(() => setExerciseHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [exercise.name])

  const pr = getPersonalBest(personalBests, exercise.name, null)

  return (
    <div className="el-page">
      <button className="el-detail-back" onClick={onBack} aria-label="Back to exercise library">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Exercise Library
      </button>

      <div className="el-detail-hero">
        <div className="el-video-wrap">
          {playbackId ? (
            <MuxPlayer
              streamType="on-demand"
              playbackId={playbackId}
              metadata={{ video_title: `How to perform — ${exercise.name}` }}
              accentColor="#cc0404"
              className="el-mux-player"
            />
          ) : (
            <>
              <button className="el-play-btn" aria-label={`Play video for ${exercise.name}`} disabled>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="5,3 19,12 5,21"/></svg>
              </button>
              <div className="el-video-label" role="status">Video coming soon — {exercise.name}</div>
            </>
          )}
        </div>
        <div className="el-detail-meta" role="group" aria-label="Exercise classification">
          <span className="el-badge primary">{exercise.primary}</span>
          <span className={`el-badge ${exercise.body}`}>{bodyLabel}</span>
          <span className="el-badge">{exercise.pattern}</span>
          {exercise.equipment && (
            <span className={`el-badge equipment equipment--${exercise.equipment.toLowerCase().replace(' ', '-')}`}>{exercise.equipment}</span>
          )}
        </div>
      </div>

      <div className="el-detail-body">
        <div className="el-steps-container">
          <div className="el-steps-header">
            <div className="el-steps-title" id="el-steps-title">{exercise.name}</div>
            <div className="el-steps-subtitle">Step-by-step execution</div>
          </div>

          {/* Tabs */}
          <div className="el-detail-tabs" role="tablist" aria-label="Exercise detail">
            <button
              id="el-tab-cues"
              role="tab"
              aria-selected={detailTab === 'cues'}
              aria-controls="el-panel-cues"
              className={`el-detail-tab${detailTab === 'cues' ? ' active' : ''}`}
              onClick={() => setDetailTab('cues')}
            >
              Coaching Cues
            </button>
            <button
              id="el-tab-pr"
              role="tab"
              aria-selected={detailTab === 'pr'}
              aria-controls="el-panel-pr"
              className={`el-detail-tab${detailTab === 'pr' ? ' active' : ''}`}
              onClick={() => setDetailTab('pr')}
            >
              Personal Record
            </button>
            <button
              id="el-tab-history"
              role="tab"
              aria-selected={detailTab === 'history'}
              aria-controls="el-panel-history"
              className={`el-detail-tab${detailTab === 'history' ? ' active' : ''}`}
              onClick={() => setDetailTab('history')}
            >
              Exercise History
            </button>
          </div>

          {/* Coaching Cues */}
          {detailTab === 'cues' && (
            <div className="el-step-list" id="el-panel-cues" role="tabpanel" aria-labelledby="el-tab-cues">
              {exercise.steps.map((step, i) => (
                <div className="el-step" key={i}>
                  <div className="el-step-num" aria-hidden="true">{i + 1}</div>
                  <div>
                    <div className="el-step-label">{step.t}</div>
                    <div
                      className="el-step-text"
                      dangerouslySetInnerHTML={{ __html: step.d }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Personal Record */}
          {detailTab === 'pr' && (
            <div className="el-pr-panel" id="el-panel-pr" role="tabpanel" aria-labelledby="el-tab-pr">
              {pr != null ? (
                <div className="el-pr-card">
                  <div className="el-pr-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="el-pr-weight" aria-hidden="true">{pr}<span>lbs</span></div>
                  <div className="el-pr-label" aria-hidden="true">Personal Record</div>
                  <div className="el-pr-sub" aria-hidden="true">{exercise.name}</div>
                  <span className="sr-only">Personal record for {exercise.name}: {pr} pounds</span>
                </div>
              ) : (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">🏆</div>
                  <div className="el-panel-empty-text">No personal record yet</div>
                  <div className="el-panel-empty-sub">Log this exercise to set your first PR</div>
                </div>
              )}
            </div>
          )}

          {/* Exercise History */}
          {detailTab === 'history' && (
            <div className="el-history-panel" id="el-panel-history" role="tabpanel" aria-labelledby="el-tab-history">
              {historyLoading ? (
                <div className="el-panel-empty" role="status" aria-live="polite">
                  <div className="el-panel-empty-text">Loading history…</div>
                </div>
              ) : exerciseHistory.length === 0 ? (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">📋</div>
                  <div className="el-panel-empty-text">No history yet</div>
                  <div className="el-panel-empty-sub">Complete a workout containing {exercise.name} to see it here</div>
                </div>
              ) : (
                exerciseHistory.map((entry, idx) => (
                  <div className="el-hist-item" key={idx}>
                    <div className="el-hist-date-col">
                      <div className="el-hist-day-num">{entry.date.getDate()}</div>
                      <div className="el-hist-month">{MONTHS_SHORT[entry.date.getMonth()]}</div>
                      <div className="el-hist-weekday">{DAYS_SHORT_EL[entry.date.getDay()]}</div>
                    </div>
                    <div className="el-hist-divider" />
                    <div className="el-hist-content">
                      <div className="el-hist-day-title">
                        {entry.weekNumber != null && (
                          <span className="el-hist-week-tag">Week {entry.weekNumber}</span>
                        )}
                        {entry.dayTitle}
                      </div>
                      <div className="el-hist-sets">
                        {Array.from({ length: entry.setCount }, (_, j) => {
                          if (!entry.completedSets?.[j]) return null
                          const w = entry.actualWeights?.[j]
                          const r = entry.actualReps?.[j] ?? entry.getReps(j)
                          return (
                            <div className="el-hist-set-row" key={j}>
                              <div className="el-hist-set-num">{j + 1}</div>
                              <div className="el-hist-set-val"><span>{r ?? '—'}</span> reps</div>
                              <div className="el-hist-set-val"><span>{w ?? '—'}</span> lbs</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <div className="el-sidebar">
            <div className="el-sidebar-title">Muscles Worked</div>
            <div className="el-diagram-wrap">
              <BodyDiagram muscles={exercise.muscles} />
            </div>
            <div className="el-legend">
              <div className="el-legend-item">
                <span className="el-legend-dot primary" />Primary
              </div>
              <div className="el-legend-item">
                <span className="el-legend-dot secondary" />Secondary
              </div>
              <div className="el-legend-item">
                <span className="el-legend-dot synergist" />Stabilizer
              </div>
            </div>
            <div className="el-tips">
              <h4>Exercise Tips</h4>
              <ul>
                {exercise.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Custom Detail View ───────────────────────────────────────────────────────

function CustomDetailView({ name, onBack }) {
  const { personalBests } = useWorkout()
  const [detailTab, setDetailTab] = useState('pr')
  const [exerciseHistory, setExerciseHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    setHistoryLoading(true)
    fetch(`${API_URL}/api/users/workout/${userId}/exercise-history?exercise=${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => {
        setExerciseHistory(
          (data.history ?? []).map(entry => {
            const repsRaw = entry.reps
            const repsArr = Array.isArray(repsRaw)
              ? repsRaw
              : typeof repsRaw === 'string' && repsRaw.includes(',')
                ? repsRaw.split(',').map(r => r.trim())
                : null
            return {
              ...entry,
              date: new Date(entry.date),
              getReps: (j) => repsArr ? (repsArr[j] ?? repsArr[repsArr.length - 1]) : repsRaw,
            }
          })
        )
      })
      .catch(() => setExerciseHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [name])

  const pr = getPersonalBest(personalBests, name, null)

  return (
    <div className="el-page">
      <button className="el-detail-back" onClick={onBack} aria-label="Back to custom exercises">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Custom Exercises
      </button>

      <div className="el-detail-body" style={{ marginTop: '24px' }}>
        <div className="el-steps-container">
          <div className="el-steps-header">
            <div className="el-steps-title">{name}</div>
            <div className="el-steps-subtitle">Custom Exercise</div>
          </div>

          <div className="el-detail-tabs" role="tablist" aria-label="Custom exercise detail">
            <button
              id="el-cust-tab-pr"
              role="tab"
              aria-selected={detailTab === 'pr'}
              aria-controls="el-cust-panel-pr"
              className={`el-detail-tab${detailTab === 'pr' ? ' active' : ''}`}
              onClick={() => setDetailTab('pr')}
            >
              Personal Record
            </button>
            <button
              id="el-cust-tab-history"
              role="tab"
              aria-selected={detailTab === 'history'}
              aria-controls="el-cust-panel-history"
              className={`el-detail-tab${detailTab === 'history' ? ' active' : ''}`}
              onClick={() => setDetailTab('history')}
            >
              Exercise History
            </button>
          </div>

          {detailTab === 'pr' && (
            <div className="el-pr-panel" id="el-cust-panel-pr" role="tabpanel" aria-labelledby="el-cust-tab-pr">
              {pr != null ? (
                <div className="el-pr-card">
                  <div className="el-pr-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="el-pr-weight" aria-hidden="true">{pr}<span>lbs</span></div>
                  <div className="el-pr-label" aria-hidden="true">Personal Record</div>
                  <div className="el-pr-sub" aria-hidden="true">{name}</div>
                  <span className="sr-only">Personal record for {name}: {pr} pounds</span>
                </div>
              ) : (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">🏆</div>
                  <div className="el-panel-empty-text">No personal record yet</div>
                  <div className="el-panel-empty-sub">Log this exercise to set your first PR</div>
                </div>
              )}
            </div>
          )}

          {detailTab === 'history' && (
            <div className="el-history-panel" id="el-cust-panel-history" role="tabpanel" aria-labelledby="el-cust-tab-history">
              {historyLoading ? (
                <div className="el-panel-empty" role="status" aria-live="polite">
                  <div className="el-panel-empty-text">Loading history…</div>
                </div>
              ) : exerciseHistory.length === 0 ? (
                <div className="el-panel-empty" role="status">
                  <div className="el-panel-empty-icon" aria-hidden="true">📋</div>
                  <div className="el-panel-empty-text">No history yet</div>
                  <div className="el-panel-empty-sub">Complete a workout containing {name} to see it here</div>
                </div>
              ) : (
                exerciseHistory.map((entry, idx) => (
                  <div className="el-hist-item" key={idx}>
                    <div className="el-hist-date-col">
                      <div className="el-hist-day-num">{entry.date.getDate()}</div>
                      <div className="el-hist-month">{MONTHS_SHORT[entry.date.getMonth()]}</div>
                      <div className="el-hist-weekday">{DAYS_SHORT_EL[entry.date.getDay()]}</div>
                    </div>
                    <div className="el-hist-divider" />
                    <div className="el-hist-content">
                      <div className="el-hist-day-title">
                        {entry.weekNumber != null && (
                          <span className="el-hist-week-tag">Week {entry.weekNumber}</span>
                        )}
                        {entry.dayTitle}
                      </div>
                      <div className="el-hist-sets">
                        {Array.from({ length: entry.setCount }, (_, j) => {
                          if (!entry.completedSets?.[j]) return null
                          const w = entry.actualWeights?.[j]
                          const r = entry.actualReps?.[j] ?? entry.getReps(j)
                          return (
                            <div className="el-hist-set-row" key={j}>
                              <div className="el-hist-set-num">{j + 1}</div>
                              <div className="el-hist-set-val"><span>{r ?? '—'}</span> reps</div>
                              <div className="el-hist-set-val"><span>{w ?? '—'}</span> lbs</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Custom Exercises Section ─────────────────────────────────────────────────

function CustomExercisesSection({ onSelect }) {
  const [customExercises, setCustomExercises] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customExercises') || '[]') } catch { return [] }
  })
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')

  const userId = localStorage.getItem('userId')

  useEffect(() => {
    if (!userId) return
    fetch(`${API_URL}/api/users/${userId}/custom-exercises`)
      .then(r => r.ok ? r.json() : { custom_exercises: [] })
      .then(data => {
        const list = data.custom_exercises ?? []
        setCustomExercises(list)
        localStorage.setItem('customExercises', JSON.stringify(list))
      })
      .catch(() => {})
  }, [userId])

  const syncLocalStorage = (list) => localStorage.setItem('customExercises', JSON.stringify(list))

  const addExercise = async () => {
    const name = inputVal.trim()
    if (!name) return
    if (customExercises.some(n => n.toLowerCase() === name.toLowerCase())) {
      setError('That exercise already exists in your custom list')
      return
    }
    setInputVal('')
    setError('')
    if (userId) {
      try {
        const res = await fetch(`${API_URL}/api/users/${userId}/custom-exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        const list = data.custom_exercises ?? [...customExercises, name]
        setCustomExercises(list)
        syncLocalStorage(list)
      } catch {
        const list = [...customExercises, name]
        setCustomExercises(list)
        syncLocalStorage(list)
      }
    } else {
      const list = [...customExercises, name]
      setCustomExercises(list)
      syncLocalStorage(list)
    }
  }

  const removeExercise = async (name) => {
    const list = customExercises.filter(n => n !== name)
    setCustomExercises(list)
    syncLocalStorage(list)
    if (userId) {
      fetch(`${API_URL}/api/users/${userId}/custom-exercises/${encodeURIComponent(name)}`, { method: 'DELETE' })
        .catch(() => {})
    }
  }

  return (
    <div className="el-section" aria-labelledby="el-custom-section-label">
      <div className="el-section-label" id="el-custom-section-label">Custom Exercises</div>
      <p style={{ color: 'var(--text-muted, #888)', fontSize: '13px', margin: '0 0 14px', lineHeight: 1.5 }}>
        Add exercises not in the standard library. They will be available as valid options in the custom workout maker.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: error ? '6px' : '16px' }}>
        <label htmlFor="el-custom-add-input" className="sr-only">New custom exercise name</label>
        <input
          id="el-custom-add-input"
          type="text"
          placeholder="Exercise name..."
          aria-label="New custom exercise name"
          aria-describedby={error ? 'el-custom-add-error' : undefined}
          aria-invalid={!!error || undefined}
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && addExercise()}
          style={{ flex: 1, background: 'var(--input-bg, #1a1a1a)', border: '1px solid var(--border, #333)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
        />
        <button
          onClick={addExercise}
          aria-label="Add custom exercise"
          style={{ background: 'var(--accent, #e63946)', border: 'none', borderRadius: '8px', padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Add
        </button>
      </div>
      {error && (
        <div
          id="el-custom-add-error"
          role="alert"
          style={{ color: '#ff5555', fontSize: '12px', marginBottom: '12px' }}
        >
          {error}
        </div>
      )}
      {customExercises.length === 0 ? (
        <div role="status" style={{ color: 'var(--text-muted, #888)', fontSize: '13px', padding: '12px 0' }}>No custom exercises yet.</div>
      ) : (
        <div className="el-grid">
          {customExercises.map(name => {
            const onActivate = () => onSelect(name)
            const onCardKeyDown = (e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                onActivate()
              }
            }
            return (
              <div
                key={name}
                className="el-card"
                onClick={onActivate}
                onKeyDown={onCardKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`${name}, custom exercise`}
              >
                <div className="el-card-body">
                  <div className="el-card-info" style={{ width: '100%' }}>
                    <div className="el-card-name" aria-hidden="true">{name}</div>
                    <div className="el-card-tags" aria-hidden="true">
                      <span className="el-tag" style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>Custom</span>
                    </div>
                  </div>
                </div>
                <div className="el-card-footer">
                  <span className="el-card-muscle" aria-hidden="true">Custom Exercise</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Real <button> nested inside role="button" parent — semantically
                        invalid per ARIA, but functionally works (separate tab stop,
                        Space/Enter stopPropagation prevents card activation).
                        Flagged as follow-up: split card into a name-button + remove-button
                        siblings rather than nested. */}
                    <button
                      className="el-card-arrow"
                      onClick={e => { e.stopPropagation(); removeExercise(name) }}
                      onKeyDown={e => e.stopPropagation()}
                      aria-label={`Remove ${name} from custom exercises`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #888)', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
                    ><span aria-hidden="true">×</span></button>
                    <span className="el-card-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView({ exercises, activeTab, search, onTabChange, onSearchChange, onSelect, onCustomSelect }) {
  const grouped = useMemo(() => {
    const upper  = {}
    const lower  = {}
    const core   = {}
    const cardio = {}
    for (const ex of exercises) {
      const bucket = ex.body === 'upper' ? upper : ex.body === 'lower' ? lower : ex.body === 'cardio' ? cardio : core
      if (!bucket[ex.pattern]) bucket[ex.pattern] = []
      bucket[ex.pattern].push(ex)
    }
    return { upper, lower, core, cardio }
  }, [exercises])

  const showUpper  = activeTab === 'all' || activeTab === 'upper'
  const showLower  = activeTab === 'all' || activeTab === 'lower'
  const showCore   = activeTab === 'all' || activeTab === 'core'
  const showCardio = activeTab === 'all' || activeTab === 'cardio'

  const tabs = [
    { key: 'all',    label: 'All' },
    { key: 'upper',  label: 'Upper Body' },
    { key: 'lower',  label: 'Lower Body' },
    { key: 'core',   label: 'Core' },
    { key: 'cardio', label: 'Cardio' },
    { key: 'custom', label: 'Custom' },
  ]

  function PatternSection({ patterns, visible }) {
    if (!visible) return null
    const hasExercises = Object.values(patterns).some(arr => arr.length > 0)
    if (!hasExercises) return null
    return (
      <>
        {Object.entries(patterns).map(([pattern, exs]) =>
          exs.length === 0 ? null : (
            <div className="el-pattern-group" key={pattern}>
              <div className="el-pattern-label">{pattern}</div>
              <div className="el-grid">
                {exs.map(ex => (
                  <ExerciseCard key={ex.id} exercise={ex} onSelect={onSelect} />
                ))}
              </div>
            </div>
          )
        )}
      </>
    )
  }

  return (
    <div className="el-page">
      <div className="el-header">
        <div>
          <div className="el-title">Exercise <span>Library</span></div>
          <div className="el-subtitle">Video guides for every movement in your program</div>
        </div>
        {activeTab !== 'custom' && (
          <div className="el-count" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true">{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
            <span className="sr-only">{exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} shown</span>
          </div>
        )}
      </div>

      {activeTab !== 'custom' && (
        <div className="el-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <label htmlFor="el-search-input" className="sr-only">Search exercises or patterns</label>
          <input
            id="el-search-input"
            type="search"
            placeholder="Search exercises or patterns…"
            aria-label="Search exercises or patterns"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      )}

      <div className="el-tabs" role="tablist" aria-label="Filter exercises by body region">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            id={`el-filter-tab-${key}`}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`el-filter-panel-${key}`}
            className={`el-tab${activeTab === key ? ' active' : ''}`}
            data-tab={key}
            onClick={() => onTabChange(key)}
          >
            <span className="el-tab-dot" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'custom' ? (
        <div id={`el-filter-panel-custom`} role="tabpanel" aria-labelledby="el-filter-tab-custom">
          <CustomExercisesSection onSelect={onCustomSelect} />
        </div>
      ) : (
        <div id={`el-filter-panel-${activeTab}`} role="tabpanel" aria-labelledby={`el-filter-tab-${activeTab}`}>
          {exercises.length === 0 ? (
            <div className="el-empty" role="status" aria-live="polite">No exercises match "{search}"</div>
          ) : (
            <>
              {showUpper && Object.keys(grouped.upper).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Upper Body</div>
                  <PatternSection patterns={grouped.upper} visible />
                </div>
              )}
              {showLower && Object.keys(grouped.lower).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Lower Body</div>
                  <PatternSection patterns={grouped.lower} visible />
                </div>
              )}
              {showCore && Object.keys(grouped.core).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Core</div>
                  <PatternSection patterns={grouped.core} visible />
                </div>
              )}
              {showCardio && Object.keys(grouped.cardio).length > 0 && (
                <div className="el-section">
                  <div className="el-section-label">Cardio</div>
                  <PatternSection patterns={grouped.cardio} visible />
                </div>
              )}
            </>
          )}
          <CustomExercisesSection onSelect={onCustomSelect} />
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────


function ExerciseLibrary() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab]       = useState('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)
  const [customSelected, setCustomSelected] = useState(null)
  const [videos, setVideos]             = useState([])

  useEffect(() => {
    fetch(`${API_URL}/api/users/library-videos`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
  }, [])

  // Inbound nav signals (mutually exclusive; focusExercise wins on collision):
  //   - location.state.focusExercise: pre-select that exercise's detail view.
  //     Match against ALL_EXERCISES (case-insensitive) first, then fall back
  //     to custom exercises (localStorage list). If neither matches (typo,
  //     removed exercise), silently land on the list.
  //   - location.state.resetToList: exit any open detail card and return to
  //     the list view. Sent by the nav-bar Exercise Library link so clicking
  //     it from a detail card resets to list (otherwise React Router treats
  //     same-path nav as a no-op and the detail stays open).
  //
  // After consumption, clear the state via replace so revisiting the page (or
  // back-navigating to it) doesn't re-trigger the signal.
  useEffect(() => {
    const focus = location.state?.focusExercise
    const reset = location.state?.resetToList
    if (focus) {
      const aliased = EXERCISE_NAME_ALIASES[focus.toLowerCase()] || focus
      const match = ALL_EXERCISES.find(
        ex => ex.name.toLowerCase() === aliased.toLowerCase()
      )
      if (match) {
        setSelected(match)
      } else {
        let customs = []
        try { customs = JSON.parse(localStorage.getItem('customExercises') || '[]') } catch { /* noop */ }
        if (customs.some(n => n.toLowerCase() === focus.toLowerCase())) {
          setCustomSelected(focus)
        }
      }
      navigate(location.pathname, { replace: true, state: null })
    } else if (reset) {
      setSelected(null)
      setCustomSelected(null)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state?.focusExercise, location.state?.resetToList])

  const lookupPlaybackId = useMemo(() => buildVideoLookup(videos), [videos])

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) {
      if (activeTab === 'all') return ALL_EXERCISES
      return ALL_EXERCISES.filter(ex => ex.body === activeTab)
    }
    return ALL_EXERCISES.filter(ex => {
      const matchesBody = activeTab === 'all' || ex.body === activeTab
      const matchesSearch = ex.name.toLowerCase().includes(term) || ex.pattern.toLowerCase().includes(term)
      return matchesBody && matchesSearch
    })
  }, [activeTab, search])

  if (selected) {
    return <DetailView exercise={selected} onBack={() => setSelected(null)} playbackId={lookupPlaybackId(selected.name)} />
  }

  if (customSelected) {
    return <CustomDetailView name={customSelected} onBack={() => setCustomSelected(null)} />
  }

  return (
    <LibraryView
      exercises={filtered}
      totalCount={ALL_EXERCISES.length}
      activeTab={activeTab}
      search={search}
      onTabChange={(tab) => { setActiveTab(tab); setSearch('') }}
      onSearchChange={setSearch}
      onSelect={setSelected}
      onCustomSelect={setCustomSelected}
    />
  )
}

export default ExerciseLibrary
