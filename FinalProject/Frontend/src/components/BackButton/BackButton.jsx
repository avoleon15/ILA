
import "./BackButton.css";

function BackButton({ text, onClick }) {

    return (
        <div className='backButton' onClick={onClick} role='button' tabIndex={0}>
            <div className='canvas-backButton'></div>
            <h3>{text}</h3>
            
        </div>
    )
    ;
}

export default BackButton;


