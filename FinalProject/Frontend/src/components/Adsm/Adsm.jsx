import { useEffect, useRef } from 'react'
import './Adsm.css'

function Adsm() {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error(e)
    }
  }, [])

  return (
    <div className='ad-small'>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5424598379625497"
        data-ad-slot="5515406939"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export default Adsm