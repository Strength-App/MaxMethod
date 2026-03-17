import {useState} from 'react'
import Calendar from 'react-calendar'
import Day from "./day.jsx";

// Use this import for custom styling of the react-calendar.
// import 'react-calendar/dist/Calendar.css'

function History () {

     const [date, setDate] = useState(new Date());

      return (
        <div className="history-page">
        <div>
          <h1 className="history-heading">History</h1>
        </div>

        <div className="react-calendar calendar-container">
          <Calendar className="calendar " onChange={setDate} value={date} tileEnabled={({date}) => date.getDay() === 1} />

        </div>
            <div >
                <button className="history-button" onClick={() => {setDate(new Date())}}>
                    <DaySelect/>
                </button>
            </div>

        </div>
      );
}

// use this function for the logic.
function DaySelect(){
    return(
        <div>
            <h2>Show History</h2>
        </div>
    )
}


export default History
