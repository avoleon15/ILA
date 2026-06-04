import { useEffect, useRef } from 'react'
import './Admd.css'

function Admd() {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error(e)
    }
  }, [])

  return (
    <div className='ad ad-medium'>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5424598379625497"
        data-ad-slot="9398811622"
        data-ad-format="rectangle"
        data-full-width-responsive="false"
      />
    </div>
  )
}

export default Admd