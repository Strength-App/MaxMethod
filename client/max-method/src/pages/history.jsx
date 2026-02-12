import {useState} from 'react'
import Calendar from 'react-calendar'

// Use this import for custom styling of the react-calendar.
// import 'react-calendar/dist/Calendar.css'



function History () {


     const [date, setDate] = useState(new Date());


      return (
        <>
        <div>
          <h1>History</h1>
        </div>
    
        <div className="react-calendar calendar">
          <Calendar className="calender" onChange={setDate} value={date} tileDisabled={({date}) => date.getDay() === 0} />
        </div>


        </>  
      );
}

export default History


function DaySelect(){
    return(
        <h1>Day Select</h1>
    )
}
