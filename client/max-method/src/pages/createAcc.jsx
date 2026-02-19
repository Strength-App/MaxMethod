import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CreateAcc() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
    e.preventDefault()

    // For now just log — later this goes to backend
    //console.log({ name, email, password })
    try{
    const res = await fetch("http://localhost:5050/users/add",{
        method:"POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            email: email,
            password: password
        })

    });
    if(!res.ok){
        throw new Error("Failed to create account")
    }

    const data = await res.json();
    console.log("User created:", data)

    // After creating account navigate to home
    navigate('/home')

    }
    catch(err){
      console.error(err);
    }

   
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
