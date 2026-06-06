import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
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
      const response = await fetch(`${API_URL}/api/users/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // fetch (unlike axios) does not throw on a 4xx/5xx — check explicitly and
      // surface the server's error message the same way axios's catch did.
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || 'Error creating account');
      }

      const data = await response.json();

      // Save user to UserContext
      setUser(data);

      // Save userId to WorkoutContext (also saves to localStorage internally)
      setUserId(data._id);

      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');

      navigate('/onboarding');
    } catch (error) {
      console.error('Error creating account:', error);
      alert(error.message || 'Error creating account');
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
