import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Welcomepage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // For now just log — later this goes to backend
    //console.log('Email:', email)
    //console.log('Password:', password)

    try{
    const res = await fetch("http://localhost:5050/users/login",{
        method:"GET",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password
        })

    });
    if(!res.ok){
        throw new Error("Failed to log into account")
    }

    // After creating account navigate to home
    navigate('/exerciseLibrary')
  }

  catch(err){
      console.error(err);
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
        >Create Account</button>
      </form>
    </div>
  )
}

export default Welcomepage