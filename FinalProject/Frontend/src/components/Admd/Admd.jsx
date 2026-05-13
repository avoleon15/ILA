import adMediumOne from '../../Assets/images/ad-md-1.png'
import adMediumTwo from '../../Assets/images/ad-md-2.png'
import './Admd.css'

function Admd({ variant = 1 }){

    const adImage = variant === 2 ? adMediumTwo : adMediumOne

    return(
        <div className='ad ad-medium'>
            <img src={adImage} alt='Publicidad mediana' />
        </div>
    )
}

export default Admd