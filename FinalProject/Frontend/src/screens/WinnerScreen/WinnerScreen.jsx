import React from 'react'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import './WinnerScreen.css'

export default function WinnerScreen({ winnerData, winnerName = 'WinnerName', winnerDrawing, navigate }) {
  const resolvedWinnerName = winnerData?.name ?? winnerName
  const resolvedWinnerDrawing = winnerData?.drawing ?? winnerDrawing
  const glitters = Array.from({ length: 10 }, (_, index) => index)

  const handlePlayAgain = () => {
    navigate('menu')
  }

  return (
    <section id="WinnerScreen">

          <h2>WINNER</h2>

          <div className="drawing-viewport">
            <div className="drawing-glitters" aria-hidden="true">
              {glitters.map((glitter) => (
                <span key={glitter} className="glitter" />
              ))}
            </div>
            {resolvedWinnerDrawing ? (
              <img src={resolvedWinnerDrawing} alt="Winning drawing" className="drawing-img" />
            ) : (
              <div className="drawing-placeholder">Waiting for the winning drawing</div>
            )}
          </div>

          <h2 className="winner-name-title">Congratulations,</h2>
          
          <div className="winner-name-panel">
            <h2 className="winner-name">{resolvedWinnerName}</h2>
          </div>
       

        <div className="actions">
          <button className="play-again" onClick={handlePlayAgain}>Play Again</button>
        </div>
    
    </section>
  )
}
