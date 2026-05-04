import OptionHolder from '../../components/OptionHolder/OptionHolder'
import TitleHolder from '../../components/TitleHolder/TitleHolder'
import BackButton from "../../components/BackButton/BackButton.jsx"
import { useState } from 'react'
import React from 'react'
import './JoinGame.css'

const JoinGame = ({navigate}) => {

    const [code, setCode] = useState(['', '', '', '', '', ''])
  return (
    <div id='Joingame'>
        <div className='backb'>
            <BackButton/>
        </div>

        <TitleHolder text="Join Game"/> 
        <h2>Enter the 6-digit code to join a game</h2>
        
        <div className="code-inputs">
         {code.map((val, i) => (
        <input
            key={i}
            type="text"
            maxLength={1}
            value={val}
            onChange={(e) => {
                const newCode = [...code]
                newCode[i] = e.target.value
                setCode(newCode)
            }}
        />
        ))}
        </div>
        <OptionHolder text="JoinGame"/>
    </div>
  )
}

export default JoinGame