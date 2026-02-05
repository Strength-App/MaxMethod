import Calendar from 'react-Calendar'
import {useState} from 'react'
import 'react-calendar/dist/Calendar.css'
function History () {
     const [value, onChange] = useState(new Date());
      return (
        <>
        <div className= "App">
          <h1>History</h1>
        </div>
    
        <div>
          <Calendar
            onChange={onChange}
            value={value}
          />
        </div>
    
      
        </>  
      );
}

export default History;