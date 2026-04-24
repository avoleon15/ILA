import './OptionHolder.css'

function OptionHolder({ text }){

    return(
        <div className='optionHolder'>
            <div className='canvas-optionHolder'></div>
            <h3>{text}</h3>
        </div>
    )
}

export default OptionHolder