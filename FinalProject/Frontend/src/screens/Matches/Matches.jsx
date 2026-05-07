import { useEffect, useState } from 'react'
import BackButton from '../../components/BackButton/BackButton.jsx'
import './Matches.css'

function Matches({ navigate }) {
    const [matches, setMatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    useEffect(() => {
        fetch('http://localhost:3000/matches')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then(data => {
                setMatches(data)
                setLoading(false)
            })
            .catch(() => {
                setError('Could not load matches. Make sure the backend is running.')
                setLoading(false)
            })
    }, [])

    const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })

    const formatDuration = (secs) => {
        if (secs === 60)  return 'Classic (60s)'
        if (secs === 120) return 'Rapid (120s)'
        if (secs === 180) return 'Extended (180s)'
        return `${secs}s`
    }

    return (
        <section id="Matches">
            <div className="matches-header">
                <BackButton text="Back" onClick={() => navigate('menu')} />
                <h2 className="matches-title">All Matches</h2>
            </div>

            {loading && <p className="matches-status">Loading...</p>}
            {error   && <p className="matches-status matches-error">{error}</p>}

            {!loading && !error && matches.length === 0 && (
                <p className="matches-status">No matches played yet.</p>
            )}

            {!loading && !error && matches.length > 0 && (
                <div className="matches-list">
                    {matches.map(match => (
                        <div key={match._id} className="match-card">
                            <div className="match-card-header">
                                <span className='match-code'>Room code: {match.roomCode}</span>
                                <span className="match-date">{formatDate(match.createdAt)}</span>
                            </div>

                            <div className="match-card-meta">
                                <div><span>Topic: </span> <span className='match-info'>{match.topic}</span></div>
                                <div><span>Round number: </span> <span className='match-info'>{match.roundNumber}</span></div>
                                <div><span>Time Mode: </span> <span className='match-info'>{formatDuration(match.duration)}</span></div>
                                <div><span>Winner: </span> <span className='match-info'>{match.winner?.playerName ?? 'N/A'}</span></div>
                            </div>

                            <div className="match-players">
                                {match.players.map((p, i) => (
                                    <div key={i} className="match-player-row">
                                        <span className="match-player-name">{p.playerName}</span>
                                        <span className="match-player-score match-info">{p.score} pts</span>
                                        {!p.drawingSubmitted && <span className="match-no-drawing">N/A</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

export default Matches
