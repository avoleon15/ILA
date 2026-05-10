import './OptionHolder.css'

function OptionHolder({ text, onClick }){

    return(
        <div
            className='optionHolder'
            onClick={onClick}
            role="button"
        >
        <div className='canvas-optionHolder'></div>
            <h3>{text}</h3>
        </div>
    )
}

export default OptionHolder