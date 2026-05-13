import adSmall from '../../Assets/images/ad-sm.png'
import './Adsm.css'

function Adsm(){

    return(
        <div className='ad ad-small'>
            <img src={adSmall} alt='Publicidad pequeña' />
        </div>
    )
}

export default Adsm