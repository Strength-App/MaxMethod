import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CreateAcc({ setIsAuthenticated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()

    // TEMP: just log
    console.log({ name, email, password })

    // Mark user as logged in
    setIsAuthenticated(true)

    // Redirect to home
    navigate('/home')
  }

  return (
    <div className="create-account-page">
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit} className="create-account">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Create Account</button>
      </form>
    </div>
  )
}

export default CreateAcc
