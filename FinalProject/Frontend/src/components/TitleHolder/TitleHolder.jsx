import './TitleHolder.css'

function TitleHolder({ text }){

    return(
        <div className='titleHolder'>
            <div className='canvas-titleHolder'></div>
            <h1>{text}</h1>
        </div>
    )
}

export default TitleHolder