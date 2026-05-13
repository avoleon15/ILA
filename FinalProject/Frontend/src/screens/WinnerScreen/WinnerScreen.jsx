// WinnerScreen.jsx — results screen shown after voting ends.
// Displays the winner's name and their drawing. The host can start a new round or any player can exit.

import { useEffect } from 'react'
import socket from '../../socket.js'
import './WinnerScreen.css'

export default function WinnerScreen({ gameState, setGameState, navigate }) {
  const winnerData = gameState?.results?.[0]
  const resolvedWinnerName = winnerData?.name ?? 'Unknown'
  const resolvedWinnerDrawing = winnerData?.drawing ?? null
  const glitters = Array.from({ length: 10 }, (_, index) => index)

  useEffect(() => {
    socket.on('room-updated', ({ state, players }) => {
      if (state === 'waiting') {
        setGameState(prev => ({ ...prev, players, topic: '', results: null }))
        navigate('lobby')
      }
    })

    return () => socket.off('room-updated')
  }, [])

  const handlePlayAgain = () => {
    socket.emit('next-round', { roomCode: gameState.roomCode }, (res) => {
      if (!res?.success) alert(res?.error)
    })
  }

  const handleExit = () => {
    socket.emit('leave-room', { roomCode: gameState.roomCode })
    setGameState(prev => ({ ...prev, roomCode: '', topic: '', results: null, players: [] }))
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
          {gameState.isHost ? (
            <button className="play-again" onClick={handlePlayAgain}>Play Again</button>
          ) : (
            <p className="waiting-host">Waiting for host...</p>
          )}
          <button className="play-again" onClick={handleExit}>Exit</button>
        </div>

    </section>
  )
}
