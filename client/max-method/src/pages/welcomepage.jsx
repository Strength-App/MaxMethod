import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'


function Welcomepage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setUser } = useUser()

  const handleSubmit = async(e) => {
    e.preventDefault()

    const request = await fetch('http://localhost:5050/logintest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    const response = await request.json()
    console.log('Login response:', response)
    if (response.success) {
      setUser(response.user) // Store user info in context
      navigate('/home', { replace: true }) // Redirect to home
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