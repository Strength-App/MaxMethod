import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Welcomepage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()

    // For now just log — later this goes to backend
    console.log('Email:', email)
    console.log('Password:', password)
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
        >Create Account</button>
      </form>
    </div>
  )
}

export default Welcomepage
