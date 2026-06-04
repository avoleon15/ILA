import { useState } from 'react'
import './App.css'
import Adlg from './components/Adlg/Adlg.jsx'
import Admd from './components/Admd/Admd.jsx'
import Adsm from './components/Adsm/Adsm.jsx'
import NavBar from './components/NavBar/NavBar'
import GameRouter from './GameRouter.jsx'

function App() {

  const [page, setPage] = useState('menu')

  const [gameState, setGameState] = useState({
    playerName: '',
    roomCode: '',
    playerId: '',
    isHost: false,
    players: [],
    gameMode: 'classic',
    topicSelector: null,
    topic: '',
    drawingDuration: 60000,
    maxPlayers: 8,
  })

  return (
    <section id='App'>  
      <NavBar/>
      <section id='page-display'>

        <Adsm/>

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
          <Admd/>
          <Admd/>
        </section>

      </section>
    </section>
  )
}

export default App