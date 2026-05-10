import { useState, useEffect, useId } from 'react'
import { useUser } from '../context/UserContext'
import UserLevelBadge from '../components/UserLevelBadge'
import { bigThreeTotal } from '../utils/classification'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts'
import { API_URL } from '../config/api';

function Settings() {
    const { user } = useUser()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(true)
    const [gender, setGender] = useState("")
    const [classificationHistory, setClassificationHistory] = useState([])
    const [bodyweightHistory, setBodyweightHistory] = useState([])
    const [currentClassification, setCurrentClassification] = useState("")
    const [currentBodyweight, setCurrentBodyweight] = useState(null)
    const [currentOneRMs, setCurrentOneRMs] = useState(null)

    const [settingsOpen, setSettingsOpen] = useState(false)
    const [classificationsOpen, setClassificationsOpen] = useState(false)
    const [bodyweightOpen, setBodyweightOpen] = useState(false)
    const [totalsOpen, setTotalsOpen] = useState(false)
    const [benchOpen, setBenchOpen] = useState(false)
    const [squatOpen, setSquatOpen] = useState(false)
    const [deadliftOpen, setDeadliftOpen] = useState(false)

    // 🚨 guard against null user
    // NOTE: pre-existing rules-of-hooks issue — this conditional return sits
    // BEFORE the useEffect below. If `user` flips between null and non-null,
    // hook-call counts diverge across renders. Flagged for follow-up; not
    // restructured in this audit pass.
    if (!user) return <p role="alert">Not logged in</p>

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/profile/${user._id}`)

                if (!res.ok) {
                    const text = await res.text()
                    console.error("Server error:", text)
                    throw new Error("Failed to fetch user")
                }

                const data = await res.json()

                setFirstName(data.firstName || "")
                setLastName(data.lastName || "")
                setEmail(data.email || "")
                setGender(data.gender || "")
                setCurrentClassification(data.current_classification || "")
                setCurrentBodyweight(data.current_bodyweight ?? null)
                setCurrentOneRMs(data.current_one_rep_maxes ?? null)
                setClassificationHistory((data.classification_history || []).slice().reverse())
                setBodyweightHistory((data.bodyweight_history || []).slice().reverse())

            } catch (err) {
                console.error("Fetch error:", err)
            } finally {
                setLoading(false)
            }
        }

        if (user?._id) {
            fetchUser()
        } else {
            setLoading(false)
        }
    }, [user])

    if (loading) return <p role="status" aria-live="polite">Loading…</p>

    // Chart data is chronological (oldest → newest); rows are reversed (newest first)
    const classificationChartData = [...classificationHistory].reverse()
    const bodyweightChartData = [...bodyweightHistory].reverse()

    return (
        <div className="settings-page">
            <h1>Profile</h1>

            <CollapsibleSection title="Strength Classifications" open={classificationsOpen} setOpen={setClassificationsOpen}>
                <div className="profile-stat-row profile-stat-row--current">
                    <span className="profile-stat-label">Current</span>
                    <UserLevelBadge
                        sex={gender}
                        bodyweight={currentBodyweight}
                        total={bigThreeTotal(currentOneRMs)}
                        showProgress
                    />
                </div>
                {classificationHistory.length === 0 ? (
                    <p className="profile-empty">No classifications recorded yet.</p>
                ) : (
                    classificationHistory.map((entry, i) => (
                        <div className="profile-stat-row" key={i}>
                            <span className="profile-stat-label">{formatDate(entry.date)}</span>
                            <span className="profile-stat-value">{entry.classification || '—'}</span>
                        </div>
                    ))
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Bodyweight" open={bodyweightOpen} setOpen={setBodyweightOpen}>
                <StatChart data={bodyweightChartData} dataKey="value" label="Bodyweight" />
                {bodyweightHistory.length === 0 ? (
                    <p className="profile-empty">No bodyweight entries recorded yet.</p>
                ) : (
                    bodyweightHistory.map((entry, i) => (
                        <div className="profile-stat-row" key={i}>
                            <span className="profile-stat-label">{formatDate(entry.date)}</span>
                            <span className="profile-stat-value">{entry.value} lbs</span>
                        </div>
                    ))
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Big 3 Total" open={totalsOpen} setOpen={setTotalsOpen}>
                <StatChart data={classificationChartData} dataKey="total" label="Total" />
                {classificationHistory.length === 0 ? (
                    <p className="profile-empty">No totals recorded yet.</p>
                ) : (
                    classificationHistory.map((entry, i) => (
                        <div className="profile-stat-row" key={i}>
                            <span className="profile-stat-label">{formatDate(entry.date)}</span>
                            <span className="profile-stat-value">{entry.total} lbs</span>
                        </div>
                    ))
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Bench" open={benchOpen} setOpen={setBenchOpen}>
                <StatChart data={classificationChartData} dataKey="bench" label="Bench" />
                {classificationHistory.length === 0 ? (
                    <p className="profile-empty">No bench press entries recorded yet.</p>
                ) : (
                    classificationHistory.map((entry, i) => (
                        <div className="profile-stat-row" key={i}>
                            <span className="profile-stat-label">{formatDate(entry.date)}</span>
                            <span className="profile-stat-value">{entry.bench} lbs</span>
                        </div>
                    ))
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Squat" open={squatOpen} setOpen={setSquatOpen}>
                <StatChart data={classificationChartData} dataKey="squat" label="Squat" />
                {classificationHistory.length === 0 ? (
                    <p className="profile-empty">No squat entries recorded yet.</p>
                ) : (
                    classificationHistory.map((entry, i) => (
                        <div className="profile-stat-row" key={i}>
                            <span className="profile-stat-label">{formatDate(entry.date)}</span>
                            <span className="profile-stat-value">{entry.squat} lbs</span>
                        </div>
                    ))
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Deadlift" open={deadliftOpen} setOpen={setDeadliftOpen}>
                <StatChart data={classificationChartData} dataKey="deadlift" label="Deadlift" />
                {classificationHistory.length === 0 ? (
                    <p className="profile-empty">No deadlift entries recorded yet.</p>
                ) : (
                    classificationHistory.map((entry, i) => (
                        <div className="profile-stat-row" key={i}>
                            <span className="profile-stat-label">{formatDate(entry.date)}</span>
                            <span className="profile-stat-value">{entry.deadlift} lbs</span>
                        </div>
                    ))
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Settings" open={settingsOpen} setOpen={setSettingsOpen}>
                <UserName
                    firstName={firstName}
                    lastName={lastName}
                    userId={user._id}
                    setFirstName={setFirstName}
                    setLastName={setLastName}
                />
                <UserEmail
                    email={email}
                    userId={user._id}
                    setEmail={setEmail}
                />
                <UserGender
                    gender={gender}
                    userId={user._id}
                    setGender={setGender}
                />
                <ChangePassword userId={user._id} />
                <RestTimerToggle />
            </CollapsibleSection>
        </div>
    )
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildChartSummary(data, dataKey, label) {
    const points = (data || []).filter(d => d && d[dataKey] != null && !isNaN(Number(d[dataKey])))
    if (points.length === 0) return `${label}: insufficient data for trend`
    if (points.length === 1) {
        const only = points[0]
        return `${label}: single entry of ${only[dataKey]} pounds on ${formatDate(only.date)}`
    }
    const first = points[0]
    const last = points[points.length - 1]
    const start = Number(first[dataKey])
    const end = Number(last[dataKey])
    const delta = end - start
    if (delta === 0) {
        return `${label}: unchanged at ${start} pounds from ${formatDate(first.date)} to ${formatDate(last.date)}`
    }
    const sign = delta > 0 ? '+' : ''
    return `${label} trend: ${start} to ${end} pounds from ${formatDate(first.date)} to ${formatDate(last.date)}, ${sign}${delta} pound change`
}

function StatChart({ data, dataKey, label, color = '#cc0404' }) {
    if (!data || data.length < 2) return null
    const summary = buildChartSummary(data, dataKey, label)
    return (
        <div
            className="profile-chart"
            role="img"
            aria-label={summary}
        >
            <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDateShort}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-sub)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-sub)' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontFamily: 'var(--font-sub)',
                            fontSize: 11,
                            color: 'var(--text)',
                        }}
                        labelFormatter={formatDate}
                        formatter={(val) => [`${val} lbs`, label]}
                    />
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

function CollapsibleSection({ title, open, setOpen, children }) {
    // Stable IDs for accordion ARIA wiring (button ⇄ region).
    const baseId = useId()
    const headerId = `${baseId}-header`
    const bodyId = `${baseId}-body`

    return (
        <div className="collapsible-section">
            <button
                id={headerId}
                className="collapsible-header"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-controls={bodyId}
            >
                <span>{title}</span>
                <span className={`collapsible-chevron${open ? ' open' : ''}`} aria-hidden="true">▾</span>
            </button>
            {open && (
                <div
                    id={bodyId}
                    role="region"
                    aria-labelledby={headerId}
                    className="collapsible-body"
                >
                    {children}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────
// NAME
// ─────────────────────────────────────────
function UserName({ firstName, lastName, userId, setFirstName, setLastName }) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempFirst, setTempFirst] = useState("")
    const [tempLast, setTempLast] = useState("")

    useEffect(() => {
        setTempFirst(firstName)
        setTempLast(lastName)
    }, [firstName, lastName])

    const handleSave = async () => {
        try {
            await fetch(`${API_URL}/api/users/update/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: tempFirst,
                    lastName: tempLast
                })
            })

            setFirstName(tempFirst)
            setLastName(tempLast)
            setIsEditing(false)

        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="user-setting">
            <p id="settings-name-label">Name:</p>

            {isEditing ? (
                <>
                    <label htmlFor="settings-first-name" className="sr-only">First name</label>
                    <input
                        id="settings-first-name"
                        value={tempFirst}
                        onChange={(e) => setTempFirst(e.target.value)}
                        placeholder="First Name"
                        autoComplete="given-name"
                    />
                    <label htmlFor="settings-last-name" className="sr-only">Last name</label>
                    <input
                        id="settings-last-name"
                        value={tempLast}
                        onChange={(e) => setTempLast(e.target.value)}
                        placeholder="Last Name"
                        autoComplete="family-name"
                    />
                    <button onClick={handleSave} aria-label="Save name">Save</button>
                </>
            ) : (
                <>
                    <span aria-labelledby="settings-name-label">{firstName} {lastName}</span>
                    <button onClick={() => setIsEditing(true)} aria-label="Edit name">Edit</button>
                </>
            )}
        </div>
    )
}

