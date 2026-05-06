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
  const drawings = gameState?.votingData?.drawings ?? []
  const otherDrawings = drawings.filter(d => d.socketId !== socket.id)

  const [currentIdx,      setCurrentIdx]      = useState(0)
  const [hasVotedCurrent, setHasVotedCurrent] = useState(false)
  const [selectedRating,  setSelectedRating]  = useState(null)
  const [doneVoting,      setDoneVoting]      = useState(otherDrawings.length === 0)

  const currentDrawing = otherDrawings[currentIdx]

  useEffect(() => {
    socket.on('voting-ended', ({ results }) => {
      setGameState(prev => ({ ...prev, results }))
      navigate('winner')
    })
    return () => socket.off('voting-ended')
  }, [])

  const handleVote = (rating) => {
    if (hasVotedCurrent) return
    setHasVotedCurrent(true)
    setSelectedRating(rating)

    socket.emit('submit-vote', {
      roomCode: gameState.roomCode,
      votedOnSocketId: currentDrawing.socketId,
      rating
    })

    setTimeout(() => {
      if (currentIdx + 1 < otherDrawings.length) {
        setCurrentIdx(prev => prev + 1)
        setHasVotedCurrent(false)
        setSelectedRating(null)
      } else {
        setDoneVoting(true)
      }
    }, 700)
  }

  if (doneVoting) {
    return (
      <div className="vs-wrap">
        <div className="vs-title-bar"><span>VOTING PHASE</span></div>
        <p className="vs-waiting">All votes submitted! Waiting for other players...</p>
      </div>
    )
  }

  return (
    <div className="vs-wrap">
      <div className="vs-title-bar">
        <span>VOTING PHASE</span>
        <span className="vs-progress">{currentIdx + 1} / {otherDrawings.length}</span>
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

      <div className="vs-vote-row">
        {VOTE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`vs-vote-btn ${selectedRating === opt.value ? 'selected' : ''}`}
            onClick={() => handleVote(opt.value)}
            disabled={hasVotedCurrent}
          >
            <span className="vs-emoji">{opt.emoji}</span>
            <span className="vs-label">{opt.label}</span>
            <span className="vs-stars">{opt.stars}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default VotingScreen
