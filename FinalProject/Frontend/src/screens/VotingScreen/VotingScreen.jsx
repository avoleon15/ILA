import { useEffect, useState } from 'react'
import socket from '../../socket.js'
import './VotingScreen.css'

const VOTE_OPTIONS = [
  { value: 1, emoji: '💩', label: 'Poop',   stars: '★☆☆☆☆' },
  { value: 2, emoji: '😐', label: 'Meh',    stars: '★★☆☆☆' },
  { value: 3, emoji: '👍', label: 'Normal', stars: '★★★☆☆' },
  { value: 4, emoji: '😍', label: 'Nice!',  stars: '★★★★☆' },
  { value: 5, emoji: '🔥', label: 'Great!', stars: '★★★★★' },
]

const VotingScreen = ({ navigate, gameState, setGameState }) => {
  const drawings        = gameState?.votingData?.drawings ?? []
  const secondsEach     = Math.floor((gameState?.votingData?.votingDuration ?? 10000) / 1000)

  const [currentIdx,     setCurrentIdx]     = useState(0)
  const [timeLeft,       setTimeLeft]       = useState(secondsEach)
  const [selectedRating, setSelectedRating] = useState(null)
  const [finished,       setFinished]       = useState(false)

  const currentDrawing = drawings[currentIdx]
  const isOwnDrawing   = currentDrawing?.socketId === socket.id

  // Navigate to winner when backend confirms results
  useEffect(() => {
    socket.on('voting-ended', ({ results }) => {
      setGameState(prev => ({ ...prev, results }))
      navigate('winner')
    })
    return () => socket.off('voting-ended')
  }, [])

  // Per-drawing countdown — resets every time currentIdx changes
  useEffect(() => {
    setTimeLeft(secondsEach)
    setSelectedRating(null)

    let remaining = secondsEach

    const interval = setInterval(() => {
      remaining -= 1
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        if (currentIdx + 1 < drawings.length) {
          setCurrentIdx(prev => prev + 1)
        } else {
          setFinished(true)
          if (gameState.isHost) {
            socket.emit('end-voting', { roomCode: gameState.roomCode })
          }
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentIdx])

  const handleVote = (rating) => {
    if (selectedRating !== null || isOwnDrawing) return
    setSelectedRating(rating)
    socket.emit('submit-vote', {
      roomCode: gameState.roomCode,
      votedOnSocketId: currentDrawing.socketId,
      rating,
    })
  }

  if (finished) {
    return (
      <div className="vs-wrap">
        <div className="vs-title-bar"><span>VOTING PHASE</span></div>
        <p className="vs-waiting">Calculating results...</p>
      </div>
    )
  }

  return (
    <div className="vs-wrap">
      <div className="vs-title-bar">
        <span>VOTING PHASE</span>
        <span className="vs-progress">{currentIdx + 1} / {drawings.length}</span>
      </div>

      <div className="vs-timer-bar">
        <div
          className={`vs-timer-fill ${timeLeft <= 3 ? 'urgent' : ''}`}
          style={{ width: `${(timeLeft / secondsEach) * 100}%` }}
        />
      </div>

      <p className="vs-player-label">{currentDrawing?.playerName} drew...</p>

      <div className="vs-draw-stage">
        <div className="vs-corner tl" /><div className="vs-corner tr" />
        <div className="vs-corner bl" /><div className="vs-corner br" />
        {currentDrawing?.drawing
          ? <img src={currentDrawing.drawing} alt="drawing" className="vs-drawing" />
          : <p className="vs-placeholder">This player didn't submit a drawing</p>
        }
      </div>

      {isOwnDrawing ? (
        <p className="vs-own-label">This is your drawing — you can't vote on it</p>
      ) : (
        <div className="vs-vote-row">
          {VOTE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`vs-vote-btn ${selectedRating === opt.value ? 'selected' : ''} ${selectedRating !== null && selectedRating !== opt.value ? 'dimmed' : ''}`}
              onClick={() => handleVote(opt.value)}
              disabled={selectedRating !== null}
            >
              <span className="vs-emoji">{opt.emoji}</span>
              <span className="vs-label">{opt.label}</span>
              <span className="vs-stars">{opt.stars}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default VotingScreen