// ─────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────
function UserEmail({ email, userId, setEmail }) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempEmail, setTempEmail] = useState("")

    useEffect(() => {
        setTempEmail(email)
    }, [email])

    const handleSave = async () => {
        try {
            await fetch(`${API_URL}/api/users/update/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: tempEmail })
            })

            setEmail(tempEmail)
            setIsEditing(false)

        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="user-setting">
            <p id="settings-email-label">Email:</p>

            {isEditing ? (
                <>
                    <label htmlFor="settings-email-input" className="sr-only">Email</label>
                    <input
                        id="settings-email-input"
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                    />
                    <button onClick={handleSave} aria-label="Save email">Save</button>
                </>
            ) : (
                <>
                    <span aria-labelledby="settings-email-label">{email}</span>
                    <button onClick={() => setIsEditing(true)} aria-label="Edit email">Edit</button>
                </>
            )}
        </div>
    )
}
// gender setting component with radio inputs and "other" option
function UserGender({ gender, userId, setGender }) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempGender, setTempGender] = useState("")

    useEffect(() => {
        setTempGender(gender)
    }, [gender])

    const handleSave = async () => {
        try {
            await fetch(`${API_URL}/api/users/update/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gender: tempGender })
            })

            setGender(tempGender)
            setIsEditing(false)

        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="user-setting">
            <p id="settings-gender-label">Gender:</p>

            {isEditing ? (
                <>
                    <div role="radiogroup" aria-labelledby="settings-gender-label" style={{ display: 'contents' }}>
                        <label>
                            <input
                                type="radio"
                                name="settings-gender"
                                value="male"
                                checked={tempGender === "male"}
                                onChange={(e) => setTempGender(e.target.value)}
                            />
                            Male
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="settings-gender"
                                value="female"
                                checked={tempGender === "female"}
                                onChange={(e) => setTempGender(e.target.value)}
                            />
                            Female
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="settings-gender"
                                value="other"
                                checked={tempGender === "other"}
                                onChange={(e) => setTempGender(e.target.value)}
                            />
                            Other
                        </label>
                    </div>

                    <button onClick={handleSave} aria-label="Save gender">Save</button>
                </>
            ) : (
                <>
                    <span aria-labelledby="settings-gender-label">{gender || "Not set"}</span>
                    <button onClick={() => setIsEditing(true)} aria-label="Edit gender">Edit</button>
                </>
            )}
        </div>
    )
}

