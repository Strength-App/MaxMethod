import React, {useState} from 'react';
import ReactPlayer from "react-player";
import UpperBodyModal from "./upperBodyModal";


function Modal({closeModal}) {
    return(
        <div className="modalBackground">

            <div className="modalContainer">

                <div className="closeButton">
                    <button className="closeX" onClick={()=>closeModal(true)}>X</button>
                </div>
                    <div className="title">
                        <h2>Bench Press</h2>
                    </div>
                        <div className="body">

                            <div className="videoContainer0">
                                < UpperBodyVideos video={"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}/>
                            </div>

                        </div>
                    <div className="footer">
                        <button className={closeModal} onClick={() => closeModal(true)}>Cancel</button>
                        <button>Continue</button>
                    </div>
            </div>
        </div>

    )
}

export default Modal;

function UpperBodyVideos({video}){
    const [openModal, setOpenModal] = useState(false)
    const [selectVideos, setVideos] = useState(false)
    return(
        <>
            <ReactPlayer src={video}
                         controls={true}
                         width="400px"
                         height="225px"
            />


        </>
)
}
