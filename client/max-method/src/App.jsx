import { useState } from 'react'
import './App.css'
import axios from 'axios'
//import { Outlet } from "react-router-dom";
//import Navbar from "./pages/components/Navbar";

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


// import components for navigation bar
import {
  Routes,
  Route,
  Link,
  useLocation,
  Navigate
} from 'react-router-dom'

// Navigation Bar
function Navigation() {
  const location = useLocation()

  return (
    <nav className="navigation">
      {/* BACK BUTTON — only exists when Navigation exists */}
      

      <button id="backBtn" onClick={() => {
          // Prevent going back to auth pages
          if (location.pathname === '/home') return
          window.history.back()
        }}
      >
        ← Back
      </button>

      <Link to="/home" className={location.pathname === '/home' ? "selected" : "nav-link"}>Home</Link>
      <Link to="/classification" className={location.pathname === '/classification' ? "selected" : "nav-link"}>Classification</Link>
      <Link to="/history" className={location.pathname === '/history' ? "selected" : "nav-link"}>History</Link>
      <Link to="/exerciseLibrary" className={location.pathname === '/exerciseLibrary' ? "selected" : "nav-link"}>Exercise Library</Link>
      <Link to="/settings" className={location.pathname === '/settings' ? "selected" : "nav-link"}>Settings</Link>
    </nav>
  )
}

function App() {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const hideNavigation =
    location.pathname === '/welcomepage' ||
    location.pathname === '/create-account'

  return (
    <div className="App">
      {/* ONLY SHOW NAV ON NON-AUTH PAGES */}
      {!hideNavigation && <Navigation />}

      <div className="page-content">
        <Routes>
          {/* AUTH PAGES */}
          <Route path="/welcomepage" element={isAuthenticated ? <Navigate to="/home" replace /> : <Welcomepage setIsAuthenticated={setIsAuthenticated} />}/>
          <Route path="/create-account" element={isAuthenticated ? <Navigate to="/home" replace /> : <CreateAcc setIsAuthenticated={setIsAuthenticated} />}/>

          {/* DEFAULT */}
          <Route path="/" element={<Navigate to="/welcomepage" replace />} />

          {/* APP PAGES Protected*/}
          <Route path="/home" element={isAuthenticated ? <Home /> : <Navigate to="/welcomepage" replace />} />
          <Route path="/day/:weekNum/:dayNum" element={isAuthenticated ? <Day /> : <Navigate to="/welcomepage" replace />} />
          <Route path="/classification" element={isAuthenticated ? <Classification /> : <Navigate to="/welcomepage" replace />} />
          <Route path="/goals" element={isAuthenticated ? <Goals /> : <Navigate to="/welcomepage" replace />} />
          <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/welcomepage" replace />} />
          <Route path="/exerciseLibrary" element={isAuthenticated ? <ExerciseLibrary /> : <Navigate to="/welcomepage" replace />} />
          <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/welcomepage" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App