import {useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from 'axios'



function App() {
  const [count, setCount] = useState(0)
    const [workout, setWorkout] = useState([])

  const fetchApi = async () => {
    const response = await axios.get('http://localhost:3000/api')
      setWorkout(response.data.workouts)
      console.log(response.data.workouts)
  }
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
          <button onClick={() => fetchApi()}>SHOW WORKOUTS</button>
          {
              workout.map((workout, index)=>(
                  <div key={index}>
                      <p>{workout}</p>
                  </div>
              ))
          }
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App


function ButtonLink({ onClick }) {
    const[workout, viewWorkout] = useState(null)
   return (
       <div className="buttonLink">
           <button onClick={() => viewWorkout(workout)}>Upper</button>
       </div>
   )
}