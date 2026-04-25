import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import axios from "axios";

function CreateAcc() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { setUserId } = useWorkout();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = { firstName, lastName, email, password };
      const response = await axios.post('${import.meta.env.VITE_API_URL}/api/users/create-account', userData);

      console.log("Status: ", response.status);

      // Save user to UserContext
      setUser(response.data);

      // Save userId to WorkoutContext (also saves to localStorage internally)
      setUserId(response.data._id);

      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');

      alert('Account created successfully');
      navigate('/onboarding');
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error creating account');
    }
  };

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
        <br />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <br />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
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
  );
}

export default CreateAcc;