import { useState } from 'react'
import './App.css'
import Adlg from './components/Adlg/Adlg.jsx'
import Admd from './components/Admd/Admd.jsx'
import Adsm from './components/Adsm/Adsm.jsx'
import NavBar from './components/NavBar/NavBar'
import GameRouter from './GameRouter.jsx'

function App() {

  const [page, setPage] = useState('menu')

  return (
    <>
      <NavBar/>
      <section id='page-display'>
        <section>

          <section id='game-box'>
            <GameRouter
              page={page}
              navigate={setPage}
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
