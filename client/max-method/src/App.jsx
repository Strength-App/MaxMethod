import './App.css'
import { useUser } from './context/UserContext';

// import pages for navigation
import Home from './pages/home'
import Day from './pages/day'
import Classification from './pages/classification'
import Goals from './pages/goals'
import ExerciseLibrary from './pages/exerciseLibrary'
import History from './pages/history'
import Settings from './pages/settings'
import CreateAcc from './pages/createAcc'
import Welcomepage from './pages/welcomepage'
import PickNewProgram from './pages/pickNewProgram'
import CustomWorkout from './pages/customWorkout'
import CustomDay from './pages/customDay'
import ViewProgram from './pages/viewProgram'

// Workout context — wraps the whole app so state persists when navigating
import { WorkoutProvider } from './context/WorkoutContext'
import { useWorkout } from './context/WorkoutContext'

import {
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
  useNavigate
} from 'react-router-dom'

// Navigation Bar
function Navigation() {
  const location = useLocation();
  const { logout } = useUser();
  const { logoutWorkout } = useWorkout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    logoutWorkout();
    navigate("/welcomepage");
  };

  const onPrograms = location.pathname === '/pickNewProgram' || location.pathname.startsWith('/view-program');

  return (
    <nav className="navigation">
      <button id="backBtn" onClick={() => {
          if (location.pathname === '/home') return
          window.history.back()
        }}
      >
        ← Back
      </button>

      <Link to="/home" className={location.pathname === '/home' ? "selected" : "nav-link"} aria-current={location.pathname === '/home' ? 'page' : undefined}>Home</Link>
      <Link to="/pickNewProgram" className={onPrograms ? "selected" : "nav-link"} aria-current={onPrograms ? 'page' : undefined}>Programs</Link>
      <Link to="/history" className={location.pathname === '/history' ? "selected" : "nav-link"} aria-current={location.pathname === '/history' ? 'page' : undefined}>History</Link>
      <Link to="/exerciseLibrary" className={location.pathname === '/exerciseLibrary' ? "selected" : "nav-link"} aria-current={location.pathname === '/exerciseLibrary' ? 'page' : undefined}>Exercise Library</Link>
      <Link to="/settings" className={location.pathname === '/settings' ? "selected" : "nav-link"} aria-current={location.pathname === '/settings' ? 'page' : undefined}>Settings</Link>

      <button onClick={handleLogout} className="logout-btn">
        Logout
      </button>
    </nav>
  )
}

function App() {
  const location = useLocation()
  const { user } = useUser();

  const hideNavigation =
  location.pathname === '/welcomepage' ||
  location.pathname === '/create-account' ||
  location.pathname === '/classification' ||
  location.pathname === '/goals'

  const protectedRoute = (element) => {
    if (!user) return <Navigate to="/welcomepage" replace />
    return element
  }

  return (
    <div className="App">
      <WorkoutProvider>
        {/* ONLY SHOW NAV ON NON-AUTH PAGES */}
        {!hideNavigation && <Navigation />}

        <div className="page-content">
          <Routes>
            {/* DEFAULT */}
            <Route path="/" element={<Navigate to="/welcomepage" replace />} />

            {/* AUTH PAGES */}
            <Route path="/welcomepage" element={user ? <Navigate to="/home" replace /> : <Welcomepage />} />
            <Route path="/create-account" element={user ? <Navigate to="/classification" replace /> : <CreateAcc />} />

            {/* ONBOARDING — requires login but not onboarding_complete */}
            <Route path="/classification" element={user ? <Classification /> : <Navigate to="/welcomepage" replace />} />

            {/* PROTECTED PAGES — requires login + onboarding_complete */}
            <Route path="/home" element={protectedRoute(<Home />)} />
            <Route path="/day/:weekNum/:dayNum" element={protectedRoute(<Day />)} />
            <Route path="/goals" element={protectedRoute(<Goals />)} />
            <Route path="/history" element={protectedRoute(<History />)} />
            <Route path="/exerciseLibrary" element={protectedRoute(<ExerciseLibrary />)} />
            <Route path="/settings" element={protectedRoute(<Settings />)} />
            <Route path="/pickNewProgram" element={protectedRoute(<PickNewProgram />)} />
            <Route path="/customWorkout" element={protectedRoute(<CustomWorkout />)} />
            <Route path="/customDay/:weekNum/:dayNum" element={protectedRoute(<CustomDay />)} />
            <Route path="/view-program/:programLogId" element={protectedRoute(<ViewProgram />)} />
          </Routes>
        </div>
      </WorkoutProvider>
    </div>
  )
}

export default App