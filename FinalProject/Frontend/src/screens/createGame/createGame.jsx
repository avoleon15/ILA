// createGame.jsx — screen where the host configures and creates a new room.
// Lets the host pick a name, player count, and game mode before emitting create-room.

import { useEffect, useState } from "react"
import BackButton from '../../components/BackButton/BackButton.jsx'
import Gamemode from "../../components/Gamemode/Gamemode.jsx"
import OptionHolder from "../../components/OptionHolder/OptionHolder.jsx"
import NumberInput from '../../components/PlayersNum/PlayersNum.jsx'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import socket from '../../socket.js'
import './createGame.css'

function CreateGame({ navigate, gameState, setGameState }) {
    const [players, setPlayers] = useState(2)
    const [error, setError] = useState('')
    const [connected, setConnected] = useState(socket.connected)

    // Track socket connection state so the user knows if the backend is reachable
    useEffect(() => {
        const onConnect    = () => setConnected(true)
        const onDisconnect = () => setConnected(false)

        socket.on('connect', onConnect)
        socket.on('disconnect', onDisconnect)

        return () => {
            socket.off('connect', onConnect)
            socket.off('disconnect', onDisconnect)
        }
    }, [])

    const handleStartMatch = () => {
        if (!connected) {
            setError('Not connected to server. Make sure the backend is running.')
            return
        }
        if (!gameState.playerName.trim()) {
            setError('Please enter your name before starting.')
            return
        }
        setError('')

        socket.emit('create-room', { hostName: gameState.playerName, gameMode: gameState.gameMode, maxPlayers: players }, (res) => {
            if (res.success) {
                setGameState(prev => ({
                    ...prev,
                    roomCode: res.roomCode,
                    playerId: res.hostId,
                    isHost: true,
                    players: res.players,
                    maxPlayers: res.maxPlayers,
                }))
                navigate('lobby')
            } else {
                setError('Could not create room. Try again.')
            }
        })
    }

    return (
        <section id='createGame'>
            <div className='createGameBackButton'>
                <BackButton text="Back" onClick={() => navigate('menu')} />
            </div>
            <TitleHolder text="Create Game" />

            <input
                className='name-input'
                type='text'
                placeholder='Your name'
                maxLength={16}
                value={gameState.playerName}
                onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value }))}
            />

            <NumberInput
                label="NUM OF PLAYERS"
                value={players}
                onChange={setPlayers}
                min={2}
                max={8}
            />

            <h2>Game Mode</h2>
            <Gamemode
                mode={gameState.gameMode}
                onChange={(m) => setGameState(prev => ({ ...prev, gameMode: m }))}
            />

            {error && <p className='error-msg'>{error}</p>}

            <OptionHolder text="Start match" onClick={handleStartMatch} />
        </section>
    )
}

export default CreateGame
