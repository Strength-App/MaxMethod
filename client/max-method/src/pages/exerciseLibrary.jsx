import React, {useState} from 'react'
import ReactPlayer from 'react-player'
import Modal from './components/modal'
import UpperBodyModal from './components/upperBodyModal'


function ExerciseLibrary () {


    const   workouts = [<video src="https://www.youtube.com/watch?v=GM2REwzKBTw"></video>, "Triceps Press","Preacher Curls"]
    const [openModal, setOpenModal] = useState(false)
    return (
        <>
            <div><h1>Exercise Library</h1></div>
            <div className={"selection"}>
                <div className={"closeButton"}>
                    <button onClick={()=> setOpenModal(true)}>UPPER BODY</button>
                    {openModal && <UpperBodyModal closeModal={()=> setOpenModal(false)}/>}
                </div>
                <br/>
                <br></br>
                <br></br>
                <div className={"exercise"}>
                    <button>LOWER BODY</button>
                </div>
            </div>

        </>
    )
}

export default ExerciseLibrary;