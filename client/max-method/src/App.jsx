import { useState } from 'react'
import './App.css'
import axios from 'axios'

// import pages for navigation
import Home from './pages/home'
import Day from './pages/day'
import Classification from './pages/classification'
import ExerciseLibrary from './pages/exerciseLibrary'
import History from './pages/history'
import Settings from './pages/settings'

// import components for navigation bar
import {
  BrowserRouter as Router,
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
      <button id="backBtn" onClick={() => window.history.back()}>← Back</button>
      <Link to="/home" className={location.pathname === '/home' ? "selected" : "nav-link"}>Home</Link>
      <Link to="/classification" className={location.pathname === '/classification' ? "selected" : "nav-link"}>Classification</Link>
      <Link to="/history" className={location.pathname === '/history' ? "selected" : "nav-link"}>History</Link>
      <Link to="/exerciseLibrary" className={location.pathname === '/exerciseLibrary' ? "selected" : "nav-link"}>Exercise Library</Link>
      <Link to="/settings" className={location.pathname === '/settings' ? "selected" : "nav-link"}>Settings</Link>
    </nav>
  );
}

function App() {
  const [workout, setWorkout] = useState([])

  const fetchApi = async () => {
    const response = await axios.get('http://localhost:3000/api')
    setWorkout(response.data.workouts)
    console.log(response.data.workouts)
  }

 return (
  <Router>
    <div className="App">
      <Navigation />
      
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/day/:weekNum/:dayNum" element={<Day />} />
          <Route path="/classification" element={<Classification />} />
          <Route path="/history" element={<History />} />
          <Route path="/exerciseLibrary" element={<ExerciseLibrary />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  </Router>
);
}

export default App