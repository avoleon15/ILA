
import "./BackButton.css";

function BackButton({text}) {

    return (
        <div className='backButton'>
            <div className='canvas-backButton'></div>
            <h3>{text}</h3>
            
        </div>
    )
    ;
}

export default BackButton;


