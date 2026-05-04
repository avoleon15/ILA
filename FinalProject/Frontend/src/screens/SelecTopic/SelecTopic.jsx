import React from 'react'
import './SelecTopic.css' 
import TitleHolder from '../../components/TitleHolder/TitleHolder'
import OptionHolder from '../../components/OptionHolder/OptionHolder'

export const SelecTopic = () => {
  return (
    <div id='sl'>
        <TitleHolder text='Topic Time!!'/>
        <input type="text" maxLength={20} className='topic' />
        <OptionHolder text="CONFIRM"/>

    </div>
  )
}
