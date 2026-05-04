import { useState } from 'react'
import './App.css'
import Adlg from './components/Adlg/Adlg.jsx'
import Admd from './components/Admd/Admd.jsx'
import Adsm from './components/Adsm/Adsm.jsx'
import NavBar from './components/NavBar/NavBar'
import GameRouter from './GameRouter.jsx'

function App() {

  const [page, setPage] = useState('winner')

  const [gameState, setGameState] = useState({
    playerName: '',
    roomCode: '',
    playerId: '',
    isHost: false,
    players: [],
    gameMode: 'classic',
  })

  return (
    <>
      <NavBar/>
      <section id='page-display'>
        <section>

          <section id='game-box'>
            <GameRouter
              page={page}
              navigate={setPage}
              gameState={gameState}
              setGameState={setGameState}
            />
          </section>

          <Adlg/>
        </section>
        <section id='display-right'>
          <Admd/>
          <Adsm/>
          <Admd/>
        </section>
      </section>
    </>
  )
}

export default App
