import { useEffect, useState } from 'react'
import BackButton from '../../components/BackButton/BackButton.jsx'
import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import socket from '../../socket.js'
import './LobbyScreen.css'

function LobbyScreen({ navigate, gameState, setGameState }) {
    const [showLeaveWarning, setShowLeaveWarning] = useState(false)
    const [players, setPlayers] = useState(gameState.players || [])

    useEffect(() => {
        // Update player list whenever someone joins or leaves
        socket.on('room-updated', ({ players: updatedPlayers }) => {
            setPlayers(updatedPlayers)
            setGameState(prev => ({ ...prev, players: updatedPlayers }))
        })

        // Navigate everyone to the game when host starts
        socket.on('game-started', () => {
            navigate('demo')
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

    return (
        <section id='lobbyScreen'>
            <div className='lobbyScreenBackButton'>
                <BackButton text='Back' onClick={() => setShowLeaveWarning(true)} />
            </div>

            <TitleHolder text='Lobby' />

            <div className='lobby-room-code'>
                <p>Room code:</p>
                <p>{gameState.roomCode}</p>
            </div>

            <div className='lobby-players'>
                <h3>Players ({players.length})</h3>
                <ul>
                    {players.map((p) => (
                        <li key={p.id}>
                            {p.name} {p.readyStatus ? '✓' : ''}
                        </li>
                    ))}
                </ul>
                {players.length === 0 && <p>Waiting for players to join...</p>}
            </div>

            {gameState.isHost && (
                <OptionHolder text='Start Game' onClick={handleStartGame} />
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
