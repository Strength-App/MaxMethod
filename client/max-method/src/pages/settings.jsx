import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'

function Settings() {
    const { user } = useUser()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [classification, setClassification] = useState("")
    const [loading, setLoading] = useState(true)
    const [gender, setGender] = useState("")

    // 🚨 guard against null user
    if (!user) return <p>Not logged in</p>

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile/${user._id}`)
                console.log("STATUS:", res.status)

                if (!res.ok) {
                    const text = await res.text()
                    console.error("Server error:", text)
                    throw new Error("Failed to fetch user")
                }

                const data = await res.json()
                console.log("DATA:", data)

                setFirstName(data.firstName || "")
                setLastName(data.lastName || "")
                setEmail(data.email || "")
                setClassification(data.current_classification || "")
                setGender(data.gender || "")

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

    return (
        <div className="settings-page">
            <h1>Settings</h1>

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

            <UserLevel classification={classification} />

            <ChangePassword userId={user._id} />

            <RestTimerToggle />
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
            await fetch(`${import.meta.env.VITE_API_URL}/api/users/update/${userId}`, {
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
            await fetch(`${import.meta.env.VITE_API_URL}/api/users/update/${userId}`, {
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
            await fetch(`${import.meta.env.VITE_API_URL}/api/users/update/${userId}`, {
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
// CLASSIFICATION
// ─────────────────────────────────────────
function UserLevel({ classification }) {
    return (
        <div className="user-setting">
            <p>Classification: {classification || "Not set"}</p>
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
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/change-password/${userId}`, {
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