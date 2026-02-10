import { useState } from 'react'

function Settings() {
    const [name, setName] = useState("Carlos")
    const [email, setEmail] = useState("carlos@email.com")
    const [level] = useState(5)

    return (
        <div className="settings-page">
            <h1>Settings</h1>

            <UserName 
                name={name}
                onSave={setName}
            />

            <UserEmail 
                email={email}
                onSave={setEmail}
            />

            <UserLevel level={level} />
        </div>
    )
}

function UserEmail({ email, onSave }) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempEmail, setTempEmail] = useState(email)

    const handleSave = () => {
        onSave(tempEmail)
        setIsEditing(false)
    }

    return (
        <div className="user-setting">
            <p>Email:</p>

            {isEditing ? (
                <>
                    <input
                        type="text"
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

function UserName({ name, onSave }) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempName, setTempName] = useState(name)

    const handleSave = () => {
        onSave(tempName)
        setIsEditing(false)
    }

    return (
        <div className="user-setting">
            <p>Name:</p>

            {isEditing ? (
                <>
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                    />
                    <button onClick={handleSave}>Save</button>
                </>
            ) : (
                <>
                    <span>{name}</span>
                    <button onClick={() => setIsEditing(true)}>Edit</button>
                </>
            )}
        </div>
    )
}

function UserLevel({ level }) {
    return (
        <div className="user-setting">
            <p>Level: {level}</p>
        </div>
    )
}

export default Settings
