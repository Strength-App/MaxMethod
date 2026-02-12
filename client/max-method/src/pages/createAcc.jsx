import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CreateAcc(){
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleSubmit = (e) => {
    e.preventDefault()

    // For now just log — later this goes to backend
    console.log({ name, email, password })

    // After creating account navigate to home
    navigate('/home')

  }

    return(
        <div className='create-account-page'>
            <h1>Create Account</h1>
            <form onSubmit={handleSubmit} className="create-account">
                <input
                type="name"
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
