import React, {useState} from 'react';
import ReactPlayer from "react-player";
import Modal from './modal';

function UpperBodyModal(closeModal, setOpenModal, openModal) {


    const [selectMuscleGroup, setSelectMuscleGroup] = useState(false)
    const [selectVideos, setVideos] = useState(false)
    return (
        <div className="modalBackground">
            <div className="modalContainer">

                <div className="title"><h3>Selections</h3></div>

                <div className="body">
                        <div className="selectionsContainer">
                            <button className="muscle-content" onClick={() => setSelectMuscleGroup(true)}>CHEST</button>
                            {selectMuscleGroup && <Modal closeModal={()=> setSelectMuscleGroup(false)}/>}
                            <button className="muscle-content" onClick={() => setVideos(true)}>ARMS</button>
                            {selectVideos && <Modal closeModal={()=> setVideos(false)}/>}
                            <button className="muscle-content">BACK</button>
                            <button className="muscle-content">SHOULDERS</button>
                        </div>
                </div>

            </div>
        </div>
    )
}



export default UpperBodyModal;


