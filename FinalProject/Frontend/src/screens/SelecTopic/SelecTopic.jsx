import React from 'react'
import TitleHolder from '../../components/TitleHolder/TitleHolder'

export const SelecTopic = () => {
  return (
    <div>
        <TitleHolder text='Topic Selection'/>
        <input type="text" maxLength={20} />
    </div>
  )
}