// ─────────────────────────────────────────
// PASSWORD
// ─────────────────────────────────────────
function ChangePassword({ userId }) {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [message, setMessage] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const res = await fetch(`${API_URL}/api/users/change-password/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.message)

            setMessage("Password updated!")
            setCurrentPassword("")
            setNewPassword("")

        } catch (err) {
            setMessage(err.message)
        }
    }

    return (
        <div className="user-setting">
            <p id="settings-pwd-label">Change Password</p>

            <form onSubmit={handleSubmit} noValidate aria-labelledby="settings-pwd-label">
                <label htmlFor="settings-current-pwd" className="sr-only">Current password</label>
                <input
                    id="settings-current-pwd"
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                />

                <label htmlFor="settings-new-pwd" className="sr-only">New password</label>
                <input
                    id="settings-new-pwd"
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                />

                <button type="submit" aria-label="Update password">Update</button>
            </form>

            {message && <p role="alert">{message}</p>}
        </div>
    )
}

// ─────────────────────────────────────────
// REST TIMER TOGGLE
// ─────────────────────────────────────────
function RestTimerToggle() {
    const [enabled, setEnabled] = useState(
        () => localStorage.getItem('restTimerEnabled') !== 'false'
    )

    const toggle = () => {
        const next = !enabled
        setEnabled(next)
        localStorage.setItem('restTimerEnabled', String(next))
    }

    return (
        <div className="user-setting">
            <p id="settings-rest-timer-label">Rest Timer</p>
            <span aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
            <button
                className={`toggle-btn${enabled ? ' toggle-btn--on' : ''}`}
                onClick={toggle}
                aria-pressed={enabled}
                aria-labelledby="settings-rest-timer-label"
            >
                <span className="toggle-knob" aria-hidden="true" />
            </button>
        </div>
    )
}

export default Settings
