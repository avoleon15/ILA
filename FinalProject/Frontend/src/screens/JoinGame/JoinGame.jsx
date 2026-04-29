import OptionHolder from '../../components/OptionHolder/OptionHolder'
import TitleHolder from '../../components/TitleHolder/TitleHolder'
import { useState } from 'react'
import React from 'react'
import './JoinGame.css'

const JoinGame = ({navigate}) => {

  return (
    <div id='Joingame'>
        <TitleHolder text="Join Game"/> 
        <h2>Enter the 6-digit code to join a game</h2>
    </div>
  )
}

export default JoinGame