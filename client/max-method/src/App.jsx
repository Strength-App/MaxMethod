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

// Workout context — wraps the whole app so state persists when navigating
import { WorkoutProvider } from './context/WorkoutContext'

import {
  Routes,
  Route,
  Link,
  useLocation,
  Navigate
} from 'react-router-dom'

// Navigation Bar
function Navigation() {
  const location = useLocation();

  return (
    <nav className="navigation">
      <button id="backBtn" onClick={() => {
          if (location.pathname === '/home') return
          window.history.back()
        }}
      >
        ← Back
      </button>

      <Link to="/home" className={location.pathname === '/home' ? "selected" : "nav-link"}>Home</Link>
      <Link to="/classification" className={location.pathname === '/classification' ? "selected" : "nav-link"}>Classification</Link>
      <Link to="/pickNewProgram" className={location.pathname === '/pickNewProgram' ? "selected" : "nav-link"}>Pick New Program</Link>
      <Link to="/history" className={location.pathname === '/history' ? "selected" : "nav-link"}>History</Link>
      <Link to="/exerciseLibrary" className={location.pathname === '/exerciseLibrary' ? "selected" : "nav-link"}>Exercise Library</Link>
      <Link to="/settings" className={location.pathname === '/settings' ? "selected" : "nav-link"}>Settings</Link>
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
    // if (!user.onboarding_complete) return <Navigate to="/classification" replace />
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
          </Routes>
        </div>
      </WorkoutProvider>
    </div>
  )
}

export default App