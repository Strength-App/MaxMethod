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
      <button id="backBtn" aria-label="Go back" onClick={() => {
          if (location.pathname === '/home') return
          window.history.back()
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{marginRight:'6px',verticalAlign:'middle'}}><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      <Link to="/home" className={location.pathname === '/home' ? "selected" : "nav-link"} aria-current={location.pathname === '/home' ? 'page' : undefined}>Home</Link>
      <Link to="/classification" className={location.pathname === '/classification' ? "selected" : "nav-link"} aria-current={location.pathname === '/classification' ? 'page' : undefined}>Classification</Link>
      <Link to="/pickNewProgram" className={location.pathname === '/pickNewProgram' ? "selected" : "nav-link"} aria-current={location.pathname === '/pickNewProgram' ? 'page' : undefined}>Pick New Program</Link>
      <Link to="/history" className={location.pathname === '/history' ? "selected" : "nav-link"} aria-current={location.pathname === '/history' ? 'page' : undefined}>History</Link>
      <Link to="/exerciseLibrary" className={location.pathname === '/exerciseLibrary' ? "selected" : "nav-link"} aria-current={location.pathname === '/exerciseLibrary' ? 'page' : undefined}>Exercise Library</Link>
      <Link to="/settings" className={location.pathname === '/settings' ? "selected" : "nav-link"} aria-current={location.pathname === '/settings' ? 'page' : undefined}>Settings</Link>
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
    </div>
  )
}

export default App