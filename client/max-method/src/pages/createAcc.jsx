import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext';

import axios from "axios";


function CreateAcc() {
  const [ firstName, setFirstName] = useState('')
  const [ lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setUser } = useUser();


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = {firstName, lastName, email, password};
      const response = await axios.post('http://localhost:5050/api/users/create-account/', userData);
      console.log("Status: ", response.status);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setUser(response.data);
      alert('Account created successfully');
      navigate('/classification');
    }catch (error) {
      console.error('Error creating account:', error);
      alert('Error creating account');
    }


    //AUTHENTICATE USER
    // Check if all inputs are filled in and the password is at least 8 characters long
    // if (!firstName || !lastName || !email || !password) {
    //   alert('Please fill in all fields')
    //   return
    // }
    // else if (password.length < 8) {
    //      alert('Password must be at least 8 characters long')
    //   return
    // }
    // else{
    //
    //   submitForm(e).then(response => {
    //     console.log(response.data);
    //   })
    //
    // }
    console.log({ firstName, lastName, email, password })
    //GO TO goals
  }
  // const submitForm = async (e) => {
  //   e.preventDefault();
  //   await axios.post('http://localhost:5050/api/users/', {email: email, password: password, firstName: firstName, lastName: lastName})
  //       .then(response => {
  //         console.log(response.data);
  //         navigate('/classification');
  //       })
  // }

  return (
      <div className="create-account-page">
        <h1>Create Account</h1>

        <form onSubmit={handleSubmit} className="create-account">
          <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
          />
          <br/>
          <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
          />
          <br/>
          <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
          />
          <br/>
          <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
          />

          <button className="history-button" type="submit">Create Account</button>
        </form>
      </div>
  )
}





export default CreateAcc
