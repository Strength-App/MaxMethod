import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import axios from "axios";
import { API_URL } from '../config/api';
import MaxMethodLogo from '../components/MaxMethodLogo';

function CreateAcc() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { setUserId } = useWorkout();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const userData = { firstName, lastName, email, password };
      const response = await axios.post(`${API_URL}/api/users/create-account`, userData);

      console.log("Status: ", response.status);

      // Save user to UserContext
      setUser(response.data);

      // Save userId to WorkoutContext (also saves to localStorage internally)
      setUserId(response.data._id);

      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');

      navigate('/onboarding');
    } catch (error) {
      console.error('Error creating account:', error);
      alert(error.response?.data?.message || 'Error creating account');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-account-page">
      <MaxMethodLogo />
      <p>Create your account</p>

      <form
        onSubmit={handleSubmit}
        className="welcome-form"
        noValidate
        aria-busy={isSubmitting || undefined}
      >
        <label htmlFor="ca-first-name" className="sr-only">First name</label>
        <input
          id="ca-first-name"
          type="text"
          placeholder="First Name"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          disabled={isSubmitting}
        />
        <label htmlFor="ca-last-name" className="sr-only">Last name</label>
        <input
          id="ca-last-name"
          type="text"
          placeholder="Last Name"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          disabled={isSubmitting}
        />
        <label htmlFor="ca-email" className="sr-only">Email</label>
        <input
          id="ca-email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
        />
        <label htmlFor="ca-password" className="sr-only">Password</label>
        <input
          id="ca-password"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

export default CreateAcc;
