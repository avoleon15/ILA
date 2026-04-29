import { useState } from 'react'
import TitleHolder from '../../components/TitleHolder/TitleHolder.jsx'
import BackButton from '../../components/BackButton/BackButton.jsx'
import OptionHolder from '../../components/OptionHolder/OptionHolder.jsx'
import './LobbyScreen.css'

function LobbyScreen({ navigate }) {
    const [showLeaveWarning, setShowLeaveWarning] = useState(false)

    const handleBackClick = () => {
        setShowLeaveWarning(true)
    }

    const handleStay = () => {
        setShowLeaveWarning(false)
    }

    const handleLeave = () => {
        setShowLeaveWarning(false)
        navigate('menu')
    }

    return (
        <section id='lobbyScreen'>
            <div className='lobbyScreenBackButton'>
                <BackButton text='Back' onClick={handleBackClick} />
            </div>
            <TitleHolder text='Lobby' />
            <p>Waiting for players to join...</p>
            {showLeaveWarning && (
                <div className='lobbyLeaveOverlay'>
                    <div className='lobbyLeaveModal'>
                        <h2>Leave the lobby?</h2>
                        <p>If you leave now, you will abandon the match setup.</p>
                        <div className='lobbyLeaveActions'>
                            <OptionHolder text='Stay' onClick={handleStay} />
                            <OptionHolder text='Leave' onClick={handleLeave} />
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default LobbyScreen
