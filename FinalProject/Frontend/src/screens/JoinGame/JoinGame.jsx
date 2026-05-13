// JoinGame.jsx — screen where a player enters their name and a 6-character room code to join an existing room.
// Handles paste, per-character input navigation, and join-room socket emit.

import { useEffect, useRef, useState } from 'react'
import BackButton from '../../components/BackButton/BackButton'
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

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
        const newCode = [...code]
        pasted.split('').forEach((char, i) => { newCode[i] = char })
        setCode(newCode)
        const nextEmpty = pasted.length < 6 ? pasted.length : 5
        inputRefs.current[nextEmpty]?.focus()
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
                    maxPlayers: res.maxPlayers,
                }))
                navigate('lobby')
            } else {
                setError(res.error || 'Could not join room. Check the code and try again.')
            }
        })
    }

    return (
        <div id='Joingame'>
            <div className='joinGameBackButton'>
                <BackButton text="Back" onClick={() => navigate('menu')} />
            </div>
            <TitleHolder text="Join Game"/>

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
                        onPaste={handlePaste}
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
