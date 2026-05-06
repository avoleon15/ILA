import './VotingScreen.css'

const VOTE_OPTIONS = [
  { value: 1, emoji: '💩', label: 'Poop',   stars: '★☆☆☆☆' },
  { value: 2, emoji: '😐', label: 'Meh',    stars: '★★☆☆☆' },
  { value: 3, emoji: '👍', label: 'Normal', stars: '★★★☆☆' },
  { value: 4, emoji: '😍', label: 'Nice!',  stars: '★★★★☆' },
  { value: 5, emoji: '🔥', label: 'Great!', stars: '★★★★★' },
]

const VotingScreen = ({ playerName = 'PLAYER_02', drawingUrl = null }) => {
  return (
    <div className="vs-wrap">
      <div className="vs-title-bar">
        <span>VOTING PHASE</span>
      </div>

      <p className="vs-player-label">{playerName} drew...</p>

      <div className="vs-draw-stage">
        <div className="vs-corner tl" /><div className="vs-corner tr" />
        <div className="vs-corner bl" /><div className="vs-corner br" />
        {drawingUrl
          ? <img src={drawingUrl} alt="drawing" className="vs-drawing" />
          : <p className="vs-placeholder">[ drawing goes here ]</p>
        }
      </div>

      <div className="vs-vote-row">
        {VOTE_OPTIONS.map(opt => (
          <button key={opt.value} className="vs-vote-btn">
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