import { useEffect, useState } from 'react'
import BackButton from '../../components/BackButton/BackButton.jsx'
import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import socket from '../../socket.js'
import './LobbyScreen.css'

function LobbyScreen({ navigate, gameState, setGameState }) {
    const [showLeaveWarning, setShowLeaveWarning] = useState(false)
    const [players, setPlayers] = useState(gameState.players || [])
    const [isCodeCopied, setIsCodeCopied] = useState(false)
    const cArcStartDegrees = 90 + 33 * 7  // Comienza donde terminaría el último (8 jugadores)
    const cArcStepDegrees = -33

    useEffect(() => {
        // Update player list whenever someone joins or leaves
        socket.on('room-updated', ({ players: updatedPlayers }) => {
            setPlayers(updatedPlayers)
            setGameState(prev => ({ ...prev, players: updatedPlayers }))
        })

        // Navigate everyone to topic selection when host starts
        socket.on('game-started', ({ topicSelector }) => {
            setGameState(prev => ({ ...prev, topicSelector }))
            navigate('selecTopic')
        })

        return () => {
            socket.off('room-updated')
            socket.off('game-started')
        }
    }, [])

    const handleStartGame = () => {
        socket.emit('start-game', { roomCode: gameState.roomCode }, (res) => {
            if (!res.success) alert(res.error)
        })
    }

    const handleLeave = () => {
        socket.emit('leave-room', { roomCode: gameState.roomCode })
        setShowLeaveWarning(false)
        navigate('menu')
    }

    const handleCopyRoomCode = async () => {
        if (!gameState.roomCode) return

        try {
            await navigator.clipboard.writeText(gameState.roomCode)
            setIsCodeCopied(true)
            window.setTimeout(() => setIsCodeCopied(false), 1500)
        } catch {
            alert('Could not copy the room code.')
        }
    }

    return (
        <section id='lobbyScreen'>
            <div className='lobbyScreenBackButton'>
                <BackButton text='Back' onClick={() => setShowLeaveWarning(true)} />
            </div>

            <div className='lobby-room-code'>
                <p className='lobby-room-code-label'>Room code:</p>
                <p className='lobby-room-code-value'>{gameState.roomCode}</p>
                <button
                    type='button'
                    className='lobby-room-code-copy'
                    onClick={handleCopyRoomCode}
                    aria-label='Copy room code'
                >
                    <span className='lobby-room-code-copy-icon' aria-hidden='true'>
                        {isCodeCopied ? (
                            <svg viewBox='0 0 24 24' role='presentation' focusable='false'>
                                <path d='M9 16.2 4.8 12 3.4 13.4 9 19 21 7 19.6 5.6z' fill='currentColor' />
                            </svg>
                        ) : (
                            <svg viewBox='0 0 24 24' role='presentation' focusable='false'>
                                <path d='M16 1H6a2 2 0 0 0-2 2v12h2V3h10zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9z' fill='currentColor' />
                            </svg>
                        )}
                    </span>
                </button>
            </div>

            <div className='lobby-players'>
                <h3>
                    <span className='lobby-players-label'>Players</span>
                    <span className='lobby-players-count'> ({players.length})</span>
                </h3>
                <ul className='lobby-players-ring'>
                    {players.map((p, index) => {
                        const playersCount = Math.max(players.length, 1)
                        const angle = cArcStartDegrees + cArcStepDegrees * index

                        return (
                        <li
                            key={p.id}
                            className='lobby-player'
                            style={{
                                '--angle': `${angle}deg`,
                                '--player-color': `hsl(${Math.round((index * 360) / playersCount)} 75% 60%)`,
                            }}
                        >
                            <span className='lobby-player-name'>{p.name}</span>
                            {p.readyStatus ? ' ✓' : ''}
                        </li>
                        )
                    })}
                </ul>
                {players.length === 0 && <p>Waiting for players to join...</p>}
            </div>

            {gameState.isHost && (
                <div className='lobbyStartButton'>
                    <OptionHolder text='Start Game' onClick={handleStartGame} />
                </div>
            )}

            {showLeaveWarning && (
                <div className='lobbyLeaveOverlay'>
                    <div className='lobbyLeaveModal'>
                        <h2>Leave the lobby?</h2>
                        <p>If you leave now, you will abandon the match setup.</p>
                        <div className='lobbyLeaveActions'>
                            <OptionHolder text='Stay' onClick={() => setShowLeaveWarning(false)} />
                            <OptionHolder text='Leave' onClick={handleLeave} />
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default LobbyScreen
