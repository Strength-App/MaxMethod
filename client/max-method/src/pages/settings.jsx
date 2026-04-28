import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
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

    const [settingsOpen, setSettingsOpen] = useState(false)
    const [classificationsOpen, setClassificationsOpen] = useState(false)
    const [bodyweightOpen, setBodyweightOpen] = useState(false)
    const [totalsOpen, setTotalsOpen] = useState(false)
    const [benchOpen, setBenchOpen] = useState(false)
    const [squatOpen, setSquatOpen] = useState(false)
    const [deadliftOpen, setDeadliftOpen] = useState(false)

    // 🚨 guard against null user
    if (!user) return <p>Not logged in</p>

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

    if (loading) return <p>Loading...</p>

    // Chart data is chronological (oldest → newest); rows are reversed (newest first)
    const classificationChartData = [...classificationHistory].reverse()
    const bodyweightChartData = [...bodyweightHistory].reverse()

    return (
        <div className="settings-page">
            <h1>Profile</h1>

            <CollapsibleSection title="Strength Classifications" open={classificationsOpen} setOpen={setClassificationsOpen}>
                {currentClassification && (
                    <div className="profile-stat-row profile-stat-row--current">
                        <span className="profile-stat-label">Current</span>
                        <span className="profile-stat-value">{currentClassification}</span>
                    </div>
                )}
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

function StatChart({ data, dataKey, label, color = '#cc0404' }) {
    if (!data || data.length < 2) return null
    return (
        <div className="profile-chart">
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
    return (
        <div className="collapsible-section">
            <button className="collapsible-header" onClick={() => setOpen(o => !o)}>
                <span>{title}</span>
                <span className={`collapsible-chevron${open ? ' open' : ''}`}>▾</span>
            </button>
            {open && <div className="collapsible-body">{children}</div>}
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
            <p>Name:</p>

            {isEditing ? (
                <>
                    <input
                        value={tempFirst}
                        onChange={(e) => setTempFirst(e.target.value)}
                        placeholder="First Name"
                    />
                    <input
                        value={tempLast}
                        onChange={(e) => setTempLast(e.target.value)}
                        placeholder="Last Name"
                    />
                    <button onClick={handleSave}>Save</button>
                </>
            ) : (
                <>
                    <span>{firstName} {lastName}</span>
                    <button onClick={() => setIsEditing(true)}>Edit</button>
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
            <p>Email:</p>

            {isEditing ? (
                <>
                    <input
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                    />
                    <button onClick={handleSave}>Save</button>
                </>
            ) : (
                <>
                    <span>{email}</span>
                    <button onClick={() => setIsEditing(true)}>Edit</button>
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
            <p>Gender:</p>

            {isEditing ? (
                <>
                    <label>
                        <input
                            type="radio"
                            value="male"
                            checked={tempGender === "male"}
                            onChange={(e) => setTempGender(e.target.value)}
                        />
                        Male
                    </label>

                    <label>
                        <input
                            type="radio"
                            value="female"
                            checked={tempGender === "female"}
                            onChange={(e) => setTempGender(e.target.value)}
                        />
                        Female
                    </label>

                    <label>
                        <input
                            type="radio"
                            value="other"
                            checked={tempGender === "other"}
                            onChange={(e) => setTempGender(e.target.value)}
                        />
                        Other
                    </label>

                    <button onClick={handleSave}>Save</button>
                </>
            ) : (
                <>
                    <span>{gender || "Not set"}</span>
                    <button onClick={() => setIsEditing(true)}>Edit</button>
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
            <p>Change Password</p>

            <form onSubmit={handleSubmit}>
                <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />

                <button type="submit">Update</button>
            </form>

            {message && <p>{message}</p>}
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
            <p>Rest Timer</p>
            <span>{enabled ? 'On' : 'Off'}</span>
            <button
                className={`toggle-btn${enabled ? ' toggle-btn--on' : ''}`}
                onClick={toggle}
                aria-pressed={enabled}
            >
                <span className="toggle-knob" />
            </button>
        </div>
    )
}

export default Settings
