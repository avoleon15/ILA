// Matches.jsx — paginated list of all completed matches fetched from the REST API.
// Pulls from GET /matches with page and limit params, showing 10 results per page.

import { useEffect, useState } from 'react'
import BackButton from '../../components/BackButton/BackButton.jsx'
import './Matches.css'

const LIMIT = 10

function Matches({ navigate }) {
    const [matches, setMatches]         = useState([])
    const [loading, setLoading]         = useState(true)
    const [error, setError]             = useState(null)
    const [page, setPage]               = useState(1)
    const [totalPages, setTotalPages]   = useState(1)
    const [total, setTotal]             = useState(0)

    useEffect(() => {
        setLoading(true)
        setError(null)
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/matches?page=${page}&limit=${LIMIT}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then(data => {
                setMatches(data.matches)
                setTotalPages(data.totalPages)
                setTotal(data.total)
                setLoading(false)
            })
            .catch(() => {
                setError('Could not load matches. Make sure the backend is running.')
                setLoading(false)
            })
    }, [page])

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
                {!loading && !error && total > 0 && (
                    <span className="matches-count">{total} match{total !== 1 ? 'es' : ''}</span>
                )}
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

            {!loading && !error && totalPages > 1 && (
                <div className="matches-pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                    >
                        &larr; Prev
                    </button>

                    <div className="pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                className={`pagination-page${p === page ? ' active' : ''}`}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <button
                        className="pagination-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
        </section>
    )
}

export default Matches
