import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useWorkout } from '../context/WorkoutContext'

function Welcomepage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setUser } = useUser()
  const { setUserId, fetchWorkout } = useWorkout()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const request = await fetch('http://localhost:5050/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const response = await request.json()
    console.log('Login response:', response)

    if (response.success) {
      const userId = response.user._id.toString()

      // Save user to UserContext
      setUser(response.user)

      // Save userId to WorkoutContext (also saves to localStorage)
      setUserId(userId)

      // If onboarding is complete, fetch their existing workout
      // so Home.jsx has it ready immediately on navigation
      if (response.user.onboarding_complete) {
        await fetchWorkout(userId)
        navigate('/home', { replace: true })
      } else {
        // Onboarding not finished — send them to classification
        navigate('/classification', { replace: true })
      }
    } else {
      alert('Login failed: ' + response.message)
    }
  }

  return (
    <div className="welcome-page">
      <h1>Welcome</h1>
      <p>Please sign in to continue</p>

      <form onSubmit={handleSubmit} className="welcome-form">
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Sign In</button>

        <button
          type="button"
          onClick={() => navigate('/create-account')}
        >
          Create Account
        </button>
      </form>
    </div>
  )
}

export default Welcomepage