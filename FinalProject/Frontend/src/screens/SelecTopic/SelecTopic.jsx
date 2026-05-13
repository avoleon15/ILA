// SelecTopic.jsx — screen shown after the game starts, while the topic is being chosen.
// The randomly selected topic selector sees an input; all other players see a waiting message.
// Navigates to the drawing screen once topic-selected is received from the server.

import { useEffect, useState } from 'react'
import OptionHolder from '../../components/OptionHolder/OptionHolder'
import TitleHolder from '../../components/TitleHolder/TitleHolder'
import socket from '../../socket.js'
import './SelecTopic.css'

export const SelecTopic = ({ navigate, gameState, setGameState }) => {
    const [topic, setTopic] = useState('')

    const isSelector = socket.id === gameState.topicSelector?.socketId

    useEffect(() => {
        socket.on('topic-selected', ({ topic, drawingDuration }) => {
            setGameState(prev => ({ ...prev, topic, drawingDuration }))
            navigate('demo')
        })
        return () => socket.off('topic-selected')
    }, [])

    const handleConfirm = () => {
        if (!topic.trim()) return
        socket.emit('select-topic', { roomCode: gameState.roomCode, topic: topic.trim() })
    }

    return (
        <div id='sl'>
            <TitleHolder text='Topic Time!!' />

            {isSelector ? (
                <>
                    <input
                        type='text'
                        maxLength={20}
                        className='topic'
                        placeholder='Enter a topic...'
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                        autoFocus
                    />
                    <OptionHolder text='CONFIRM' onClick={handleConfirm} />
                </>
            ) : (
                <p className='waiting-text'>
                    Waiting for <strong>{gameState.topicSelector?.name}</strong> to choose a topic...
                </p>
            )}
        </div>
    )
}
