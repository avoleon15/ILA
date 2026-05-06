import { useEffect, useRef, useState } from 'react'
import OptionHolder from '../../components/OptionHolder/OptionHolder'
import TitleHolder from '../../components/TitleHolder/TitleHolder'
import socket from '../../socket.js'
import './JoinGame.css'

const JoinGame = ({ navigate, gameState, setGameState }) => {

    const [code, setCode] = useState(['', '', '', '', '', ''])
    const [error, setError] = useState('')
    const [connected, setConnected] = useState(socket.connected)
    const inputRefs = useRef([])

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

    const handleCodeChange = (e, i) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
        const newCode = [...code]
        newCode[i] = val.slice(-1)
        setCode(newCode)
        if (val && i < 5) inputRefs.current[i + 1]?.focus()
    }

    const handleJoin = () => {
        if (!connected) {
            setError('Not connected to server. Make sure the backend is running.')
            return
        }
        if (!gameState.playerName.trim()) {
            setError('Please enter your name.')
            return
        }
        const roomCode = code.join('')
        if (roomCode.length < 6) {
            setError('Please enter the full 6-character room code.')
            return
        }
        setError('')

        socket.emit('join-room', { roomCode, playerName: gameState.playerName }, (res) => {
            if (res.success) {
                setGameState(prev => ({
                    ...prev,
                    roomCode,
                    playerId: res.playerId,
                    isHost: false,
                    players: res.players,
                }))
                navigate('lobby')
            } else {
                setError(res.error || 'Could not join room. Check the code and try again.')
            }
        })
    }

    return (
        <div id='Joingame'>
            <TitleHolder text="Join Game"/>

            <p className={connected ? 'status-ok' : 'status-err'}>
                {connected ? '● Connected' : '● Disconnected — start the backend (npm start)'}
            </p>

            <input
                className='name-input'
                type='text'
                placeholder='Your name'
                maxLength={16}
                value={gameState.playerName}
                onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value }))}
            />

            <h2>Enter the 6-character code to join a game</h2>

            <div className="code-inputs">
                {code.map((val, i) => (
                    <input
                        key={i}
                        ref={(el) => (inputRefs.current[i] = el)}
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleCodeChange(e, i)}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !val && i > 0) inputRefs.current[i - 1]?.focus()
                        }}
                    />
                ))}
            </div>

            {error && <p className='error-msg'>{error}</p>}

            <OptionHolder text="Join Game" onClick={handleJoin} />
        </div>
    )
}

export default JoinGame
