import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useWorkout } from '../context/WorkoutContext'
import { API_URL } from '../config/api';
import MaxMethodLogo from '../components/MaxMethodLogo'

function Welcomepage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setUser } = useUser()
  const { setUserId, fetchWorkout } = useWorkout()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const request = await fetch(`${API_URL}/api/users/login`, {
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
      <MaxMethodLogo animated />
      <p>Please sign in to continue</p>

      <form onSubmit={handleSubmit} className="welcome-form" noValidate>
        <label htmlFor="login-email" className="sr-only">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="login-password" className="sr-only">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
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
